import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const PAGE_SIZE = 20;
const SUPPORTED_CHAINS: Record<string, number> = {
  base: 8453,
  ethereum: 1,
  polygon: 137,
  arbitrum: 42161,
};

interface RequestParams {
  chain: string;
  page: number;
  query: string;
}

interface AgentEntry {
  agentId: string;
  chain: string;
  name: string;
  imageUrl?: string;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getRequestParams(req: Request): Promise<RequestParams> {
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    return normalizeParams(body);
  }

  const url = new URL(req.url);
  return normalizeParams({
    chain: url.searchParams.get("chain"),
    page: url.searchParams.get("page"),
    q: url.searchParams.get("q"),
    query: url.searchParams.get("query"),
  });
}

function normalizeParams(input: Record<string, unknown>): RequestParams {
  const chain = typeof input.chain === "string" ? input.chain.toLowerCase() : "base";
  const rawPage = Number(input.page);
  const page = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const queryValue = typeof input.q === "string"
    ? input.q
    : typeof input.query === "string"
      ? input.query
      : "";

  return {
    chain,
    page,
    query: queryValue.trim(),
  };
}

function isSupportedChain(chain: string) {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_CHAINS, chain);
}

function matchesRequestedChain(item: Record<string, unknown>, chain: string) {
  const expectedChainId = SUPPORTED_CHAINS[chain];
  const chainId = Number(item.chain_id);
  const isTestnet = item.is_testnet === true;
  return chainId === expectedChainId && !isTestnet;
}

function toAgentEntry(item: Record<string, unknown>, chain: string): AgentEntry | null {
  const agentId = String(item.token_id ?? item.tokenId ?? "").trim();
  const name = typeof item.name === "string" ? item.name.trim() : "";

  if (!agentId || !name) {
    return null;
  }

  const imageUrl = typeof item.image_url === "string" ? item.image_url : undefined;

  return {
    agentId,
    chain,
    name,
    imageUrl,
  };
}

async function fetchAgents(chain: string, query: string) {
  const params = new URLSearchParams({ chain });
  const endpoint = query
    ? `https://8004scan.io/api/v1/agents?${new URLSearchParams({ chain, search: query }).toString()}`
    : `https://8004scan.io/api/v1/agents/latest?${params.toString()}`;

  console.log(`[fetch-agent-directory] Fetching ${endpoint}`);

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "TokenHealthScan/1.0",
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`8004scan API ${response.status}: ${errorText.slice(0, 200)}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];

  const deduped = new Map<string, AgentEntry>();

  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    if (!matchesRequestedChain(item as Record<string, unknown>, chain)) continue;

    const agent = toAgentEntry(item as Record<string, unknown>, chain);
    if (!agent) continue;

    const key = `${agent.chain}-${agent.agentId}`;
    if (!deduped.has(key)) {
      deduped.set(key, agent);
    }
  }

  return Array.from(deduped.values());
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  if (!["GET", "POST"].includes(req.method)) {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { chain, page, query } = await getRequestParams(req);

    if (!isSupportedChain(chain)) {
      return jsonResponse({ error: "Unsupported chain" }, 400);
    }

    if (query.length > 100) {
      return jsonResponse({ error: "Search query is too long" }, 400);
    }

    const agents = await fetchAgents(chain, query);
    const start = (page - 1) * PAGE_SIZE;
    const pagedAgents = agents.slice(start, start + PAGE_SIZE);

    return jsonResponse({
      agents: pagedAgents,
      total: agents.length,
      page,
      pageSize: PAGE_SIZE,
      totalPages: Math.max(1, Math.ceil(agents.length / PAGE_SIZE)),
    });
  } catch (error) {
    console.error("[fetch-agent-directory] Error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});
