/**
 * Solana-native API integrations for SPL token scanning
 * Uses Solana RPC, GeckoTerminal, and CoinGecko for data fetching
 */

const SOLANA_RPC_URL = 'https://api.mainnet-beta.solana.com';

/**
 * Fetch SPL token mint info from Solana RPC
 * Returns mint authority, freeze authority, supply, and decimals
 */
export async function fetchSPLMintInfo(mintAddress: string): Promise<{
  decimals: number | null;
  supply: string | null;
  mintAuthority: string | null;
  freezeAuthority: string | null;
  isInitialized: boolean;
}> {
  try {
    console.log(`[SOLANA-RPC] Fetching mint info for: ${mintAddress}`);
    
    const response = await fetch(SOLANA_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAccountInfo',
        params: [mintAddress, { encoding: 'jsonParsed' }]
      })
    });

    if (!response.ok) {
      console.error(`[SOLANA-RPC] HTTP error: ${response.status}`);
      return { decimals: null, supply: null, mintAuthority: null, freezeAuthority: null, isInitialized: false };
    }

    const data = await response.json();
    
    if (data.error) {
      console.error(`[SOLANA-RPC] RPC error:`, data.error);
      return { decimals: null, supply: null, mintAuthority: null, freezeAuthority: null, isInitialized: false };
    }

    const parsed = data.result?.value?.data?.parsed?.info;
    
    if (!parsed) {
      console.warn(`[SOLANA-RPC] No parsed data for mint: ${mintAddress}`);
      return { decimals: null, supply: null, mintAuthority: null, freezeAuthority: null, isInitialized: false };
    }

    console.log(`[SOLANA-RPC] Mint info retrieved:`, {
      decimals: parsed.decimals,
      supply: parsed.supply,
      mintAuthority: parsed.mintAuthority ? 'Active' : 'Renounced',
      freezeAuthority: parsed.freezeAuthority ? 'Active' : 'Disabled'
    });

    return {
      decimals: parsed.decimals ?? null,
      supply: parsed.supply ?? null,
      mintAuthority: parsed.mintAuthority ?? null,
      freezeAuthority: parsed.freezeAuthority ?? null,
      isInitialized: parsed.isInitialized ?? false
    };
  } catch (error) {
    console.error(`[SOLANA-RPC] Error fetching mint info:`, error);
    return { decimals: null, supply: null, mintAuthority: null, freezeAuthority: null, isInitialized: false };
  }
}

/**
 * Fetch Solana token liquidity from GeckoTerminal
 * Returns total liquidity, major pools, and pool count
 */
export async function fetchSolanaLiquidity(mintAddress: string): Promise<{
  totalLiquidity: number;
  majorPools: Array<{
    dex: string;
    name: string;
    liquidity_usd: number;
    volume_24h: number;
  }>;
  poolCount: number;
}> {
  try {
    console.log(`[GECKOTERMINAL] Fetching Solana liquidity for: ${mintAddress}`);
    
    const url = `https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mintAddress}/pools?page=1`;
    
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`[GECKOTERMINAL] HTTP error: ${response.status}`);
      return { totalLiquidity: 0, majorPools: [], poolCount: 0 };
    }

    const data = await response.json();
    const pools = data.data || [];

    let totalLiquidity = 0;
    const majorPools: Array<{ dex: string; name: string; liquidity_usd: number; volume_24h: number }> = [];

    for (const pool of pools.slice(0, 10)) {
      const liquidity = parseFloat(pool.attributes?.reserve_in_usd || '0');
      totalLiquidity += liquidity;

      if (liquidity > 1000) {
        majorPools.push({
          dex: pool.relationships?.dex?.data?.id || 'Unknown',
          name: pool.attributes?.name || 'Unknown Pool',
          liquidity_usd: liquidity,
          volume_24h: parseFloat(pool.attributes?.volume_usd?.h24 || '0')
        });
      }
    }

    console.log(`[GECKOTERMINAL] Found ${pools.length} pools, total liquidity: $${totalLiquidity.toLocaleString()}`);

    return { totalLiquidity, majorPools, poolCount: pools.length };
  } catch (error) {
    console.error(`[GECKOTERMINAL] Error fetching liquidity:`, error);
    return { totalLiquidity: 0, majorPools: [], poolCount: 0 };
  }
}

/**
 * Fetch Solana token market data from CoinGecko
 * Returns price, market cap, and metadata
 */
