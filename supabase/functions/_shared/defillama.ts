// DeFiLlama API integration for TVL data
export async function fetchDeFiLlamaTVL(tokenAddress: string): Promise<number | null> {
  console.log(`[DEFILLAMA] === STARTING DEFILLAMA TVL LOOKUP ===`);
  console.log(`[DEFILLAMA] Token Address: ${tokenAddress}`);
  
  try {
    // Define known protocol mappings
    const protocolMappings: Record<string, string> = {
      // NEAR Protocol
      '0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4': 'near',
      // Add more mappings as needed
      '0xa0b86a33e6c8e8e5f3b0c4c9f5f5e5f5f5f5f5f5': 'aave',
      '0xd533a949740bb3306d119cc777fa900ba034cd52': 'curve',
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
    
    // Extract current TVL
    const currentTVL = data.currentChainTvls?.['Ethereum'] || data.tvl?.[data.tvl?.length - 1]?.totalLiquidityUSD || 0;
    
    console.log(`[DEFILLAMA] Extracted TVL: $${currentTVL}`);
    
    return typeof currentTVL === 'number' ? currentTVL : null;
    
  } catch (error) {
    console.error(`[DEFILLAMA] Error fetching TVL:`, error);
    return null;
  }
}