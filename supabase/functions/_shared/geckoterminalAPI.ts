// GeckoTerminal DEX pool/liquidity lookup — Moralis Pairs fallback for EVM.
//
// Added 2026-09-14, mirroring the pattern already live in solanaAPI.ts's
// fetchSolanaLiquidity (that Solana-only implementation is left untouched —
// this is a new, separate, generic function for the EVM chains). Fully
// keyless, free, public API. Verified live against all 5 EVM chains this
// project supports, using the `gecko` network slug already in chainConfig.ts.
import { getChainConfigByMoralisId } from './chainConfig.ts';

export interface GeckoTerminalPairsData {
  total_pairs: number;
  total_liquidity_usd: number;
  major_pairs: Array<{
    dex: string;
    pair_address: string;
    liquidity_usd: number;
    token0_symbol: string;
    token1_symbol: string;
    volume_24h_usd: number;
  }>;
}

export async function fetchGeckoTerminalPairs(
  tokenAddress: string,
  chainId: string,
): Promise<GeckoTerminalPairsData | null> {
  console.log(`[GECKOTERMINAL-EVM] === STARTING POOLS LOOKUP ===`);
  console.log(`[GECKOTERMINAL-EVM] Token: ${tokenAddress}, Chain: ${chainId}`);

  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig?.gecko) {
      console.log(`[GECKOTERMINAL-EVM] No network mapping for chain: ${chainId}`);
      return null;
    }

    const url = `https://api.geckoterminal.com/api/v2/networks/${chainConfig.gecko}/tokens/${tokenAddress.toLowerCase()}/pools?page=1`;
    console.log(`[GECKOTERMINAL-EVM] Request URL: ${url}`);

    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      console.error(`[GECKOTERMINAL-EVM] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const pools = data.data || [];
    console.log(`[GECKOTERMINAL-EVM] Found ${pools.length} pools`);

    let totalLiquidityUsd = 0;
    const majorPairs: GeckoTerminalPairsData['major_pairs'] = [];

    for (const pool of pools) {
      const attrs = pool.attributes || {};
      const liquidityUsd = parseFloat(attrs.reserve_in_usd || '0');
      totalLiquidityUsd += liquidityUsd;

      if (liquidityUsd > 1000 && majorPairs.length < 5) {
        const nameParts = (attrs.name || '').split(' / ');
        majorPairs.push({
          dex: pool.relationships?.dex?.data?.id || 'Unknown',
          pair_address: attrs.address || pool.id || '',
          liquidity_usd: liquidityUsd,
          token0_symbol: nameParts[0]?.trim() || '',
          token1_symbol: (nameParts[1] || '').split(' ')[0]?.trim() || '',
          volume_24h_usd: parseFloat(attrs.volume_usd?.h24 || '0'),
        });
      }
    }

    console.log(`[GECKOTERMINAL-EVM] Total liquidity: $${totalLiquidityUsd}, major pairs: ${majorPairs.length}`);

    return {
      total_pairs: pools.length,
      total_liquidity_usd: totalLiquidityUsd,
      major_pairs: majorPairs,
    };
  } catch (error) {
    console.error(`[GECKOTERMINAL-EVM] Error:`, error);
    return null;
  }
}
