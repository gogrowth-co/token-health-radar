import { toast } from "sonner";
import { TokenResult } from "@/components/token/types";

// Cache for token detail responses to reduce API calls - versioned
export const CACHE_VERSION = "v3"; // Increment for API key usage
export const tokenDetailCache: Record<string, any> = {};

// Used to prevent too many API calls in a short period
let lastApiCallTime = 0;
let lastDetailApiCallTime = 0;
export const MIN_API_CALL_INTERVAL = 500; // Reduced with API key
export const MIN_DETAIL_API_CALL_INTERVAL = 300; // Reduced with API key

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

// Enhanced API call function with API key support (updated for FREE API KEY, not paid/pro)
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

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Always prefer free endpoint with your API key if present (not Pro)
  let urlWithKey = url;
  if (
    typeof window !== "undefined" &&
    "SUPABASE_CG_API_KEY" in window &&
    (window as any).SUPABASE_CG_API_KEY
  ) {
    // Append x_cg_pro_api_key param for free key
    const key = (window as any).SUPABASE_CG_API_KEY;
    // Support both ? and & in URL
    urlWithKey = url + (url.includes('?') ? '&' : '?') + "x_cg_pro_api_key=" + encodeURIComponent(key);
  }

  try {
    console.log(`Making CoinGecko API call to: ${urlWithKey}`);
    const response = await fetch(urlWithKey, { headers });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      console.warn(`Rate limit hit, suggested wait time: ${waitTime}ms`);
      throw new Error("API rate limit reached. Please try again in a few moments.");
    }
    if (!response.ok) {
      console.error(`CoinGecko API error: ${response.status} ${response.statusText}`);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`CoinGecko API response received successfully`);
    return data;
  } catch (error) {
    console.error(`CoinGecko API call failed:`, error);
    throw error;
  }
};
