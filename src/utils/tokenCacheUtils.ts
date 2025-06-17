
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
      .single();

    if (error) {
      console.log(`[CACHE] No cached data found for ${coingeckoId}`);
      return null;
    }

    console.log(`[CACHE] Found cached data for ${coingeckoId}:`, data);
    return data;
  } catch (err) {
    console.warn(`[CACHE] Error fetching cached data for ${coingeckoId}:`, err);
    return null;
  }
};

/**
 * Create enriched token info from cache data
 */
export const createTokenInfoFromCache = (cacheData: any): any => {
  return {
    name: cacheData.name,
    symbol: cacheData.symbol?.toUpperCase(),
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
 * Create fallback market data based on market cap rank
 */
export const createFallbackMarketData = (token: any) => {
  // If we have market cap rank but no actual market cap, create estimate
  let estimatedMarketCap = 0;
  if (token.market_cap_rank) {
    // Very rough estimation based on rank
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
