export type HeroRequest = {
  chain: string
  address: string
  name: string
  symbol: string
  vertical?: "defi" | "gaming" | "nft" | "meme" | "infra" | "other"
  mood?: "neutral" | "bullish" | "cautious"
}
export type HeroResponse = {
  ok: boolean
  url_1200x630?: string
  url_1080x1920?: string
  error?: string
}
