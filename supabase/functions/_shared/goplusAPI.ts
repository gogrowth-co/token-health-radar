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

// SHA1 hash function
async function sha1Hex(input: string): Promise<string> {
  const buffer = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-1', buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Cache for GoPlus access token
let cachedToken: { value: string; exp: number } | null = null;

// Get GoPlus access token
async function getGoPlusAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  // Check if we have a valid cached token (with 60s buffer)
  if (cachedToken && cachedToken.exp - now > 60) {
    console.log(`[GOPLUS-AUTH] Using cached token (expires in ${cachedToken.exp - now}s)`);
    return cachedToken.value;
  }

  console.log(`[GOPLUS-AUTH] Token expired or missing, fetching new token...`);
  
  const APP_KEY = Deno.env.get('GOPLUS_APP_KEY');
  const APP_SECRET = Deno.env.get('GOPLUS_APP_SECRET');
  
  if (!APP_KEY || !APP_SECRET) {
    throw new Error('[GOPLUS-AUTH] Missing GOPLUS_APP_KEY or GOPLUS_APP_SECRET');
  }

  const sign = await sha1Hex(`${APP_KEY}${now}${APP_SECRET}`);

  console.log(`[GOPLUS-AUTH] Auth request:`, {
    app_key: APP_KEY,
    time: now,
    sign: sign.substring(0, 8) + '...'
  });

  const res = await fetch('https://api.gopluslabs.io/api/v1/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ app_key: APP_KEY, time: now, sign })
  });

  const json = await res.json();
  console.log(`[GOPLUS-AUTH] Response:`, json);

  if (json.code !== 1) {
    throw new Error(`GoPlus token error: ${JSON.stringify(json)}`);
  }

  cachedToken = {
    value: json.result.access_token,
    exp: now + json.result.expire
  };

  console.log(`[GOPLUS-AUTH] Successfully obtained access token (expires in ${json.result.expire}s)`);
  return cachedToken.value;
}

// Helper functions to extract liquidity lock data from LP holders
function extractLiquidityLockStatus(lpHolders: any[]): boolean | null {
  if (!Array.isArray(lpHolders) || lpHolders.length === 0) return null;
  
  // Check if any LP holder has locked tokens
  const hasLockedLP = lpHolders.some(holder => holder.is_locked === '1');
  return hasLockedLP;
}

function extractLiquidityLockInfo(lpHolders: any[]): string | null {
  if (!Array.isArray(lpHolders) || lpHolders.length === 0) return null;
  
  const lockedHolders = lpHolders.filter(holder => holder.is_locked === '1' && holder.locked_detail);
  if (lockedHolders.length === 0) return null;
  
  // Combine lock info from all locked holders
  const lockInfos = lockedHolders.map(holder => {
    if (!holder.locked_detail || !Array.isArray(holder.locked_detail)) return null;
    
    return holder.locked_detail.map((lock: any) => {
      const endTime = lock.end_time ? new Date(lock.end_time * 1000).toISOString() : 'Unknown';
      const amount = lock.amount || 'Unknown';
      return `Amount: ${amount}, Unlock: ${endTime}`;
    }).join('; ');
  }).filter(Boolean);
  
  return lockInfos.length > 0 ? lockInfos.join(' | ') : null;
}

function extractLiquidityLockPercentage(lpHolders: any[]): number | null {
  if (!Array.isArray(lpHolders) || lpHolders.length === 0) return null;
  
  // Calculate total percentage of locked LP tokens
  const totalLockedPercentage = lpHolders.reduce((sum, holder) => {
    if (holder.is_locked === '1' && holder.percent) {
      // holder.percent is already in 0-1 format where 1 = 100%
      return sum + (parseFloat(holder.percent) * 100);
    }
    return sum;
  }, 0);
  
  return totalLockedPercentage > 0 ? totalLockedPercentage : null;
}

