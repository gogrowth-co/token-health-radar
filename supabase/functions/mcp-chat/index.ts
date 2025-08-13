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
  available: string[];
  limited: boolean;
  errors: string[];
}

const SYSTEM_PROMPT = `You are Token Health Copilot inside the Token Scan Result page.
Primary data path: CoinGecko MCP public remote. Do not ask the user to authenticate. Not financial advice.

Host context:
- token = { address, chain, coingeckoId?, symbol?, name? }
- mcpPublicMode = true

Tool policy:
1) Discover tools from the MCP server at runtime; do not hardcode names.
2) For "auto_insights", fetch price (USD + 24h%), a 7d price series (for a sparkline), top pools/liquidity, and categories/tags.
3) For chat:
   - price/mcap/24h -> price/markets tool
   - 7d/30d/trend/chart -> OHLC/market_chart and compute % from closes if needed
   - categories/sector/tags -> metadata
   - if coingeckoId missing -> search once, pick best result, proceed
4) If any tool is rate-limited or partial, continue with what's available, set limited=true, and add one short line: "Public MCP is rate-limited. Showing partial data."

Answer style:
- 1–2 sentences, then compact JSON-like blocks the UI can render (price, sparkline, topPools, categories).
- Always state timeframe (now, last 7d, last 30d). If % is computed, note "computed from OHLC".
- End with "Source: CoinGecko MCP (public)."`;

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
      
      if (lastMessage.includes('price') || lastMessage.includes('cost')) {
        mockResponse = {
          text: "Current price is $0.5234 with a 2.45% increase in the last 24 hours. Source: CoinGecko MCP (public).",
          data: {
            price: {
              usd: 0.5234,
              change24hPct: 2.45,
              mcap: 156789000,
              change30dPct: null
            }
          },
          available: ["price"],
          limited: false,
          errors: []
        };
      } else if (lastMessage.includes('trend') || lastMessage.includes('chart') || lastMessage.includes('7d')) {
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