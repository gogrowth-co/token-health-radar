// Normalize chain and address for consistent storage paths
function normalizeChain(chain: string): string {
  if (chain === '0x1' || chain === '1') return 'ethereum'
  return chain.toLowerCase()
}

function normalizeAddress(address: string): string {
  return address.toLowerCase()
}

export function pathHero(chain: string, address: string) {
  const normalizedChain = normalizeChain(chain)
  const normalizedAddress = normalizeAddress(address)
  return `${normalizedChain}/${normalizedAddress}/hero_1200x630.png`
}

export function pathScore(chain: string, address: string) {
  const normalizedChain = normalizeChain(chain)
  const normalizedAddress = normalizeAddress(address)
  return `${normalizedChain}/${normalizedAddress}/score-snapshot_1200x630.png`
}

export function pathChartPrice(chain: string, address: string) {
  const normalizedChain = normalizeChain(chain)
  const normalizedAddress = normalizeAddress(address)
  return `${normalizedChain}/${normalizedAddress}/chart_price_7d.png`
}

// Given a storage path, return a public URL (no DB writes)
// If you're already using Supabase JS client, reuse it here.
export function storagePublicUrl(supabase: any, path: string) {
  if (!path || !supabase) return ""
  
  const { data } = supabase.storage.from("reports").getPublicUrl(path)
  const url = data?.publicUrl || ""
  
  // Debug logging in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Storage URL construction:', { path, url })
  }
  
  return url
}
