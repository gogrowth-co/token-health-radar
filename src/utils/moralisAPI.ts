import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeChainId, getSupportedChains } from "./tokenCacheUtils";

// Unified chain configuration (matches backend)
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

// Rate limiting for edge function calls
let lastMoralisCallTime = 0;
export const MIN_MORALIS_API_CALL_INTERVAL = 1000; // 1 second between calls

// Enhanced API call function using Supabase edge function
export const callMoralisAPI = async (action: string, params: Record<string, any> = {}, retryCount = 0) => {
  const now = Date.now();
  
  // Wait for the minimum interval if needed
  if (now - lastMoralisCallTime < MIN_MORALIS_API_CALL_INTERVAL) {
    const waitTime = MIN_MORALIS_API_CALL_INTERVAL - (now - lastMoralisCallTime);
    console.log(`[MORALIS-API] Waiting ${waitTime}ms for rate limiting...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastMoralisCallTime = Date.now();

  try {
    console.log(`[MORALIS-API] Making edge function request for: ${action}`, params);
    
    // Normalize chain ID if provided using the shared function
    const requestBody = {
      action,
      ...params,
      ...(params.chainId && { chainId: normalizeChainId(params.chainId) })
    };

    console.log(`[MORALIS-API] Request body:`, requestBody);

    const { data, error } = await supabase.functions.invoke('moralis-token-search', {
      body: requestBody
    });

    if (error) {
      console.error(`[MORALIS-API] Edge function error:`, error);
      throw new Error(`Moralis API Error: ${error.message}`);
    }

    if (data.error) {
      console.error(`[MORALIS-API] API Error:`, data.error);
      
      // Handle rate limiting with retry
      if (data.error.includes('rate limit') && retryCount < 2) {
        console.warn(`[MORALIS-API] Rate limit hit, retrying attempt ${retryCount + 1}`);
        await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
        return callMoralisAPI(action, params, retryCount + 1);
      }
      
      throw new Error(data.error);
    }

    console.log(`[MORALIS-API] Response received successfully`);
    return data;
  } catch (error: any) {
    console.error(`[MORALIS-API] Request failed:`, error);
    
    // Provide more user-friendly error messages
    if (error.message?.includes('Failed to invoke function')) {
      throw new Error('Unable to connect to the search service. Please try again later.');
    }
    
    throw error;
  }
};

// Search tokens using Moralis API with consistent chain handling
export const searchTokensByMoralis = async (searchTerm: string, limit = 10) => {
  try {
    console.log(`[MORALIS-API] Searching for tokens: "${searchTerm}"`);
    
    if (!searchTerm || searchTerm.trim() === '') {
      throw new Error('Please enter a token name or symbol');
    }
    
    const data = await callMoralisAPI('search', {
      searchTerm: searchTerm.trim(),
      limit
    });
    
    return data.tokens || [];
  } catch (error) {
    console.error(`[MORALIS-API] Search failed:`, error);
    throw error;
  }
};

// Get token metadata using Moralis API with normalized chain ID
export const getTokenMetadata = async (tokenAddress: string, chainId: string) => {
  try {
    console.log(`[MORALIS-API] Fetching metadata for token: ${tokenAddress} on chain: ${chainId}`);
    
    const normalizedChainId = normalizeChainId(chainId);
    
    const data = await callMoralisAPI('metadata', {
      tokenAddress: tokenAddress.toLowerCase(),
      chainId: normalizedChainId
    });
    
    return data.metadata || {};
  } catch (error) {
    console.error(`[MORALIS-API] Metadata fetch failed:`, error);
    throw error;
  }
};

// Get token price using Moralis API with normalized chain ID
export const getTokenPrice = async (tokenAddress: string, chainId: string) => {
  try {
    console.log(`[MORALIS-API] Fetching price for token: ${tokenAddress} on chain: ${chainId}`);
    
    const normalizedChainId = normalizeChainId(chainId);
    
    const data = await callMoralisAPI('price', {
      tokenAddress: tokenAddress.toLowerCase(),
      chainId: normalizedChainId
    });
    
    return data.price || {};
  } catch (error) {
    console.error(`[MORALIS-API] Price fetch failed:`, error);
    // Price data is optional, return empty object on failure
    return {};
  }
};

// Verify token address and get basic info with consistent chain handling
export const verifyTokenAddress = async (tokenAddress: string, chainId: string) => {
  try {
    console.log(`[MORALIS-API] Verifying token address: ${tokenAddress} on chain: ${chainId}`);
    
    const normalizedChainId = normalizeChainId(chainId);
    
    const data = await callMoralisAPI('verify', {
      tokenAddress: tokenAddress.toLowerCase(),
      chainId: normalizedChainId
    });
    
    return data.verified || false;
  } catch (error) {
    console.error(`[MORALIS-API] Token verification failed:`, error);
    return false;
  }
};

// Export the shared getSupportedChains function
export { getSupportedChains };
