/**
 * regenerate-seo-snapshot — write per-route HTML into the `seo-snapshots`
 * Storage bucket so bots get first-byte HTML without a live build.
 *
 * Auth: requires either
 *   - Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *   - x-internal-secret: <INTERNAL_API_SECRET>
 *
 * Body:
 *   { kind: 'token',  symbol: 'aave' }
 *   { kind: 'agent',  chain: 'eip155:1', agentId: '0xabc' }
 *   { kind: 'static', path: '/pricing' }
 *   { kind: 'all-static' }
 *
 * Triggered by:
 *   - run-token-scan   (after a successful scan)
 *   - scan-agent       (after a successful agent scan)
 *   - regenerate-static-snapshots (cron)
 *   - admin one-off backfill
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
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

function isAuthorized(req: Request): boolean {
  const internal = req.headers.get("x-internal-secret");
  if (internal && internal === Deno.env.get("INTERNAL_API_SECRET")) return true;

  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "");
  if (token && token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return true;

  return false;
}

async function uploadHtml(path: string, html: string): Promise<void> {
  const key = pathToStorageKey(path);
  const { error } = await supabase.storage.from("seo-snapshots").upload(key, html, {
    upsert: true,
    contentType: "text/html; charset=utf-8",
    cacheControl: "300",
  });
  if (error) throw error;
}

async function regenStatic(path: string): Promise<string> {
  const html = renderStaticPage(path);
  if (!html) throw new Error(`Unknown static route: ${path}`);
  await uploadHtml(path, html);
  return path;
}

async function regenAllStatic(): Promise<string[]> {
  const out: string[] = [];
  for (const p of STATIC_ROUTES) {
    try {
      out.push(await regenStatic(p));
    } catch (e) {
      console.error(`[regen-static] ${p} failed:`, e);
    }
  }
  return out;
}

async function regenToken(symbol: string): Promise<string> {
  const sym = symbol.toLowerCase();
  const { data: report, error } = await supabase
    .from("token_reports")
    .select("*")
    .ilike("token_symbol", sym)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!report) throw new Error(`No token_reports row for ${sym}`);

  const { data: cache } = await supabase
    .from("token_data_cache")
    .select("*")
    .eq("token_address", (report.token_address || "").toLowerCase())
    .maybeSingle();

  const rc: any = report.report_content || {};
  const scores = rc?.scores || {};
  const input: TokenSnapshotInput = {
    symbol: sym,
    name: report.token_name || cache?.name || sym,
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

  const html = renderTokenPage(input);
  const path = `/token/${encodeURIComponent(sym)}`;
  await uploadHtml(path, html);
  return path;
}

async function regenAgent(chain: string, agentId: string): Promise<string> {
  const { data } = await supabase
    .from("agent_scans")
    .select("*")
    .eq("chain", chain)
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) throw new Error(`No agent_scans row for ${chain}/${agentId}`);
  const raw: any = data.raw_data || {};
  const scores: any = data.scores || {};
  const html = renderAgentPage({
    chain,
    agentId,
    name: data.agent_name || raw?.agent?.name,
    description: raw?.agent?.description,
    trustScore: scores?.trust ?? scores?.overall ?? null,
  });
  const path = `/agent-scan/${encodeURIComponent(chain)}/${encodeURIComponent(agentId)}`;
  await uploadHtml(path, html);
  return path;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const kind = body?.kind;

    let written: string | string[];
    if (kind === "token") {
      if (!body.symbol) throw new Error("symbol required");
      written = await regenToken(String(body.symbol));
    } else if (kind === "agent") {
      if (!body.chain || !body.agentId) throw new Error("chain and agentId required");
      written = await regenAgent(String(body.chain), String(body.agentId));
    } else if (kind === "static") {
      if (!body.path) throw new Error("path required");
      written = await regenStatic(String(body.path));
    } else if (kind === "all-static") {
      written = await regenAllStatic();
    } else {
      throw new Error(`Unknown kind: ${kind}`);
    }

    return new Response(JSON.stringify({ ok: true, written }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[regenerate-seo-snapshot] error:", err);
    return new Response(JSON.stringify({ ok: false, error: String((err as Error).message) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
