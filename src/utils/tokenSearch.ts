
import { toast } from "sonner";
import { TokenResult } from "@/components/token/types";

// Cache for token detail responses to reduce API calls - versioned
export const CACHE_VERSION = "v4"; // Increment for better rate limiting
export const tokenDetailCache: Record<string, any> = {};

// Increased intervals for better rate limiting on free tier
let lastApiCallTime = 0;
let lastDetailApiCallTime = 0;
export const MIN_API_CALL_INTERVAL = 2000; // 2 seconds for search calls
export const MIN_DETAIL_API_CALL_INTERVAL = 3000; // 3 seconds for detail calls

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

// Enhanced API call function with proper rate limiting and exponential backoff
export const callCoinGeckoAPI = async (url: string, isDetailRequest = false, retryCount = 0) => {
  const now = Date.now();
  const minInterval = isDetailRequest ? MIN_DETAIL_API_CALL_INTERVAL : MIN_API_CALL_INTERVAL;
  const lastTime = isDetailRequest ? lastDetailApiCallTime : lastApiCallTime;
  
  // Wait for the minimum interval if needed
  if (now - lastTime < minInterval) {
    const waitTime = minInterval - (now - lastTime);
    console.log(`Waiting ${waitTime}ms for rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Update last call time
  if (isDetailRequest) {
    lastDetailApiCallTime = Date.now();
  } else {
    lastApiCallTime = Date.now();
  }

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Always use free API with API key as query parameter
  let urlWithKey = url;
  if (
    typeof window !== "undefined" &&
    "SUPABASE_CG_API_KEY" in window &&
    (window as any).SUPABASE_CG_API_KEY
  ) {
    const key = (window as any).SUPABASE_CG_API_KEY;
    urlWithKey = url + (url.includes('?') ? '&' : '?') + "x_cg_pro_api_key=" + encodeURIComponent(key);
  }

  try {
    console.log(`Making CoinGecko API call to: ${url.split('?')[0]}`);
    const response = await fetch(urlWithKey, { headers });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const baseWaitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      
      // Exponential backoff: 60s, 120s, 240s
      const waitTime = baseWaitTime * Math.pow(2, retryCount);
      console.warn(`Rate limit hit, waiting ${waitTime}ms before retry (attempt ${retryCount + 1})`);
      
      if (retryCount < 2) { // Max 2 retries
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callCoinGeckoAPI(url, isDetailRequest, retryCount + 1);
      } else {
        throw new Error("API rate limit reached. Please try again in a few minutes.");
      }
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
