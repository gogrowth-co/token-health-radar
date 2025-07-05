import { getChainConfigByMoralisId } from './chainConfig.ts';

// Moralis Price API client for price and liquidity data
export async function fetchMoralisPriceData(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS-PRICE] === STARTING MORALIS PRICE API CALL ===`);
  console.log(`[MORALIS-PRICE] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[MORALIS-PRICE] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    // Get API key from environment
    const apiKey = Deno.env.get('MORALIS_API_KEY');
    if (!apiKey) {
      console.error(`[MORALIS-PRICE] FAILED - MORALIS_API_KEY not configured in environment`);
      return null;
    }

    console.log(`[MORALIS-PRICE] API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
    console.log(`[MORALIS-PRICE] Chain: ${chainConfig.name} (${chainConfig.id})`);
    console.log(`[MORALIS-PRICE] Target token: ${tokenAddress.toLowerCase()}`);
    
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/price?chain=${chainConfig.id}&include=percent_change`;
    console.log(`[MORALIS-PRICE] Request URL: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[MORALIS-PRICE] Response status: ${response.status}`);
    console.log(`[MORALIS-PRICE] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MORALIS-PRICE] FAILED - API error: ${response.status} ${response.statusText}`);
      console.error(`[MORALIS-PRICE] Error response body:`, errorText);
      throw new Error(`Moralis Price API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`[MORALIS-PRICE] Raw response text:`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[MORALIS-PRICE] Parsed JSON response:`, JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.error(`[MORALIS-PRICE] FAILED - Invalid JSON response:`, jsonError);
      console.error(`[MORALIS-PRICE] Response text was:`, responseText);
      return null;
    }
    
    if (!data) {
      console.error(`[MORALIS-PRICE] FAILED - Empty response data for token: ${tokenAddress}`);
      return null;
    }

    // Log the specific price change data for debugging
    console.log(`[MORALIS-PRICE] Price change data extraction:`, {
      'data.percent_change': data.percent_change,
      'data.percent_change?.usd_price_24h_percent_change': data.percent_change?.usd_price_24h_percent_change,
      'Full percent_change object': JSON.stringify(data.percent_change, null, 2)
    });

    // Extract price change with proper null handling - DO NOT use ?? 0 fallback
    const priceChange24h = data.percent_change?.usd_price_24h_percent_change;
    const parsedPriceChange = priceChange24h !== null && priceChange24h !== undefined 
      ? parseFloat(priceChange24h) 
      : null; // Preserve null for missing data

    // Extract other market data
    const currentPriceUsd = parseFloat(data.usdPrice) || 0;
    const marketCapUsd = parseFloat(data.usdPriceFormatted) || 0; // May not be available in price endpoint
    const tradingVolume24hUsd = 0; // Not available in Moralis price endpoint

    // Data validation - warn about potential issues
    if (parsedPriceChange === null) {
      console.warn(`[MORALIS-PRICE] No valid 24h price change data found for token: ${tokenAddress}`);
    } else {
      console.log(`[MORALIS-PRICE] Successfully extracted 24h price change: ${parsedPriceChange}%`);
    }

    const result = {
      current_price_usd: currentPriceUsd,
      price_change_24h: parsedPriceChange, // Keep null when data is missing - no fallback to 0
      market_cap_usd: marketCapUsd,
      trading_volume_24h_usd: tradingVolume24hUsd,
      name: '', // Not available in price endpoint
      symbol: '' // Not available in price endpoint
    };

    console.log(`[MORALIS-PRICE] SUCCESS - Processed price data:`, {
      token: tokenAddress,
      price_usd: result.current_price_usd,
      price_change_24h: result.price_change_24h,
      has_price_change: result.price_change_24h !== null
    });
    
    return result;
  } catch (error) {
    console.error(`[MORALIS-PRICE] Error fetching price data:`, error);
    return null;
  }
}

// Moralis API client for comprehensive token metadata
export async function fetchMoralisMetadata(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS] === STARTING MORALIS API CALL ===`);
  console.log(`[MORALIS] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[MORALIS] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    // Get API key from environment
    const apiKey = Deno.env.get('MORALIS_API_KEY');
    if (!apiKey) {
      console.error(`[MORALIS] FAILED - MORALIS_API_KEY not configured in environment`);
      return null;
    }

    console.log(`[MORALIS] API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
    console.log(`[MORALIS] Chain: ${chainConfig.name} (${chainConfig.id})`);
    console.log(`[MORALIS] Target token: ${tokenAddress.toLowerCase()}`);
    
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}?chain=${chainConfig.id}&include=percent_change`;
    console.log(`[MORALIS] Request URL: ${url}`);
    
    // Test API key with a simple request first
    console.log(`[MORALIS] Testing API authentication...`);
    const testResponse = await fetch(`https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainConfig.id}&addresses=${tokenAddress.toLowerCase()}`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[MORALIS] Auth test response status: ${testResponse.status}`);
    if (testResponse.status === 401 || testResponse.status === 403) {
      console.error(`[MORALIS] FAILED - API authentication failed. Status: ${testResponse.status}`);
      const errorText = await testResponse.text();
      console.error(`[MORALIS] Auth error response:`, errorText);
      return null;
    }

    // Now make the actual request with correct endpoint format
    const metadataUrl = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainConfig.id}&addresses=${tokenAddress.toLowerCase()}`;
    console.log(`[MORALIS] Making actual request: ${metadataUrl}`);
    
    const response = await fetch(metadataUrl, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[MORALIS] Response status: ${response.status}`);
    console.log(`[MORALIS] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MORALIS] FAILED - API error: ${response.status} ${response.statusText}`);
      console.error(`[MORALIS] Error response body:`, errorText);
      throw new Error(`Moralis API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`[MORALIS] Raw response text:`, responseText.substring(0, 500) + '...');
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[MORALIS] Parsed JSON response (first token):`, JSON.stringify(data[0], null, 2));
    } catch (jsonError) {
      console.error(`[MORALIS] FAILED - Invalid JSON response:`, jsonError);
      console.error(`[MORALIS] Response text was:`, responseText);
      return null;
    }
    
    const tokenData = data[0];
    
    if (!tokenData) {
      console.log(`[MORALIS] No metadata found for token: ${tokenAddress}`);
      return null;
    }

    console.log(`[MORALIS] Rich metadata extracted for: ${tokenData.name} (${tokenData.symbol})`);
    console.log(`[MORALIS] Description available: ${!!tokenData.description}`);
    console.log(`[MORALIS] Links available: ${Object.keys(tokenData.links || {}).length} social links`);
    console.log(`[MORALIS] Security score: ${tokenData.security_score || 'N/A'}`);
    
    return {
      name: tokenData.name || '',
      symbol: tokenData.symbol || '',
      decimals: parseInt(tokenData.decimals) || 18,
      logo: tokenData.logo || '',
      thumbnail: tokenData.thumbnail || '',
      total_supply: tokenData.total_supply || '0',
      verified_contract: tokenData.verified_contract || false,
      possible_spam: tokenData.possible_spam || false,
      description: tokenData.description || '',
      links: tokenData.links || {},
      security_score: tokenData.security_score || null,
      market_cap: tokenData.market_cap || null,
      circulating_supply: tokenData.circulating_supply || null,
      fully_diluted_valuation: tokenData.fully_diluted_valuation || null
    };
  } catch (error) {
    console.error(`[MORALIS] Error fetching metadata:`, error);
    return null;
  }
}