/**
 * Cloudflare Worker — Bot Prerender + Edge Router
 *
 * Single edge entry point in front of Lovable hosting (tokenhealthscan.com).
 *
 *  • Bots/crawlers/unfurlers (Google, GPTBot, PerplexityBot, ClaudeBot,
 *    Gemini, OAI-SearchBot, social unfurlers, audit tools, ...) on a
 *    known route → fetch from the Supabase `seo-snapshot` edge function
 *    and serve that HTML on the first byte.
 *
 *  • Static helpers (/sitemap.xml, /robots.txt, /llms.txt, /rss.xml) →
 *    proxy to the appropriate origin (Supabase edge fn or Lovable static).
 *
 *  • *.lovable.app/* → 301 to https://tokenhealthscan.com/...
 *
 *  • Everything else → transparent passthrough to Lovable hosting (SPA).
 *
 * Deploy: wrangler deploy
 * Secrets:
 *   wrangler secret put SUPABASE_URL          (e.g. https://qaqebpcqespvzbfwawlp.supabase.co)
 *   wrangler secret put SUPABASE_ANON_KEY     (publishable / anon key)
 *   wrangler secret put LOVABLE_ORIGIN        (defaults to https://token-health-radar.lovable.app)
 */

const SITE_URL = "https://tokenhealthscan.com";
const DEFAULT_LOVABLE_ORIGIN = "https://token-health-radar.lovable.app";
const SUPABASE_PROJECT = "qaqebpcqespvzbfwawlp";
const CMS_STORAGE_BUCKET = "blog-images";

const BOT_UA_PATTERN = new RegExp(
  [
    // Search engines
    "googlebot", "google-inspectiontool", "googleother",
    "bingbot", "duckduckbot", "duckassistbot",
    "yandexbot", "baiduspider", "sogou", "exabot", "ia_archiver", "applebot",
    "applebot-extended", "msnbot", "teoma", "rogerbot", "seznambot", "slurp",
    // AI / AEO crawlers
    "gptbot", "chatgpt-user", "oai-searchbot",
    "claudebot", "anthropic-ai", "claude-web",
    "perplexitybot", "perplexity-user",
    "google-extended", "googleother", "gemini",
    "ccbot", "meta-externalagent", "meta-externalfetcher", "facebookbot",
    "bytespider", "amazonbot", "cohere-ai", "cohere-bot",
    "mistralai", "mistral", "xai", "grok", "diffbot",
    "petalbot", "youbot", "you.com", "kagibot", "phindbot",
    "omgili", "mojeekbot",
    // Social unfurlers
    "twitterbot", "facebookexternalhit", "linkedinbot", "slackbot",
    "whatsapp", "telegrambot", "discordbot", "embedly", "redditbot",
    "pinterestbot", "vkshare", "nuzzel", "bitlybot",
    // SEO / audit tools
    "semrushbot", "ahrefsbot", "ahrefssiteaudit", "mj12bot", "dotbot",
    "screaming frog", "sitebulb", "lighthouse", "chrome-lighthouse",
    "headlesschrome", "pagespeed", "gtmetrix", "pingdom",
    "mozcrawler", "moz.com",
  ].join("|"),
  "i"
);

// Static allowlist
const STATIC_ROUTES = new Set([
  "/", "/pricing", "/token", "/token-directory",
  "/token-scan-guide", "/token-sniffer-comparison", "/token-sniffer-vs-tokenhealthscan",
  "/solana-launchpads", "/ethereum-launchpads",
  "/ai-agents", "/agent-directory", "/agent-scan",
  "/copilot", "/publications", "/privacy", "/terms", "/ltd",
]);

// Dynamic route patterns
const DYNAMIC_PATTERNS = [
  /^\/token\/[^/]+$/,                  // /token/:symbol
  /^\/agent-scan\/[^/]+\/[^/]+$/,      // /agent-scan/:chain/:agentId
  /^\/publications\/[^/]+$/,           // /publications/:slug
];

const CMS_STORAGE_PROXY_PATHS = {
  "/rss.xml": "rss.xml",
  "/rss/en.xml": "rss/en.xml",
  "/rss-en.xml": "rss-en.xml",
  "/llms.txt": "llms.txt",
  "/llms-full.txt": "llms-full.txt",
};

function normalizePath(pathname) {
  let p = (pathname || "/").split("?")[0].split("#")[0];
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  return p || "/";
}

function isKnownRoute(path) {
  if (STATIC_ROUTES.has(path)) return true;
  return DYNAMIC_PATTERNS.some((re) => re.test(path));
}

function isBot(req) {
  const ua = req.headers.get("User-Agent") || "";
  return BOT_UA_PATTERN.test(ua);
}

