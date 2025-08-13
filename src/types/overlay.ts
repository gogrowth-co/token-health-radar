export type PillarScores = {
  security: number | null
  liquidity: number | null
  tokenomics: number | null
  community: number | null
  development: number | null
}

export type HeroOverlayPayload = {
  chain: string
  address: string
  name: string
  symbol: string
  logoUrl?: string
  overallScore: number | null
  scores: PillarScores
  lastScannedAt?: string // ISO
}
