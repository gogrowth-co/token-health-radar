import { getChainConfigByMoralisId } from './chainConfig.ts';
import Moralis from 'https://esm.sh/moralis@2.27.2';

// Moralis Price API client using SDK
export async function fetchMoralisPriceData(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS-PRICE] === STARTING MORALIS PRICE SDK CALL ===`);
  console.log(`[MORALIS-PRICE] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[MORALIS-PRICE] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    // Get API key from environment (with fallback for testing)
    const apiKey = Deno.env.get('MORALIS_API_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjI2YWE1NWViLTEyNmItNGU4MC05OTY2LTgxNzAzOTUzZmU4YyIsIm9yZ0lkIjoiNDU1ODE1IiwidXNlcklkIjoiNDY4OTczIiwidHlwZUlkIjoiNzA2ZDc3NTYtZDlhNS00NmFkLTgwNGEtN2UyYzI5ZGUxMzc1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTA5MDUwNDAsImV4cCI6NDkwNjY2NTA0MH0.dhtovO-cPljwR_O5WJrTRoyfv6rGnPplERZpd7iT9Uw';
    if (!apiKey) {
      console.error(`[MORALIS-PRICE] FAILED - MORALIS_API_KEY not configured in environment`);
      return null;
    }

    console.log(`[MORALIS-PRICE] API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
    console.log(`[MORALIS-PRICE] Chain: ${chainConfig.name} (${chainId})`);
    console.log(`[MORALIS-PRICE] Target token: ${tokenAddress.toLowerCase()}`);
    
    // Initialize Moralis SDK
    if (!Moralis.Core.isStarted) {
      await Moralis.start({ apiKey });
      console.log(`[MORALIS-PRICE] Moralis SDK initialized`);
    }

    // Get token price using SDK
    const response = await Moralis.EvmApi.token.getTokenPrice({
      chain: chainId,
      include: "percent_change",
      address: tokenAddress.toLowerCase()
    });

    console.log(`[MORALIS-PRICE] SDK Response received`);
    const data = response.raw;
    console.log(`[MORALIS-PRICE] Raw response data:`, JSON.stringify(data, null, 2));

    if (!data) {
      console.error(`[MORALIS-PRICE] FAILED - Empty response data for token: ${tokenAddress}`);
      return null;
    }

    // Extract price data using SDK response format
    const currentPriceUsd = parseFloat(data.usdPrice) || 0;
    const priceChange24h = data['24hrPercentChange'] || data.usdPrice24hrPercentChange;
    const parsedPriceChange = priceChange24h !== null && priceChange24h !== undefined 
      ? parseFloat(priceChange24h) 
      : null;

    const result = {
      current_price_usd: currentPriceUsd,
      price_change_24h: parsedPriceChange,
      market_cap_usd: 0, // Not available in price endpoint
      trading_volume_24h_usd: parseFloat(data.pairTotalLiquidityUsd) || 0,
      name: data.tokenName || '',
      symbol: data.tokenSymbol || ''
    };

    console.log(`[MORALIS-PRICE] SUCCESS - Processed price data:`, {
      token: tokenAddress,
      price_usd: result.current_price_usd,
      price_change_24h: result.price_change_24h,
      name: result.name,
      symbol: result.symbol
    });
    
    return result;
  } catch (error) {
    console.error(`[MORALIS-PRICE] Error fetching price data:`, error);
    return null;
  }
}

// Moralis API client using SDK for comprehensive token metadata
export async function fetchMoralisMetadata(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS] === STARTING MORALIS SDK METADATA CALL ===`);
  console.log(`[MORALIS] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[MORALIS] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    // Get API key from environment (with fallback for testing)
    const apiKey = Deno.env.get('MORALIS_API_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjI2YWE1NWViLTEyNmItNGU4MC05OTY2LTgxNzAzOTUzZmU4YyIsIW9yZ0lkIjoiNDU1ODE1IiwidXNlcklkIjoiNDY4OTczIiwidHlwZUlkIjoiNzA2ZDc3NTYtZDlhNS00NmFkLTgwNGEtN2UyYzI5ZGUxMzc1IiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NTA5MDUwNDAsImV4cCI6NDkwNjY2NTA0MH0.dhtovO-cPljwR_O5WJrTRoyfv6rGnPplERZpd7iT9Uw';
    if (!apiKey) {
      console.error(`[MORALIS] FAILED - MORALIS_API_KEY not configured in environment`);
      return null;
    }

    console.log(`[MORALIS] API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
    console.log(`[MORALIS] Chain: ${chainConfig.name} (${chainId})`);
    console.log(`[MORALIS] Target token: ${tokenAddress.toLowerCase()}`);
    
    // Initialize Moralis SDK
    if (!Moralis.Core.isStarted) {
      await Moralis.start({ apiKey });
      console.log(`[MORALIS] Moralis SDK initialized`);
    }

    // Get token metadata using SDK
    const response = await Moralis.EvmApi.token.getTokenMetadata({
      chain: chainId,
      addresses: [tokenAddress.toLowerCase()]
    });

    console.log(`[MORALIS] SDK Response received`);
    const data = response.raw;
    console.log(`[MORALIS] Raw response data:`, JSON.stringify(data, null, 2));
    
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