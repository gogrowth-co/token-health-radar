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
    holders?: {
      totalHolders: number;
      topHolders: Array<{ address: string; percentage: number; balance?: number }>;
      top10Percentage: number;
      concentrationRisk: string;
      giniCoefficient?: number;
    };
  };
  available: string[];
  limited: boolean;
  errors: string[];
}

interface ParsedIntent {
  type: 'price' | 'chart' | 'pools' | 'metadata' | 'summary' | 'holders' | 'unknown';
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
- holders: Token holder distribution (e.g., "holders", "who owns", "whale", "distribution", "top wallets", "concentration")
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
                  enum: ['price', 'chart', 'pools', 'metadata', 'summary', 'holders', 'unknown'],
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
  if (lower.includes('holder') || lower.includes('who owns') || lower.includes('whale') || 
      lower.includes('distribution') || lower.includes('top wallet') || lower.includes('concentration')) {
    return { type: 'holders' };
  }
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
      '0xa': 'optimism',
      // Solana support
      'solana': 'solana',
      'sol': 'solana',
      'spl': 'solana'
    };
    
    const network = networkMap[chain.toLowerCase()] || 'eth';
    console.log(`[MCP-CHAT] Fetching pools for ${address} on network: ${network}`);
    
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

// Fetch Solana token holders from Helius DAS API
async function fetchSolanaHolders(mintAddress: string): Promise<{
  totalHolders: number;
  topHolders: Array<{ address: string; percentage: number; balance: number }>;
  top10Percentage: number;
  concentrationRisk: string;
  giniCoefficient: number;
} | null> {
  try {
    const HELIUS_API_KEY = Deno.env.get('HELIUS_API_KEY');
    if (!HELIUS_API_KEY) {
      console.log('[MCP-CHAT] No HELIUS_API_KEY configured for Solana holders');
      return null;
    }

    console.log(`[MCP-CHAT] Fetching Solana holders for: ${mintAddress}`);
    
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    
    // Use getTokenAccounts to get holders
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'helius-holders',
        method: 'getTokenAccounts',
        params: {
          mint: mintAddress,
          limit: 50,
          options: {
            showZeroBalance: false
          }
        }
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.log(`[MCP-CHAT] Helius holders fetch failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data.error) {
      console.log('[MCP-CHAT] Helius RPC error:', data.error);
      return null;
    }

    const tokenAccounts = data.result?.token_accounts || [];
    
    if (tokenAccounts.length === 0) {
      console.log('[MCP-CHAT] No token accounts found');
      return null;
    }

    // Calculate total supply from all accounts
    let totalSupply = 0;
    const holders: Array<{ owner: string; amount: number }> = [];
    
    for (const account of tokenAccounts) {
      const amount = parseFloat(account.amount || '0');
      if (amount > 0) {
        totalSupply += amount;
        holders.push({ owner: account.owner, amount });
      }
    }

    // Sort by amount descending
    holders.sort((a, b) => b.amount - a.amount);

    // Map top holders with percentages
    const topHolders = holders.slice(0, 10).map(h => ({
      address: h.owner,
      percentage: totalSupply > 0 ? (h.amount / totalSupply) * 100 : 0,
      balance: h.amount
    }));

    // Calculate stats
    const totalHolders = tokenAccounts.length;
    const top10Percentage = topHolders.reduce((sum, h) => sum + h.percentage, 0);
    
    // Calculate Gini coefficient
    const balances = holders.map(h => h.amount).filter(b => b > 0);
    const giniCoefficient = calculateGiniCoefficient(balances);

    // Determine concentration risk
    let concentrationRisk = 'Low';
    if (top10Percentage > 80 || giniCoefficient > 0.9) {
      concentrationRisk = 'High';
    } else if (top10Percentage > 50 || giniCoefficient > 0.7) {
      concentrationRisk = 'Medium';
    }

    console.log('[MCP-CHAT] Solana holders data:', { totalHolders, top10Percentage: top10Percentage.toFixed(2), giniCoefficient: giniCoefficient.toFixed(3), concentrationRisk });

    return {
      totalHolders,
      topHolders,
      top10Percentage,
      concentrationRisk,
      giniCoefficient
    };
  } catch (err) {
    console.log('[MCP-CHAT] Solana holders fetch error:', err);
    return null;
  }
}

// Fetch token holders - routes to Helius for Solana, Moralis for EVM
async function fetchHolders(address: string, chain: string): Promise<{
  totalHolders: number;
  topHolders: Array<{ address: string; percentage: number; balance: number }>;
  top10Percentage: number;
  concentrationRisk: string;
  giniCoefficient: number;
} | null> {
  // Route Solana tokens to Helius
  const solanaChains = ['solana', 'sol', 'spl'];
  if (solanaChains.includes(chain.toLowerCase())) {
    console.log('[MCP-CHAT] Routing to Helius for Solana holders');
    return fetchSolanaHolders(address);
  }

  // EVM chains use Moralis
  try {
    const MORALIS_API_KEY = Deno.env.get('MORALIS_API_KEY');
    if (!MORALIS_API_KEY) {
      console.log('[MCP-CHAT] No MORALIS_API_KEY configured');
      return null;
    }

    // Map chain to Moralis chain format
    const chainMap: Record<string, string> = {
      'eth': '0x1',
      'ethereum': '0x1',
      '0x1': '0x1',
      'polygon': '0x89',
      '0x89': '0x89',
      'bsc': '0x38',
      '0x38': '0x38',
      'arbitrum': '0xa4b1',
      '0xa4b1': '0xa4b1',
      'base': '0x2105',
      '0x2105': '0x2105',
    };

    const moralisChain = chainMap[chain.toLowerCase()] || '0x1';
    console.log(`[MCP-CHAT] Fetching EVM holders for ${address} on chain: ${moralisChain}`);
    
    // Fetch token owners
    const ownersUrl = `https://deep-index.moralis.io/api/v2.2/erc20/${address}/owners?chain=${moralisChain}&limit=50&order=DESC`;
    
    const ownersRes = await fetch(ownersUrl, {
      headers: { 'X-API-Key': MORALIS_API_KEY },
      signal: AbortSignal.timeout(10000)
    });

    if (!ownersRes.ok) {
      console.log('[MCP-CHAT] Moralis owners fetch failed:', ownersRes.status);
      return null;
    }

    const ownersData = await ownersRes.json();
    
    if (!ownersData.result || !Array.isArray(ownersData.result)) {
      console.log('[MCP-CHAT] No holder data returned from Moralis');
      return null;
    }

    // Calculate percentages and stats
    const holders = ownersData.result;
    const totalHolders = ownersData.page_size || holders.length;
    
    // Get total supply for percentage calculation
    let totalSupply = 0;
    holders.forEach((h: any) => {
      const balance = parseFloat(h.balance_formatted || h.balance || '0');
      totalSupply += balance;
    });

    // Map top holders with percentages
    const topHolders = holders.slice(0, 10).map((h: any) => {
      const balance = parseFloat(h.balance_formatted || h.balance || '0');
      const percentage = totalSupply > 0 ? (balance / totalSupply) * 100 : 0;
      return {
        address: h.owner_address,
        percentage,
        balance
      };
    });

    // Calculate top 10 percentage
    const top10Percentage = topHolders.reduce((sum: number, h: any) => sum + h.percentage, 0);

    // Calculate Gini coefficient
    const balances = holders.map((h: any) => parseFloat(h.balance_formatted || h.balance || '0')).filter((b: number) => b > 0);
    const giniCoefficient = calculateGiniCoefficient(balances);

    // Determine concentration risk
    let concentrationRisk = 'Low';
    if (top10Percentage > 80 || giniCoefficient > 0.9) {
      concentrationRisk = 'High';
    } else if (top10Percentage > 50 || giniCoefficient > 0.7) {
      concentrationRisk = 'Medium';
    }

    console.log('[MCP-CHAT] Holders data fetched:', { totalHolders, top10Percentage, giniCoefficient, concentrationRisk });

    return {
      totalHolders,
      topHolders,
      top10Percentage,
      concentrationRisk,
      giniCoefficient
    };
  } catch (err) {
    console.log('[MCP-CHAT] Holders fetch failed:', err);
    return null;
  }
}

// Calculate Gini coefficient for wealth distribution
function calculateGiniCoefficient(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  
  if (sum === 0) return 0;
  
  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i];
  }
  
  return giniSum / (n * sum);
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

        case 'holders': {
          const [price, holders] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchHolders(token.address, token.chain)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (holders) {
            response.data.holders = holders;
            response.available.push('holders');

            // Try natural response
            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            if (naturalResponse) {
              response.text = naturalResponse;
            } else {
              response.text = `${tokenSymbol} has ${holders.totalHolders.toLocaleString()} holders. Top 10 wallets hold ${holders.top10Percentage.toFixed(1)}% of supply. Concentration risk: ${holders.concentrationRisk}. Source: Moralis.`;
            }
          } else {
            response.text = `Unable to fetch holder data for ${tokenSymbol}. The Moralis API may be unavailable or the token may not be indexed.`;
            response.limited = true;
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
