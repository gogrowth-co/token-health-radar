
import { toast } from "sonner";
import { TokenResult } from "@/components/token/types";

// Cache for token detail responses to reduce API calls - versioned
export const CACHE_VERSION = "v5"; // Increment for Demo Plan authentication changes
export const tokenDetailCache: Record<string, any> = {};

// Demo Plan rate limits: 30 calls/min (2 seconds between calls)
let lastApiCallTime = 0;
let lastDetailApiCallTime = 0;
export const MIN_API_CALL_INTERVAL = 2000; // 2 seconds for Demo Plan
export const MIN_DETAIL_API_CALL_INTERVAL = 2000; // 2 seconds for Demo Plan

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

// Enhanced API call function with Demo Plan authentication and proper rate limiting
export const callCoinGeckoAPI = async (url: string, isDetailRequest = false, retryCount = 0) => {
  const now = Date.now();
  const minInterval = MIN_API_CALL_INTERVAL; // Same interval for Demo Plan
  const lastTime = isDetailRequest ? lastDetailApiCallTime : lastApiCallTime;
  
  // Wait for the minimum interval if needed
  if (now - lastTime < minInterval) {
    const waitTime = minInterval - (now - lastTime);
    console.log(`[COINGECKO-API] Waiting ${waitTime}ms for Demo Plan rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Update last call time
  if (isDetailRequest) {
    lastDetailApiCallTime = Date.now();
  } else {
    lastApiCallTime = Date.now();
  }

  // Demo Plan requires Authorization header, not query parameter
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  // Add Authorization header if API key is available (Demo Plan)
  if (
    typeof window !== "undefined" &&
    "SUPABASE_CG_API_KEY" in window &&
    (window as any).SUPABASE_CG_API_KEY
  ) {
    const apiKey = (window as any).SUPABASE_CG_API_KEY;
    headers['x-cg-demo-api-key'] = apiKey;
    console.log(`[COINGECKO-API] Using Demo Plan authentication`);
  } else {
    console.log(`[COINGECKO-API] No API key found, using free tier`);
  }

  try {
    console.log(`[COINGECKO-API] Making request to: ${url.split('?')[0]}`);
    const response = await fetch(url, { headers });

    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const baseWaitTime = retryAfter ? parseInt(retryAfter) * 1000 : 2000; // Demo Plan: shorter wait
      
      // Exponential backoff for Demo Plan: 2s, 4s, 8s
      const waitTime = baseWaitTime * Math.pow(2, retryCount);
      console.warn(`[COINGECKO-API] Rate limit hit, waiting ${waitTime}ms before retry (attempt ${retryCount + 1})`);
      
      if (retryCount < 2) { // Max 2 retries
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return callCoinGeckoAPI(url, isDetailRequest, retryCount + 1);
      } else {
        throw new Error("API rate limit reached. Please try again in a moment.");
      }
    }
    
    if (!response.ok) {
      console.error(`[COINGECKO-API] Error: ${response.status} ${response.statusText}`);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[COINGECKO-API] Response received successfully`);
    return data;
  } catch (error) {
    console.error(`[COINGECKO-API] Request failed:`, error);
    throw error;
  }
};
