
// CoinGecko API utilities for fetching token descriptions
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

export interface CoinGeckoTokenDetails {
  id: string;
  name: string;
  symbol: string;
  description: {
    en: string;
  };
  image: {
    large: string;
    small: string;
    thumb: string;
  };
  links: {
    homepage: string[];
    twitter_screen_name: string;
    github: string[];
  };
}

// Fetch token details from CoinGecko using token address
export const fetchCoinGeckoTokenByAddress = async (tokenAddress: string): Promise<CoinGeckoTokenDetails | null> => {
  try {
    console.log(`[COINGECKO] Fetching token details for address: ${tokenAddress}`);
    
    // First, get the coin ID from the contract address
    const platformResponse = await fetch(
      `${COINGECKO_BASE_URL}/coins/ethereum/contract/${tokenAddress.toLowerCase()}`
    );
    
    if (!platformResponse.ok) {
      console.warn(`[COINGECKO] Failed to fetch by address: ${platformResponse.status}`);
      return null;
    }
    
    const tokenData = await platformResponse.json();
    console.log(`[COINGECKO] Successfully fetched token data for ${tokenData.name}`);
    
    return {
      id: tokenData.id,
      name: tokenData.name,
      symbol: tokenData.symbol,
      description: tokenData.description || { en: '' },
      image: tokenData.image || { large: '', small: '', thumb: '' },
      links: tokenData.links || { homepage: [], twitter_screen_name: '', github: [] }
    };
    
  } catch (error) {
    console.error('[COINGECKO] Error fetching token details:', error);
    return null;
  }
};

// Fetch token details from CoinGecko using CoinGecko ID
export const fetchCoinGeckoTokenById = async (coinGeckoId: string): Promise<CoinGeckoTokenDetails | null> => {
  try {
    console.log(`[COINGECKO] Fetching token details for ID: ${coinGeckoId}`);
    
    const response = await fetch(
      `${COINGECKO_BASE_URL}/coins/${coinGeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`
    );
    
    if (!response.ok) {
      console.warn(`[COINGECKO] Failed to fetch by ID: ${response.status}`);
      return null;
    }
    
    const tokenData = await response.json();
    console.log(`[COINGECKO] Successfully fetched token data for ${tokenData.name}`);
    
    return {
      id: tokenData.id,
      name: tokenData.name,
      symbol: tokenData.symbol,
      description: tokenData.description || { en: '' },
      image: tokenData.image || { large: '', small: '', thumb: '' },
      links: tokenData.links || { homepage: [], twitter_screen_name: '', github: [] }
    };
    
  } catch (error) {
    console.error('[COINGECKO] Error fetching token details by ID:', error);
    return null;
  }
};

// Helper function to clean and format CoinGecko description
export const formatCoinGeckoDescription = (description: string): string => {
  if (!description || description.trim() === '') {
    return '';
  }
  
  // Remove HTML tags
  const cleanDesc = description
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  
  // Truncate if too long
  if (cleanDesc.length > 300) {
    const truncated = cleanDesc.substring(0, 300);
    const lastSpace = truncated.lastIndexOf(' ');
    return lastSpace > 250 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }
  
  return cleanDesc;
};
