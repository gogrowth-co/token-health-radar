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

interface CommunityData {
  twitterFollowers: number | null;
  twitterVerified?: boolean;
  twitterGrowth7d?: number | null;
  discordMembers: number | null;
  telegramMembers: number | null;
  score?: number;
}

interface SecurityData {
  ownershipRenounced: boolean | null;
  canMint: boolean | null;
  honeypotDetected: boolean | null;
  freezeAuthority: boolean | null;
  isProxy: boolean | null;
  contractVerified: boolean | null;
  isLiquidityLocked: boolean | null;
  liquidityLockInfo?: string | null;
  score?: number;
  webacySeverity?: string | null;
}

interface DevelopmentData {
  repoName: string | null;
  repoUrl?: string | null;
  commits30d: number | null;
  contributors: number | null;
  stars: number | null;
  forks: number | null;
  openIssues?: number | null;
  lastCommitDate: string | null;
  language?: string | null;
  isArchived?: boolean;
  score?: number;
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
    tokenomics?: TokenomicsData;
    community?: CommunityData;
    security?: SecurityData;
    development?: DevelopmentData;
  };
  available: string[];
  limited: boolean;
  errors: string[];
  intent?: string;
}

interface ParsedIntent {
  type: 'price' | 'chart' | 'pools' | 'metadata' | 'summary' | 'holders' | 'tokenomics' | 'community' | 'security' | 'development' | 'unknown';
  window?: string;
  needsExplanation?: boolean;
}

interface TokenomicsData {
  totalSupply: number | null;
  circulatingSupply: number | null;
  marketCap: number | null;
  fdv: number | null;
  tvl: number | null;
  circulatingRatio: number | null;
  maxSupply: number | null;
}

// Lovable AI-powered intent parsing with new intent types
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
- tokenomics: Supply metrics, valuation, FDV, TVL (e.g., "tokenomics", "supply", "circulating", "market cap", "fdv", "tvl")
- community: Social metrics, followers, engagement (e.g., "community", "social", "twitter", "discord", "telegram", "followers", "engagement")
- security: Contract safety, risks, audits (e.g., "security", "safe", "scam", "honeypot", "audit", "rug", "risky", "trust")
- development: Code activity, team activity (e.g., "development", "github", "commits", "team", "devs", "active", "code")
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
                  enum: ['price', 'chart', 'pools', 'metadata', 'summary', 'holders', 'tokenomics', 'community', 'security', 'development', 'unknown'],
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

