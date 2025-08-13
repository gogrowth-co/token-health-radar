export function pathHero(chain: string, address: string) {
  return `reports/${chain}/${address}/hero_1200x630.png`
}
export function pathScore(chain: string, address: string) {
  return `reports/${chain}/${address}/score-snapshot_1200x630.png`
}
export function pathChartPrice(chain: string, address: string) {
  return `reports/${chain}/${address}/chart_price_7d.png`
}

// Given a storage path, return a public URL (no DB writes)
// If you're already using Supabase JS client, reuse it here.
export function storagePublicUrl(supabase: any, path: string) {
  const { data } = supabase.storage.from("reports").getPublicUrl(path)
  return data?.publicUrl || ""
}
