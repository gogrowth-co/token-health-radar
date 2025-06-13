
import { toast } from "sonner";
import { TokenResult } from "@/components/token/types";
import { supabase } from "@/integrations/supabase/client";

// Cache for token detail responses to reduce API calls - versioned
export const CACHE_VERSION = "v3"; // Increment this when logic changes
export const tokenDetailCache: Record<string, any> = {};

// Enhanced rate limiting with exponential backoff
let lastApiCallTime = 0;
let lastDetailApiCallTime = 0;
let consecutiveFailures = 0;
export const MIN_API_CALL_INTERVAL = 2000; // Increased to 2 seconds
export const MIN_DETAIL_API_CALL_INTERVAL = 1500; // Increased interval
export const MAX_BACKOFF_TIME = 30000; // Maximum 30 seconds

// Known ERC-20 tokens that might not be correctly identified by platform data
export const KNOWN_ERC20_TOKENS = [
  'ethereum', 'uniswap', 'dai', 'chainlink', 'aave', 'compound', 
  'maker', 'wrapped-bitcoin', 'tether', 'usd-coin'
];

// Helper function to properly determine if a token is ERC-20 compatible
export const isValidErc20Token = (token: any): boolean => {
  // Check if it's in our known ERC-20 whitelist
  if (KNOWN_ERC20_TOKENS.includes(token.id)) {
    return true;
  }
  
  // Check platforms data for ANY EVM chain with 0x address
  if (token.platforms) {
    return Object.values(token.platforms || {}).some(addr => 
      typeof addr === 'string' && addr.trim().toLowerCase().startsWith('0x')
    );
  }
  
  // Fallback based on token naming
  const nameAndSymbol = (token.name + token.symbol).toLowerCase();
  if (nameAndSymbol.includes('erc20') || nameAndSymbol.includes('erc-20') || 
      nameAndSymbol.includes('eth') || nameAndSymbol.includes('ethereum')) {
    return true;
  }
  
  return false;
}

// Get API key from Supabase edge function
const getApiKey = async (): Promise<string | null> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-coingecko-key');
    if (error || !data?.key) {
      console.warn('CoinGecko API key not available, using public API');
      return null;
    }
    return data.key;
  } catch (error) {
    console.warn('Failed to get API key:', error);
    return null;
  }
};

// Calculate backoff time with exponential backoff
const getBackoffTime = (): number => {
  if (consecutiveFailures === 0) return 0;
  return Math.min(1000 * Math.pow(2, consecutiveFailures - 1), MAX_BACKOFF_TIME);
};

// Enhanced API call function with rate limiting, caching, and API key usage
export const callCoinGeckoAPI = async (url: string, isDetailRequest = false) => {
  const now = Date.now();
  const minInterval = isDetailRequest ? MIN_DETAIL_API_CALL_INTERVAL : MIN_API_CALL_INTERVAL;
  const lastTime = isDetailRequest ? lastDetailApiCallTime : lastApiCallTime;
  const backoffTime = getBackoffTime();
  
  // Calculate total wait time including backoff
  const timeSinceLastCall = now - lastTime;
  const totalWaitTime = Math.max(minInterval + backoffTime - timeSinceLastCall, 0);
  
  if (totalWaitTime > 0) {
    console.log(`Rate limiting: waiting ${totalWaitTime}ms before next API call`);
    await new Promise(resolve => setTimeout(resolve, totalWaitTime));
  }
  
  if (isDetailRequest) {
    lastDetailApiCallTime = Date.now();
  } else {
    lastApiCallTime = Date.now();
  }
  
  try {
    // Get API key for authenticated requests
    const apiKey = await getApiKey();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    // Add API key if available
    let finalUrl = url;
    if (apiKey) {
      const separator = url.includes('?') ? '&' : '?';
      finalUrl = `${url}${separator}x_cg_demo_api_key=${apiKey}`;
      console.log('Using authenticated CoinGecko API request');
    }

    const response = await fetch(finalUrl, { headers });
    
    // Handle rate limiting with better error messages
    if (response.status === 429) {
      consecutiveFailures++;
      const retryAfter = response.headers.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      console.warn(`CoinGecko rate limit hit. Consecutive failures: ${consecutiveFailures}, suggested wait: ${waitTime}ms`);
      throw new Error(`API rate limit reached. Please wait ${Math.ceil(waitTime/1000)} seconds before trying again.`);
    }
    
    if (!response.ok) {
      consecutiveFailures++;
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }
    
    // Reset failure count on success
    consecutiveFailures = 0;
    return await response.json();
  } catch (error) {
    console.error('CoinGecko API call failed:', error);
    throw error;
  }
};

// Check database cache before making API calls
export const checkTokenCache = async (searchTerm: string): Promise<TokenResult[]> => {
  try {
    const { data, error } = await supabase
      .from('token_data_cache')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,symbol.ilike.%${searchTerm}%`)
      .limit(5);
    
    if (error) {
      console.warn('Database cache check failed:', error);
      return [];
    }
    
    if (data && data.length > 0) {
      console.log(`Found ${data.length} cached tokens for search term: ${searchTerm}`);
      return data.map(token => ({
        id: token.coingecko_id || token.token_address,
        name: token.name,
        symbol: token.symbol,
        large: token.logo_url,
        thumb: token.logo_url,
        market_cap_rank: null, // Database doesn't store market_cap_rank
        platforms: {}, // Database doesn't store platforms, use empty object
        price_usd: token.current_price_usd || 0, // Map to correct property
        price_change_24h: token.price_change_24h || 0,
        market_cap: token.market_cap_usd || 0, // Map to correct property
        isErc20: KNOWN_ERC20_TOKENS.includes(token.coingecko_id || ''), // Use whitelist since no platforms data
        description: token.description || `${token.name} (${token.symbol}) - Cached data`
      }));
    }
    
    return [];
  } catch (error) {
    console.warn('Cache check error:', error);
    return [];
  }
};

// Store successful API responses in cache
export const cacheTokenData = async (tokens: any[]) => {
  try {
    const cacheData = tokens.map(token => ({
      coingecko_id: token.id,
      token_address: token.platforms?.ethereum || null,
      name: token.name,
      symbol: token.symbol,
      logo_url: token.large || token.thumb,
      market_cap_rank: token.market_cap_rank,
      current_price_usd: token.price_usd || 0,
      price_change_24h: token.price_change_24h || 0,
      market_cap_usd: token.market_cap || 0,
      last_updated: new Date().toISOString()
    }));
    
    // Use upsert to avoid duplicates
    const { error } = await supabase
      .from('token_data_cache')
      .upsert(cacheData, { onConflict: 'coingecko_id' });
    
    if (error) {
      console.warn('Failed to cache token data:', error);
    } else {
      console.log(`Cached ${cacheData.length} tokens successfully`);
    }
  } catch (error) {
    console.warn('Cache storage error:', error);
  }
};
