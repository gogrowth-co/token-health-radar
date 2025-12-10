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
    symbol?: string;
    name?: string;
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

interface ParsedIntent {
  type: 'price' | 'chart' | 'pools' | 'metadata' | 'summary' | 'unknown';
  window?: string;
  needsExplanation?: boolean;
}

// Lovable AI-powered intent parsing
async function parseIntentWithAI(
  message: string, 
  conversationHistory: ChatMessage[],
  tokenSymbol?: string
): Promise<ParsedIntent> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    console.log('[MCP-CHAT] No LOVABLE_API_KEY, falling back to keyword parser');
    return parseIntentFallback(message);
  }

  try {
    // Build conversation context (last 3 messages)
    const recentHistory = conversationHistory.slice(-3).map(m => ({
      role: m.role,
      content: m.content
    }));

    const systemPrompt = `You are a crypto assistant intent classifier analyzing questions about ${tokenSymbol || 'a token'}.

Determine the user's intent and extract relevant parameters.

Intent types:
- price: Current price, market cap, 24h change (e.g., "what's the price?", "how much?", "current value")
- chart: Historical price trends (e.g., "how's it doing?", "performance", "trend", "history", "last week")
- pools: DEX liquidity pools (e.g., "liquidity", "pools", "where to trade", "dex")
- metadata: Token categories/sector (e.g., "what type?", "category", "sector")
- summary: General overview (e.g., "tell me about", "what is", "overview", "explain", "info")
- unknown: Cannot determine intent

Timeframes (for chart intent):
- 1: today, 24h, daily
- 7: week, 7 days
- 30: month, 30 days
- 90: quarter, 3 months
- 365: year, annual

Consider conversation context for follow-ups like "and the 30 day?" or "what about liquidity?".`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentHistory,
          { role: 'user', content: message }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_intent',
            description: 'Extract the user\'s intent from their crypto question',
            parameters: {
              type: 'object',
              properties: {
                intent_type: { 
                  type: 'string', 
                  enum: ['price', 'chart', 'pools', 'metadata', 'summary', 'unknown'],
                  description: 'The type of information the user wants'
                },
                timeframe: { 
                  type: 'string', 
                  enum: ['1', '7', '30', '90', '365', 'none'],
                  description: 'Timeframe for chart data if applicable'
                },
                needs_explanation: {
                  type: 'boolean',
                  description: 'Whether the user needs an explanatory response'
                }
              },
              required: ['intent_type', 'timeframe']
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_intent' } }
      }),
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      console.log('[MCP-CHAT] AI intent parsing failed:', response.status);
      return parseIntentFallback(message);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const args = JSON.parse(toolCall.function.arguments);
      console.log('[MCP-CHAT] AI parsed intent:', args);
      
      return {
        type: args.intent_type || 'price',
        window: args.timeframe !== 'none' ? args.timeframe : undefined,
        needsExplanation: args.needs_explanation || false
      };
    }

    return parseIntentFallback(message);
  } catch (err) {
    console.log('[MCP-CHAT] AI intent parsing error:', err);
    return parseIntentFallback(message);
  }
}

// Fallback keyword-based intent parser
function parseIntentFallback(message: string): ParsedIntent {
  const lower = message.toLowerCase();
  
  // Check for summary/general questions first
  if (lower.includes('tell me about') || lower.includes('what is') || lower.includes('overview') || 
      lower.includes('explain') || lower.includes('info') || lower.includes('about this')) {
    return { type: 'summary', window: '7' };
  }
  
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
  if (lower.includes('pool') || lower.includes('liquidity') || lower.includes('dex') || lower.includes('trade')) {
    return { type: 'pools' };
  }
  if (lower.includes('trend') || lower.includes('chart') || lower.includes('history') || lower.includes('performance') || lower.includes('doing')) {
    return { type: 'chart', window: '7' };
  }
  if (lower.includes('price') || lower.includes('cost') || lower.includes('worth') || lower.includes('how much')) {
    return { type: 'price' };
  }
  if (lower.includes('categor') || lower.includes('sector') || lower.includes('type of')) {
    return { type: 'metadata' };
  }
  
  // Default to summary for generic questions
  return { type: 'summary', window: '7' };
}

