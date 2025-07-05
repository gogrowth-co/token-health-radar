import { getChainConfigByMoralisId } from './chainConfig.ts';

// GoPlus Security API client with enhanced debugging
export async function fetchGoPlusSecurity(tokenAddress: string, chainId: string) {
  console.log(`[GOPLUS] === STARTING GOPLUS API CALL ===`);
  console.log(`[GOPLUS] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[GOPLUS] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    console.log(`[GOPLUS] Chain mapping: ${chainId} -> ${chainConfig.goplus} (${chainConfig.name})`);
    console.log(`[GOPLUS] Target token: ${tokenAddress.toLowerCase()}`);

    const url = `https://api.gopluslabs.io/api/v1/token_security/${chainConfig.goplus}?contract_addresses=${tokenAddress.toLowerCase()}`;
    console.log(`[GOPLUS] Request URL: ${url}`);
    
    const response = await fetch(url);
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
    
    const securityData = {
      ownership_renounced: tokenData.owner_address === '0x0000000000000000000000000000000000000000',
      can_mint: tokenData.can_take_back_ownership === '1' || tokenData.cannot_buy === '1',
      honeypot_detected: tokenData.is_honeypot === '1',
      freeze_authority: tokenData.can_take_back_ownership === '1',
      audit_status: tokenData.trust_list ? 'verified' : 'unverified'
    };
    
    console.log(`[GOPLUS] SUCCESS - Extracted security data:`, securityData);
    return securityData;
    
  } catch (error) {
    console.error(`[GOPLUS] Error fetching security data:`, error);
    return null;
  }
}