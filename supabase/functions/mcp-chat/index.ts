import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface ChatRequest {
  query: string;
  token: {
    coingeckoId: string;
    address: string;
    chain: string;
  };
}

interface ChatResponse {
  text: string;
  data: {
    price?: { usd: number; change24hPct: number; mcap: number | null; change30dPct: number | null };
    sparkline?: Array<{ t: number; v: number }>;
    topPools?: Array<{
      name: string;
      dex: string;
      liquidityUsd: number;
      vol24hUsd: number;
      ageDays: number;
    }>;
    categories?: string[];
  };
  limited: boolean;
  errors: string[];
  telemetry: {
    attempted: string[];
    succeeded: string[];
    toolErrors: string[];
  };
}

const SYSTEM_PROMPT = `You are Token Health Copilot inside the Token Scan Result page of Token Health Scan.
Primary data path is the CoinGecko MCP public remote server. Use MCP tools to answer.
Do not ask the user to authenticate. This is not financial advice.

Context from the host app:
- token: { address, chain, coingeckoId?, symbol?, name? }
- mcpPublicMode: true

Tool policy:
1) Discover tools at runtime from the MCP server. Do not hardcode tool names.
2) On page load (auto_insights), fetch:
   - Price in USD and 24h change
   - 7 day price series for a sparkline (OHLC or market_chart)
   - Top pools/liquidity if available
   - Categories/tags
3) During chat, map intents to minimal calls:
   - price/mcap/24h -> simple price or markets
   - 7d/30d/trend/chart -> market_chart or OHLC and compute % change locally if needed
   - categories/sector/tags -> coin metadata
   - if coingeckoId missing -> search once, pick best match, then proceed
4) If a tool returns rate limit or partials:
   - Return what you have, set limited=true, and add a short line: "Public MCP is rate-limited. Showing partial data."
   - Do not retry more than once per tool in the same turn.

Answer style:
- Be succinct: one or two sentences plus compact JSON-like blocks the UI can render.
- Always indicate the time frame: now, last 7d, last 30d.
- If you computed a % yourself, note "computed from OHLC".
- End with: "Source: CoinGecko MCP (public)."

Telemetry for the host (attach silently):
__telemetry__: { source: "coingecko-mcp-public", attempted: [...], succeeded: [...], limited: boolean }

If nothing useful can be fetched:
- Say: "Couldn't fetch live data from the public MCP right now. Try again soon."`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, token }: ChatRequest = await req.json();
    console.log('[MCP-CHAT] Processing query:', query, 'for token:', token);

    if (!query || !token?.coingeckoId) {
      return new Response(
        JSON.stringify({
          text: "Missing query or token information",
          data: {},
          limited: true,
          errors: ["Invalid request parameters"],
          telemetry: { attempted: [], succeeded: [], toolErrors: [] }
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // For now, use simplified mock data structure
    // In production, this would connect to CoinGecko MCP server
    const mockResponse: ChatResponse = {
      text: "Fetching live data from CoinGecko MCP...",
      data: {
        price: {
          usd: 0.5234,
          change24hPct: 2.45,
          mcap: 156789000,
          change30dPct: null
        },
        sparkline: Array.from({ length: 7 }, (_, i) => ({
          t: Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
          v: 0.5 + Math.random() * 0.1
        })),
        topPools: [
          {
            name: "USDC/ETH",
            dex: "Uniswap V3",
            liquidityUsd: 2450000,
            vol24hUsd: 890000,
            ageDays: 180
          }
        ],
        categories: ["DeFi", "Ethereum", "Trading"]
      },
      limited: false,
      errors: [],
      telemetry: {
        attempted: ["price", "market_chart", "pools", "categories"],
        succeeded: ["price", "pools", "categories"],
        toolErrors: ["market_chart: rate limited"]
      }
    };

    // Add actual MCP connection logic here
    // For now, return mock data with proper structure

    return new Response(
      JSON.stringify(mockResponse),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[MCP-CHAT] Error:', error);
    
    const errorResponse: ChatResponse = {
      text: "Couldn't fetch live data from the public MCP right now. Try again soon.",
      data: {},
      limited: true,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      telemetry: { attempted: [], succeeded: [], toolErrors: [error?.toString() || 'Unknown error'] }
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});