// GoPlus Security API client with enhanced debugging and authentication, retry logic and health monitoring
export async function fetchGoPlusSecurity(tokenAddress: string, chainId: string) {
  console.log(`[GOPLUS] === STARTING GOPLUS API CALL ===`);
  console.log(`[GOPLUS] Token: ${tokenAddress}, Chain: ${chainId}`);
  console.log(`[GOPLUS] API Health Stats:`, goplusApiHealthStats);
  
  goplusApiHealthStats.totalRequests++;
  
  // Check upfront for non-retryable failures
  const chainConfig = getChainConfigByMoralisId(chainId);
  if (!chainConfig) {
    console.error(`[GOPLUS] FAILED - Unsupported chain: ${chainId}`);
    return null;
  }

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
        console.error(`[GOPLUS] FAILED - Could not obtain access token on attempt ${attempt + 1}`);
        if (attempt === RETRY_CONFIG.maxRetries) return null;
        continue; // Retry getting token
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
      
      let data;
      if (response.status === 401) {
        console.warn('[GOPLUS] Access token expired. Clearing cache and retrying.');
        cachedToken = null;
        throw new Error('Token expired, will retry with new token');
      } else if (!response.ok) {
        const errorText = await response.text();
        console.error(`[GOPLUS] API error: ${response.status} ${response.statusText}`);
        console.error(`[GOPLUS] Error response body:`, errorText);
        throw new Error(`GoPlus API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log(`[GOPLUS] Raw response text (first 1000 chars):`, responseText.substring(0, 1000));
      
      try {
        data = JSON.parse(responseText);
        console.log(`[GOPLUS] === FULL RAW API RESPONSE ===`);
        console.log(`[GOPLUS] Response JSON:`, JSON.stringify(data, null, 2));
      } catch (jsonError) {
        console.error(`[GOPLUS] Invalid JSON response:`, jsonError);
        console.error(`[GOPLUS] Response text was:`, responseText);
        throw new Error('Invalid JSON response from GoPlus API');
      }
      
      // Check response structure
      console.log(`[GOPLUS] Response analysis:`, {
        code: data.code,
        message: data.message,
        hasResult: !!data.result,
        resultType: typeof data.result,
        resultKeys: data.result ? Object.keys(data.result) : [],
        searchingFor: tokenAddress.toLowerCase()
      });
      
      // Check if GoPlus returned an error
      if (data.code !== 1) {
        console.error(`[GOPLUS] API returned error code: ${data.code}, message: ${data.message}`);
        throw new Error(`GoPlus API error: ${data.message || 'Unknown error'}`);
      }
      
      if (!data.result) {
        console.error(`[GOPLUS] No result object in response`);
        throw new Error('No result object in GoPlus response');
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
        console.error(`[GOPLUS] No security data found for token: ${tokenAddress}`);
        console.error(`[GOPLUS] Searched for addresses:`, searchAddresses);
        console.error(`[GOPLUS] Available addresses in response:`, resultKeys);
        throw new Error(`No token data found in GoPlus response for ${tokenAddress}`);
      }
      
      console.log(`[GOPLUS] Raw token data:`, JSON.stringify(tokenData, null, 2));
      
      // CRITICAL DEBUGGING: Log LP holders data for liquidity lock analysis
      console.log(`[GOPLUS] === LIQUIDITY LOCK DEBUGGING ===`);
      console.log(`[GOPLUS] tokenData.lp_holders:`, JSON.stringify(tokenData.lp_holders, null, 2));
      console.log(`[GOPLUS] LP holders count:`, Array.isArray(tokenData.lp_holders) ? tokenData.lp_holders.length : 'Not an array');
      console.log(`[GOPLUS] Raw tokenData keys:`, Object.keys(tokenData));
      console.log(`[GOPLUS] === END LIQUIDITY LOCK DEBUGGING ===`);
      
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
        
        // FIXED: Liquidity lock information from LP holders data
        is_liquidity_locked: extractLiquidityLockStatus(tokenData.lp_holders),
        liquidity_lock_info: extractLiquidityLockInfo(tokenData.lp_holders),
        liquidity_percentage: extractLiquidityLockPercentage(tokenData.lp_holders),
        
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
      
      console.log(`[GOPLUS] Liquidity Lock Data:`, {
        raw_lp_holders: tokenData.lp_holders,
        mapped_is_locked: securityData.is_liquidity_locked,
        mapped_lock_info: securityData.liquidity_lock_info,
        mapped_percentage: securityData.liquidity_percentage
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