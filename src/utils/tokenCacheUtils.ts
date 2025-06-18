
import { supabase } from "@/integrations/supabase/client";
import { TokenResult } from "@/components/token/types";

/**
 * Fetch token data from database cache by CoinGecko ID
 */
export const getTokenFromCache = async (coingeckoId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from("token_data_cache")
      .select("*")
      .eq("coingecko_id", coingeckoId)
      .maybeSingle();

    if (error) {
      console.log(`[CACHE] Error querying cache for ${coingeckoId}:`, error);
      return null;
    }

    if (!data) {
      console.log(`[CACHE] No cached data found for ${coingeckoId}`);
      return null;
    }

    console.log(`[CACHE] Found cached data for ${coingeckoId}:`, data);
    return data;
  } catch (err) {
    console.warn(`[CACHE] Exception fetching cached data for ${coingeckoId}:`, err);
    return null;
  }
};

/**
 * Create enriched token info from cache data
 */
export const createTokenInfoFromCache = (cacheData: any): any => {
  return {
    name: cacheData.name || '',
    symbol: (cacheData.symbol || '').toUpperCase(),
    description: cacheData.description || '',
    website_url: cacheData.website_url || '',
    twitter_handle: cacheData.twitter_handle || '',
    github_url: cacheData.github_url || '',
    logo_url: cacheData.logo_url || '',
    coingecko_id: cacheData.coingecko_id,
    current_price_usd: cacheData.current_price_usd || 0,
    price_change_24h: cacheData.price_change_24h || 0,
    market_cap_usd: cacheData.market_cap_usd || 0,
    total_value_locked_usd: cacheData.total_value_locked_usd || 'N/A'
  };
};

/**
 * Create enhanced market data with better fallbacks
 */
export const createEnhancedMarketData = (token: any, apiData?: any) => {
  // Priority 1: Use API data if available
  if (apiData && apiData.market_data) {
    return {
      price_usd: apiData.market_data.current_price?.usd || 0,
      price_change_24h: apiData.market_data.price_change_percentage_24h || 0,
      market_cap: apiData.market_data.market_cap?.usd || 0
    };
  }

  // Priority 2: Use any existing market data from search results
  if (token.current_price_usd !== undefined || token.market_cap !== undefined) {
    return {
      price_usd: token.current_price_usd || 0,
      price_change_24h: token.price_change_percentage_24h || 0,
      market_cap: token.market_cap || 0
    };
  }

  // Priority 3: Estimate based on market cap rank
  let estimatedMarketCap = 0;
  if (token.market_cap_rank) {
    const rank = token.market_cap_rank;
    if (rank <= 10) estimatedMarketCap = 10000000000; // 10B+
    else if (rank <= 50) estimatedMarketCap = 1000000000; // 1B+
    else if (rank <= 100) estimatedMarketCap = 100000000; // 100M+
    else if (rank <= 500) estimatedMarketCap = 10000000; // 10M+
    else estimatedMarketCap = 1000000; // 1M+
  }

  return {
    price_usd: 0,
    price_change_24h: 0,
    market_cap: estimatedMarketCap
  };
};

/**
 * Create meaningful description with available data
 */
export const createMeaningfulDescription = (token: any, apiDescription?: string) => {
  // Use API description if available and meaningful
  if (apiDescription && apiDescription.trim() && !apiDescription.includes('is a cryptocurrency')) {
    const cleanDesc = apiDescription.replace(/<[^>]*>/g, '').split('.')[0] + '.';
    return cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + '...' : cleanDesc;
  }
  
  // Create description from token data
  let desc = `${token.name} (${(token.symbol || '').toUpperCase()})`;
  
  if (token.market_cap_rank && token.market_cap_rank > 0) {
    desc += ` is ranked #${token.market_cap_rank} by market capitalization`;
  } else {
    desc += ` is a cryptocurrency token`;
  }
  
  // Add chain information if available
  if (token.platforms && Object.keys(token.platforms).length > 0) {
    const chainCount = Object.keys(token.platforms).length;
    desc += `. Available on ${chainCount} blockchain${chainCount > 1 ? 's' : ''}`;
  }
  
  return desc;
};

/**
 * Enhanced API call with retry logic for network failures
 */
export const callWithRetry = async (apiCall: () => Promise<any>, maxRetries = 2): Promise<any> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall();
    } catch (error: any) {
      const isNetworkError = error.message?.includes('Failed to fetch') || 
                           error.message?.includes('network') ||
                           error.message?.includes('timeout');
      
      if (isNetworkError && attempt < maxRetries) {
        console.log(`[RETRY] Network error, retrying attempt ${attempt + 2}/${maxRetries + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        continue;
      }
      
      throw error;
    }
  }
};
