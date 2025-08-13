export type OrchestrateRequest = {
  chain: string
  address: string
  tokenId: string
  name: string
  symbol: string
  logoUrl?: string
  overallScore?: number | null
  scores?: {
    security: number | null
    liquidity: number | null
    tokenomics: number | null
    community: number | null
    development: number | null
  }
  lastScannedAt?: string
  verticalHint?: "defi" | "gaming" | "nft" | "meme" | "infra" | "other"
  mood?: "neutral" | "bullish" | "cautious"
  force?: boolean
}

export type OrchestrateResponse = {
  ok: boolean
  assets: Partial<Record<string, string>>
  skipped?: string[]
  errors?: Array<{ step: string; error: string }>
}
