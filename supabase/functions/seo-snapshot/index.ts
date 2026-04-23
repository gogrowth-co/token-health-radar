/**
 * seo-snapshot — public endpoint that serves prerendered per-route HTML.
 *
 * GET /functions/v1/seo-snapshot?path=/token/aave
 *
 * 1. Look up `${path}/index.html` in the `seo-snapshots` Storage bucket.
 * 2. If found, stream it back with long-cache headers.
 * 3. If missing, build live from current data and serve (no write — that's
 *    `regenerate-seo-snapshot`'s job).
 *
 * Called by the Cloudflare Worker (workers/bot-prerender.js) when a known
 * crawler hits an allowlisted route.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  pathToStorageKey,
  renderStaticPage,
  renderTokenPage,
  renderAgentPage,
  STATIC_ROUTES,
  type TokenSnapshotInput,
} from "../_shared/seoHtml.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const HTML_HEADERS = {
  ...corsHeaders,
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
  "X-Robots-Tag": "index, follow",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function normalizePath(raw: string | null): string {
  if (!raw) return "/";
  let p = raw.trim();
  if (!p.startsWith("/")) p = "/" + p;
  // Strip query/hash
  p = p.split("?")[0].split("#")[0];
  // Collapse multiple slashes, remove trailing
  p = p.replace(/\/{2,}/g, "/").replace(/\/+$/, "") || "/";
  return p;
}

async function readSnapshot(path: string): Promise<string | null> {
  const key = pathToStorageKey(path);
  const { data, error } = await supabase.storage.from("seo-snapshots").download(key);
  if (error || !data) return null;
  return await data.text();
}

async function buildLiveTokenPage(symbol: string): Promise<string | null> {
  // Look up by token_symbol, fall back to address
  const sym = symbol.toLowerCase();
  const { data: report } = await supabase
    .from("token_reports")
    .select("*")
    .ilike("token_symbol", sym)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!report) return null;

  // Try to enrich with cached scores
  const { data: cache } = await supabase
    .from("token_data_cache")
    .select("*")
    .eq("token_address", (report.token_address || "").toLowerCase())
    .maybeSingle();

  const rc: any = report.report_content || {};
  const scores = rc?.scores || {};

  const input: TokenSnapshotInput = {
    symbol,
    name: report.token_name || cache?.name || symbol,
    address: report.token_address,
    chain: report.chain_id,
    overall_score: rc?.overall_score ?? null,
    security_score: scores?.security ?? null,
    liquidity_score: scores?.liquidity ?? null,
    tokenomics_score: scores?.tokenomics ?? null,
    community_score: scores?.community ?? null,
    development_score: scores?.development ?? null,
    ai_analysis: rc?.ai_analysis || rc?.summary || null,
    description: cache?.description || null,
    price_usd: cache?.current_price_usd ?? null,
    market_cap_usd: cache?.market_cap_usd ?? null,
    hero_image_url: rc?.hero_image_url || null,
    updated_at: report.updated_at,
  };

  return renderTokenPage(input);
}

async function buildLiveAgentPage(chain: string, agentId: string): Promise<string | null> {
  const { data } = await supabase
    .from("agent_scans")
    .select("*")
    .eq("chain", chain)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const raw: any = data.raw_data || {};
  const scores: any = data.scores || {};
  return renderAgentPage({
    chain,
    agentId,
    name: data.agent_name || raw?.agent?.name,
    description: raw?.agent?.description,
    trustScore: scores?.trust ?? scores?.overall ?? null,
  });
}

function esc(input: unknown): string {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function stripHtml(html: string | null): string {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function buildLiveCmsPage(slug: string): Promise<string | null> {
  const { data: translation } = await supabase
    .from("page_translations")
    .select("*, pages(*)")
    .eq("language", "en")
    .eq("slug", slug)
    .maybeSingle();

  if (!translation?.pages || (translation.pages as any).status !== "published") return null;

  const page: any = translation.pages;
  const canonical = `https://tokenhealthscan.com/publications/${encodeURIComponent(translation.slug || page.slug)}`;
  const title = translation.title || page.slug;
  const description = translation.meta_description || stripHtml(translation.content).slice(0, 155) || "Token Health Scan publication.";
  const image = page.featured_image || "https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png";
  const articleLd = translation.schema || {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    image,
    author: { "@type": "Organization", name: page.author_name || "Token Health Scan" },
    publisher: { "@type": "Organization", name: "Token Health Scan" },
    datePublished: page.created_at,
    dateModified: page.updated_at,
    mainEntityOfPage: canonical,
  };

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${esc(title)} | Token Health Scan</title><meta name="description" content="${esc(description)}"/><link rel="canonical" href="${esc(canonical)}"/><meta property="og:type" content="article"/><meta property="og:site_name" content="Token Health Scan"/><meta property="og:title" content="${esc(title)}"/><meta property="og:description" content="${esc(description)}"/><meta property="og:url" content="${esc(canonical)}"/><meta property="og:image" content="${esc(image)}"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${esc(title)}"/><meta name="twitter:description" content="${esc(description)}"/><meta name="twitter:image" content="${esc(image)}"/><script type="application/ld+json">${JSON.stringify(articleLd).replaceAll("<", "\\u003c")}</script></head><body><main><h1>${esc(title)}</h1><p>${esc(description)}</p>${translation.content || ""}</main></body></html>`;
}

async function buildLive(path: string): Promise<string | null> {
  // Token: /token/:symbol
  const tokenMatch = path.match(/^\/token\/([^\/]+)$/);
  if (tokenMatch) return buildLiveTokenPage(decodeURIComponent(tokenMatch[1]));

  // Agent scan: /agent-scan/:chain/:agentId
  const agentMatch = path.match(/^\/agent-scan\/([^\/]+)\/([^\/]+)$/);
  if (agentMatch) return buildLiveAgentPage(decodeURIComponent(agentMatch[1]), decodeURIComponent(agentMatch[2]));

  // CMS publication: /publications/:slug
  const cmsMatch = path.match(/^\/publications\/([^\/]+)$/);
  if (cmsMatch) return buildLiveCmsPage(decodeURIComponent(cmsMatch[1]));

  // Static
  if (STATIC_ROUTES.includes(path as any)) return renderStaticPage(path);

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const path = normalizePath(url.searchParams.get("path"));

    // 1. Try storage bucket
    const cached = await readSnapshot(path);
    if (cached) {
      return new Response(cached, {
        headers: { ...HTML_HEADERS, "X-Snapshot-Source": "bucket" },
      });
    }

    // 2. Build live
    const live = await buildLive(path);
    if (live) {
      return new Response(live, {
        headers: { ...HTML_HEADERS, "X-Snapshot-Source": "live" },
      });
    }

    // 3. Unknown route — return 404 so the Worker passes through to SPA
    return new Response(`<!DOCTYPE html><title>Not found</title>`, {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err) {
    console.error("[seo-snapshot] error:", err);
    return new Response(JSON.stringify({ error: String((err as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
