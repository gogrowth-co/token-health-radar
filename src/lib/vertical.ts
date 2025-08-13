export function inferVertical(input?: string, symbol?: string) {
  const s = (input || symbol || "").toLowerCase()
  if (/(swap|dex|lending|staking|yield|amm|tvl|liquidity)/.test(s)) return "defi"
  if (/(game|gaming|play|metaverse)/.test(s)) return "gaming"
  if (/(nft|collection|mint|art)/.test(s)) return "nft"
  if (/(pepe|doge|shib|inu|meme)/.test(s)) return "meme"
  if (/(infra|rpc|rollup|bridge|index|oracle|zk)/.test(s)) return "infra"
  return "other"
}
