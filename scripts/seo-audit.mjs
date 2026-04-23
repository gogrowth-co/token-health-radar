#!/usr/bin/env node
/**
 * SEO/AEO audit harness — curl every key route with representative bot UAs
 * and assert the response contains route-specific <title>, canonical, JSON-LD,
 * and OG/Twitter image tags.
 *
 * Usage:
 *   node scripts/seo-audit.mjs                 # against production
 *   BASE_URL=https://example.com node scripts/seo-audit.mjs
 */

const BASE_URL = process.env.BASE_URL || "https://tokenhealthscan.com";

const ROUTES = [
  "/",
  "/pricing",
  "/token-scan-guide",
  "/token-sniffer-comparison",
  "/solana-launchpads",
  "/ethereum-launchpads",
  "/ai-agents",
  "/agent-directory",
  "/copilot",
];

// Add a token route if a TOKEN_SYMBOL env var is set (e.g. TOKEN_SYMBOL=aave)
if (process.env.TOKEN_SYMBOL) ROUTES.push(`/token/${process.env.TOKEN_SYMBOL}`);

const BOTS = [
  ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
  ["GPTBot", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.0; +https://openai.com/gptbot"],
  ["PerplexityBot", "Mozilla/5.0 (compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot)"],
  ["ClaudeBot", "Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)"],
  ["facebookexternalhit", "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"],
  ["Twitterbot", "Twitterbot/1.0"],
];

function check(html, route) {
  const checks = {
    has_title: /<title>[^<]+<\/title>/i.test(html),
    has_canonical: /<link[^>]+rel=["']canonical["']/i.test(html),
    has_og_image: /<meta[^>]+property=["']og:image["']/i.test(html),
    has_twitter_image: /<meta[^>]+name=["']twitter:image["']/i.test(html),
    has_jsonld: /<script[^>]+type=["']application\/ld\+json["']/i.test(html),
    has_h1: /<h1[\s>]/i.test(html),
    body_size_ok: html.length > 2000,
  };
  return checks;
}

function statusEmoji(checks) {
  return Object.values(checks).every(Boolean) ? "✅" : "❌";
}

const results = [];

for (const route of ROUTES) {
  for (const [botName, ua] of BOTS) {
    const url = BASE_URL + route;
    let entry = { route, bot: botName, status: "?", checks: {} };
    try {
      const res = await fetch(url, { headers: { "User-Agent": ua, Accept: "text/html" } });
      const html = await res.text();
      entry.status = res.status;
      entry.checks = check(html, route);
      entry.size = html.length;
    } catch (err) {
      entry.error = err.message;
    }
    results.push(entry);
    console.log(`${statusEmoji(entry.checks)} ${botName.padEnd(20)} ${String(entry.status).padEnd(4)} ${route}  (${entry.size || 0}b)`);
  }
}

const failed = results.filter((r) => !Object.values(r.checks).every(Boolean));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  console.log("\nFailures:");
  for (const f of failed) {
    const missing = Object.entries(f.checks).filter(([, v]) => !v).map(([k]) => k);
    console.log(`  ${f.bot} ${f.route} → missing: ${missing.join(", ") || f.error || "?"}`);
  }
  process.exit(1);
}
