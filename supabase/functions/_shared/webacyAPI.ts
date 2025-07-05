import { getChainConfigByMoralisId } from './chainConfig.ts';

// Webacy Security API client for contract risk analysis
export async function fetchWebacySecurity(tokenAddress: string, chainId: string) {
  console.log(`[WEBACY] === STARTING WEBACY API CALL ===`);
  console.log(`[WEBACY] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
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
    
    // Test API key first with a simple validation request
    console.log(`[WEBACY] Testing API authentication...`);
    const testResponse = await fetch(`https://api.webacy.com/risk/ethereum/0x0000000000000000000000000000000000000000`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[WEBACY] Auth test response status: ${testResponse.status}`);
    if (testResponse.status === 401 || testResponse.status === 403) {
      console.error(`[WEBACY] FAILED - API authentication failed. Status: ${testResponse.status}`);
      const errorText = await testResponse.text();
      console.error(`[WEBACY] Auth error response:`, errorText);
      return null;
    }

    // Now make the actual request  
    console.log(`[WEBACY] Making actual request for token data...`);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
    
    return {
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
      contract_verified: !riskFlags.some((flag: any) => flag.flag === 'is_closed_source')
    };
  } catch (error) {
    console.error(`[WEBACY] Error fetching contract risk data:`, error);
    return null;
  }
}