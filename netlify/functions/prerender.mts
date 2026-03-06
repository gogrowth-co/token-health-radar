import type { Context, Config } from "@netlify/functions";
import puppeteer, { Browser, HTTPRequest } from "puppeteer";
import chromium from "@sparticuz/chromium";
import psl from "psl";

// Extend Window interface for prerenderReady
declare global {
  interface Window {
    prerenderReady?: boolean;
  }
}

type RequestWithId = HTTPRequest & {
  id: string;
}

// Check if running in Netlify/AWS Lambda environment
const isProduction = !process.env.NETLIFY_DEV;

const allowRemoteHostsRawSetting: string|undefined = process.env.PRERENDER_ALLOW_REMOTE_HOSTS?.toLowerCase();
const allowRemoteHosts = allowRemoteHostsRawSetting &&
  (allowRemoteHostsRawSetting === "always" ||
  (allowRemoteHostsRawSetting === "local" && !isProduction));

const localShowBrowser = !isProduction && process.env.PRERENDER_LOCAL_SHOW_BROWSER?.toLowerCase() === "true";
const userAgent = process.env.PRERENDER_USER_AGENT || 'Mozilla/5.0 (compatible; Netlify Prerender Function)';
const disableCaching = process.env.PRERENDER_DISABLE_CACHING?.toLowerCase() === "true";
const skipVisualResources = !(process.env.PRERENDER_SKIP_VISUAL_RESOURCES?.toLowerCase() === "false");
const skipThirdParty = !(process.env.PRERENDER_SKIP_THIRD_PARTY?.toLowerCase() === "false");
const skipCustomList = process.env.PRERENDER_SKIP_CUSTOM_LIST?.split(",").filter(Boolean) || [];
const shouldLogSkipped = process.env.PRERENDER_SKIP_LOGGING?.toLowerCase() === "true";

const visualResourceTypes = ['image', 'media', 'font', 'stylesheet'];
const waitAfterLastRequest = 500;
const pageDoneCheckInterval = 100;
const maxWaitTime = 10000;
const inFlightReportAfterTime = 1000;
const inFlightReportInterval = 1000;

let browser: Browser|null = null;

