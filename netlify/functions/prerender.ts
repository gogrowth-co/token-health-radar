import type { Handler, HandlerEvent } from "@netlify/functions";
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const SITE_URL = "https://tokenhealthscan.com";
const CACHE_TTL = 72 * 60 * 60; // 72 hours in seconds

const handler: Handler = async (event: HandlerEvent) => {
  const path = event.queryStringParameters?.path || "/";
  const targetUrl = `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  console.log(`[PRERENDER] Rendering: ${targetUrl}`);

  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Use a regular user-agent so we don't trigger bot detection on our own site
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Block unnecessary resources to speed up rendering
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const resourceType = req.resourceType();
      if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // Navigate and wait for the SPA to render
    await page.goto(targetUrl, {
      waitUntil: "networkidle0",
      timeout: 25000,
    });

    // Also wait for a custom readiness flag if the app sets one
    try {
      await page.waitForFunction("window.__PRERENDER_READY === true", {
        timeout: 5000,
      });
    } catch {
      // If flag isn't set within 5s, proceed with whatever we have
      console.log("[PRERENDER] __PRERENDER_READY not detected, using networkidle result");
    }

    let html = await page.content();

    // Strip <script> tags so bots don't re-execute the SPA bundle
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

    // Inject prerender status meta tag
    html = html.replace(
      "</head>",
      '  <meta name="prerender-status" content="200">\n</head>'
    );

    console.log(`[PRERENDER] Successfully rendered ${targetUrl} (${html.length} bytes)`);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
        "X-Prerender": "true",
      },
      body: html,
    };
  } catch (err: any) {
    console.error(`[PRERENDER] Error rendering ${targetUrl}:`, err.message);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Prerender failed",
        message: err.message,
        path,
      }),
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};

export { handler };
