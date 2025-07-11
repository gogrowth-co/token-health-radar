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

// Webacy Security API client for contract risk analysis with simplified error handling
export async function fetchWebacySecurity(tokenAddress: string, chainId: string) {
  console.log(`[WEBACY] === STARTING WEBACY API CALL ===`);
  console.log(`[WEBACY] Token: ${tokenAddress}, Chain: ${chainId}`);
  console.log(`[WEBACY] API Health Stats:`, webacyApiHealthStats);
  
  webacyApiHealthStats.totalRequests++;
  
  try {
    // Get API key from environment
    const apiKey = Deno.env.get('WEBACY_API_KEY');
    if (!apiKey) {
      console.error(`[WEBACY] FAILED - WEBACY_API_KEY not configured in environment`);
      return null;
    }

    console.log(`[WEBACY] API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
    console.log(`[WEBACY] Target address: ${tokenAddress.toLowerCase()}`);
    
    // Use the new Webacy API endpoint that doesn't require chain mapping
    const url = `https://api.webacy.com/addresses/${tokenAddress.toLowerCase()}`;
    console.log(`[WEBACY] Request URL: ${url}`);
    
    // Make the request with x-api-key header as per documentation
    console.log(`[WEBACY] Making request with x-api-key header...`);
    
    const response = await fetch(url, {
      headers: {
        'x-api-key': apiKey
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

    // Parse the new API response format
    const overallRisk = data.overallRisk || 0;
    const issues = data.issues || [];
    
    // Extract risk flags from issues and their tags
    const riskFlags: any[] = [];
    issues.forEach((issue: any) => {
      if (issue.tags && Array.isArray(issue.tags)) {
        issue.tags.forEach((tag: any) => {
          riskFlags.push({
            flag: tag.key,
            name: tag.name,
            description: tag.description,
            severity: tag.severity === 3 ? 'high' : tag.severity === 2 ? 'medium' : 'low'
          });
        });
      }
    });

    // Determine overall severity based on overallRisk score
    let severity = 'low';
    if (overallRisk >= 70) severity = 'high';
    else if (overallRisk >= 40) severity = 'medium';

    // Categorize flags by severity
    const criticalFlags = riskFlags.filter((flag: any) => flag.severity === 'high');
    const warningFlags = riskFlags.filter((flag: any) => flag.severity === 'medium');
    const infoFlags = riskFlags.filter((flag: any) => flag.severity === 'low');

    console.log(`[WEBACY] Contract risk analysis for ${tokenAddress}:`, {
      overallRisk,
      severity,
      totalFlags: riskFlags.length,
      criticalFlags: criticalFlags.length,
      warningFlags: warningFlags.length,
      infoFlags: infoFlags.length
    });

    const result = {
      address: tokenAddress,
      riskScore: overallRisk,
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