async function getBrowser() {
  if (browser) {
    try {
      if (!browser.connected) {
        throw new Error('Browser disconnected');
      }
      const pages = await Promise.race([
        browser.pages(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Health check timeout')), 2000)
        )
      ]);
      console.log('Browser health check passed, reusing existing instance');
      return browser;
    } catch (error) {
      console.log('Browser health check failed, recreating:', (error as Error).message);
      try {
        await browser.close();
      } catch (closeError) {
        console.log('Failed to close dead browser connection:', (closeError as Error).message);
      }
      browser = null;
    }
  }

  if (!browser) {
    if (isProduction) {
      const executablePath = await chromium.executablePath();
      browser = await puppeteer.launch({
        args: [...chromium.args, '--disable-web-security'],
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless,
      });
    } else {
      console.log('Local development environment detected, using bundled Chromium');
      browser = await puppeteer.launch({
        headless: !localShowBrowser,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
    }
    console.log('New browser instance created successfully');
  }

  return browser;
}

export default async (req: Request, context: Context) => {
  const startTime = Date.now();
  const clientIP = context.ip || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
  let targetUrl = 'unknown';

  try {
    const targetUrlParam = new URL(req.url).searchParams.get('url');

    if (!targetUrlParam) {
      console.error('PRERENDER ERROR: Missing url parameter');
      return new Response('Missing url parameter', { status: 400 });
    }

    const requestHost = new URL(req.url).host;

    let parsedTargetUrl: URL | undefined;
    try {
      parsedTargetUrl = new URL(targetUrlParam);

      if (!allowRemoteHosts && parsedTargetUrl.host !== requestHost) {
        console.error(`PRERENDER ERROR: Host mismatch - request from ${requestHost}, target ${parsedTargetUrl.host}`);
        return new Response('Invalid target URL: must be same host', { status: 403 });
      }

      if (!['http:', 'https:'].includes(parsedTargetUrl.protocol)) {
        console.error(`PRERENDER ERROR: Invalid protocol ${parsedTargetUrl.protocol} for ${targetUrlParam}`);
        return new Response('Invalid protocol: only HTTP/HTTPS allowed', { status: 403 });
      }

      const hostname = parsedTargetUrl.hostname;
      const isPrivateNetwork =
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.') ||
        hostname.startsWith('172.17.') ||
        hostname.startsWith('172.18.') ||
        hostname.startsWith('172.19.') ||
        hostname.startsWith('172.2') ||
        hostname.startsWith('172.30.') ||
        hostname.startsWith('172.31.') ||
        hostname === '::1';

      if (isPrivateNetwork && process.env.NETLIFY) {
        console.error(`PRERENDER ERROR: Private network access denied for ${hostname}`);
        return new Response('Private network access not allowed', { status: 403 });
      }

      targetUrl = targetUrlParam;
    } catch (urlError) {
      console.error(`PRERENDER ERROR: Invalid URL format: ${targetUrlParam}`);
      return new Response('Invalid URL format', { status: 400 });
    }

    console.log(`Getting browser instance...`);
    const getBrowserStart = Date.now();
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();
    const getBrowserTime = Date.now() - getBrowserStart;

    await page.setUserAgent(userAgent);
    await page.setRequestInterception(true);

    let skippedCount = 0;
    let numRequestsInFlight = 0;
    let lastRequestReceivedAt = Date.now();
    const requests: { [requestId: string]: string } = {};
    const pageDomain = psl.parse(parsedTargetUrl!.hostname).domain;

    page.on('request', (request) => {
      const url = request.url();
      const resourceType = request.resourceType();

      let shouldSkip = (skipVisualResources && visualResourceTypes.includes(resourceType));
      shouldSkip = shouldSkip || skipCustomList.some(skipItem => url.includes(skipItem));

      if (!shouldSkip && skipThirdParty) {
        try {
          const requestDomain = psl.parse(new URL(url).hostname).domain;
          shouldSkip = pageDomain !== requestDomain;
        } catch {
          shouldSkip = false;
        }
      }

      if (shouldSkip) {
        if (shouldLogSkipped) {
          console.log("Skip loading request:", url);
        }
        skippedCount++;
        request.abort();
      } else {
        const reqId = (request as RequestWithId).id;
        if (!requests[reqId]) {
          numRequestsInFlight++;
          requests[reqId] = url;
        }
        request.continue();
      }
    });

    page.on('requestfinished', (request) => {
      const id = (request as RequestWithId).id;
      if (requests[id]) {
        numRequestsInFlight = Math.max(0, numRequestsInFlight - 1);
        lastRequestReceivedAt = Date.now();
        delete requests[id];
      }
    });

    page.on('requestfailed', (request) => {
      const id = (request as RequestWithId).id;
      if (requests[id]) {
        numRequestsInFlight = Math.max(0, numRequestsInFlight - 1);
        lastRequestReceivedAt = Date.now();
        delete requests[id];
      }
    });

    await page.setViewport({ width: 1200, height: 800 });

    await page.evaluateOnNewDocument(() => {
      if ('Notification' in window) {
        Object.defineProperty(window, 'Notification', {
          value: undefined,
          writable: false
        });
      }
      (window as any).__PRERENDER__ = true;
    });

    console.log(`Navigating to ${targetUrl}...`);
    const navigationStart = Date.now();
    try {
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      });
    } catch (navigationError) {
      console.error(`PRERENDER ERROR: Navigation failed for ${targetUrl}: ${(navigationError as Error).message}`);
      throw navigationError;
    }
    const navigationTime = Date.now() - navigationStart;

    console.log("Waiting for window.prerenderReady or requests to settle...");
    const waitStart = Date.now();
    let lastInFlightReportTime = waitStart;

    const checkIfDone = async (): Promise<boolean> => {
      const now = Date.now();
      const totalWaitTime = now - waitStart;

      if (totalWaitTime >= maxWaitTime) {
        return true;
      }

      const currentPrerenderReady = await page.evaluate(() => {
        return typeof window.prerenderReady === 'boolean' ? window.prerenderReady : null;
      });

      if (currentPrerenderReady !== null) {
        if (currentPrerenderReady === true) {
          return true;
        }
        return false;
      }

      const timeSinceLastRequest = now - lastRequestReceivedAt;
      const requestsSettled = numRequestsInFlight <= 0 && timeSinceLastRequest >= waitAfterLastRequest;

      if (numRequestsInFlight > 0 && totalWaitTime >= inFlightReportAfterTime) {
        if (now - lastInFlightReportTime > inFlightReportInterval) {
          const inflightUrls = Object.values(requests).map(url => url.substring(0, 200));
          console.log(`In-flight requests after ${Date.now() - waitStart}ms of wait: `, inflightUrls);
          lastInFlightReportTime = now;
        }
      }
      return requestsSettled;
    };

    while (!(await checkIfDone())) {
      await new Promise(resolve => setTimeout(resolve, pageDoneCheckInterval));
    }
    const totalWaitTime = Date.now() - waitStart;

    const html = await page.content();
    const htmlSize = Buffer.byteLength(html, 'utf8');

    await page.close();

    const renderTime = Date.now() - startTime;

    let statusCode = 200;
    let headers: Record<string, string> = {
      'Content-Type': 'text/html; charset=utf-8',
      'Vary': 'User-Agent',
      'X-Prerendered': 'true',
      'X-Prerender-Timestamp': new Date().toISOString(),
    };

    if (disableCaching) {
      headers['Cache-Control'] = 'no-store';
    } else {
      headers['Netlify-CDN-Cache-Control'] = 'public, max-age=3600, stale-while-revalidate=604800, durable';
      headers['Cache-Control'] = 'public, max-age=0, must-revalidate';
      headers['Cache-Tags'] = 'nf-prerender';
    }

    console.log(`PRERENDER SUCCESS: ${targetUrl} | ${renderTime}ms total (${getBrowserTime}ms get browser, ${navigationTime}ms nav, ${totalWaitTime}ms wait) | ${statusCode} status | ${htmlSize}B HTML | ${skippedCount} requests skipped | IP=${clientIP}`);

    const cleanup = async () => {
      const cleanupStart = Date.now();
      const page = await browserInstance.newPage();
      await page.close();
      console.log(`Async resource cleanup done in ${Date.now() - cleanupStart}ms`);
    }
    context.waitUntil(cleanup());

    return new Response(html, {
      status: statusCode,
      headers
    });
  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`PRERENDER ERROR: ${targetUrl} | ${errorTime}ms | ${(error as Error).message} | IP=${clientIP}`);
    console.error(`PRERENDER ERROR STACK: ${(error as Error).stack}`);
    return new Response('Prerender failed', { status: 500 });
  }
};

export const config: Config = {
  path: "/api/prerender"
};
