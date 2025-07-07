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

    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/stats?chain=${chainId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[MORALIS-STATS] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[MORALIS-STATS] Token stats received:`, JSON.stringify(data, null, 2));
    
    return {
      total_supply: data.total_supply || '0',
      holders: data.holders || 0,
      transfers: data.transfers || 0,
      total_supply_formatted: data.total_supply_formatted || '0'
    };
  } catch (error) {
    console.error(`[MORALIS-STATS] Error fetching token stats:`, error);
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

    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/pairs?chain=${chainId}&limit=20`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[MORALIS-PAIRS] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[MORALIS-PAIRS] Found ${data.result?.length || 0} pairs`);
    
    // Calculate total DEX liquidity
    let totalLiquidityUsd = 0;
    const majorPairs = [];
    
    if (data.result && Array.isArray(data.result)) {
      for (const pair of data.result) {
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
    }
    
    console.log(`[MORALIS-PAIRS] Total DEX liquidity: $${totalLiquidityUsd}, Major pairs: ${majorPairs.length}`);
    
    return {
      total_pairs: data.result?.length || 0,
      total_liquidity_usd: totalLiquidityUsd,
      major_pairs: majorPairs
    };
  } catch (error) {
    console.error(`[MORALIS-PAIRS] Error fetching token pairs:`, error);
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

    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/owners?chain=${chainId}&limit=100&order=DESC`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[MORALIS-OWNERS] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[MORALIS-OWNERS] Found ${data.result?.length || 0} top holders`);
    
    if (!data.result || !Array.isArray(data.result)) {
      return null;
    }

    // Calculate distribution metrics
    const holders = data.result.map(holder => ({
      address: holder.owner_address,
      balance: parseFloat(holder.balance_formatted || 0),
      percentage: parseFloat(holder.percentage_relative_to_total_supply || 0)
    }));

    // Calculate Gini coefficient for wealth distribution
    const balances = holders.map(h => h.percentage).sort((a, b) => a - b);
    const giniCoefficient = calculateGiniCoefficient(balances);
    
    // Determine concentration risk
    const top10Percentage = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
    let concentrationRisk = 'Low';
    if (top10Percentage > 80) concentrationRisk = 'Very High';
    else if (top10Percentage > 60) concentrationRisk = 'High';
    else if (top10Percentage > 40) concentrationRisk = 'Medium';

    console.log(`[MORALIS-OWNERS] Distribution analysis: Gini: ${giniCoefficient.toFixed(3)}, Top 10: ${top10Percentage.toFixed(1)}%, Risk: ${concentrationRisk}`);
    
    return {
      total_holders: data.total || holders.length,
      top_holders: holders.slice(0, 20),
      gini_coefficient: giniCoefficient,
      concentration_risk: concentrationRisk,
      top_10_percentage: top10Percentage
    };
  } catch (error) {
    console.error(`[MORALIS-OWNERS] Error fetching token owners:`, error);
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