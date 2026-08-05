// tokenhealthscan-bot-prerender v2.0 — 2026-08-05
// Changes vs v1 (deployed as tokenhealthscan-bot-prerender):
// - Hard 404 propagation (mangabeira-snapshot-router v2.6 pattern):
//   when a bot hits a known dynamic route pattern (/token/:sym,
//   /publications/:slug, /agent-scan/:chain/:id) and seo-snapshot
//   returns 404, serve a real 404 page instead of falling through
//   to the SPA origin (which returns index.html at 200 = soft 404).
// - Bots on fully unknown routes get X-Robots-Tag: noindex on the
//   origin response so junk URLs can never be indexed.
// - Static-file proxy + og-image fix behavior unchanged.

const FIXED_OG_IMAGE = "https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png";

async function fixOgImage(response) {
  const ct = response.headers.get("content-type") || "";
  if (!ct.includes("text/html")) return response;
  const text = await response.text();
  if (!text.includes("storage.googleapis.com/gpt-engineer-file-uploads")) return new Response(text, response);
  const fixed = text.replace(/https:\/\/storage\.googleapis\.com\/gpt-engineer-file-uploads\/[^"]+/g, FIXED_OG_IMAGE);
  return new Response(fixed, { status: response.status, headers: response.headers });
}

const SUPABASE_PROJECT = "qaqebpcqespvzbfwawlp";
const SUPABASE_URL = `https://${SUPABASE_PROJECT}.supabase.co`;
const SITEMAP_BUCKET = "sitemaps";
const STATIC_FILE_BUCKET = "seo-snapshots";

const STORAGE_PROXY_PATHS = {
  "/sitemap.xml": {
    url: `${SUPABASE_URL}/storage/v1/object/public/${SITEMAP_BUCKET}/sitemap.xml`,
    contentType: "application/xml; charset=utf-8"
  },
  "/llms.txt": {
    url: `${SUPABASE_URL}/storage/v1/object/public/${STATIC_FILE_BUCKET}/llms.txt`,
    contentType: "text/plain; charset=utf-8"
  },
  "/llms-full.txt": {
    url: `${SUPABASE_URL}/storage/v1/object/public/${STATIC_FILE_BUCKET}/llms-full.txt`,
    contentType: "text/plain; charset=utf-8"
  },
  "/rss.xml": {
    url: `${SUPABASE_URL}/functions/v1/rss-feed`,
    contentType: "application/rss+xml; charset=utf-8"
  },
  "/f8a3d2e1b4c7059e6a8f3b2d1e4c7059.txt": {
    url: `${SUPABASE_URL}/storage/v1/object/public/${STATIC_FILE_BUCKET}/f8a3d2e1b4c7059e6a8f3b2d1e4c7059.txt`,
    contentType: "text/plain; charset=utf-8"
  }
};

const BOT_UA_REGEX = /bot|crawler|spider|crawling|googlebot|google-inspectiontool|googleother|bingbot|duckduckbot|duckassistbot|slurp|yandexbot|baiduspider|applebot|applebot-extended|gptbot|chatgpt-user|oai-searchbot|claudebot|anthropic-ai|claude-web|perplexitybot|perplexity-user|google-extended|gemini|ccbot|meta-externalagent|meta-externalfetcher|facebookbot|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|slackbot|redditbot|pinterestbot|bytespider|amazonbot|cohere-ai|mistralai|xai|grok|diffbot|petalbot|youbot|kagibot|lighthouse|chrome-lighthouse|screaming frog|ahrefsbot|semrushbot|mj12bot|dotbot|sitebulb|mozcrawler/i;

const STATIC_ROUTES = new Set([
  "/",
  "/pricing",
  "/token",
  "/token-directory",
  "/token-scan-guide",
  "/token-sniffer-comparison",
  "/token-sniffer-vs-tokenhealthscan",
  "/solana-launchpads",
  "/ethereum-launchpads",
  "/ai-agents",
  "/agent-directory",
  "/agent-scan",
  "/copilot",
  "/publications",
  "/privacy",
  "/terms",
  "/ltd"
]);

const DYNAMIC_ROUTES = [
  /^\/token\/[^/]+$/,
  /^\/agent-scan\/[^/]+\/[^/]+$/,
  /^\/publications\/[^/]+$/
];

function normalizePath(pathname) {
  let path = pathname || "/";
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path || "/";
}

function isStaticRoute(pathname) {
  return STATIC_ROUTES.has(pathname);
}

function isDynamicRoute(pathname) {
  return DYNAMIC_ROUTES.some((pattern) => pattern.test(pathname));
}

function isKnownRoute(pathname) {
  return isStaticRoute(pathname) || isDynamicRoute(pathname);
}

function isBot(request) {
  return BOT_UA_REGEX.test(request.headers.get("user-agent") || "");
}

function wantsHtml(request) {
  const accept = request.headers.get("accept") || "";
  return !accept || accept.includes("text/html") || accept.includes("*/*");
}

function notFoundPage(pathname) {
  const body = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>404 Not Found | Token Health Scan</title>
<meta name="robots" content="noindex"/>
</head><body style="font-family:system-ui;max-width:600px;margin:10vh auto;padding:24px;background:#0a0a0f;color:#e5e7eb">
<h1>404 — Page not found</h1>
<p>The page <code>${pathname.replace(/[<>&"']/g, "")}</code> does not exist.</p>
<p><a href="https://tokenhealthscan.com/" style="color:#a78bfa">Token Health Scan home</a> · <a href="https://tokenhealthscan.com/token" style="color:#a78bfa">Token directory</a></p>
</body></html>`;
  return new Response(body, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
      "x-served-by": "cf-worker-404"
    }
  });
}

async function proxyStaticFile(pathname, request) {
  const target = STORAGE_PROXY_PATHS[pathname];
  if (!target) return null;
  const upstream = await fetch(target.url, {
    headers: {
      "user-agent": request.headers.get("user-agent") || "tokenhealthscan-worker",
      accept: target.contentType
    },
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (!upstream.ok) return null;
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": target.contentType,
      "cache-control": "public, max-age=300, s-maxage=600",
      "x-served-by": pathname === "/sitemap.xml" ? "cf-worker-sitemap-storage" : "cf-worker-static-proxy"
    }
  });
}

// Returns a Response (snapshot 200 or propagated 404) or null on upstream error.
async function serveSnapshot(pathname) {
  const snapshotUrl = `${SUPABASE_URL}/functions/v1/seo-snapshot?path=${encodeURIComponent(pathname)}`;
  const upstream = await fetch(snapshotUrl, {
    cf: { cacheTtl: 300, cacheEverything: true }
  });
  if (upstream.ok) {
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
        "x-robots-tag": "index, follow",
        "x-served-by": "cf-worker-snapshot",
        "x-snapshot-source": upstream.headers.get("x-snapshot-source") || "unknown"
      }
    });
  }
  // v2.0: propagate hard 404 for dynamic routes whose slug doesn't exist
  // (seo-snapshot returns 404 only for unknown content; 5xx falls through).
  if (upstream.status === 404 && isDynamicRoute(pathname)) {
    return notFoundPage(pathname);
  }
  return null;
}

async function addNoindex(response) {
  const r = new Response(response.body, response);
  r.headers.set("x-robots-tag", "noindex");
  return r;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = normalizePath(url.pathname);

    if (STORAGE_PROXY_PATHS[pathname]) {
      const fileResponse = await proxyStaticFile(pathname, request);
      if (fileResponse) return fileResponse;
      return fetch(request);
    }

    const botHtml = request.method === "GET" && wantsHtml(request) && isBot(request);

    if (botHtml && isKnownRoute(pathname)) {
      const snapshot = await serveSnapshot(pathname);
      if (snapshot) return snapshot;
    }

    const originResp = await fetch(request);

    // v2.0: bots on unknown routes must never index the SPA shell.
    if (botHtml && !isKnownRoute(pathname)) {
      return addNoindex(await fixOgImage(originResp));
    }

    return fixOgImage(originResp);
  }
};
