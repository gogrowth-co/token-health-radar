
import { TokenResult, TokenInfoEnriched } from "@/components/token/types";

// Transform Moralis token search result to our TokenResult format
export const transformMoralisSearchResult = (moralisToken: any): TokenResult => {
  return {
    id: `${moralisToken.chain}-${moralisToken.address}`,
    name: moralisToken.name || '',
    symbol: moralisToken.symbol || '',
    market_cap_rank: undefined, // Moralis doesn't provide ranking
    thumb: moralisToken.logo || '',
    large: moralisToken.logo || '',
    platforms: {
      [moralisToken.chain]: moralisToken.address
    },
    market_cap: 0, // Will be populated from price data if available
    price_usd: 0, // Will be populated from price data if available
    price_change_24h: 0, // Will be populated from price data if available
    isErc20: moralisToken.verified || false,
    description: '', // Will be populated from additional data
    tokenInfo: {
      name: moralisToken.name || '',
      symbol: moralisToken.symbol || '',
      description: '',
      website_url: '',
      twitter_handle: '',
      github_url: '',
      logo_url: moralisToken.logo || '',
      coingecko_id: '', // Not applicable for Moralis
      current_price_usd: 0,
      price_change_24h: 0,
      market_cap_usd: 0,
      total_value_locked_usd: 'N/A'
    }
  };
};

// Transform Moralis token metadata to our TokenInfoEnriched format
export const transformMoralisTokenInfo = (moralisMetadata: any, moralisToken: any): TokenInfoEnriched => {
  return {
    name: moralisMetadata.name || moralisToken.name || '',
    symbol: moralisMetadata.symbol || moralisToken.symbol || '',
    description: createMoralisDescription(moralisMetadata, moralisToken),
    website_url: '',
    twitter_handle: '',
    github_url: '',
    logo_url: moralisMetadata.logo || moralisToken.logo || '',
    coingecko_id: '', // Not applicable for Moralis
    current_price_usd: 0, // Will be set from price data
    price_change_24h: 0, // Will be set from price data
    market_cap_usd: 0, // Will be set from price data
    total_value_locked_usd: 'N/A'
  };
};

// Create meaningful description from Moralis data
export const createMoralisDescription = (moralisMetadata: any, moralisToken: any): string => {
  const tokenName = moralisMetadata.name || moralisToken.name || 'Unknown Token';
  const tokenSymbol = moralisMetadata.symbol || moralisToken.symbol || 'UNKNOWN';
  const chainName = getChainDisplayName(moralisToken.chain);
  
  let desc = `${tokenName} (${tokenSymbol})`;
  
  if (moralisToken.verified) {
    desc += ` is a verified token on the ${chainName} network`;
  } else {
    desc += ` is a token on the ${chainName} network`;
  }
  
  // Add decimals information if available
  if (moralisMetadata.decimals) {
    desc += `. Token uses ${moralisMetadata.decimals} decimal places`;
  }
  
  return desc;
};

// Helper function to get chain display name
const getChainDisplayName = (chain: string): string => {
  const chainNames: Record<string, string> = {
    'eth': 'Ethereum',
    '0x1': 'Ethereum',
    'polygon': 'Polygon',
    '0x89': 'Polygon',
    'bsc': 'BSC',
    '0x38': 'BSC',
    'arbitrum': 'Arbitrum',
    '0xa4b1': 'Arbitrum',
    'avalanche': 'Avalanche',
    '0xa86a': 'Avalanche',
    'optimism': 'Optimism',
    '0xa': 'Optimism',
    'base': 'Base',
    '0x2105': 'Base',
    'fantom': 'Fantom',
    '0xfa': 'Fantom'
  };
  
  return chainNames[chain.toLowerCase()] || chain.charAt(0).toUpperCase() + chain.slice(1);
};

// Determine if token is ERC-20 compatible based on Moralis data
export const determineMoralisErc20Compatibility = (moralisToken: any): boolean => {
  // Check if it's verified by Moralis (indicates it's a legitimate token)
  if (moralisToken.verified) {
    return true;
  }
  
  // Check if it has a valid contract address and is on an EVM chain
  const evmChains = ['eth', '0x1', 'polygon', '0x89', 'bsc', '0x38', 'arbitrum', '0xa4b1', 'base', '0x2105', 'optimism', '0xa'];
  const hasValidAddress = moralisToken.address && moralisToken.address.startsWith('0x') && moralisToken.address.length === 42;
  const isEvmChain = evmChains.includes(moralisToken.chain?.toLowerCase());
  
  return hasValidAddress && isEvmChain;
};

// Extract platform information for display
export const extractMoralisPlatformData = (moralisToken: any) => {
  if (!moralisToken.address || !moralisToken.chain) {
    return {};
  }
  
  // Map Moralis chain identifiers to our platform format
  const platformMap: Record<string, string> = {
    'eth': 'ethereum',
    '0x1': 'ethereum',
    'polygon': 'polygon-pos',
    '0x89': 'polygon-pos',
    'bsc': 'binance-smart-chain',
    '0x38': 'binance-smart-chain',
    'arbitrum': 'arbitrum-one',
    '0xa4b1': 'arbitrum-one',
    'optimism': 'optimistic-ethereum',
    '0xa': 'optimistic-ethereum',
    'avalanche': 'avalanche',
    '0xa86a': 'avalanche',
    'base': 'base',
    '0x2105': 'base',
    'fantom': 'fantom',
    '0xfa': 'fantom'
  };
  
  const normalizedPlatform = platformMap[moralisToken.chain.toLowerCase()] || moralisToken.chain.toLowerCase();
  
  return { [normalizedPlatform]: moralisToken.address };
};
