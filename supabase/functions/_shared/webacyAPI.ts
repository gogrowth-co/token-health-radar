

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

// Chain mapping for Webacy API - using correct format from example
function getWebacyChainCode(chainId: string): string {
  // Convert hex chain IDs to decimal
  const decimalChainId = chainId.startsWith('0x') ? parseInt(chainId, 16).toString() : chainId;
  
  const chainMapping: { [key: string]: string } = {
    '1': 'eth',      // Ethereum (matches the example)
    '137': 'pol',    // Polygon
    '56': 'bsc',     // BSC
    '42161': 'arb',  // Arbitrum
    '8453': 'base',  // Base
    '10': 'opt',     // Optimism
    '7565164': 'sol', // Solana (if supported)
    // Add more chain mappings as needed
  };
  
  return chainMapping[decimalChainId] || 'eth'; // Default to Ethereum
}

// Webacy Security API client using the correct endpoint from the provided example
export async function fetchWebacySecurity(tokenAddress: string, chainId: string) {
  console.log(`[WEBACY] === STARTING WEBACY API CALL ===`);
  console.log(`[WEBACY] Token: ${tokenAddress}, Chain: ${chainId}`);
  console.log(`[WEBACY] API Health Stats:`, webacyApiHealthStats);
  
  webacyApiHealthStats.totalRequests++;
  
  try {
    // Get API key from environment with enhanced validation
    const apiKey = Deno.env.get('WEBACY_API_KEY');
    if (!apiKey) {
      console.error(`[WEBACY] FAILED - WEBACY_API_KEY not configured in environment`);
      return null;
    }

    // Enhanced API key validation
    const trimmedApiKey = apiKey.trim();
    if (trimmedApiKey !== apiKey) {
      console.warn(`[WEBACY] WARNING - API key had whitespace, trimmed it`);
    }
    
    if (trimmedApiKey.length < 10) {
      console.error(`[WEBACY] FAILED - API key appears too short: ${trimmedApiKey.length} characters`);
      return null;
    }

    const webacyChain = getWebacyChainCode(chainId);
    console.log(`[WEBACY] API Key validation passed - Length: ${trimmedApiKey.length} chars, Starts with: ${trimmedApiKey.substring(0, 8)}...`);
    console.log(`[WEBACY] Target address: ${tokenAddress}, Chain: ${chainId} -> ${webacyChain}`);
    
    // Use the CORRECT Webacy API endpoint from the provided example
    const url = `https://api.webacy.com/addresses/${tokenAddress}?chain=${webacyChain}`;
    console.log(`[WEBACY] Request URL (CORRECTED): ${url}`);
    
    // Make the request with headers matching the provided example
    console.log(`[WEBACY] Making request with headers matching provided example...`);
    
    const headers = {
      'accept': 'application/json',
      'x-api-key': trimmedApiKey
    };
    
    console.log(`[WEBACY] Request headers:`, {
      'accept': headers['accept'],
      'x-api-key': `${trimmedApiKey.substring(0, 8)}...`
    });
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });

    console.log(`[WEBACY] Response status: ${response.status}`);
    console.log(`[WEBACY] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[WEBACY] No risk data found for token: ${tokenAddress} (404 - token not indexed)`);
        webacyApiHealthStats.successfulRequests++; // 404 is a successful response
        return null;
      }
      
      const errorText = await response.text();
      console.error(`[WEBACY] FAILED - API error: ${response.status} ${response.statusText}`);
      console.error(`[WEBACY] Error response body:`, errorText);
      
      // Enhanced error handling for common issues
      if (response.status === 403) {
        console.error(`[WEBACY] AUTHENTICATION ERROR - Check API key validity and permissions`);
        console.error(`[WEBACY] API Key format check - Length: ${trimmedApiKey.length}, First 8 chars: ${trimmedApiKey.substring(0, 8)}`);
      } else if (response.status === 401) {
        console.error(`[WEBACY] UNAUTHORIZED - API key may be invalid or expired`);
      } else if (response.status === 429) {
        console.error(`[WEBACY] RATE LIMITED - Too many requests`);
      }
      
      throw new Error(`Webacy API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`[WEBACY] Raw response (first 500 chars):`, responseText.substring(0, 500));
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[WEBACY] Parsed JSON response structure:`, Object.keys(data));
      console.log(`[WEBACY] Full parsed response:`, JSON.stringify(data, null, 2));
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

    // Parse the response format - handle both old and new API responses
    let result;
    
    if (data.riskScore !== undefined || data.overallRisk !== undefined) {
      // Handle new API format
      const overallRisk = data.riskScore || data.overallRisk || 0;
      const issues = data.issues || [];
      const flags = data.flags || [];
      const severity = data.severity || (overallRisk >= 70 ? 'high' : overallRisk >= 40 ? 'medium' : 'low');
      
      console.log(`[WEBACY] New API format detected - Risk Score: ${overallRisk}, Flags: ${flags.length}`);
      
      result = {
        webacy_risk_score: overallRisk,
        webacy_severity: severity,
        webacy_flags: flags,
        // Basic security mappings - conservative approach
        ownership_renounced: overallRisk < 30, // Lower risk suggests better ownership
        can_mint: overallRisk > 50, // Higher risk suggests mintability
        honeypot_detected: overallRisk > 70, // Very high risk suggests honeypot
        freeze_authority: overallRisk > 60, // High risk suggests freeze capability
        is_proxy: false, // Default conservative value
        is_blacklisted: false, // Default conservative value
        access_control: overallRisk > 40, // Medium+ risk suggests access controls
        contract_verified: overallRisk < 50 // Lower risk suggests verification
      };
    } else {
      // Handle legacy format or other structures
      console.log(`[WEBACY] Legacy or alternative API format detected`);
      
      result = {
        webacy_risk_score: null,
        webacy_severity: 'unknown',
        webacy_flags: [],
        ownership_renounced: null,
        can_mint: null,
        honeypot_detected: null,
        freeze_authority: null,
        is_proxy: null,
        is_blacklisted: null,
        access_control: null,
        contract_verified: null
      };
    }

    console.log(`[WEBACY] === FINAL WEBACY RESULT ===`);
    console.log(`[WEBACY] Processed result:`, JSON.stringify(result, null, 2));

    // Update success stats
    webacyApiHealthStats.successfulRequests++;
    webacyApiHealthStats.lastSuccessTime = Date.now();
    console.log(`[WEBACY] API Health - Success rate: ${((webacyApiHealthStats.successfulRequests / webacyApiHealthStats.totalRequests) * 100).toFixed(1)}%`);
    
    return result;
    
  } catch (error) {
    console.error(`[WEBACY] Request failed:`, error);
    
    // Update failure stats
    webacyApiHealthStats.failedRequests++;
    webacyApiHealthStats.lastFailureTime = Date.now();
    webacyApiHealthStats.errors.push(`${new Date().toISOString()}: ${error.message}`);
    
    // Keep only last 10 errors
    if (webacyApiHealthStats.errors.length > 10) {
      webacyApiHealthStats.errors = webacyApiHealthStats.errors.slice(-10);
    }
    
    console.error(`[WEBACY] FINAL FAILURE - API Health Stats:`, webacyApiHealthStats);
    return null;
  }
}

