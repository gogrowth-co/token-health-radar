// DeFiLlama API integration for TVL data
export async function fetchDeFiLlamaTVL(tokenAddress: string): Promise<number | null> {
  console.log(`[DEFILLAMA] === STARTING DEFILLAMA TVL LOOKUP ===`);
  console.log(`[DEFILLAMA] Token Address: ${tokenAddress}`);
  
  try {
    // Define known protocol mappings for DeFi protocols
    const protocolMappings: Record<string, string> = {
      // Pendle Protocol - FIX: Correct mapping for Pendle token
      '0x808507121b80c02388fad14726482e061b8da827': 'pendle',
      // Major DeFi Protocols
      '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9': 'aave', // AAVE token
      '0xc00e94cb662c3520282e6f5717214004a7f26888': 'compound', // COMP token
      '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984': 'uniswap', // UNI token
      '0xd533a949740bb3306d119cc777fa900ba034cd52': 'curve', // CRV token
      '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2': 'sushiswap', // SUSHI token
      '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e': 'yearn-finance', // YFI token
      '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2': 'makerdao', // MKR token
      // Layer 2 and Infrastructure
      '0x4e3fbd56cd56c3e72c1403e103b45db9da5b9d2b': 'convex-finance', // CVX token
      '0x3472a5a71965499acd81997a54bba8d852c6e53d': 'badger-dao', // BADGER token
    };

    const protocolSlug = protocolMappings[tokenAddress.toLowerCase()];
    
    if (!protocolSlug) {
      console.log(`[DEFILLAMA] No protocol mapping found for token: ${tokenAddress}`);
      return null;
    }

    console.log(`[DEFILLAMA] Found protocol mapping: ${tokenAddress} -> ${protocolSlug}`);
    
    const url = `https://api.llama.fi/protocol/${protocolSlug}`;
    console.log(`[DEFILLAMA] Fetching TVL from: ${url}`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[DEFILLAMA] API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    console.log(`[DEFILLAMA] Raw API response:`, JSON.stringify(data, null, 2));
    
    // Extract current TVL with enhanced logic
    const currentTVL = data.currentChainTvls?.['Ethereum'] || 
                      data.tvl?.[data.tvl?.length - 1]?.totalLiquidityUSD || 
                      data.currentChainTvls?.total ||
                      0;
    
    console.log(`[DEFILLAMA] TVL extraction details:`, {
      currentChainTvls: data.currentChainTvls,
      tvlArrayLength: data.tvl?.length,
      lastTvlEntry: data.tvl?.[data.tvl?.length - 1],
      extractedTVL: currentTVL
    });
    
    // Return null if TVL is 0 to distinguish from actual zero TVL
    return typeof currentTVL === 'number' && currentTVL > 0 ? currentTVL : null;
    
  } catch (error) {
    console.error(`[DEFILLAMA] Error fetching TVL:`, error);
    return null;
  }
}