function wantsHtml(req) {
  const accept = req.headers.get("Accept") || "";
  // Bots often omit Accept; treat empty/string as html-acceptable.
  return !accept || accept.includes("text/html") || accept.includes("*/*");
}

async function serveSnapshot(path, env) {
  const supabaseUrl = env.SUPABASE_URL;
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL secret");
  const url = `${supabaseUrl}/functions/v1/seo-snapshot?path=${encodeURIComponent(path)}`;
  const upstream = await fetch(url, {
    headers: env.SUPABASE_ANON_KEY
      ? {
          apikey: env.SUPABASE_ANON_KEY,
          Authorization: `Bearer ${env.SUPABASE_ANON_KEY}`,
        }
      : {},
    cf: { cacheTtl: 300, cacheEverything: true },
  });
  if (!upstream.ok) return null;
  const html = await upstream.text();
  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      "X-Robots-Tag": "index, follow",
      "X-Served-By": "cf-worker-snapshot",
      "X-Snapshot-Source": upstream.headers.get("X-Snapshot-Source") || "unknown",
    },
  });
}

async function proxySitemap(env) {
  const supabaseUrl = env.SUPABASE_URL;
  const upstream = await fetch(`${supabaseUrl}/functions/v1/serve-sitemap`, {
    headers: env.SUPABASE_ANON_KEY
      ? { apikey: env.SUPABASE_ANON_KEY, Authorization: `Bearer ${env.SUPABASE_ANON_KEY}` }
      : {},
    cf: { cacheTtl: 600, cacheEverything: true },
  });
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=3600",
      "X-Served-By": "cf-worker-sitemap",
    },
  });
}

async function proxyCmsStorage(path) {
  const objectKey = CMS_STORAGE_PROXY_PATHS[path];
  const url = `https://${SUPABASE_PROJECT}.supabase.co/storage/v1/object/public/${CMS_STORAGE_BUCKET}/${objectKey}`;
  const upstream = await fetch(url, { cf: { cacheTtl: 600, cacheEverything: true } });
  const contentType = objectKey.endsWith(".xml") ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8";
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=600, s-maxage=3600",
      "X-Served-By": "cf-worker-cms-static",
    },
  });
}

function createOriginRequest(request) {
  const incomingUrl = new URL(request.url);
  const originBase = new URL(DEFAULT_LOVABLE_ORIGIN);
  const originUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, originBase);
  const headers = new Headers(request.headers);
  headers.set("Host", originBase.hostname);
  headers.set("X-Forwarded-Host", incomingUrl.hostname);
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Forwarded-Ssl", "on");
  headers.set("X-Url-Scheme", "https");

  return new Request(originUrl.toString(), {
    method: request.method,
    headers,
    body: request.body,
    redirect: "manual",
  });
}

async function fetchLovableOrigin(request) {
  const response = await fetch(createOriginRequest(request));
  const location = response.headers.get("Location");
  if (response.status >= 300 && response.status < 400 && location) {
    const requestUrl = new URL(request.url);
    const redirectUrl = new URL(location, requestUrl);
    if (redirectUrl.hostname === requestUrl.hostname && redirectUrl.pathname === requestUrl.pathname) {
      const headers = new Headers(response.headers);
      headers.delete("Location");
      headers.set("Cache-Control", "no-store");
      return new Response(null, { status: 204, headers });
    }
  }
  return response;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Canonical-host redirect: *.lovable.app → tokenhealthscan.com
    if (url.hostname.endsWith(".lovable.app")) {
      const target = `${SITE_URL}${url.pathname}${url.search}`;
      return Response.redirect(target, 301);
    }

    const path = normalizePath(url.pathname);

    // Static helpers — always pass through to origin (Lovable serves /robots.txt etc)
    if (path === "/sitemap.xml") {
      try { return await proxySitemap(env); } catch (_) { /* fallthrough */ }
    }

    if (CMS_STORAGE_PROXY_PATHS[path]) {
      try { return await proxyCmsStorage(path); } catch (_) { /* fallthrough */ }
    }

    // Only intercept GET HTML-ish requests
    if (request.method !== "GET" || !wantsHtml(request)) {
      return fetchLovableOrigin(request);
    }

    // Bots on a known route → snapshot
    if (isBot(request) && isKnownRoute(path)) {
      try {
        const snap = await serveSnapshot(path, env);
        if (snap) return snap;
      } catch (e) {
        console.error("Snapshot fetch failed:", e?.message);
      }
      // fall through to passthrough on snapshot failure
    }

    // Default: transparent passthrough to Lovable hosting
    return fetchLovableOrigin(request);
  },
};