// Fallback keyword-based intent parser with new intent types
function parseIntentFallback(message: string): ParsedIntent {
  const lower = message.toLowerCase();
  
  // Check for community intent
  if (lower.includes('community') || lower.includes('social') || lower.includes('twitter') || 
      lower.includes('discord') || lower.includes('telegram') || lower.includes('follower') ||
      lower.includes('engagement')) {
    return { type: 'community' };
  }
  
  // Check for security intent
  if (lower.includes('security') || lower.includes('safe') || lower.includes('scam') || 
      lower.includes('honeypot') || lower.includes('audit') || lower.includes('rug') ||
      lower.includes('risky') || lower.includes('trust')) {
    return { type: 'security' };
  }
  
  // Check for development intent
  if (lower.includes('development') || lower.includes('github') || lower.includes('commit') || 
      lower.includes('team') || lower.includes('devs') || lower.includes('code') ||
      lower.includes('repo')) {
    return { type: 'development' };
  }
  
  // Check for summary/general questions
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
  
  if (lower.includes('tokenomics') || lower.includes('supply') || lower.includes('circulating') ||
      lower.includes('total supply') || lower.includes('max supply') || lower.includes('fdv') ||
      lower.includes('fully diluted') || lower.includes('tvl') || lower.includes('allocation') ||
      lower.includes('vesting') || lower.includes('emission')) {
    return { type: 'tokenomics' };
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
Always mention the data source at the end (CoinGecko, GeckoTerminal, GoPlus, GitHub, or social APIs).
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

// Fetch tokenomics data from CoinGecko
async function fetchTokenomics(coingeckoId: string): Promise<TokenomicsData | null> {
  try {
    console.log(`[MCP-CHAT] Fetching tokenomics for: ${coingeckoId}`);
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&community_data=false&developer_data=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) {
      console.log(`[MCP-CHAT] Tokenomics fetch failed: ${res.status}`);
      return null;
    }
    const data = await res.json();
    
    const marketData = data.market_data;
    if (!marketData) {
      console.log('[MCP-CHAT] No market_data in CoinGecko response');
      return null;
    }
    
    const totalSupply = marketData.total_supply || null;
    const circulatingSupply = marketData.circulating_supply || null;
    const maxSupply = marketData.max_supply || null;
    
    const tokenomics: TokenomicsData = {
      totalSupply,
      circulatingSupply,
      marketCap: marketData.market_cap?.usd || null,
      fdv: marketData.fully_diluted_valuation?.usd || null,
      tvl: marketData.total_value_locked?.usd || null,
      maxSupply,
      circulatingRatio: (totalSupply && circulatingSupply) 
        ? circulatingSupply / totalSupply 
        : null
    };
    
    console.log('[MCP-CHAT] Tokenomics data:', { 
      marketCap: tokenomics.marketCap, 
      fdv: tokenomics.fdv, 
      circulatingRatio: tokenomics.circulatingRatio?.toFixed(2) 
    });
    
    return tokenomics;
  } catch (err) {
    console.log('[MCP-CHAT] Tokenomics fetch failed:', err);
    return null;
  }
}

// ========== Integrated Social APIs for Community Data ==========

// Fetch Twitter followers from Apify or CoinGecko fallback
async function fetchTwitterFollowers(twitterHandle: string, coingeckoId?: string): Promise<number | null> {
  if (!twitterHandle) {
    console.log('[TWITTER] No Twitter handle provided');
    return null;
  }

  const apiKey = Deno.env.get('APIFY_API_KEY');
  
  // If no Apify key, go straight to CoinGecko fallback
  if (!apiKey) {
    console.log('[TWITTER] APIFY_API_KEY not configured, using CoinGecko fallback');
    return await fetchTwitterFromCoinGecko(coingeckoId);
  }

  try {
    console.log(`[TWITTER] Fetching followers for: @${twitterHandle}`);
    
    const apiUrl = `https://api.apify.com/v2/acts/practicaltools~cheap-simple-twitter-api/run-sync-get-dataset-items?token=${apiKey}`;
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: 'user/info',
        parameters: { userName: twitterHandle }
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.log(`[TWITTER] Apify failed: ${response.status}, using CoinGecko fallback`);
      return await fetchTwitterFromCoinGecko(coingeckoId);
    }

    const responseText = await response.text();
    if (!responseText || responseText.trim() === '') {
      console.log('[TWITTER] Empty Apify response, using CoinGecko fallback');
      return await fetchTwitterFromCoinGecko(coingeckoId);
    }

    const data = JSON.parse(responseText);
    const followerCount = Array.isArray(data) ? data[0]?.followers || null : null;
    
    if (followerCount && followerCount > 0) {
      console.log(`[TWITTER] Successfully got ${followerCount} followers for @${twitterHandle}`);
      return followerCount;
    }
    
    console.log('[TWITTER] No Apify data, using CoinGecko fallback');
    return await fetchTwitterFromCoinGecko(coingeckoId);
  } catch (err) {
    console.log('[TWITTER] Error:', err);
    return await fetchTwitterFromCoinGecko(coingeckoId);
  }
}

