import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, Accept",
  "Content-Type": "application/json",
};

const SERVER_INFO = { name: "token-health-radar", version: "1.0.0" };
const CAPABILITIES = { tools: {} };

const TOOLS = [
  {
    name: "scan_token",
    description:
      "Run a full health scan on a crypto token. Analyzes security, liquidity, tokenomics, community, and development across EVM chains and Solana. Returns a 0–100 score per dimension and an overall health score. Takes 5–20 seconds.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Token contract address. EVM: 0x… format. Solana: Base58." },
        chain: {
          type: "string",
          description: "Chain name.",
          enum: ["ethereum", "polygon", "bsc", "arbitrum", "base", "solana"],
        },
      },
      required: ["address", "chain"],
    },
  },
  {
    name: "get_cached_scores",
    description:
      "Return the last known health scores for a token from the database cache. Fast (<500ms). Returns null if the token has never been scanned. Use scan_token to get fresh data.",
    inputSchema: {
      type: "object",
      properties: {
        address: { type: "string", description: "Token contract address." },
        chain: {
          type: "string",
          description: "Chain name.",
          enum: ["ethereum", "polygon", "bsc", "arbitrum", "base", "solana"],
        },
      },
      required: ["address", "chain"],
    },
  },
];

function normalizeChain(chain: string): string {
  const map: Record<string, string> = {
    ethereum: "0x1", eth: "0x1", "1": "0x1",
    polygon: "0x89", matic: "0x89", "137": "0x89",
    bsc: "0x38", binance: "0x38", "56": "0x38",
    arbitrum: "0xa4b1", "42161": "0xa4b1",
    base: "0x2105", "8453": "0x2105",
    solana: "solana", sol: "solana",
  };
  return map[chain.toLowerCase()] ?? "0x1";
}

function isSolana(chain: string): boolean {
  return ["solana", "sol"].includes(chain.toLowerCase());
}

function generateVerdict(scores: Record<string, number | null>, overall: number): string {
  const level =
    overall >= 80 ? "Healthy token"
    : overall >= 60 ? "Moderate risk token"
    : overall >= 40 ? "Elevated risk token"
    : "High risk token";

  const valid = Object.entries(scores).filter(([, v]) => v !== null && v !== undefined) as [string, number][];
  const weakest = valid.sort(([, a], [, b]) => a - b)[0];
  const weakStr = weakest ? ` Weakest dimension: ${weakest[0]} at ${weakest[1]}/100.` : "";

  return `${level} (${overall}/100).${weakStr}`;
}

async function handleScanToken(args: { address: string; chain: string }) {
  const chain_id = normalizeChain(args.chain);
  const address = isSolana(args.chain) ? args.address : args.address.toLowerCase();
  const start = Date.now();

  const res = await fetch(
    `${Deno.env.get("SUPABASE_URL")}/functions/v1/run-token-scan`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ token_address: address, chain_id, user_id: null, force_refresh: false }),
    },
  );

  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.error ?? `Scan failed (HTTP ${res.status})`);
  }

  return {
    name: data.token_name,
    symbol: data.token_symbol,
    address,
    chain: args.chain,
    overall_score: data.overall_score,
    scores: data.scores,
    verdict: generateVerdict(data.scores ?? {}, data.overall_score ?? 0),
    scan_duration_ms: Date.now() - start,
  };
}

async function handleGetCachedScores(args: { address: string; chain: string }) {
  const chain_id = normalizeChain(args.chain);
  const addr = isSolana(args.chain) ? args.address : args.address.toLowerCase();

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const [dataCache, secCache, liqCache, tokCache, comCache, devCache] = await Promise.all([
    supabase.from("token_data_cache").select("name, symbol, created_at").eq("token_address", addr).eq("chain_id", chain_id).maybeSingle(),
    supabase.from("token_security_cache").select("score, updated_at").eq("token_address", addr).eq("chain_id", chain_id).maybeSingle(),
    supabase.from("token_liquidity_cache").select("score, updated_at").eq("token_address", addr).eq("chain_id", chain_id).maybeSingle(),
    supabase.from("token_tokenomics_cache").select("score, updated_at").eq("token_address", addr).eq("chain_id", chain_id).maybeSingle(),
    supabase.from("token_community_cache").select("score, updated_at").eq("token_address", addr).eq("chain_id", chain_id).maybeSingle(),
    supabase.from("token_development_cache").select("score, updated_at").eq("token_address", addr).eq("chain_id", chain_id).maybeSingle(),
  ]);

  if (!dataCache.data) {
    return { cached: false, message: "Token has never been scanned. Use scan_token to get fresh data." };
  }

  const scores: Record<string, number | null> = {
    security: secCache.data?.score ?? null,
    liquidity: liqCache.data?.score ?? null,
    tokenomics: tokCache.data?.score ?? null,
    community: comCache.data?.score ?? null,
    development: devCache.data?.score ?? null,
  };

  const validScores = Object.values(scores).filter((s): s is number => s !== null);
  const overall_score = validScores.length
    ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
    : null;

  const timestamps = [secCache, liqCache, tokCache, comCache, devCache]
    .map((c) => c.data?.updated_at)
    .filter(Boolean) as string[];
  const last_scanned_at = timestamps.length ? timestamps.sort().pop()! : dataCache.data.created_at;
  const cache_age_hours = last_scanned_at
    ? Math.round((Date.now() - new Date(last_scanned_at).getTime()) / 3600000)
    : null;

  return {
    cached: true,
    name: dataCache.data.name,
    symbol: dataCache.data.symbol,
    address: args.address,
    chain: args.chain,
    overall_score,
    scores,
    last_scanned_at,
    cache_age_hours,
    verdict: overall_score ? generateVerdict(scores, overall_score) : null,
  };
}

// --- Main JSON-RPC 2.0 Router ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS_HEADERS });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }),
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { method, params, id } = body;

  const ok = (result: any) =>
    new Response(JSON.stringify({ jsonrpc: "2.0", result, id }), { headers: CORS_HEADERS });

  const err = (code: number, message: string) =>
    new Response(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id }), { headers: CORS_HEADERS });

  try {
    switch (method) {
      case "initialize":
        return ok({
          protocolVersion: "2024-11-05",
          serverInfo: SERVER_INFO,
          capabilities: CAPABILITIES,
        });

      case "notifications/initialized":
        return new Response(null, { status: 204, headers: CORS_HEADERS });

      case "tools/list":
        return ok({ tools: TOOLS });

      case "tools/call": {
        const { name, arguments: args } = params ?? {};

        if (!name || !args) return err(-32602, "Missing tool name or arguments");

        let toolResult: any;
        if (name === "scan_token") {
          toolResult = await handleScanToken(args);
        } else if (name === "get_cached_scores") {
          toolResult = await handleGetCachedScores(args);
        } else {
          return err(-32601, `Unknown tool: ${name}`);
        }

        return ok({ content: [{ type: "text", text: JSON.stringify(toolResult, null, 2) }] });
      }

      default:
        return err(-32601, `Method not found: ${method}`);
    }
  } catch (e: any) {
    console.error("[token-health-mcp] Error:", e);
    return err(-32603, e?.message ?? "Internal error");
  }
});
