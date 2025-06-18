
import { TokenResult, TokenInfoEnriched } from "@/components/token/types";

// Transform CMC search result to our TokenResult format
export const transformCMCSearchResult = (cmcToken: any): TokenResult => {
  return {
    id: cmcToken.slug || `cmc-${cmcToken.id}`,
    name: cmcToken.name || '',
    symbol: cmcToken.symbol || '',
    market_cap_rank: cmcToken.rank || undefined,
    thumb: '', // Will be populated from detail data
    large: '', // Will be populated from detail data
    platforms: {}, // Will be populated from detail data
    market_cap: 0, // Will be populated from quote data
    price_usd: 0, // Will be populated from quote data
    price_change_24h: 0, // Will be populated from quote data
    isErc20: false, // Will be determined from platform data
    description: '', // Will be populated from detail data
    tokenInfo: {
      name: cmcToken.name || '',
      symbol: cmcToken.symbol || '',
      description: '',
      website_url: '',
      twitter_handle: '',
      github_url: '',
      logo_url: '',
      coingecko_id: '', // Not applicable for CMC
      current_price_usd: 0,
      price_change_24h: 0,
      market_cap_usd: 0,
      total_value_locked_usd: 'N/A'
    }
  };
};

// Transform CMC token info to our TokenInfoEnriched format
export const transformCMCTokenInfo = (cmcInfo: any, cmcToken: any): TokenInfoEnriched => {
  const urls = cmcInfo.urls || {};
  const website = urls.website?.[0] || '';
  const twitter = urls.twitter?.[0] || '';
  const github = urls.source_code?.[0] || '';
  
  // Extract Twitter handle from URL
  const twitterHandle = twitter ? twitter.split('/').pop()?.replace('@', '') || '' : '';
  
  return {
    name: cmcInfo.name || cmcToken.name || '',
    symbol: cmcInfo.symbol || cmcToken.symbol || '',
    description: cmcInfo.description || '',
    website_url: website,
    twitter_handle: twitterHandle,
    github_url: github,
    logo_url: cmcInfo.logo || '',
    coingecko_id: '', // Not applicable for CMC
    current_price_usd: 0, // Will be set from quote data
    price_change_24h: 0, // Will be set from quote data
    market_cap_usd: 0, // Will be set from quote data
    total_value_locked_usd: 'N/A'
  };
};

// Transform CMC quote data to extract price and market cap
export const transformCMCQuoteData = (cmcQuote: any) => {
  const usdQuote = cmcQuote.quote?.USD || {};
  
  return {
    price_usd: usdQuote.price || 0,
    price_change_24h: usdQuote.percent_change_24h || 0,
    market_cap: usdQuote.market_cap || 0,
    volume_24h: usdQuote.volume_24h || 0
  };
};

// Determine ERC-20 compatibility from CMC platform data
export const determineCMCErc20Compatibility = (cmcInfo: any): boolean => {
  if (!cmcInfo.platform) {
    return false;
  }
  
  // Check if it's on Ethereum or other EVM-compatible chains
  const evmChains = [
    'ethereum',
    'polygon',
    'binance-smart-chain',
    'arbitrum',
    'optimism',
    'avalanche',
    'fantom',
    'base'
  ];
  
  const platformName = cmcInfo.platform.name?.toLowerCase() || '';
  const tokenAddress = cmcInfo.platform.token_address;
  
  // Must have a valid contract address and be on an EVM chain
  return !!(tokenAddress && 
           tokenAddress.startsWith('0x') && 
           evmChains.some(chain => platformName.includes(chain)));
};

// Extract platform information for display
export const extractCMCPlatformData = (cmcInfo: any) => {
  if (!cmcInfo.platform) {
    return {};
  }
  
  const platformName = cmcInfo.platform.name || 'Unknown';
  const tokenAddress = cmcInfo.platform.token_address || '';
  
  // Map CMC platform names to our format
  const platformMap: Record<string, string> = {
    'ethereum': 'ethereum',
    'polygon': 'polygon-pos',
    'binance smart chain': 'binance-smart-chain',
    'arbitrum': 'arbitrum-one',
    'optimism': 'optimistic-ethereum',
    'avalanche': 'avalanche',
    'fantom': 'fantom',
    'base': 'base'
  };
  
  const normalizedPlatform = platformMap[platformName.toLowerCase()] || platformName.toLowerCase();
  
  return tokenAddress ? { [normalizedPlatform]: tokenAddress } : {};
};

// Create meaningful description from CMC data
export const createCMCDescription = (cmcInfo: any, cmcToken: any): string => {
  // Use CMC description if available and meaningful
  if (cmcInfo.description && cmcInfo.description.trim()) {
    const cleanDesc = cmcInfo.description.replace(/<[^>]*>/g, '').split('.')[0] + '.';
    return cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + '...' : cleanDesc;
  }
  
  // Create description from token data
  let desc = `${cmcToken.name} (${cmcToken.symbol})`;
  
  if (cmcToken.rank && cmcToken.rank > 0) {
    desc += ` is ranked #${cmcToken.rank} by market capitalization`;
  } else {
    desc += ` is a cryptocurrency token`;
  }
  
  // Add platform information if available
  if (cmcInfo.platform?.name) {
    desc += `. Built on ${cmcInfo.platform.name}`;
  }
  
  return desc;
};
