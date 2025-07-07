import { getChainConfigByMoralisId } from './chainConfig.ts';

// API Health Tracking
const goplusApiHealthStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  authFailures: 0,
  lastSuccessTime: 0,
  lastFailureTime: 0,
  errors: [] as string[]
};

// Retry configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2
};

// Helper function for exponential backoff delay
function calculateDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

// Access token cache for GoPlus API
let goplusAccessToken: string | null = null;
let tokenExpiration: number = 0;

// Get or refresh GoPlus access token
async function getGoPlusAccessToken(): Promise<string | null> {
  console.log(`[GOPLUS-AUTH] Checking access token status`);
  
  // Check if we have a valid token
  if (goplusAccessToken && Date.now() < tokenExpiration) {
    console.log(`[GOPLUS-AUTH] Using cached access token (expires in ${Math.round((tokenExpiration - Date.now()) / 1000)}s)`);
    return goplusAccessToken;
  }

  // Get API key from environment
  const apiKey = Deno.env.get('GOPLUS_API_KEY');
  if (!apiKey) {
    console.error(`[GOPLUS-AUTH] GOPLUS_API_KEY not configured`);
    return null;
  }

  try {
    console.log(`[GOPLUS-AUTH] Requesting new access token...`);
    const response = await fetch('https://api.gopluslabs.io/api/v1/authorization', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: apiKey
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GOPLUS-AUTH] Failed to get access token: ${response.status} ${response.statusText}`);
      console.error(`[GOPLUS-AUTH] Error response:`, errorText);
      return null;
    }

    const authData = await response.json();
    console.log(`[GOPLUS-AUTH] Auth response:`, authData);

    if (authData.code === 1 && authData.data?.access_token) {
      goplusAccessToken = authData.data.access_token;
      // Set expiration to 23 hours from now (tokens expire in 24 hours)
      tokenExpiration = Date.now() + (23 * 60 * 60 * 1000);
      console.log(`[GOPLUS-AUTH] Successfully obtained access token (expires in ${authData.data.expires_in || 86400}s)`);
      return goplusAccessToken;
    } else {
      console.error(`[GOPLUS-AUTH] Invalid auth response:`, authData);
      return null;
    }
  } catch (error) {
    console.error(`[GOPLUS-AUTH] Error getting access token:`, error);
    return null;
  }
}

// GoPlus Security API client with enhanced debugging and authentication, retry logic and health monitoring
export async function fetchGoPlusSecurity(tokenAddress: string, chainId: string) {
  console.log(`[GOPLUS] === STARTING GOPLUS API CALL ===`);
  console.log(`[GOPLUS] Token: ${tokenAddress}, Chain: ${chainId}`);
  console.log(`[GOPLUS] API Health Stats:`, goplusApiHealthStats);
  
  goplusApiHealthStats.totalRequests++;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateDelay(attempt - 1);
        console.log(`[GOPLUS] Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    // Get access token first
    const accessToken = await getGoPlusAccessToken();
    if (!accessToken) {
      console.error(`[GOPLUS] FAILED - Could not obtain access token`);
      return null;
    }

    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[GOPLUS] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    console.log(`[GOPLUS] Chain mapping: ${chainId} -> ${chainConfig.goplus} (${chainConfig.name})`);
    console.log(`[GOPLUS] Target token: ${tokenAddress.toLowerCase()}`);

    const url = `https://api.gopluslabs.io/api/v1/token_security/${chainConfig.goplus}?contract_addresses=${tokenAddress.toLowerCase()}`;
    console.log(`[GOPLUS] Request URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    console.log(`[GOPLUS] Response status: ${response.status}`);
    console.log(`[GOPLUS] Response headers:`, Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[GOPLUS] FAILED - API error: ${response.status} ${response.statusText}`);
      console.error(`[GOPLUS] Error response body:`, errorText);
      throw new Error(`GoPlus API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`[GOPLUS] Raw response text (first 500 chars):`, responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[GOPLUS] === FULL RAW API RESPONSE ===`);
      console.log(`[GOPLUS] Response JSON:`, JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.error(`[GOPLUS] FAILED - Invalid JSON response:`, jsonError);
      console.error(`[GOPLUS] Response text was:`, responseText);
      return null;
    }
    
    // Check response structure
    console.log(`[GOPLUS] Response analysis:`, {
      code: data.code,
      message: data.message,
      hasResult: !!data.result,
      resultKeys: data.result ? Object.keys(data.result) : [],
      searchingFor: tokenAddress.toLowerCase()
    });
    
    if (!data.result) {
      console.error(`[GOPLUS] FAILED - No result object in response`);
      return null;
    }
    
    // Try different case variations to find the token data
    const resultKeys = Object.keys(data.result);
    console.log(`[GOPLUS] Available result keys:`, resultKeys);
    
    let tokenData = null;
    const searchAddresses = [
      tokenAddress.toLowerCase(),
      tokenAddress.toUpperCase(), 
      tokenAddress // original case
    ];
    
    for (const addr of searchAddresses) {
      if (data.result[addr]) {
        tokenData = data.result[addr];
        console.log(`[GOPLUS] Found token data using address: ${addr}`);
        break;
      }
    }
    
    if (!tokenData) {
      console.error(`[GOPLUS] FAILED - No security data found for token: ${tokenAddress}`);
      console.error(`[GOPLUS] Searched for addresses:`, searchAddresses);
      console.error(`[GOPLUS] Available addresses in response:`, resultKeys);
      return null;
    }
    
    console.log(`[GOPLUS] Raw token data:`, JSON.stringify(tokenData, null, 2));
    
    // Enhanced data mapping based on GoPlus API documentation with proper null handling
    const securityData = {
      // Core security indicators
      ownership_renounced: tokenData.owner_address ? tokenData.owner_address === '0x0000000000000000000000000000000000000000' : null,
      can_mint: tokenData.is_mintable !== undefined ? tokenData.is_mintable === '1' : null,
      honeypot_detected: tokenData.is_honeypot !== undefined ? tokenData.is_honeypot === '1' : null,
      freeze_authority: tokenData.can_take_back_ownership !== undefined ? tokenData.can_take_back_ownership === '1' : null,
      audit_status: tokenData.trust_list !== undefined ? (tokenData.trust_list === '1' ? 'verified' : 'unverified') : 'unknown',
      
      // Additional Webacy-compatible fields with proper mapping
      is_proxy: tokenData.is_proxy !== undefined ? tokenData.is_proxy === '1' : null,
      is_blacklisted: tokenData.is_blacklisted !== undefined ? tokenData.is_blacklisted === '1' : null,
      access_control: tokenData.can_take_back_ownership !== undefined ? tokenData.can_take_back_ownership === '1' : null,
      contract_verified: tokenData.is_open_source !== undefined ? tokenData.is_open_source === '1' : null,
      
      // Tax information (used for scoring)
      buy_tax: tokenData.buy_tax !== undefined ? parseFloat(tokenData.buy_tax) : null,
      sell_tax: tokenData.sell_tax !== undefined ? parseFloat(tokenData.sell_tax) : null,
      transfer_tax: tokenData.transfer_tax !== undefined ? parseFloat(tokenData.transfer_tax) : null,
      
      // Multisig status (derived from governance indicators)
      multisig_status: tokenData.owner_address && tokenData.owner_address !== '0x0000000000000000000000000000000000000000' ? 'unknown' : 'renounced'
    };

    console.log(`[GOPLUS] Data field mapping:`, {
      raw_owner_address: tokenData.owner_address,
      raw_is_mintable: tokenData.is_mintable,
      raw_is_honeypot: tokenData.is_honeypot,
      raw_can_take_back_ownership: tokenData.can_take_back_ownership,
      raw_trust_list: tokenData.trust_list,
      raw_is_proxy: tokenData.is_proxy,
      raw_is_blacklisted: tokenData.is_blacklisted,
      raw_is_open_source: tokenData.is_open_source,
      mapped_data: securityData
    });
    
      console.log(`[GOPLUS] SUCCESS - Extracted security data:`, securityData);
      
      // Update success stats
      goplusApiHealthStats.successfulRequests++;
      goplusApiHealthStats.lastSuccessTime = Date.now();
      console.log(`[GOPLUS] API Health - Success rate: ${((goplusApiHealthStats.successfulRequests / goplusApiHealthStats.totalRequests) * 100).toFixed(1)}%`);
      
      return securityData;
      
    } catch (error) {
      console.error(`[GOPLUS] Attempt ${attempt + 1} failed:`, error);
      
      // Update failure stats
      goplusApiHealthStats.failedRequests++;
      goplusApiHealthStats.lastFailureTime = Date.now();
      goplusApiHealthStats.errors.push(`${new Date().toISOString()}: ${error.message}`);
      
      // Track auth failures specifically
      if (error.message?.includes('authorization') || error.message?.includes('401')) {
        goplusApiHealthStats.authFailures++;
      }
      
      // Keep only last 10 errors
      if (goplusApiHealthStats.errors.length > 10) {
        goplusApiHealthStats.errors = goplusApiHealthStats.errors.slice(-10);
      }
      
      // If this was the last attempt, log comprehensive failure details
      if (attempt === RETRY_CONFIG.maxRetries) {
        console.error(`[GOPLUS] FINAL FAILURE after ${RETRY_CONFIG.maxRetries + 1} attempts`);
        console.error(`[GOPLUS] API Health Stats:`, goplusApiHealthStats);
        console.error(`[GOPLUS] Final error:`, error);
        return null;
      }
    }
  }
  
  // This should never be reached due to the return statements above
  return null;
}