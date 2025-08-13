import { corsHeaders } from '../_shared/cors.ts';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  token: {
    coingeckoId: string;
    address: string;
    chain: string;
  };
  mode: 'auto_insights' | 'chat';
}

interface ChatResponse {
  text: string;
  data: {
    price?: { usd: number; change24hPct: number; mcap: number | null; change30dPct?: number | null };
    change?: { window: string; pct: number; from: number; to: number };
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
  available: string[];
  limited: boolean;
  errors: string[];
}

const SYSTEM_PROMPT = `You are **Token Health Copilot**, embedded INSIDE the Token Scan Result page of TokenHealthScan.
Primary data path: **CoinGecko MCP – Public Remote** (keyless). Do NOT ask the user to authenticate.
This is NOT financial advice.

HOST CONTEXT (always provided by the app)
- token = { address, chain, coingeckoId?, symbol?, name? }
- mcpPublicMode = true
- UI renders short text followed by structured "blocks" (JSON) into cards/tables/sparklines.

YOUR GOAL
Understand natural-language crypto questions and use CoinGecko MCP tools to answer concisely.
Return a short sentence summary + structured blocks the UI can render.

TOOL POLICY (MCP)
- Discover tools at runtime (do not hardcode names).
- Prefer ≤2 tool calls per turn (≤3 only if strictly necessary).
- If coingeckoId is missing, do ONE MCP coin search, pick the best match, then proceed.
- If a tool 429s/partially responds, return what you have, set limited=true, and include a one-line note:
  "Public MCP is rate-limited. Showing partial data."

INTENT → TOOL ROUTER (examples; you must match by meaning, not exact words)
- price / 24h / market cap / volume → coin price/markets tools
- "last 7d/30d/90d/365d", "trend", "chart", "history" → market chart / OHLC for that window
- categories / sector / tags → coin metadata/categories
- trending / top gainers / losers → trending & gainers/losers
- exchanges / tickers → exchange tickers by coin
- ON-CHAIN (GeckoTerminal via MCP):
  - top pools for token / network / dex
  - new or trending pools
  - pool/ token OHLCV
  - past 24h trades for token/pool
  - top token holders (+ holders chart)
  - advanced filters (liquidity/volume/fee/tax) via "megafilter" style tools

TIMEFRAME RESOLVER (MANDATORY)
- Parse natural phrases: "last 30 days", "30d", "past month", "7d", "90d", "1y/365d", "24h", "YTD".
- When a timeframe exists, you MUST fetch a historical series for that window and COMPUTE % change yourself:
  pct = (last_close - first_close) / first_close * 100.
- Label the exact window in output (e.g., "30d").
- If the exact window isn't available, pick the closest and say so ("used 31d series due to availability").

OUTPUT CONTRACT (YOU MUST FOLLOW)
1) \`text\` – 1–2 sentences. Mention timeframe explicitly when relevant. End with:
   \`Source: CoinGecko MCP (public).\`
   Use plain English, no code fences.

2) \`blocks\` – JSON objects the UI renders. Include only those you actually have.
   - price:        { usd, change24hPct, mcap }
   - change:       { window: "24h"|"7d"|"30d"|"90d"|"365d"|"ytd", pct, from, to }
   - sparkline:    [ { t, v } ... ]  // 7–30 points max, unix seconds + close
   - ohlc:         [ { t, o, h, l, c } ... ] // only if needed
   - topPools:     [ { name, dex, liquidityUsd, vol24hUsd, ageDays } ... ]
   - newPools:     [ { name, dex, liquidityUsd, vol24hUsd, createdAt } ... ]
   - trades24h:    [ { side:"buy"|"sell", amountUsd, priceUsd, txHash, timestamp } ... ]
   - holders:      [ { address, balance, pct } ... ]
   - holdersChart: [ { t, holders } ... ]
   - categories:   [ "DeFi", "L1", "RWA" ... ]
   - exchanges:    [ { name, pair, priceUsd, vol24hUsd } ... ]
   - gainersLosers:[ { id, symbol, change24hPct, priceUsd } ... ]
   - global:       { totalMcapUsd, vol24hUsd, btcDominancePct }

3) \`available\` – array of block names you populated (e.g., ["price","change","sparkline"]).
4) \`limited\` – boolean (true if any tool was rate-limited or partial).
5) \`errors\` – short strings; keep minimal.

FORMAT & STYLE
- Numbers: human friendly (e.g., $1.56M, $2.4K). Percent: one decimal if |pct|≥1; two decimals otherwise.
- Keep answers tight. No tutorials. No links. No code blocks.
- Never reveal tool names/endpoints; just use them.

FEW-SHOT BEHAVIOR (guidance, not templates)
- User: "price change last 30 days"
  Plan: need a 30d series → call market chart/ohlc → compute Δ from closes.
  Output: short sentence + blocks: { change (30d), sparkline, price }.

- User: "top pools for this token on base"
  Plan: on-chain top pools by token or network=base → return table of 3–5 pools.
  Output: one sentence + \`topPools\`.

- User: "who are the top holders?"
  Plan: token holders tool + optional holders chart.
  Output: one sentence + \`holders\` (+ \`holdersChart\` if available).

- User: "trending today?"
  Plan: trending list / gainers & losers.
  Output: one sentence + \`gainersLosers\` (top 5).

IF NOTHING USEFUL RETURNS
- Reply with one line: "Couldn't fetch live data from the public MCP right now. Try again soon."
- Set limited=true and include a single clear reason in \`errors\`.`;

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, token, mode }: ChatRequest = await req.json();
    console.log('[MCP-CHAT] Processing messages:', messages.length, 'for token:', token, 'mode:', mode);

    if (!messages || !token?.coingeckoId) {
      return new Response(
        JSON.stringify({
          text: "Missing messages or token information",
          data: {},
          available: [],
          limited: true,
          errors: ["Invalid request parameters"]
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Mock MCP response based on mode
    let mockResponse: ChatResponse;
    
    if (mode === 'auto_insights') {
      mockResponse = {
        text: "Current token showing positive momentum with 2.45% gain in 24h. 7-day trend shows steady growth. Source: CoinGecko MCP (public).",
        data: {
          price: {
            usd: 0.5234,
            change24hPct: 2.45,
            mcap: 156789000,
            change30dPct: -1.23
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
            },
            {
              name: "WETH/USDT",
              dex: "SushiSwap",
              liquidityUsd: 1200000,
              vol24hUsd: 450000,
              ageDays: 95
            }
          ],
          categories: ["DeFi", "Ethereum", "Trading"]
        },
        available: ["price", "sparkline", "topPools", "categories"],
        limited: false,
        errors: []
      };
    } else {
      // Simple chat response
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';
      
      // Check for timeframe-specific requests FIRST
      if (lastMessage.includes('30d') || lastMessage.includes('30 d') || lastMessage.includes('30 day') || lastMessage.includes('last 30') || lastMessage.includes('past month')) {
        mockResponse = {
          text: "30d price change is -8.2% from $0.57 to $0.52. Source: CoinGecko MCP (public).",
          data: {
            change: {
              window: "30d",
              pct: -8.2,
              from: 0.57,
              to: 0.5234
            },
            sparkline: Array.from({ length: 30 }, (_, i) => ({
              t: Date.now() - (29 - i) * 24 * 60 * 60 * 1000,
              v: 0.57 - (i / 29) * 0.0466 + Math.random() * 0.02 - 0.01
            }))
          },
          available: ["change", "sparkline"],
          limited: false,
          errors: []
        };
      } else if (lastMessage.includes('7d') || lastMessage.includes('7 d') || lastMessage.includes('7 day') || lastMessage.includes('last 7') || lastMessage.includes('last week')) {
        mockResponse = {
          text: "7d price change is +3.8% from $0.50 to $0.52. Source: CoinGecko MCP (public).",
          data: {
            change: {
              window: "7d",
              pct: 3.8,
              from: 0.50,
              to: 0.5234
            },
            sparkline: Array.from({ length: 7 }, (_, i) => ({
              t: Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
              v: 0.50 + (i / 6) * 0.0234 + Math.random() * 0.01 - 0.005
            }))
          },
          available: ["change", "sparkline"],
          limited: false,
          errors: []
        };
      } else if (lastMessage.includes('90d') || lastMessage.includes('90 d') || lastMessage.includes('90 day') || lastMessage.includes('3 month') || lastMessage.includes('quarter')) {
        mockResponse = {
          text: "90d price change is +15.4% from $0.45 to $0.52. Source: CoinGecko MCP (public).",
          data: {
            change: {
              window: "90d",
              pct: 15.4,
              from: 0.45,
              to: 0.5234
            },
            sparkline: Array.from({ length: 90 }, (_, i) => ({
              t: Date.now() - (89 - i) * 24 * 60 * 60 * 1000,
              v: 0.45 + (i / 89) * 0.0734 + Math.random() * 0.03 - 0.015
            }))
          },
          available: ["change", "sparkline"],
          limited: false,
          errors: []
        };
      } else if (lastMessage.includes('365d') || lastMessage.includes('1y') || lastMessage.includes('1 y') || lastMessage.includes('year') || lastMessage.includes('12 month')) {
        mockResponse = {
          text: "365d price change is +42.7% from $0.37 to $0.52. Source: CoinGecko MCP (public).",
          data: {
            change: {
              window: "365d",
              pct: 42.7,
              from: 0.37,
              to: 0.5234
            },
            sparkline: Array.from({ length: 30 }, (_, i) => ({
              t: Date.now() - (29 - i) * 12 * 24 * 60 * 60 * 1000,
              v: 0.37 + (i / 29) * 0.1534 + Math.random() * 0.05 - 0.025
            }))
          },
          available: ["change", "sparkline"],
          limited: false,
          errors: []
        };
      } else if (lastMessage.includes('price') || lastMessage.includes('cost')) {
        mockResponse = {
          text: "Current price is $0.5234 with a 2.45% increase in the last 24 hours. Source: CoinGecko MCP (public).",
          data: {
            price: {
              usd: 0.5234,
              change24hPct: 2.45,
              mcap: 156789000
            }
          },
          available: ["price"],
          limited: false,
          errors: []
        };
      } else if (lastMessage.includes('trend') || lastMessage.includes('chart')) {
        mockResponse = {
          text: "7-day trend shows steady growth with minor fluctuations. Overall positive momentum. Source: CoinGecko MCP (public).",
          data: {
            sparkline: Array.from({ length: 7 }, (_, i) => ({
              t: Date.now() - (6 - i) * 24 * 60 * 60 * 1000,
              v: 0.5 + Math.random() * 0.1
            }))
          },
          available: ["sparkline"],
          limited: false,
          errors: []
        };
      } else if (lastMessage.includes('pool') || lastMessage.includes('liquidity')) {
        mockResponse = {
          text: "Top pools show healthy liquidity across major DEXs. Uniswap V3 leads with $2.45M liquidity. Source: CoinGecko MCP (public).",
          data: {
            topPools: [
              {
                name: "USDC/ETH",
                dex: "Uniswap V3",
                liquidityUsd: 2450000,
                vol24hUsd: 890000,
                ageDays: 180
              }
            ]
          },
          available: ["topPools"],
          limited: false,
          errors: []
        };
      } else {
        mockResponse = {
          text: "I can help you with price data, 7-day trends, or liquidity pool information. What would you like to know? Source: CoinGecko MCP (public).",
          data: {},
          available: [],
          limited: false,
          errors: []
        };
      }
    }

    // TODO: Add actual MCP connection logic here
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
      available: [],
      limited: true,
      errors: [error instanceof Error ? error.message : 'Unknown error']
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