// CoinGecko fallback for Twitter followers
async function fetchTwitterFromCoinGecko(coingeckoId?: string): Promise<number | null> {
  if (!coingeckoId) return null;
  
  try {
    console.log(`[TWITTER-CG] Fetching from CoinGecko for: ${coingeckoId}`);
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!res.ok) return null;
    const data = await res.json();
    const followers = data.community_data?.twitter_followers;
    
    if (followers && followers > 0) {
      console.log(`[TWITTER-CG] Got ${followers} followers from CoinGecko`);
      return followers;
    }
    return null;
  } catch (err) {
    console.log('[TWITTER-CG] Error:', err);
    return null;
  }
}

// Fetch Discord member count from Discord API
async function fetchDiscordMembers(discordUrl: string | null): Promise<number | null> {
  if (!discordUrl) {
    console.log('[DISCORD] No Discord URL provided');
    return null;
  }

  try {
    console.log(`[DISCORD] Extracting invite code from: ${discordUrl}`);
    
    // Extract invite code from Discord URLs
    const inviteCodeMatch = discordUrl.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9]+)/);
    if (!inviteCodeMatch) {
      console.log(`[DISCORD] Invalid Discord URL format: ${discordUrl}`);
      return null;
    }
    
    const inviteCode = inviteCodeMatch[1];
    console.log(`[DISCORD] Fetching members for invite: ${inviteCode}`);
    
    const response = await fetch(
      `https://discord.com/api/v9/invites/${inviteCode}?with_counts=true`,
      { 
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      console.log(`[DISCORD] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const memberCount = data?.approximate_member_count || null;
    
    if (memberCount) {
      console.log(`[DISCORD] Got ${memberCount} members for ${data?.guild?.name || 'server'}`);
    }
    
    return memberCount;
  } catch (err) {
    console.log('[DISCORD] Error:', err);
    return null;
  }
}

// Fetch Telegram members from Apify web scraper
async function fetchTelegramMembers(telegramUrl: string | null): Promise<number | null> {
  if (!telegramUrl) {
    console.log('[TELEGRAM] No Telegram URL provided');
    return null;
  }

  const apiKey = Deno.env.get('APIFY_API_KEY');
  if (!apiKey) {
    console.log('[TELEGRAM] APIFY_API_KEY not configured');
    return null;
  }

  try {
    console.log(`[TELEGRAM] Fetching members for: ${telegramUrl}`);
    
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startUrls: [{ url: telegramUrl }],
          pageFunction: "async function pageFunction(context) {\n  const title = document.querySelector('.tgme_page_title span')?.innerText.trim();\n  const stats = document.querySelector('.tgme_page_extra')?.innerText.trim();\n  return { title, stats };\n}"
        }),
        signal: AbortSignal.timeout(30000)
      }
    );

    if (!response.ok) {
      console.log(`[TELEGRAM] Apify error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = Array.isArray(data) ? data[0] : null;
    
    if (!result?.stats) {
      console.log('[TELEGRAM] No stats in response');
      return null;
    }

    // Parse member count from stats like "35 546 members, 1 138 online"
    const memberMatch = result.stats.match(/([\d\s]+) members/);
    if (memberMatch) {
      const memberCount = parseInt(memberMatch[1].replace(/\s/g, ''), 10);
      console.log(`[TELEGRAM] Got ${memberCount} members`);
      return memberCount;
    }
    
    return null;
  } catch (err) {
    console.log('[TELEGRAM] Error:', err);
    return null;
  }
}

// Fetch community data using all available APIs
async function fetchCommunityData(coingeckoId: string, tokenAddress: string, chainId: string): Promise<CommunityData | null> {
  try {
    console.log(`[MCP-CHAT] Fetching community data for: ${coingeckoId}`);
    
    // First check Supabase cache
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      const cacheRes = await fetch(
        `${supabaseUrl}/rest/v1/token_community_cache?token_address=eq.${tokenAddress}&chain_id=eq.${chainId}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          }
        }
      );
      
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData && cacheData[0]) {
          const cached = cacheData[0];
          const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
          // Use cache if less than 24 hours old
          if (cacheAge < 24 * 60 * 60 * 1000) {
            console.log('[MCP-CHAT] Using cached community data');
            return {
              twitterFollowers: cached.twitter_followers,
              twitterVerified: cached.twitter_verified,
              twitterGrowth7d: cached.twitter_growth_7d,
              discordMembers: cached.discord_members,
              telegramMembers: cached.telegram_members,
              score: cached.score
            };
          }
        }
      }
    }
    
    // Fetch social links from CoinGecko first
    console.log('[MCP-CHAT] Fetching social links from CoinGecko...');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=false&developer_data=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!res.ok) {
      console.log(`[MCP-CHAT] CoinGecko fetch failed: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    const links = data.links || {};
    const communityData = data.community_data || {};
    
    // Extract social links
    const twitterHandle = links.twitter_screen_name || null;
    const telegramUrl = links.telegram_channel_identifier 
      ? `https://t.me/${links.telegram_channel_identifier}` 
      : null;
    const discordUrl = links.chat_url?.find((url: string) => url.includes('discord')) || null;
    
    console.log('[MCP-CHAT] Social links found:', { 
      twitter: twitterHandle, 
      telegram: links.telegram_channel_identifier, 
      discord: discordUrl ? 'yes' : 'no' 
    });
    
    // Fetch all social metrics in parallel
    const [twitterFollowers, discordMembers, telegramMembers] = await Promise.all([
      fetchTwitterFollowers(twitterHandle, coingeckoId),
      fetchDiscordMembers(discordUrl),
      fetchTelegramMembers(telegramUrl)
    ]);
    
    // Use CoinGecko data as fallback for Telegram
    const finalTelegramMembers = telegramMembers || communityData.telegram_channel_user_count || null;
    
    const community: CommunityData = {
      twitterFollowers,
      discordMembers,
      telegramMembers: finalTelegramMembers,
      score: undefined
    };
    
    // Calculate community score
    let score = 0;
    let factors = 0;
    
    if (community.twitterFollowers) {
      if (community.twitterFollowers >= 100000) score += 30;
      else if (community.twitterFollowers >= 10000) score += 20;
      else if (community.twitterFollowers >= 1000) score += 10;
      factors++;
    }
    
    if (community.discordMembers) {
      if (community.discordMembers >= 50000) score += 30;
      else if (community.discordMembers >= 10000) score += 20;
      else if (community.discordMembers >= 1000) score += 10;
      factors++;
    }
    
    if (community.telegramMembers) {
      if (community.telegramMembers >= 50000) score += 30;
      else if (community.telegramMembers >= 10000) score += 20;
      else if (community.telegramMembers >= 1000) score += 10;
      factors++;
    }
    
    if (factors > 0) {
      community.score = Math.min(100, Math.round((score / factors) * (100 / 30)));
    }
    
    console.log('[MCP-CHAT] Community data:', { 
      twitter: community.twitterFollowers, 
      discord: community.discordMembers,
      telegram: community.telegramMembers,
      score: community.score
    });
    
    return community;
  } catch (err) {
    console.log('[MCP-CHAT] Community fetch failed:', err);
    return null;
  }
}

// Fetch security data from GoPlus or cache
async function fetchSecurityData(tokenAddress: string, chainId: string): Promise<SecurityData | null> {
  try {
    console.log(`[MCP-CHAT] Fetching security data for: ${tokenAddress} on chain ${chainId}`);
    
    // First check Supabase cache
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      const cacheRes = await fetch(
        `${supabaseUrl}/rest/v1/token_security_cache?token_address=eq.${tokenAddress}&chain_id=eq.${chainId}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          }
        }
      );
      
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData && cacheData[0]) {
          const cached = cacheData[0];
          const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
          // Use cache if less than 24 hours old
          if (cacheAge < 24 * 60 * 60 * 1000) {
            console.log('[MCP-CHAT] Using cached security data');
            return {
              ownershipRenounced: cached.ownership_renounced,
              canMint: cached.can_mint,
              honeypotDetected: cached.honeypot_detected,
              freezeAuthority: cached.freeze_authority,
              isProxy: cached.is_proxy,
              contractVerified: cached.contract_verified,
              isLiquidityLocked: cached.is_liquidity_locked,
              liquidityLockInfo: cached.liquidity_lock_info,
              score: cached.score,
              webacySeverity: cached.webacy_severity
            };
          }
        }
      }
    }
    
    // Map chain to GoPlus chain ID
    const goplusChainMap: Record<string, string> = {
      'eth': '1',
      '0x1': '1',
      'bsc': '56',
      '0x38': '56',
      'polygon': '137',
      '0x89': '137',
      'arbitrum': '42161',
      '0xa4b1': '42161',
      'base': '8453',
      '0x2105': '8453',
      'solana': 'solana',
      'sol': 'solana'
    };
    
    const goplusChain = goplusChainMap[chainId.toLowerCase()] || '1';
    
    // Fetch from GoPlus
    const goplusUrl = goplusChain === 'solana'
      ? `https://api.gopluslabs.io/api/v1/solana/token_security?contract_addresses=${tokenAddress}`
      : `https://api.gopluslabs.io/api/v1/token_security/${goplusChain}?contract_addresses=${tokenAddress}`;
    
    const res = await fetch(goplusUrl, { signal: AbortSignal.timeout(8000) });
    
    if (!res.ok) {
      console.log(`[MCP-CHAT] GoPlus security fetch failed: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    const tokenData = data.result?.[tokenAddress.toLowerCase()] || data.result?.[tokenAddress];
    
    if (!tokenData) {
      console.log('[MCP-CHAT] No security data from GoPlus');
      return null;
    }
    
    const security: SecurityData = {
      ownershipRenounced: tokenData.owner_change_balance === '0' || tokenData.can_take_back_ownership === '0',
      canMint: tokenData.is_mintable === '1',
      honeypotDetected: tokenData.is_honeypot === '1',
      freezeAuthority: tokenData.transfer_pausable === '1' || tokenData.can_freeze === '1',
      isProxy: tokenData.is_proxy === '1',
      contractVerified: tokenData.is_open_source === '1',
      isLiquidityLocked: null,
      liquidityLockInfo: null,
      score: undefined
    };
    
    // Check LP holders for lock info
    if (tokenData.lp_holders && Array.isArray(tokenData.lp_holders)) {
      const lockedLp = tokenData.lp_holders.find((lp: any) => lp.is_locked === 1);
      if (lockedLp) {
        security.isLiquidityLocked = true;
        security.liquidityLockInfo = `${(parseFloat(lockedLp.percent) * 100).toFixed(1)}% locked`;
      }
    }
    
    // Calculate security score
    let score = 50; // Base score
    if (security.ownershipRenounced === true) score += 15;
    if (security.canMint === false) score += 10;
    if (security.honeypotDetected === false) score += 15;
    if (security.freezeAuthority === false) score += 5;
    if (security.contractVerified === true) score += 5;
    if (security.isLiquidityLocked === true) score += 10;
    if (security.honeypotDetected === true) score -= 50;
    
    security.score = Math.max(0, Math.min(100, score));
    
    console.log('[MCP-CHAT] Security data:', { 
      ownershipRenounced: security.ownershipRenounced,
      honeypot: security.honeypotDetected,
      score: security.score
    });
    
    return security;
  } catch (err) {
    console.log('[MCP-CHAT] Security fetch failed:', err);
    return null;
  }
}

// Fetch development data from GitHub or cache
async function fetchDevelopmentData(coingeckoId: string, tokenAddress: string, chainId: string): Promise<DevelopmentData | null> {
  try {
    console.log(`[MCP-CHAT] Fetching development data for: ${coingeckoId}`);
    
    // First check Supabase cache
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (supabaseUrl && supabaseKey) {
      const cacheRes = await fetch(
        `${supabaseUrl}/rest/v1/token_development_cache?token_address=eq.${tokenAddress}&chain_id=eq.${chainId}`,
        {
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          }
        }
      );
      
      if (cacheRes.ok) {
        const cacheData = await cacheRes.json();
        if (cacheData && cacheData[0]) {
          const cached = cacheData[0];
          const cacheAge = Date.now() - new Date(cached.updated_at).getTime();
          // Use cache if less than 24 hours old
          if (cacheAge < 24 * 60 * 60 * 1000) {
            console.log('[MCP-CHAT] Using cached development data');
            return {
              repoName: cached.github_repo,
              repoUrl: cached.github_repo ? `https://github.com/${cached.github_repo}` : null,
              commits30d: cached.commits_30d,
              contributors: cached.contributors_count,
              stars: cached.stars,
              forks: cached.forks,
              openIssues: cached.open_issues,
              lastCommitDate: cached.last_commit,
              language: cached.language,
              isArchived: cached.is_archived,
              score: cached.score
            };
          }
        }
      }
    }
    
    // Fetch from CoinGecko (includes developer data)
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=false&community_data=false`,
      { signal: AbortSignal.timeout(5000) }
    );
    
    if (!res.ok) {
      console.log(`[MCP-CHAT] CoinGecko developer fetch failed: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    const devData = data.developer_data || {};
    const repoUrl = data.links?.repos_url?.github?.[0] || null;
    
    // Extract repo name from URL
    let repoName = null;
    if (repoUrl) {
      const match = repoUrl.match(/github\.com\/([^\/]+\/[^\/]+)/);
      repoName = match ? match[1] : null;
    }
    
    const development: DevelopmentData = {
      repoName,
      repoUrl,
      commits30d: devData.commit_count_4_weeks || null,
      contributors: devData.pull_request_contributors || null,
      stars: devData.stars || null,
      forks: devData.forks || null,
      openIssues: devData.total_issues || null,
      lastCommitDate: null, // Not available from CoinGecko
      language: null,
      isArchived: false,
      score: undefined
    };
    
    // Calculate development score
    let score = 0;
    if (development.commits30d) {
      if (development.commits30d >= 50) score += 40;
      else if (development.commits30d >= 20) score += 30;
      else if (development.commits30d >= 5) score += 20;
      else if (development.commits30d >= 1) score += 10;
    }
    
    if (development.contributors) {
      if (development.contributors >= 20) score += 20;
      else if (development.contributors >= 10) score += 15;
      else if (development.contributors >= 5) score += 10;
      else score += 5;
    }
    
    if (development.stars) {
      if (development.stars >= 1000) score += 20;
      else if (development.stars >= 100) score += 15;
      else if (development.stars >= 10) score += 10;
    }
    
    if (repoName) score += 20; // Has a repo
    
    development.score = Math.min(100, score);
    
    console.log('[MCP-CHAT] Development data:', { 
      repo: development.repoName,
      commits: development.commits30d,
      score: development.score
    });
    
    return development;
  } catch (err) {
    console.log('[MCP-CHAT] Development fetch failed:', err);
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

    let totalSupply = 0;
    const holders: Array<{ owner: string; amount: number }> = [];
    
    for (const account of tokenAccounts) {
      const amount = parseFloat(account.amount || '0');
      if (amount > 0) {
        totalSupply += amount;
        holders.push({ owner: account.owner, amount });
      }
    }

    holders.sort((a, b) => b.amount - a.amount);

    const topHolders = holders.slice(0, 10).map(h => ({
      address: h.owner,
      percentage: totalSupply > 0 ? (h.amount / totalSupply) * 100 : 0,
      balance: h.amount
    }));

    const totalHolders = tokenAccounts.length;
    const top10Percentage = topHolders.reduce((sum, h) => sum + h.percentage, 0);
    
    const balances = holders.map(h => h.amount).filter(b => b > 0);
    const giniCoefficient = calculateGiniCoefficient(balances);

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
  const solanaChains = ['solana', 'sol', 'spl'];
  if (solanaChains.includes(chain.toLowerCase())) {
    console.log('[MCP-CHAT] Routing to Helius for Solana holders');
    return fetchSolanaHolders(address);
  }

  try {
    const MORALIS_API_KEY = Deno.env.get('MORALIS_API_KEY');
    if (!MORALIS_API_KEY) {
      console.log('[MCP-CHAT] No MORALIS_API_KEY configured');
      return null;
    }

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

    const holders = ownersData.result;
    const totalHolders = ownersData.page_size || holders.length;
    
    let totalSupply = 0;
    holders.forEach((h: any) => {
      const balance = parseFloat(h.balance_formatted || h.balance || '0');
      totalSupply += balance;
    });

    const topHolders = holders.slice(0, 10).map((h: any) => {
      const balance = parseFloat(h.balance_formatted || h.balance || '0');
      const percentage = totalSupply > 0 ? (balance / totalSupply) * 100 : 0;
      return {
        address: h.owner_address,
        percentage,
        balance
      };
    });

    const top10Percentage = topHolders.reduce((sum: number, h: any) => sum + h.percentage, 0);

    const balances = holders.map((h: any) => parseFloat(h.balance_formatted || h.balance || '0')).filter((b: number) => b > 0);
    const giniCoefficient = calculateGiniCoefficient(balances);

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

// Resolve CoinGecko ID by searching their API
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
      errors: [],
      intent: undefined
    };

    // Get the last user message and parse intent using AI
    const lastMessage = messages[messages.length - 1]?.content || '';
    const tokenSymbol = token.symbol || coingeckoId.toUpperCase();
    const intent = await parseIntentWithAI(lastMessage, messages, tokenSymbol);
    console.log('[MCP-CHAT] Parsed intent:', intent);
    
    response.intent = intent.type;

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
        case 'community': {
          const [price, community] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchCommunityData(coingeckoId, token.address, token.chain)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (community) {
            response.data.community = community;
            response.available.push('community');

            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            if (naturalResponse) {
              response.text = naturalResponse;
            } else {
              const parts: string[] = [];
              if (community.twitterFollowers) parts.push(`Twitter: ${(community.twitterFollowers / 1000).toFixed(1)}K followers`);
              if (community.telegramMembers) parts.push(`Telegram: ${(community.telegramMembers / 1000).toFixed(1)}K members`);
              if (community.discordMembers) parts.push(`Discord: ${(community.discordMembers / 1000).toFixed(1)}K members`);
              response.text = parts.length > 0 
                ? `${tokenSymbol} community: ${parts.join(', ')}. Source: CoinGecko.`
                : `No community data available for ${tokenSymbol}.`;
            }
          } else {
            response.text = `Unable to fetch community data for ${tokenSymbol}. Try again soon.`;
            response.limited = true;
          }
          break;
        }

        case 'security': {
          const [price, security] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchSecurityData(token.address, token.chain)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (security) {
            response.data.security = security;
            response.available.push('security');

            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            if (naturalResponse) {
              response.text = naturalResponse;
            } else {
              const flags: string[] = [];
              if (security.honeypotDetected === true) flags.push('⚠️ Honeypot detected');
              if (security.ownershipRenounced === true) flags.push('✅ Ownership renounced');
              if (security.canMint === true) flags.push('⚠️ Can mint tokens');
              if (security.isLiquidityLocked === true) flags.push('✅ Liquidity locked');
              response.text = flags.length > 0 
                ? `${tokenSymbol} security: ${flags.join(', ')}. Score: ${security.score || 'N/A'}/100. Source: GoPlus.`
                : `Security data available for ${tokenSymbol}. Score: ${security.score || 'N/A'}/100. Source: GoPlus.`;
            }
          } else {
            response.text = `Unable to fetch security data for ${tokenSymbol}. The token may not be indexed yet.`;
            response.limited = true;
          }
          break;
        }

        case 'development': {
          const [price, development] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchDevelopmentData(coingeckoId, token.address, token.chain)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (development) {
            response.data.development = development;
            response.available.push('development');

            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            if (naturalResponse) {
              response.text = naturalResponse;
            } else {
              const parts: string[] = [];
              if (development.commits30d !== null) parts.push(`${development.commits30d} commits in 30 days`);
              if (development.contributors !== null) parts.push(`${development.contributors} contributors`);
              if (development.stars !== null) parts.push(`${development.stars} stars`);
              response.text = parts.length > 0 
                ? `${tokenSymbol} development: ${parts.join(', ')}. Score: ${development.score || 'N/A'}/100. Source: CoinGecko/GitHub.`
                : `Development data available for ${tokenSymbol}. Source: CoinGecko.`;
            }
          } else {
            response.text = `Unable to fetch development data for ${tokenSymbol}. No GitHub repository may be linked.`;
            response.limited = true;
          }
          break;
        }

        case 'summary': {
          // Fetch all data for a comprehensive summary including new data types
          const [price, ohlc, pools, categories, tokenomics, community, security, development] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchOHLC(coingeckoId, intent.window || '7'),
            fetchPools(token.address, token.chain),
            fetchMetadata(coingeckoId),
            fetchTokenomics(coingeckoId),
            fetchCommunityData(coingeckoId, token.address, token.chain),
            fetchSecurityData(token.address, token.chain),
            fetchDevelopmentData(coingeckoId, token.address, token.chain)
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
          if (tokenomics) {
            response.data.tokenomics = tokenomics;
            response.available.push('tokenomics');
          }
          if (community) {
            response.data.community = community;
            response.available.push('community');
          }
          if (security) {
            response.data.security = security;
            response.available.push('security');
          }
          if (development) {
            response.data.development = development;
            response.available.push('development');
          }

          const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
          if (naturalResponse) {
            response.text = naturalResponse;
          } else {
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

        case 'tokenomics': {
          const [price, tokenomics] = await Promise.all([
            fetchPrice(coingeckoId),
            fetchTokenomics(coingeckoId)
          ]);

          if (price) {
            response.data.price = price;
            response.available.push('price');
          }

          if (tokenomics) {
            response.data.tokenomics = tokenomics;
            response.available.push('tokenomics');

            const naturalResponse = await generateNaturalResponse(intent, response.data, tokenSymbol, lastMessage);
            if (naturalResponse) {
              response.text = naturalResponse;
            } else {
              const parts: string[] = [];
              if (tokenomics.marketCap) parts.push(`Market Cap: ${formatNumber(tokenomics.marketCap)}`);
              if (tokenomics.fdv) parts.push(`FDV: ${formatNumber(tokenomics.fdv)}`);
              if (tokenomics.circulatingRatio) parts.push(`Circulating: ${(tokenomics.circulatingRatio * 100).toFixed(1)}% of total supply`);
              if (tokenomics.tvl) parts.push(`TVL: ${formatNumber(tokenomics.tvl)}`);
              response.text = parts.length > 0 
                ? `${tokenSymbol} Tokenomics: ${parts.join('. ')}. Source: CoinGecko.`
                : `Tokenomics data available for ${tokenSymbol}. Source: CoinGecko.`;
            }
          } else {
            response.text = `Unable to fetch tokenomics data for ${tokenSymbol}. Try again soon.`;
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
      response.text = `I can help you with ${tokenSymbol}'s price, trends (7d, 30d, 90d), liquidity pools, community, security, development, or give you a summary. What would you like to know?`;
    }

    console.log('[MCP-CHAT] Response:', { available: response.available, errors: response.errors, intent: response.intent });

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
