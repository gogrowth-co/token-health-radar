import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
import { checkRateLimit, createRateLimitError } from "../_shared/rateLimit.ts";
import { getClientIp } from "../_shared/authGuard.ts";
import { executePaidScan } from "../_shared/paidScan.ts";
import type { PaymentPayload } from "../_shared/x402.ts";

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
      "PAID, 0.02 USDC per call on Solana via x402 (no account or API key). Run a full health scan on a crypto token. Analyzes security, liquidity, tokenomics, community, and development across EVM chains and Solana. Returns a 0–100 score per dimension and an overall health score. Takes 5–20 seconds. Call without payment to receive the x402 PaymentRequired; retry with the signed payment in _meta[\"x402/payment\"]. USDC only moves after the scan succeeds.",
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

async function handleGetCachedScores(args: { address: string; chain: string }) {
  const chain_id = normalizeChain(args.chain);
  // The cache tables store every address lowercased, Solana mints included (run-token-scan restores the
  // exact case separately). Looking up a base58 mint in its original case never matched.
  const addr = args.address.trim().toLowerCase();

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

  // Same rule as the scanner (scoring v2): an overall needs security plus at least 3 of 5 scored dimensions.
  const validScores = Object.values(scores).filter((s): s is number => s !== null);
  const overall_score = scores.security !== null && validScores.length >= 3
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
    verdict: overall_score !== null ? generateVerdict(scores, overall_score) : 'Not scored: not enough verified data.',
  };
}


// x402 over MCP: https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/mcp.md
async function handlePaidScan(
  args: { address: string; chain: string },
  payment: PaymentPayload | null,
  ok: (result: any) => Response,
  err: (code: number, message: string) => Response,
) {
  const outcome = await executePaidScan({
    payment,
    channel: "mcp",
    input: { address: args.address, chain: args.chain },
    resource: {
      url: `mcp://tool/scan_token?chain=${encodeURIComponent(args.chain)}&address=${encodeURIComponent(args.address)}`,
      description: "Token Health Scan: 0-100 health score across security, liquidity, tokenomics, community and development",
      mimeType: "application/json",
      serviceName: "Token Health Scan",
      tags: ["token-risk", "security", "solana"],
    },
  });
  switch (outcome.kind) {
    case "invalid_input":
      return err(-32602, outcome.message);
    case "not_configured":
      return err(-32603, "x402 payments are not configured on this deployment");
    case "facilitator_down":
    case "ledger_error":
      return err(-32603, "Payment service unavailable, try again shortly");
    case "not_scored":
      return ok({
        isError: true,
        content: [{ type: "text", text: JSON.stringify({ error: "Not scored: not enough verified data for a verdict. You were not charged.", partial: outcome.result }, null, 2) }],
      });
    case "scan_failed":
      return err(-32603, `Scan failed. You were not charged. ${outcome.message}`);
    case "payment_required":
      // Per the x402 MCP transport spec (specs/transports-v2/mcp.md, "Payment Required Signaling") the
      // requirements go in structuredContent and, identically, in content[0].text. The official @x402/mcp
      // client reads structuredContent.
      return ok({
        isError: true,
        structuredContent: outcome.required,
        content: [{ type: "text", text: JSON.stringify(outcome.required) }],
      });
    case "ok":
      return ok({
        content: [{ type: "text", text: JSON.stringify({ ...outcome.result, payment: { transaction: outcome.settle.transaction, explorer: outcome.explorer } }, null, 2) }],
        _meta: { "x402/payment-response": outcome.settle },
      });
  }
}

// --- Main JSON-RPC 2.0 Router ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS_HEADERS });
  }

  // SECURITY: per-IP rate limit (this endpoint is intentionally public for MCP)
  const ip = getClientIp(req);
  const rl = await checkRateLimit({
    maxRequests: 60,
    windowSeconds: 3600,
    identifier: ip,
    namespace: "token-health-mcp",
  });
  if (!rl.allowed) return createRateLimitError(rl, CORS_HEADERS);

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
          return await handlePaidScan(args, params?._meta?.["x402/payment"] ?? null, ok, err);
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