export async function fetchSolanaMarketData(mintAddress: string): Promise<{
  name: string | null;
  symbol: string | null;
  image: string | null;
  current_price: number | null;
  market_cap: number | null;
  price_change_24h: number | null;
  description: string | null;
} | null> {
  try {
    console.log(`[COINGECKO-SOLANA] Fetching market data for: ${mintAddress}`);
    
    const apiKey = Deno.env.get('COINGECKO_API_KEY');
    const url = `https://api.coingecko.com/api/v3/coins/solana/contract/${mintAddress}`;
    
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (apiKey) {
      headers['x-cg-demo-api-key'] = apiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.warn(`[COINGECKO-SOLANA] HTTP error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    console.log(`[COINGECKO-SOLANA] Market data retrieved for: ${data.name}`);

    return {
      name: data.name || null,
      symbol: data.symbol?.toUpperCase() || null,
      image: data.image?.large || data.image?.small || null,
      current_price: data.market_data?.current_price?.usd || null,
      market_cap: data.market_data?.market_cap?.usd || null,
      price_change_24h: data.market_data?.price_change_percentage_24h || null,
      description: data.description?.en?.split('.')[0] || null
    };
  } catch (error) {
    console.error(`[COINGECKO-SOLANA] Error fetching market data:`, error);
    return null;
  }
}

/**
 * Calculate Solana security score based on mint/freeze authority
 */
export function calculateSolanaSecurityScore(mintInfo: {
  mintAuthority: string | null;
  freezeAuthority: string | null;
}): number {
  let score = 50; // Base score
  
  // Mint authority renounced = +30 points (can't create new tokens)
  if (mintInfo.mintAuthority === null) {
    score += 30;
  }
  
  // Freeze authority disabled = +20 points (can't freeze accounts)
  if (mintInfo.freezeAuthority === null) {
    score += 20;
  }
  
  console.log(`[SOLANA-SCORE] Security score: ${score} (mintAuth: ${mintInfo.mintAuthority ? 'Active' : 'Renounced'}, freezeAuth: ${mintInfo.freezeAuthority ? 'Active' : 'Disabled'})`);
  
  return Math.min(100, score);
}

/**
 * Calculate Solana tokenomics score
 */
export function calculateSolanaTokenomicsScore(
  mintInfo: { supply: string | null; mintAuthority: string | null },
  marketData: { market_cap: number | null } | null
): number {
  let score = 40; // Base score
  
  // Has supply data
  if (mintInfo.supply) {
    score += 10;
  }
  
  // Market cap available
  if (marketData?.market_cap && marketData.market_cap > 0) {
    score += 15;
    
    // Larger market cap = more established
    if (marketData.market_cap > 100000000) score += 15; // >$100M
    else if (marketData.market_cap > 10000000) score += 10; // >$10M
    else if (marketData.market_cap > 1000000) score += 5; // >$1M
  }
  
  // Mint authority renounced = no inflation risk
  if (mintInfo.mintAuthority === null) {
    score += 10;
  }
  
  console.log(`[SOLANA-SCORE] Tokenomics score: ${score}`);
  
  return Math.min(100, score);
}

/**
 * Calculate Solana liquidity score
 */
export function calculateSolanaLiquidityScore(liquidityData: {
  totalLiquidity: number;
  poolCount: number;
}): number {
  let score = 20; // Base score
  
  const liquidity = liquidityData.totalLiquidity;
  
  // Liquidity depth scoring
  if (liquidity > 10000000) score += 40; // >$10M
  else if (liquidity > 1000000) score += 35; // >$1M
  else if (liquidity > 500000) score += 30; // >$500K
  else if (liquidity > 100000) score += 25; // >$100K
  else if (liquidity > 50000) score += 20; // >$50K
  else if (liquidity > 10000) score += 15; // >$10K
  else if (liquidity > 1000) score += 10; // >$1K
  
  // Multiple pools = more decentralized liquidity
  if (liquidityData.poolCount > 10) score += 15;
  else if (liquidityData.poolCount > 5) score += 10;
  else if (liquidityData.poolCount > 2) score += 5;
  
  console.log(`[SOLANA-SCORE] Liquidity score: ${score} (liquidity: $${liquidity.toLocaleString()}, pools: ${liquidityData.poolCount})`);
  
  return Math.min(100, score);
}
