import { getChainConfigByMoralisId } from './chainConfig.ts';

// Moralis Price API client using REST API
export async function fetchMoralisPriceData(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS-PRICE] === STARTING MORALIS PRICE REST API CALL ===`);
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
    console.log(`[MORALIS-PRICE] Chain: ${chainConfig.name} (${chainId})`);
    console.log(`[MORALIS-PRICE] Target token: ${tokenAddress.toLowerCase()}`);
    
    // Call Moralis REST API for token price
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/price?chain=${chainId}&include=percent_change`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[MORALIS-PRICE] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[MORALIS-PRICE] API Response received:`, JSON.stringify(data, null, 2));

    if (!data) {
      console.error(`[MORALIS-PRICE] FAILED - Empty response data for token: ${tokenAddress}`);
      return null;
    }

    // Extract price data from REST API response
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

// Moralis ERC20 Stats API for enhanced tokenomics data
export async function fetchMoralisTokenStats(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS-STATS] === STARTING MORALIS TOKEN STATS API CALL ===`);
  console.log(`[MORALIS-STATS] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[MORALIS-STATS] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    const apiKey = Deno.env.get('MORALIS_API_KEY');
    if (!apiKey) {
      console.error(`[MORALIS-STATS] FAILED - MORALIS_API_KEY not configured`);
      return null;
    }

    console.log(`[MORALIS-STATS] API Key configured: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/stats?chain=${chainId}`;
    console.log(`[MORALIS-STATS] Request URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[MORALIS-STATS] Response status: ${response.status} ${response.statusText}`);
    console.log(`[MORALIS-STATS] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MORALIS-STATS] API error: ${response.status} ${response.statusText}`);
      console.error(`[MORALIS-STATS] Error response body:`, errorText);
      return null;
    }

    const responseText = await response.text();
    console.log(`[MORALIS-STATS] Raw response text:`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[MORALIS-STATS] Failed to parse JSON:`, parseError);
      console.error(`[MORALIS-STATS] Raw response was:`, responseText);
      return null;
    }

    console.log(`[MORALIS-STATS] === FULL RAW API RESPONSE ===`);
    console.log(`[MORALIS-STATS] Parsed data:`, JSON.stringify(data, null, 2));
    
    // Enhanced data extraction with detailed logging
    const extractedData = {
      total_supply: data.total_supply || '0',
      holders: data.holders || 0,
      transfers: data.transfers || 0,
      total_supply_formatted: data.total_supply_formatted || '0'
    };

    console.log(`[MORALIS-STATS] === DATA EXTRACTION ANALYSIS ===`);
    console.log(`[MORALIS-STATS] Raw total_supply:`, data.total_supply, `(type: ${typeof data.total_supply})`);
    console.log(`[MORALIS-STATS] Raw holders:`, data.holders, `(type: ${typeof data.holders})`);
    console.log(`[MORALIS-STATS] Raw transfers:`, data.transfers, `(type: ${typeof data.transfers})`);
    console.log(`[MORALIS-STATS] Raw total_supply_formatted:`, data.total_supply_formatted, `(type: ${typeof data.total_supply_formatted})`);
    console.log(`[MORALIS-STATS] Final extracted data:`, extractedData);
    
    return extractedData;
  } catch (error) {
    console.error(`[MORALIS-STATS] Error fetching token stats:`, error);
    console.error(`[MORALIS-STATS] Error stack:`, error.stack);
    return null;
  }
}

