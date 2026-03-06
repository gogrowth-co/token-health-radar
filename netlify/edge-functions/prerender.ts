import type { Context, Config } from "@netlify/edge-functions";

// Comprehensive crawler user agents (matching Netlify browser-prerendering-example)
const CRAWLER_USER_AGENTS = [
  'baiduspider',
  'twitterbot',
  'facebookexternalhit',
  'facebot',
  'rogerbot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'socialflow',
  'googlebot',
  'outbrain',
  'pinterestbot',
  'pinterest/0',
  'slackbot',
  'vkshare',
  'w3c_validator',
  'redditbot',
  'mediapartners-google',
  'adsbot-google',
  'parsely',
  'duckduckbot',
  'whatsapp',
  'hatena',
  'screaming frog seo spider',
  'bingbot',
  'sajaribot',
  'dashlinkpreviews',
  'discordbot',
  'ranksonicbot',
  'lyticsbot',
  'yandexbot/',
  'yandexwebmaster/',
  'naytev-url-scraper',
  'applebot/',
  'snapchat',
  'viber',
  'proximic',
  'iframely/',
  'ahrefsbot/',
  'ahrefssiteaudit/',
  'petalbot',
  'taboolabot/',
  'google-inspectiontool/',
  'microsoftpreview/',
  'zoombot',
  'mastodon/',
  'siteauditbot/',
  'semrushbot-ba',
  'semrushbot-si/',
  'semrushbot-swa/',
  'semrushbot-ocob/',
  'gptbot',
  'chatgpt-user',
  'oai-searchbot',
  'perplexitybot',
  'claudebot',
  'dotbot',
  'semrushbot',
  'mj12bot',
  'ia_archiver',
  'ccbot',
  'cohere-ai',
  'anthropic-ai',
];

const isHTMLRequest = (path: string): boolean => {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return true;
  const ext = path.substring(lastDot);
  if (ext === '.woff2') return false;
  if (ext === '.html' || ext === '.htm') return true;
  return ext.length > 5;
};

const acceptsHTML = (acceptHeader: string): boolean => {
  if (!acceptHeader) return true;
  return (
    acceptHeader.includes('text/html') ||
    acceptHeader.includes('text/*') ||
    acceptHeader.includes('*/*')
  );
};

const isCrawlerRequest = (req: Request): boolean => {
  if (req.method !== 'GET') return false;

  const url = new URL(req.url);
  if (url.searchParams.has('_escaped_fragment_')) return true;

  const userAgent = req.headers.get('user-agent') || '';

  // Exclude empty, internal function calls, or excessively long user agents
  if (
    !userAgent ||
    userAgent === 'Prerender' ||
    userAgent === 'Netlify-Edge-Function' ||
    userAgent.startsWith('Mozilla/5.0 (compatible; Netlify Prerender') ||
    userAgent.length > 4096
  ) {
    return false;
  }

  const ua = userAgent.toLowerCase();
  return CRAWLER_USER_AGENTS.some((bot) => ua.includes(bot));
};

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);

  // Pass through non-HTML requests (JS, CSS, images, fonts, etc.)
  if (!isHTMLRequest(url.pathname)) {
    return;
  }

  // Pass through requests that don't accept HTML
  const acceptHeader = req.headers.get('accept') || '';
  if (!acceptsHTML(acceptHeader)) {
    return;
  }

  // Skip internal Netlify paths and API routes
  if (
    url.pathname.startsWith('/.netlify/') ||
    url.pathname.startsWith('/api/') ||
    url.pathname === '/.netlify/images'
  ) {
    return;
  }

  const shouldPrerender =
    isCrawlerRequest(req) || url.searchParams.has('prerender');

  if (!shouldPrerender) {
    return;
  }

  // Route to the Netlify prerender function
  const prerenderUrl = new URL('/api/prerender', req.url);
  const targetUrl = new URL(req.url);
  targetUrl.searchParams.delete('_escaped_fragment_');
  targetUrl.searchParams.delete('prerender');
  prerenderUrl.searchParams.set('url', targetUrl.toString());

  const originalUserAgent = req.headers.get('user-agent') || '';

  try {
    return context.next(
      new Request(prerenderUrl.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'Netlify-Edge-Function',
          'X-Original-User-Agent': originalUserAgent,
          'X-Forwarded-For': req.headers.get('x-forwarded-for') || '',
        },
      })
    );
  } catch (error) {
    console.error('Prerender routing error:', error);
    return;
  }
};

export const config: Config = {
  path: '/*',
};
