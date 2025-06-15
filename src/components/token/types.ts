
export interface TokenInfoEnriched {
  name: string;
  symbol: string;
  description?: string;
  website_url?: string;
  twitter_handle?: string;
  github_url?: string;
  logo_url?: string;
  coingecko_id?: string;
  current_price_usd?: number;
  price_change_24h?: number;
  market_cap_usd?: number;
  total_value_locked_usd?: string;
}

export interface TokenResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  thumb: string;
  large?: string;
  platforms?: Record<string, string>;
  market_cap?: number;
  price_usd?: number;
  price_change_24h?: number;
  isErc20?: boolean;
  description?: string;

  // Enriched token info (for complete scan)
  tokenInfo?: TokenInfoEnriched;
}
