import { supabase } from "@/integrations/supabase/client";
import { TokenResult, TokenInfoEnriched } from "@/components/token/types";
import type { Database } from "@/integrations/supabase/types";

// Use the actual database type instead of custom interface
type TokenDataCacheRow = Database['public']['Tables']['token_data_cache']['Row'];

// Unified chain configuration (matches edge function)
const CHAIN_MAP = {
  ethereum: {
    name: 'Ethereum',
    moralis: '0x1',
    goplus: '1',
    gecko: 'eth',
    etherscan: 'https://api.etherscan.io',
    symbol: 'ETH'
  },
  bsc: {
    name: 'BNB Chain',
    moralis: '0x38',
    goplus: '56',
    gecko: 'bsc',
    etherscan: 'https://api.bscscan.com',
    symbol: 'BNB'
  },
  arbitrum: {
    name: 'Arbitrum',
    moralis: '0xa4b1',
    goplus: '42161',
    gecko: 'arbitrum',
    etherscan: 'https://api.arbiscan.io',
    symbol: 'ETH'
  },
  optimism: {
    name: 'Optimism',
    moralis: '0xa',
    goplus: '10',
    gecko: 'optimism',
    etherscan: 'https://api-optimistic.etherscan.io',
    symbol: 'ETH'
  },
  base: {
    name: 'Base',
    moralis: '0x2105',
    goplus: '8453',
    gecko: 'base',
    etherscan: 'https://api.basescan.org',
    symbol: 'ETH'
  },
  polygon: {
    name: 'Polygon',
    moralis: '0x89',
    goplus: '137',
    gecko: 'polygon_pos',
    etherscan: 'https://api.polygonscan.com',
    symbol: 'MATIC'
  }
};

// Chain ID mapping for consistent handling
const CHAIN_ID_MAP: Record<string, string> = {
  '1': '0x1',        // Ethereum mainnet
  'eth': '0x1',
  'ethereum': '0x1',
  '137': '0x89',     // Polygon
  'polygon': '0x89',
  '56': '0x38',      // BSC
  'bsc': '0x38',
  '42161': '0xa4b1', // Arbitrum
  'arbitrum': '0xa4b1',
  '43114': '0xa86a', // Avalanche
  'avalanche': '0xa86a',
  '10': '0xa',       // Optimism
  'optimism': '0xa',
  '8453': '0x2105',  // Base
  'base': '0x2105',
  '250': '0xfa',     // Fantom
  'fantom': '0xfa'
};

/**
 * Normalize chain ID to hex format
 */
export const normalizeChainId = (chainId: string): string => {
  if (!chainId) return '0x1'; // Default to Ethereum
  
  const normalized = chainId.toLowerCase();
  return CHAIN_ID_MAP[normalized] || chainId;
};

/**
 * Get chain configuration by Moralis chain ID
 */
export const getChainConfigByMoralisId = (chainId: string): any => {
  return Object.values(CHAIN_MAP).find(chain => chain.moralis === chainId);
};

/**
 * Fetch token data from database cache by token address and chain ID
 */
export const getTokenFromCache = async (tokenAddress: string, chainId: string = '0x1'): Promise<TokenDataCacheRow | null> => {
  try {
    const normalizedChainId = normalizeChainId(chainId);
    console.log(`[CACHE] Searching for token: ${tokenAddress} on chain: ${normalizedChainId}`);
    
    // Search by token address and chain ID
    const { data: tokenData, error: tokenError } = await supabase
      .from("token_data_cache")
      .select("*")
      .eq("token_address", tokenAddress.toLowerCase())
      .eq("chain_id", normalizedChainId)
      .maybeSingle();

    if (tokenData && !tokenError) {
      console.log(`[CACHE] Found cached data for ${tokenAddress} on chain ${normalizedChainId}:`, tokenData);
      return tokenData;
    }

    console.log(`[CACHE] No cached data found for ${tokenAddress} on chain ${normalizedChainId}`);
    return null;
  } catch (err) {
    console.warn(`[CACHE] Exception fetching cached data for ${tokenAddress} on chain ${chainId}:`, err);
    return null;
  }
};

/**
 * Create enriched token info from cache data
 */
export const createTokenInfoFromCache = (cacheData: TokenDataCacheRow): TokenInfoEnriched => {
  return {
    name: cacheData.name || '',
    symbol: (cacheData.symbol || '').toUpperCase(),
    description: cacheData.description || '',
    website_url: cacheData.website_url || '',
    twitter_handle: cacheData.twitter_handle || '',
    github_url: cacheData.github_url || '',
    logo_url: cacheData.logo_url || '',
    coingecko_id: cacheData.coingecko_id || '',
    current_price_usd: Number(cacheData.current_price_usd) || 0,
    price_change_24h: Number(cacheData.price_change_24h) || 0,
    market_cap_usd: Number(cacheData.market_cap_usd) || 0,
    total_value_locked_usd: cacheData.total_value_locked_usd || 'N/A'
  };
};

interface MarketData {
  price_usd: number;
  price_change_24h: number;
  market_cap: number;
}

interface ApiData {
  market_data?: {
    current_price?: { usd?: number };
    price_change_percentage_24h?: number;
    market_cap?: { usd?: number };
  };
}

interface TokenWithMarketData {
  current_price_usd?: number;
  market_cap?: number;
  price_change_percentage_24h?: number;
  market_cap_rank?: number;
  rank?: number;
}

/**
 * Create enhanced market data with better fallbacks
 */
export const createEnhancedMarketData = (token: TokenWithMarketData, apiData?: ApiData): MarketData => {
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
  if (token.market_cap_rank || token.rank) {
    const rank = token.market_cap_rank || token.rank;
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

interface TokenWithBasicInfo {
  name: string;
  symbol?: string;
  market_cap_rank?: number;
  rank?: number;
  platforms?: Record<string, string>;
}

/**
 * Create meaningful description with available data
 */
export const createMeaningfulDescription = (token: TokenWithBasicInfo, apiDescription?: string): string => {
  // Use API description if available and meaningful
  if (apiDescription && apiDescription.trim() && !apiDescription.includes('is a cryptocurrency')) {
    const cleanDesc = apiDescription.replace(/<[^>]*>/g, '').split('.')[0] + '.';
    return cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + '...' : cleanDesc;
  }
  
  // Create description from token data
  let desc = `${token.name} (${(token.symbol || '').toUpperCase()})`;
  
  const rank = token.market_cap_rank || token.rank;
  if (rank && rank > 0) {
    desc += ` is ranked #${rank} by market capitalization`;
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
export const callWithRetry = async <T>(apiCall: () => Promise<T>, maxRetries = 2): Promise<T> => {
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
  
  // This should never be reached due to the throw above, but TypeScript needs it
  throw new Error('Maximum retry attempts exceeded');
};

/**
 * Get supported chain names for display
 */
export const getSupportedChains = (): Record<string, string> => {
  const chains: Record<string, string> = {};
  Object.entries(CHAIN_MAP).forEach(([key, config]) => {
    chains[config.moralis] = config.name;
  });
  return chains;
};
