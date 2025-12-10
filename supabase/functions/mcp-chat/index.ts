import { corsHeaders } from '../_shared/cors.ts';

interface ChatMessage {
  role: 'user' | 'assistant';
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

// Parse user intent from message
function parseIntent(message: string): { type: string; window?: string } {
  const lower = message.toLowerCase();
  
  // Check for timeframe-specific requests
  if (lower.includes('365d') || lower.includes('1y') || lower.includes('1 y') || lower.includes('year')) {
    return { type: 'chart', window: '365' };
  }
  if (lower.includes('90d') || lower.includes('90 d') || lower.includes('3 month') || lower.includes('quarter')) {
    return { type: 'chart', window: '90' };
  }
  if (lower.includes('30d') || lower.includes('30 d') || lower.includes('30 day') || lower.includes('month')) {
    return { type: 'chart', window: '30' };
  }
  if (lower.includes('7d') || lower.includes('7 d') || lower.includes('week') || lower.includes('7 day')) {
    return { type: 'chart', window: '7' };
  }
  if (lower.includes('24h') || lower.includes('today') || lower.includes('1d')) {
    return { type: 'chart', window: '1' };
  }
  
  // Check for specific intents
  if (lower.includes('pool') || lower.includes('liquidity') || lower.includes('dex')) {
    return { type: 'pools' };
  }
  if (lower.includes('trend') || lower.includes('chart') || lower.includes('history')) {
    return { type: 'chart', window: '7' };
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('worth')) {
    return { type: 'price' };
  }
  if (lower.includes('categor') || lower.includes('sector') || lower.includes('type')) {
    return { type: 'metadata' };
  }
  
  // Default to price
  return { type: 'price' };
}

// Fetch price data from CoinGecko
async function fetchPrice(coingeckoId: string): Promise<{ usd: number; change24hPct: number; mcap: number | null } | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const tokenData = data[coingeckoId];
    if (!tokenData) return null;
    return {
      usd: tokenData.usd || 0,
      change24hPct: tokenData.usd_24h_change || 0,
      mcap: tokenData.usd_market_cap || null
    };
  } catch (err) {
    console.log('[MCP-CHAT] Price fetch failed:', err);
    return null;
  }
}

// Fetch OHLC chart data from CoinGecko
async function fetchOHLC(coingeckoId: string, days: string): Promise<Array<{ t: number; v: number }> | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}/ohlc?vs_currency=usd&days=${days}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    
    // Return closing prices as sparkline
    return data.map(([t, , , , c]: [number, number, number, number, number]) => ({
      t: Math.floor(t / 1000),
      v: c
    }));
  } catch (err) {
    console.log('[MCP-CHAT] OHLC fetch failed:', err);
    return null;
  }
}

// Fetch pools from GeckoTerminal
async function fetchPools(address: string, chain: string): Promise<Array<{
  name: string;
  dex: string;
  liquidityUsd: number;
  vol24hUsd: number;
  ageDays: number;
}> | null> {
  try {
    // Map chain to GeckoTerminal network ID
    const networkMap: Record<string, string> = {
      'eth': 'eth',
      '0x1': 'eth',
      'polygon': 'polygon_pos',
      '0x89': 'polygon_pos',
      'bsc': 'bsc',
      '0x38': 'bsc',
      'arbitrum': 'arbitrum',
      '0xa4b1': 'arbitrum',
      'base': 'base',
      '0x2105': 'base',
      'optimism': 'optimism',
      '0xa': 'optimism'
    };
    
    const network = networkMap[chain.toLowerCase()] || 'eth';
    
    const res = await fetch(
      `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${address}/pools?page=1`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    if (!data.data || !Array.isArray(data.data)) return null;
    
    return data.data.slice(0, 5).map((pool: any) => ({
      name: pool.attributes?.name || 'Unknown',
      dex: pool.relationships?.dex?.data?.id || 'Unknown',
      liquidityUsd: parseFloat(pool.attributes?.reserve_in_usd || '0'),
      vol24hUsd: parseFloat(pool.attributes?.volume_usd?.h24 || '0'),
      ageDays: pool.attributes?.pool_created_at 
        ? Math.floor((Date.now() - new Date(pool.attributes.pool_created_at).getTime()) / 86400000)
        : 0
    }));
  } catch (err) {
    console.log('[MCP-CHAT] Pools fetch failed:', err);
    return null;
  }
}

// Fetch token metadata (categories) from CoinGecko
async function fetchMetadata(coingeckoId: string): Promise<string[] | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    
    if (data.categories && Array.isArray(data.categories)) {
      return data.categories.filter(Boolean).slice(0, 5);
    }
    return null;
  } catch (err) {
    console.log('[MCP-CHAT] Metadata fetch failed:', err);
    return null;
  }
}

