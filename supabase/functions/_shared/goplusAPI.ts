import { getChainConfigByMoralisId } from './chainConfig.ts';

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

// GoPlus Security API client with enhanced debugging and authentication
export async function fetchGoPlusSecurity(tokenAddress: string, chainId: string) {
  console.log(`[GOPLUS] === STARTING GOPLUS API CALL ===`);
  console.log(`[GOPLUS] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
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
    console.log(`[GOPLUS] Raw response text:`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[GOPLUS] Parsed JSON response:`, JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.error(`[GOPLUS] FAILED - Invalid JSON response:`, jsonError);
      console.error(`[GOPLUS] Response text was:`, responseText);
      return null;
    }
    
    console.log(`[GOPLUS] Response structure:`, {
      hasResult: !!data.result,
      resultKeys: data.result ? Object.keys(data.result) : [],
      searchingFor: tokenAddress.toLowerCase()
    });
    
    const tokenData = data.result?.[tokenAddress.toLowerCase()];
    
    if (!tokenData) {
      console.error(`[GOPLUS] FAILED - No security data found for token: ${tokenAddress}`);
      console.log(`[GOPLUS] Available tokens in response:`, data.result ? Object.keys(data.result) : 'No result object');
      return null;
    }
    
    console.log(`[GOPLUS] Raw token data:`, JSON.stringify(tokenData, null, 2));
    
    // Enhanced data mapping based on GoPlus API documentation
    const securityData = {
      ownership_renounced: tokenData.owner_address === '0x0000000000000000000000000000000000000000',
      can_mint: tokenData.is_mintable === '1',
      honeypot_detected: tokenData.is_honeypot === '1',
      freeze_authority: tokenData.can_take_back_ownership === '1',
      audit_status: tokenData.trust_list === '1' ? 'verified' : 'unverified',
      // Additional Webacy-compatible fields
      is_proxy: tokenData.is_proxy === '1',
      is_blacklisted: tokenData.is_blacklisted === '1',
      access_control: tokenData.can_take_back_ownership === '1',
      contract_verified: tokenData.is_open_source === '1'
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
    return securityData;
    
  } catch (error) {
    console.error(`[GOPLUS] Error fetching security data:`, error);
    return null;
  }
}