// Moralis ERC20 Pairs API for DEX liquidity analysis
export async function fetchMoralisTokenPairs(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS-PAIRS] === STARTING MORALIS TOKEN PAIRS API CALL ===`);
  console.log(`[MORALIS-PAIRS] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[MORALIS-PAIRS] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    const apiKey = Deno.env.get('MORALIS_API_KEY');
    if (!apiKey) {
      console.error(`[MORALIS-PAIRS] FAILED - MORALIS_API_KEY not configured`);
      return null;
    }

    console.log(`[MORALIS-PAIRS] API Key configured: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/pairs?chain=${chainId}&limit=20`;
    console.log(`[MORALIS-PAIRS] Request URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[MORALIS-PAIRS] Response status: ${response.status} ${response.statusText}`);
    console.log(`[MORALIS-PAIRS] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MORALIS-PAIRS] API error: ${response.status} ${response.statusText}`);
      console.error(`[MORALIS-PAIRS] Error response body:`, errorText);
      return null;
    }

    const responseText = await response.text();
    console.log(`[MORALIS-PAIRS] Raw response text:`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[MORALIS-PAIRS] Failed to parse JSON:`, parseError);
      console.error(`[MORALIS-PAIRS] Raw response was:`, responseText);
      return null;
    }

    console.log(`[MORALIS-PAIRS] === FULL RAW API RESPONSE ===`);
    console.log(`[MORALIS-PAIRS] Parsed data:`, JSON.stringify(data, null, 2));
    console.log(`[MORALIS-PAIRS] Found ${data.result?.length || 0} pairs`);
    
    // Calculate total DEX liquidity with detailed logging
    let totalLiquidityUsd = 0;
    const majorPairs = [];
    
    if (data.result && Array.isArray(data.result)) {
      console.log(`[MORALIS-PAIRS] Processing ${data.result.length} pairs...`);
      for (const pair of data.result) {
        console.log(`[MORALIS-PAIRS] Pair data:`, {
          exchange: pair.exchange_name,
          liquidity_usd: pair.liquidity_usd,
          token0: pair.token0_symbol,
          token1: pair.token1_symbol
        });
        
        const liquidityUsd = parseFloat(pair.liquidity_usd || 0);
        totalLiquidityUsd += liquidityUsd;
        
        if (liquidityUsd > 1000) { // Only include pairs with > $1000 liquidity
          majorPairs.push({
            dex: pair.exchange_name || 'Unknown',
            pair_address: pair.pair_address,
            liquidity_usd: liquidityUsd,
            token0_symbol: pair.token0_symbol,
            token1_symbol: pair.token1_symbol
          });
        }
      }
    } else {
      console.log(`[MORALIS-PAIRS] No pairs found or invalid result structure`);
      console.log(`[MORALIS-PAIRS] data.result type:`, typeof data.result);
      console.log(`[MORALIS-PAIRS] data.result:`, data.result);
    }
    
    console.log(`[MORALIS-PAIRS] === LIQUIDITY ANALYSIS ===`);
    console.log(`[MORALIS-PAIRS] Total DEX liquidity: $${totalLiquidityUsd}`);
    console.log(`[MORALIS-PAIRS] Major pairs (>$1000): ${majorPairs.length}`);
    console.log(`[MORALIS-PAIRS] Major pairs details:`, majorPairs);
    
    const result = {
      total_pairs: data.result?.length || 0,
      total_liquidity_usd: totalLiquidityUsd,
      major_pairs: majorPairs
    };
    
    console.log(`[MORALIS-PAIRS] Final result:`, result);
    return result;
  } catch (error) {
    console.error(`[MORALIS-PAIRS] Error fetching token pairs:`, error);
    console.error(`[MORALIS-PAIRS] Error stack:`, error.stack);
    return null;
  }
}

// Moralis ERC20 Owners API for holder distribution analysis
export async function fetchMoralisTokenOwners(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS-OWNERS] === STARTING MORALIS TOKEN OWNERS API CALL ===`);
  console.log(`[MORALIS-OWNERS] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[MORALIS-OWNERS] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    const apiKey = Deno.env.get('MORALIS_API_KEY');
    if (!apiKey) {
      console.error(`[MORALIS-OWNERS] FAILED - MORALIS_API_KEY not configured`);
      return null;
    }

    console.log(`[MORALIS-OWNERS] API Key configured: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/owners?chain=${chainId}&limit=100&order=DESC`;
    console.log(`[MORALIS-OWNERS] Request URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[MORALIS-OWNERS] Response status: ${response.status} ${response.statusText}`);
    console.log(`[MORALIS-OWNERS] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MORALIS-OWNERS] API error: ${response.status} ${response.statusText}`);
      console.error(`[MORALIS-OWNERS] Error response body:`, errorText);
      return null;
    }

    const responseText = await response.text();
    console.log(`[MORALIS-OWNERS] Raw response text:`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[MORALIS-OWNERS] Failed to parse JSON:`, parseError);
      console.error(`[MORALIS-OWNERS] Raw response was:`, responseText);
      return null;
    }

    console.log(`[MORALIS-OWNERS] === FULL RAW API RESPONSE ===`);
    console.log(`[MORALIS-OWNERS] Parsed data:`, JSON.stringify(data, null, 2));
    console.log(`[MORALIS-OWNERS] Found ${data.result?.length || 0} top holders`);
    
    if (!data.result || !Array.isArray(data.result)) {
      console.log(`[MORALIS-OWNERS] No holders found or invalid result structure`);
      console.log(`[MORALIS-OWNERS] data.result type:`, typeof data.result);
      console.log(`[MORALIS-OWNERS] data.result:`, data.result);
      return null;
    }

    // Calculate distribution metrics with detailed logging
    console.log(`[MORALIS-OWNERS] Processing ${data.result.length} holders...`);
    const holders = data.result.map((holder, index) => {
      const holderData = {
        address: holder.owner_address,
        balance: parseFloat(holder.balance_formatted || 0),
        percentage: parseFloat(holder.percentage_relative_to_total_supply || 0)
      };
      
      if (index < 5) { // Log first 5 holders for debugging
        console.log(`[MORALIS-OWNERS] Holder ${index + 1}:`, {
          address: holder.owner_address,
          balance_raw: holder.balance,
          balance_formatted: holder.balance_formatted,
          percentage_raw: holder.percentage_relative_to_total_supply,
          processed: holderData
        });
      }
      
      return holderData;
    });

    // Calculate Gini coefficient for wealth distribution
    const balances = holders.map(h => h.percentage).sort((a, b) => a - b);
    const giniCoefficient = calculateGiniCoefficient(balances);
    
    // Determine concentration risk
    const top10Percentage = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
    let concentrationRisk = 'Low';
    if (top10Percentage > 80) concentrationRisk = 'Very High';
    else if (top10Percentage > 60) concentrationRisk = 'High';
    else if (top10Percentage > 40) concentrationRisk = 'Medium';

    console.log(`[MORALIS-OWNERS] === DISTRIBUTION ANALYSIS ===`);
    console.log(`[MORALIS-OWNERS] Total holders: ${data.total || holders.length}`);
    console.log(`[MORALIS-OWNERS] Gini coefficient: ${giniCoefficient.toFixed(3)}`);
    console.log(`[MORALIS-OWNERS] Top 10 percentage: ${top10Percentage.toFixed(1)}%`);
    console.log(`[MORALIS-OWNERS] Concentration risk: ${concentrationRisk}`);
    
    const result = {
      total_holders: data.total || holders.length,
      top_holders: holders.slice(0, 20),
      gini_coefficient: giniCoefficient,
      concentration_risk: concentrationRisk,
      top_10_percentage: top10Percentage
    };
    
    console.log(`[MORALIS-OWNERS] Final result:`, result);
    return result;
  } catch (error) {
    console.error(`[MORALIS-OWNERS] Error fetching token owners:`, error);
    console.error(`[MORALIS-OWNERS] Error stack:`, error.stack);
    return null;
  }
}

// Calculate Gini coefficient for wealth inequality measurement
function calculateGiniCoefficient(values: number[]): number {
  if (!values || values.length === 0) return 0;
  
  const n = values.length;
  const sortedValues = values.sort((a, b) => a - b);
  
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (2 * i - n + 1) * sortedValues[i];
  }
  
  const mean = sortedValues.reduce((a, b) => a + b) / n;
  return sum / (n * n * mean);
}

// Moralis API client using REST API for comprehensive token metadata
export async function fetchMoralisMetadata(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS] === STARTING MORALIS METADATA REST API CALL ===`);
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
    console.log(`[MORALIS] Chain: ${chainConfig.name} (${chainId})`);
    console.log(`[MORALIS] Target token: ${tokenAddress.toLowerCase()}`);
    
    // Call Moralis REST API for token metadata
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainId}&addresses%5B0%5D=${tokenAddress.toLowerCase()}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[MORALIS] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[MORALIS] API Response received:`, JSON.stringify(data, null, 2));
    
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