// Format number for display
function formatNumber(num: number): string {
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

// Format percentage for display
function formatPct(pct: number): string {
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, token, mode }: ChatRequest = await req.json();
    console.log('[MCP-CHAT] Request:', { messageCount: messages?.length, token: token?.coingeckoId, mode });

    if (!messages || !token?.coingeckoId) {
      return new Response(
        JSON.stringify({
          text: "Missing token information. Please select a token first.",
          data: {},
          available: [],
          limited: false,
          errors: ["Invalid request"]
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response: ChatResponse = {
      text: '',
      data: {},
      available: [],
      limited: false,
      errors: []
    };

    // Get the last user message to understand intent
    const lastMessage = messages[messages.length - 1]?.content || '';
    const intent = parseIntent(lastMessage);
    console.log('[MCP-CHAT] Parsed intent:', intent);

    // Handle auto_insights mode
    if (mode === 'auto_insights') {
      const [price, ohlc, pools, categories] = await Promise.all([
        fetchPrice(token.coingeckoId),
        fetchOHLC(token.coingeckoId, '7'),
        fetchPools(token.address, token.chain),
        fetchMetadata(token.coingeckoId)
      ]);

      if (price) {
        response.data.price = price;
        response.available.push('price');
      }
      if (ohlc) {
        response.data.sparkline = ohlc;
        response.available.push('sparkline');
      }
      if (pools && pools.length > 0) {
        response.data.topPools = pools;
        response.available.push('topPools');
      }
      if (categories && categories.length > 0) {
        response.data.categories = categories;
        response.available.push('categories');
      }

      response.text = price 
        ? `${token.coingeckoId.toUpperCase()} is trading at ${formatNumber(price.usd)} (${formatPct(price.change24hPct)} 24h). Source: CoinGecko.`
        : `Unable to fetch live data for ${token.coingeckoId}. Try again soon.`;
      
      if (response.available.length === 0) {
        response.limited = true;
        response.errors.push('CoinGecko API unavailable');
      }
    }
    // Handle chat mode
    else {
      switch (intent.type) {
        case 'chart': {
          const days = intent.window || '7';
          const [price, ohlc] = await Promise.all([
            fetchPrice(token.coingeckoId),
            fetchOHLC(token.coingeckoId, days)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (ohlc && ohlc.length >= 2) {
            response.data.sparkline = ohlc;
            response.available.push('sparkline');

            // Calculate change
            const firstPrice = ohlc[0].v;
            const lastPrice = ohlc[ohlc.length - 1].v;
            const pctChange = ((lastPrice - firstPrice) / firstPrice) * 100;

            response.data.change = {
              window: `${days}d`,
              pct: pctChange,
              from: firstPrice,
              to: lastPrice
            };
            response.available.push('change');

            response.text = `${days}-day change: ${formatPct(pctChange)} (${formatNumber(firstPrice)} → ${formatNumber(lastPrice)}). Source: CoinGecko.`;
          } else {
            response.text = price 
              ? `Current price: ${formatNumber(price.usd)} (${formatPct(price.change24hPct)} 24h). Chart data unavailable. Source: CoinGecko.`
              : `Unable to fetch data for ${token.coingeckoId}. Try again soon.`;
          }
          break;
        }

        case 'pools': {
          const [price, pools] = await Promise.all([
            fetchPrice(token.coingeckoId),
            fetchPools(token.address, token.chain)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (pools && pools.length > 0) {
            response.data.topPools = pools;
            response.available.push('topPools');

            const topPool = pools[0];
            response.text = `Found ${pools.length} pools. Top pool: ${topPool.name} on ${topPool.dex} with ${formatNumber(topPool.liquidityUsd)} liquidity. Source: GeckoTerminal.`;
          } else {
            response.text = `No pools found for this token on ${token.chain}. The token may not have liquidity pools yet.`;
          }
          break;
        }

        case 'metadata': {
          const [price, categories] = await Promise.all([
            fetchPrice(token.coingeckoId),
            fetchMetadata(token.coingeckoId)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (categories && categories.length > 0) {
            response.data.categories = categories;
            response.available.push('categories');
            response.text = `This token belongs to: ${categories.join(', ')}. Source: CoinGecko.`;
          } else {
            response.text = `No category data available for this token.`;
          }
          break;
        }

        case 'price':
        default: {
          const price = await fetchPrice(token.coingeckoId);

          if (price) {
            response.data.price = price;
            response.available.push('price');

            const mcapStr = price.mcap ? ` Market cap: ${formatNumber(price.mcap)}.` : '';
            response.text = `Current price: ${formatNumber(price.usd)} (${formatPct(price.change24hPct)} 24h).${mcapStr} Source: CoinGecko.`;
          } else {
            response.text = `Unable to fetch price for ${token.coingeckoId}. Try again soon.`;
            response.limited = true;
          }
          break;
        }
      }
    }

    // Fallback message if nothing was fetched
    if (response.available.length === 0 && !response.text) {
      response.text = "I can help you with price data, trends (7d, 30d, 90d), or liquidity pools. What would you like to know?";
    }

    console.log('[MCP-CHAT] Response:', { available: response.available, errors: response.errors });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[MCP-CHAT] Error:', error);
    
    return new Response(
      JSON.stringify({
        text: "Something went wrong. Please try again.",
        data: {},
        available: [],
        limited: true,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
