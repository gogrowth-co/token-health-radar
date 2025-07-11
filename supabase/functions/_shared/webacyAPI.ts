import { getChainConfigByMoralisId } from './chainConfig.ts';

// API Health Tracking
const webacyApiHealthStats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
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

// Webacy Security API client for contract risk analysis with retry logic and health monitoring
export async function fetchWebacySecurity(tokenAddress: string, chainId: string) {
  console.log(`[WEBACY] === STARTING WEBACY API CALL ===`);
  console.log(`[WEBACY] Token: ${tokenAddress}, Chain: ${chainId}`);
  console.log(`[WEBACY] API Health Stats:`, webacyApiHealthStats);
  
  webacyApiHealthStats.totalRequests++;
  
  for (let attempt = 0; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = calculateDelay(attempt - 1);
        console.log(`[WEBACY] Retry attempt ${attempt}/${RETRY_CONFIG.maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[WEBACY] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    // Map Moralis chain IDs to Webacy chain names
    const webacyChainMap: { [key: string]: string } = {
      '0x1': 'ethereum',
      '0x38': 'bsc', 
      '0xa4b1': 'arbitrum',
      '0xa': 'optimism',
      '0x2105': 'base',
      '0x89': 'polygon'
    };

    const webacyChain = webacyChainMap[chainId];
    if (!webacyChain) {
      console.error(`[WEBACY] FAILED - Chain ${chainId} not supported by Webacy. Supported chains:`, Object.keys(webacyChainMap));
      return null;
    }

    // Get API key from environment
    const apiKey = Deno.env.get('WEBACY_API_KEY');
    if (!apiKey) {
      console.error(`[WEBACY] FAILED - WEBACY_API_KEY not configured in environment`);
      return null;
    }

    console.log(`[WEBACY] API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
    console.log(`[WEBACY] Chain mapping: ${chainId} -> ${webacyChain}`);
    console.log(`[WEBACY] Target token: ${tokenAddress.toLowerCase()}`);
    
    const url = `https://api.webacy.com/risk/${webacyChain}/${tokenAddress.toLowerCase()}`;
    console.log(`[WEBACY] Request URL: ${url}`);
    
    // Make the request with key=value format as required by Webacy API
    console.log(`[WEBACY] Making request with key=value authorization format...`);
    console.log(`[WEBACY] Authorization header will be: key=${apiKey.substring(0, 8)}...`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `key=${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[WEBACY] Response status: ${response.status}`);
    console.log(`[WEBACY] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[WEBACY] No risk data found for token: ${tokenAddress} (404 - token not indexed)`);
        return null;
      }
      const errorText = await response.text();
      console.error(`[WEBACY] FAILED - API error: ${response.status} ${response.statusText}`);
      console.error(`[WEBACY] Error response body:`, errorText);
      throw new Error(`Webacy API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`[WEBACY] Raw response text:`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[WEBACY] Parsed JSON response:`, JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.error(`[WEBACY] FAILED - Invalid JSON response:`, jsonError);
      console.error(`[WEBACY] Response text was:`, responseText);
      return null;
    }
    
    if (!data) {
      console.error(`[WEBACY] FAILED - Empty response data for token: ${tokenAddress}`);
      return null;
    }

      console.log(`[WEBACY] SUCCESS - Received valid response for token: ${tokenAddress}`);
      console.log(`[WEBACY] Response structure keys:`, Object.keys(data));

      // Extract risk flags and categorize by severity
      const riskFlags = data.flags || [];
      const riskScore = data.riskScore || 0;
      const severity = data.severity || 'unknown';

      // Categorize flags by severity
      const criticalFlags = riskFlags.filter((flag: any) => flag.severity === 'critical');
      const warningFlags = riskFlags.filter((flag: any) => flag.severity === 'warning');
      const infoFlags = riskFlags.filter((flag: any) => flag.severity === 'info');

      console.log(`[WEBACY] Contract risk analysis for ${tokenAddress}:`, {
        riskScore,
        severity,
        totalFlags: riskFlags.length,
        criticalFlags: criticalFlags.length,
        warningFlags: warningFlags.length,
        infoFlags: infoFlags.length
      });

      const result = {
        address: data.address,
        riskScore,
        severity,
        flags: riskFlags,
        criticalFlags,
        warningFlags,
        infoFlags,
        // Map to existing security data structure for compatibility
        ownership_renounced: !riskFlags.some((flag: any) => flag.flag === 'not-renounced'),
        can_mint: riskFlags.some((flag: any) => flag.flag === 'mintable'),
        honeypot_detected: riskFlags.some((flag: any) => ['is_honeypot', 'honeypot_with_same_creator'].includes(flag.flag)),
        freeze_authority: riskFlags.some((flag: any) => flag.flag === 'freezeable'),
        audit_status: riskFlags.some((flag: any) => flag.flag === 'is_closed_source') ? 'unverified' : 'unknown',
        is_proxy: riskFlags.some((flag: any) => flag.flag === 'is_proxy'),
        is_blacklisted: riskFlags.some((flag: any) => flag.flag === 'is_blacklisted'),
        access_control: riskFlags.some((flag: any) => flag.flag === 'access_control'),
        contract_verified: !riskFlags.some((flag: any) => flag.flag === 'is_closed_source'),
        webacy_severity: severity
      };

      // Update success stats
      webacyApiHealthStats.successfulRequests++;
      webacyApiHealthStats.lastSuccessTime = Date.now();
      console.log(`[WEBACY] API Health - Success rate: ${((webacyApiHealthStats.successfulRequests / webacyApiHealthStats.totalRequests) * 100).toFixed(1)}%`);
      
      return result;
      
    } catch (error) {
      console.error(`[WEBACY] Attempt ${attempt + 1} failed:`, error);
      
      // Update failure stats
      webacyApiHealthStats.failedRequests++;
      webacyApiHealthStats.lastFailureTime = Date.now();
      webacyApiHealthStats.errors.push(`${new Date().toISOString()}: ${error.message}`);
      
      // Keep only last 10 errors
      if (webacyApiHealthStats.errors.length > 10) {
        webacyApiHealthStats.errors = webacyApiHealthStats.errors.slice(-10);
      }
      
      // If this was the last attempt, log comprehensive failure details
      if (attempt === RETRY_CONFIG.maxRetries) {
        console.error(`[WEBACY] FINAL FAILURE after ${RETRY_CONFIG.maxRetries + 1} attempts`);
        console.error(`[WEBACY] API Health Stats:`, webacyApiHealthStats);
        console.error(`[WEBACY] Final error:`, error);
        return null;
      }
    }
  }
  
  // This should never be reached due to the return statements above
  return null;
}