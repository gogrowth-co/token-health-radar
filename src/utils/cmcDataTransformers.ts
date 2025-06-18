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
    cmc_id: cmcToken.id, // Include CMC ID from search result
    tokenInfo: {
      name: cmcToken.name || '',
      symbol: cmcToken.symbol || '',
      description: '',
      website_url: '',
      twitter_handle: '',
      github_url: '',
      logo_url: '',
      coingecko_id: '', // Not applicable for CMC
      cmc_id: cmcToken.id, // Include CMC ID in tokenInfo as well
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
    cmc_id: cmcToken.id, // Include CMC ID
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

// Create meaningful description from CMC data - Enhanced version for v2 API
export const createCMCDescription = (cmcInfo: any, cmcToken: any): string => {
  // First priority: Use CMC v2 description if available and meaningful
  if (cmcInfo.description && cmcInfo.description.trim()) {
    // Clean HTML tags and extract meaningful content
    const cleanDesc = cmcInfo.description
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ') // Replace multiple whitespace
      .trim();
    
    // If we have a substantial description, use it (v2 descriptions are typically better)
    if (cleanDesc.length > 20) { // Lower threshold for v2 API descriptions
      // Truncate if too long
      if (cleanDesc.length > 300) {
        const truncated = cleanDesc.substring(0, 300);
        const lastSpace = truncated.lastIndexOf(' ');
        return lastSpace > 250 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
      }
      return cleanDesc;
    }
  }
  
  // Second priority: Create informative description from available CMC data
  let desc = `${cmcToken.name} (${cmcToken.symbol})`;
  
  // Add ranking information if available
  if (cmcToken.rank && cmcToken.rank > 0) {
    if (cmcToken.rank <= 10) {
      desc += ` is a top 10 cryptocurrency ranked #${cmcToken.rank} by market capitalization`;
    } else if (cmcToken.rank <= 100) {
      desc += ` is ranked #${cmcToken.rank} by market capitalization`;
    } else {
      desc += ` is ranked #${cmcToken.rank} by market cap`;
    }
  } else {
    desc += ` is a digital asset`;
  }
  
  // Add platform information if available
  if (cmcInfo.platform?.name) {
    desc += `. Built on the ${cmcInfo.platform.name} network`;
  }
  
  // Add category information if available
  if (cmcInfo.category && Array.isArray(cmcInfo.category) && cmcInfo.category.length > 0) {
    const categories = cmcInfo.category.slice(0, 2).join(' and ');
    desc += `. Categorized as ${categories}`;
  }
  
  return desc;
};
