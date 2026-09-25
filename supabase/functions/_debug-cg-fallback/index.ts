import { fetchCoinGeckoTokenData } from '../_shared/coingeckoAPI.ts'
import { fetchGeckoTerminalPairs } from '../_shared/geckoterminalAPI.ts'
import { fetchEtherscanTokenStats } from '../_shared/etherscanAPI.ts'

Deno.serve(async (req) => {
  try {
    const { token_address, chain_id } = await req.json()
    const cg = await fetchCoinGeckoTokenData(token_address, chain_id)
    const gt = await fetchGeckoTerminalPairs(token_address, chain_id)
    const es = await fetchEtherscanTokenStats(token_address, chain_id)
    return new Response(JSON.stringify({ cg, gt, es }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e), stack: e?.stack }, null, 2), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