// Generate natural language response using Lovable AI
async function generateNaturalResponse(
  intent: ParsedIntent,
  data: ChatResponse['data'],
  tokenSymbol: string,
  userMessage: string
): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    return null;
  }

  try {
    const dataContext = JSON.stringify(data, null, 2);
    
    const systemPrompt = `You are a helpful crypto assistant providing insights about ${tokenSymbol}.
    
Respond naturally and conversationally. Be concise but informative.
Include relevant data points from the provided data.
Use $ for prices and % for percentages.
Don't be overly formal - be friendly and direct.
Always mention the source (CoinGecko or GeckoTerminal) at the end.
Keep responses under 100 words unless specifically asked for details.`;

    const userPrompt = `User asked: "${userMessage}"

Available data:
${dataContext}

Generate a natural, helpful response based on this data.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!response.ok) {
      console.log('[MCP-CHAT] AI response generation failed:', response.status);
      return null;
    }

    const result = await response.json();
    const generatedText = result.choices?.[0]?.message?.content;
    
    if (generatedText) {
      console.log('[MCP-CHAT] AI generated natural response');
      return generatedText.trim();
    }

    return null;
  } catch (err) {
    console.log('[MCP-CHAT] AI response generation error:', err);
    return null;
  }
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

// Resolve CoinGecko ID by searching their API (fallback when coingeckoId is missing or invalid)
async function resolveCoingeckoId(symbol: string, name: string): Promise<string | null> {
  try {
    console.log(`[MCP-CHAT] Resolving CoinGecko ID for: ${symbol} (${name})`);
    const query = encodeURIComponent(symbol);
    const res = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${query}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) {
      console.log(`[MCP-CHAT] CoinGecko search failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    if (data.coins && data.coins.length > 0) {
      // Find best match by symbol (case insensitive)
      const exactMatch = data.coins.find((c: any) => 
        c.symbol.toLowerCase() === symbol.toLowerCase()
      );
      const resolvedId = exactMatch?.id || data.coins[0].id;
      console.log(`[MCP-CHAT] Resolved CoinGecko ID: ${resolvedId}`);
      return resolvedId;
    }
    return null;
  } catch (err) {
    console.log('[MCP-CHAT] CoinGecko ID resolution failed:', err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, token, mode }: ChatRequest = await req.json();
    console.log('[MCP-CHAT] Request:', { 
      messageCount: messages?.length, 
      coingeckoId: token?.coingeckoId,
      address: token?.address,
      chain: token?.chain,
      mode 
    });

    if (!messages || !token) {
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

    // Resolve CoinGecko ID if not provided or if it looks like an internal ID
    let coingeckoId = token.coingeckoId;
    if (!coingeckoId || coingeckoId.includes('-0x') || coingeckoId.startsWith('eth-') || coingeckoId.startsWith('0x')) {
      console.log('[MCP-CHAT] Invalid coingeckoId, attempting resolution...');
      // Extract symbol from the provided data or try to resolve
      const symbol = token.address ? token.address.split('-').pop()?.slice(0, 5) : '';
      coingeckoId = await resolveCoingeckoId(symbol || 'unknown', '');
      if (!coingeckoId) {
        return new Response(
          JSON.stringify({
            text: `Unable to find this token on CoinGecko. Try searching for a different token.`,
            data: {},
            available: [],
            limited: true,
            errors: ["Token not found on CoinGecko"]
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    console.log('[MCP-CHAT] Using coingeckoId:', coingeckoId);

    const response: ChatResponse = {
      text: '',
      data: {},
      available: [],
      limited: false,
      errors: []
    };

    // Get the last user message and parse intent using AI
    const lastMessage = messages[messages.length - 1]?.content || '';
    const tokenSymbol = token.symbol || coingeckoId.toUpperCase();
    const intent = await parseIntentWithAI(lastMessage, messages, tokenSymbol);
    console.log('[MCP-CHAT] Parsed intent:', intent);

    // Handle auto_insights mode
    if (mode === 'auto_insights') {
      const [price, ohlc, pools, categories] = await Promise.all([
        fetchPrice(coingeckoId),
        fetchOHLC(coingeckoId, '7'),
        fetchPools(token.address, token.chain),
        fetchMetadata(coingeckoId)
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

      // Try to generate a natural response
      const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
      response.text = naturalResponse || (price 
        ? `${tokenSymbol} is trading at ${formatNumber(price.usd)} (${formatPct(price.change24hPct)} 24h). Source: CoinGecko.`
        : `Unable to fetch live data for ${tokenSymbol}. Try again soon.`);
      
      if (response.available.length === 0) {
        response.limited = true;
        response.errors.push('CoinGecko API unavailable');
      }
    }
    // Handle chat mode
    else {
      switch (intent.type) {
        case 'summary': {
          // Fetch all data for a comprehensive summary
          const [price, ohlc, pools, categories] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchOHLC(coingeckoId, intent.window || '7'),
            fetchPools(token.address, token.chain),
            fetchMetadata(coingeckoId)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }
          if (ohlc && ohlc.length >= 2) {
            response.data.sparkline = ohlc;
            response.available.push('sparkline');
            
            const firstPrice = ohlc[0].v;
            const lastPrice = ohlc[ohlc.length - 1].v;
            const pctChange = ((lastPrice - firstPrice) / firstPrice) * 100;
            response.data.change = {
              window: `${intent.window || '7'}d`,
              pct: pctChange,
              from: firstPrice,
              to: lastPrice
            };
            response.available.push('change');
          }
          if (pools && pools.length > 0) {
            response.data.topPools = pools;
            response.available.push('topPools');
          }
          if (categories && categories.length > 0) {
            response.data.categories = categories;
            response.available.push('categories');
          }

          // Generate natural summary using AI
          const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
          if (naturalResponse) {
            response.text = naturalResponse;
          } else {
            // Fallback summary
            const parts: string[] = [];
            if (price) {
              parts.push(`${tokenSymbol} is currently at ${formatNumber(price.usd)} (${formatPct(price.change24hPct)} 24h)`);
              if (price.mcap) parts.push(`Market cap: ${formatNumber(price.mcap)}`);
            }
            if (categories && categories.length > 0) {
              parts.push(`Categories: ${categories.slice(0, 3).join(', ')}`);
            }
            if (pools && pools.length > 0) {
              parts.push(`${pools.length} liquidity pools available`);
            }
            response.text = parts.length > 0 
              ? parts.join('. ') + '. Source: CoinGecko/GeckoTerminal.'
              : `Unable to fetch data for ${tokenSymbol}. Try again soon.`;
          }
          break;
        }

        case 'chart': {
          const days = intent.window || '7';
          const [price, ohlc] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchOHLC(coingeckoId, days)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (ohlc && ohlc.length >= 2) {
            response.data.sparkline = ohlc;
            response.available.push('sparkline');

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

            // Try natural response
            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            response.text = naturalResponse || `${days}-day change: ${formatPct(pctChange)} (${formatNumber(firstPrice)} → ${formatNumber(lastPrice)}). Source: CoinGecko.`;
          } else {
            response.text = price 
              ? `Current price: ${formatNumber(price.usd)} (${formatPct(price.change24hPct)} 24h). Chart data unavailable. Source: CoinGecko.`
              : `Unable to fetch data for ${tokenSymbol}. Try again soon.`;
          }
          break;
        }

        case 'pools': {
          const [price, pools] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchPools(token.address, token.chain)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (pools && pools.length > 0) {
            response.data.topPools = pools;
            response.available.push('topPools');

            // Try natural response
            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            if (naturalResponse) {
              response.text = naturalResponse;
            } else {
              const topPool = pools[0];
              response.text = `Found ${pools.length} pools. Top pool: ${topPool.name} on ${topPool.dex} with ${formatNumber(topPool.liquidityUsd)} liquidity. Source: GeckoTerminal.`;
            }
          } else {
            response.text = `No liquidity pools found for ${tokenSymbol} on ${token.chain}. The token may not have DEX listings yet.`;
          }
          break;
        }

        case 'metadata': {
          const [price, categories] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchMetadata(coingeckoId)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (categories && categories.length > 0) {
            response.data.categories = categories;
            response.available.push('categories');
            
            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            response.text = naturalResponse || `${tokenSymbol} belongs to: ${categories.join(', ')}. Source: CoinGecko.`;
          } else {
            response.text = `No category data available for ${tokenSymbol}.`;
          }
          break;
        }

        case 'price':
        default: {
          const price = await fetchPrice(coingeckoId);

          if (price) {
            response.data.price = price;
            response.available.push('price');

            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            if (naturalResponse) {
              response.text = naturalResponse;
            } else {
              const mcapStr = price.mcap ? ` Market cap: ${formatNumber(price.mcap)}.` : '';
              response.text = `Current price: ${formatNumber(price.usd)} (${formatPct(price.change24hPct)} 24h).${mcapStr} Source: CoinGecko.`;
            }
          } else {
            response.text = `Unable to fetch price for ${tokenSymbol}. Try again soon.`;
            response.limited = true;
          }
          break;
        }
      }
    }

    // Fallback message if nothing was fetched
    if (response.available.length === 0 && !response.text) {
      response.text = `I can help you with ${tokenSymbol}'s price, trends (7d, 30d, 90d), liquidity pools, or give you a summary. What would you like to know?`;
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
