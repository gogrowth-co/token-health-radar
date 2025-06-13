
import { toast } from "sonner";
import { TokenResult } from "@/components/token/types";

// Cache for token detail responses to reduce API calls - versioned
export const CACHE_VERSION = "v2"; // Increment this when logic changes
export const tokenDetailCache: Record<string, any> = {};

// Used to prevent too many API calls in a short period
let lastApiCallTime = 0;
let lastDetailApiCallTime = 0;
export const MIN_API_CALL_INTERVAL = 1000; // milliseconds between search calls
export const MIN_DETAIL_API_CALL_INTERVAL = 600; // milliseconds between detail calls

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

// Improved API call function with rate limiting and caching
export const callCoinGeckoAPI = async (url: string, isDetailRequest = false) => {
  const now = Date.now();
  const minInterval = isDetailRequest ? MIN_DETAIL_API_CALL_INTERVAL : MIN_API_CALL_INTERVAL;
  const lastTime = isDetailRequest ? lastDetailApiCallTime : lastApiCallTime;
  
  if (now - lastTime < minInterval) {
    await new Promise(resolve => 
      setTimeout(resolve, minInterval - (now - lastTime))
    );
  }
  
  if (isDetailRequest) {
    lastDetailApiCallTime = Date.now();
  } else {
    lastApiCallTime = Date.now();
  }
  
  // More robust headers
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    // Add API key headers if available
  };

  try {
    const response = await fetch(url, { headers });
    
    // Handle rate limiting explicitly
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      console.warn(`Rate limit hit, suggested wait time: ${waitTime}ms`);
      throw new Error("API rate limit reached. Please try again in a few moments.");
    }
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};

// Main search function for tokens
export const searchTokens = async (searchTerm: string): Promise<TokenResult[]> => {
  console.log("Searching for tokens with term:", searchTerm);
  
  // Check if search term looks like an address
  const isAddress = searchTerm.startsWith('0x') && searchTerm.length === 42;
  
  try {
    if (isAddress) {
      // Search by contract address
      const url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${searchTerm}`;
      const tokenData = await callCoinGeckoAPI(url, true);
      
      return [{
        id: tokenData.id,
        name: tokenData.name,
        symbol: tokenData.symbol,
        thumb: tokenData.image?.thumb || '',
        large: tokenData.image?.large || '',
        platforms: tokenData.platforms || {},
        market_cap: tokenData.market_data?.market_cap?.usd,
        price_usd: tokenData.market_data?.current_price?.usd,
        price_change_24h: tokenData.market_data?.price_change_percentage_24h,
        isErc20: isValidErc20Token(tokenData),
        description: tokenData.description?.en
      }];
    } else {
      // Search by name
      const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchTerm)}`;
      const searchData = await callCoinGeckoAPI(url);
      
      return searchData.coins?.map((coin: any) => ({
        id: coin.id,
        name: coin.name,
        symbol: coin.symbol,
        market_cap_rank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large,
        platforms: {},
        isErc20: KNOWN_ERC20_TOKENS.includes(coin.id)
      })) || [];
    }
  } catch (error) {
    console.error("Token search error:", error);
    throw error;
  }
};
