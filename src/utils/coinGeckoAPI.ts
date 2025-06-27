
// CoinGecko API utilities - DEPRECATED
// This file is kept for reference but is no longer used in the frontend
// The backend scan function uses Moralis as the primary metadata source

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

// DEPRECATED: Use backend scan function instead
export const fetchCoinGeckoTokenByAddress = async (tokenAddress: string): Promise<CoinGeckoTokenDetails | null> => {
  console.warn('[COINGECKO] This function is deprecated. Use backend scan function instead.');
  return null;
};

// DEPRECATED: Use backend scan function instead
export const fetchCoinGeckoTokenById = async (coinGeckoId: string): Promise<CoinGeckoTokenDetails | null> => {
  console.warn('[COINGECKO] This function is deprecated. Use backend scan function instead.');
  return null;
};

// DEPRECATED: Use backend scan function instead
export const formatCoinGeckoDescription = (description: string): string => {
  console.warn('[COINGECKO] This function is deprecated. Use backend scan function instead.');
  return '';
};
