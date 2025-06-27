
import { CHAIN_MAP, getChainConfigByMoralisId } from './chainConfig.ts';

// GoPlus Security API client
export async function fetchGoPlusSecurity(tokenAddress: string, chainId: string) {
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.log(`[GOPLUS] Unsupported chain: ${chainId}`);
      return null;
    }

    const url = `https://api.gopluslabs.io/api/v1/token_security/${chainConfig.goplus}?contract_addresses=${tokenAddress.toLowerCase()}`;
    console.log(`[GOPLUS] Fetching security data: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GoPlus API error: ${response.status}`);
    }
    
    const data = await response.json();
    const tokenData = data.result?.[tokenAddress.toLowerCase()];
    
    if (!tokenData) {
      console.log(`[GOPLUS] No security data found for token: ${tokenAddress}`);
      return null;
    }
    
    return {
      ownership_renounced: tokenData.owner_address === '0x0000000000000000000000000000000000000000',
      can_mint: tokenData.can_take_back_ownership === '1' || tokenData.cannot_buy === '1',
      honeypot_detected: tokenData.is_honeypot === '1',
      freeze_authority: tokenData.can_take_back_ownership === '1',
      audit_status: tokenData.trust_list ? 'verified' : 'unverified'
    };
  } catch (error) {
    console.error(`[GOPLUS] Error fetching security data:`, error);
    return null;
  }
}

// GeckoTerminal API client for price and liquidity data
export async function fetchGeckoTerminalData(tokenAddress: string, chainId: string) {
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.log(`[GECKO] Unsupported chain: ${chainId}`);
      return null;
    }

    const url = `https://api.geckoterminal.com/api/v2/networks/${chainConfig.gecko}/tokens/${tokenAddress.toLowerCase()}`;
    console.log(`[GECKO] Fetching market data: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GeckoTerminal API error: ${response.status}`);
    }
    
    const data = await response.json();
    const tokenData = data.data?.attributes;
    
    if (!tokenData) {
      console.log(`[GECKO] No market data found for token: ${tokenAddress}`);
      return null;
    }
    
    return {
      current_price_usd: parseFloat(tokenData.price_usd) || 0,
      price_change_24h: parseFloat(tokenData.price_change_percentage?.h24) || 0,
      market_cap_usd: parseFloat(tokenData.market_cap_usd) || 0,
      trading_volume_24h_usd: parseFloat(tokenData.volume_usd?.h24) || 0,
      name: tokenData.name || '',
      symbol: tokenData.symbol || ''
    };
  } catch (error) {
    console.error(`[GECKO] Error fetching market data:`, error);
    return null;
  }
}

// Moralis API client for comprehensive token metadata
export async function fetchMoralisMetadata(tokenAddress: string, chainId: string) {
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.log(`[MORALIS] Unsupported chain: ${chainId}`);
      return null;
    }

    // Get API key from environment
    const apiKey = Deno.env.get('MORALIS_API_KEY');
    if (!apiKey) {
      console.log(`[MORALIS] No API key configured`);
      return null;
    }

    const url = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainId}&addresses%5B0%5D=${tokenAddress.toLowerCase()}`;
    console.log(`[MORALIS] Fetching metadata: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
        'accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Moralis API error: ${response.status}`);
    }
    
    const data = await response.json();
    const tokenData = data[0];
    
    if (!tokenData) {
      console.log(`[MORALIS] No metadata found for token: ${tokenAddress}`);
      return null;
    }
    
    return {
      name: tokenData.name || '',
      symbol: tokenData.symbol || '',
      decimals: parseInt(tokenData.decimals) || 18,
      logo: tokenData.logo || '',
      thumbnail: tokenData.thumbnail || '',
      total_supply: tokenData.total_supply || '0',
      verified_contract: tokenData.verified_contract || false,
      possible_spam: tokenData.possible_spam || false
    };
  } catch (error) {
    console.error(`[MORALIS] Error fetching metadata:`, error);
    return null;
  }
}

// Calculate security score based on real data
export function calculateSecurityScore(securityData: any): number {
  if (!securityData) return 0;
  
  let score = 50; // Base score
  
  // Positive factors
  if (securityData.ownership_renounced) score += 20;
  if (securityData.audit_status === 'verified') score += 15;
  if (!securityData.can_mint) score += 10;
  
  // Negative factors
  if (securityData.honeypot_detected) score -= 30;
  if (securityData.freeze_authority) score -= 15;
  
  return Math.max(0, Math.min(100, score));
}

// Calculate liquidity score based on real data
export function calculateLiquidityScore(marketData: any): number {
  if (!marketData) return 0;
  
  let score = 30; // Base score
  
  // Volume-based scoring
  const volume24h = marketData.trading_volume_24h_usd || 0;
  if (volume24h > 1000000) score += 25; // > $1M
  else if (volume24h > 100000) score += 15; // > $100K
  else if (volume24h > 10000) score += 5; // > $10K
  
  // Market cap based scoring
  const marketCap = marketData.market_cap_usd || 0;
  if (marketCap > 100000000) score += 20; // > $100M
  else if (marketCap > 10000000) score += 10; // > $10M
  else if (marketCap > 1000000) score += 5; // > $1M
  
  return Math.max(0, Math.min(100, score));
}

// Calculate tokenomics score based on real data
export function calculateTokenomicsScore(moralisData: any, marketData: any): number {
  if (!moralisData && !marketData) return 0;
  
  let score = 40; // Base score
  
  // Supply analysis
  if (moralisData?.total_supply) {
    const supply = parseFloat(moralisData.total_supply);
    if (supply < 1000000000) score += 15; // Low supply is good
    else if (supply > 1000000000000) score -= 10; // Very high supply is concerning
  }
  
  // Contract verification
  if (moralisData?.verified_contract) score += 10;
  
  // Spam detection (negative factor)
  if (moralisData?.possible_spam) score -= 20;
  
  // Price stability (less volatility is better for tokenomics)
  if (marketData?.price_change_24h !== undefined) {
    const change = Math.abs(marketData.price_change_24h);
    if (change < 5) score += 10; // Stable price
    else if (change > 20) score -= 5; // High volatility
  }
  
  return Math.max(0, Math.min(100, score));
}
