
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
}
