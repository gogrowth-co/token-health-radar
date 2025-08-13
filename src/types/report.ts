export type SeriesPoint = { t: number; v: number }
export type ChartType = "price_7d" | "tvl_90d" | "holders_donut"

export type TokenMini = {
  tokenId: string
  chain: string
  address: string
  name: string
  symbol: string
}
