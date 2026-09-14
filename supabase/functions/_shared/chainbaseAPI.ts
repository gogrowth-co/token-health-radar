// Chainbase — holder concentration + price volatility.
//
// Added 2026-09-14. Fills two gaps that had no fallback at all before this:
//
// 1. Holder concentration/Gini (Moralis Owners has been 401ing since the
//    2026-09-01 outage, same as everything else Moralis; see
//    coingeckoAPI.ts/geckoterminalAPI.ts/etherscanAPI.ts for the sibling
//    fallbacks added the same day). Chainbase's top-holders endpoint caps at
//    100 holders per call — nowhere near enough for a true population-wide
//    Gini coefficient on a popular token (Dune-verified: Aerodrome alone has
//    ~800k holders). Rather than mislabel a top-100-only approximation as
//    "Gini" (decided against explicitly), this computes the standard
//    industry concentration metric instead: what % of TOTAL supply the top
//    10 holders control (total, not circulating — see the comment on
//    fetchTopHolderConcentration's totalSupply param for why that matters).
//    `distribution_gini_coefficient` in the DB stays null — this never
//    claims to be a Gini coefficient anywhere.
//
// 2. Price stability in calculateTokenomicsScore previously used a single
//    24h price_change_24h figure — noisy, easy for one lucky/unlucky day to
//    misrepresent a token's real volatility. This adds a 7-day price-range
//    volatility figure from real historical ticks as a steadier signal,
//    falling back to the 24h figure when history isn't available.
//
// Free tier: 200k credits/mo, no card required, 1-5 credits per Web3 API
// call. Both endpoints below cost one call each regardless of the token.
import { getChainConfigByMoralisId } from './chainConfig.ts';

export interface HolderConcentrationData {
  holders_analyzed: number;
  top_10_pct_of_supply: number | null;
  top_holders: Array<{ wallet_address: string; amount: string; usd_value: string }>;
}

export interface PriceVolatilityData {
  data_points: number;
  volatility_pct: number;
  period_days: number;
}

const CHAINBASE_BASE = 'https://api.chainbase.online/v1';

export async function fetchTopHolderConcentration(
  tokenAddress: string,
  chainId: string,
  // Must be TOTAL supply, not circulating. Chainbase's top-holders list
  // necessarily includes every wallet regardless of lock status (treasury,
  // vesting contracts, LP escrow) — dividing by circulating-only supply,
  // which by definition excludes locked tokens, produces a >100% result
  // whenever a large holder sits in the non-circulating portion. Confirmed
  // live 2026-09-14: AERO's circulating supply is ~half its total supply,
  // and its top-10 holders came back as 133.6% of circulating — impossible
  // — but a sane ~67% of total supply.
  totalSupply: number | null,
): Promise<HolderConcentrationData | null> {
  console.log(`[CHAINBASE-HOLDERS] === STARTING TOP HOLDERS LOOKUP ===`);
  console.log(`[CHAINBASE-HOLDERS] Token: ${tokenAddress}, Chain: ${chainId}`);

  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig?.goplus) {
      console.log(`[CHAINBASE-HOLDERS] No numeric chain id mapping for chain: ${chainId}`);
      return null;
    }

    const apiKey = Deno.env.get('CHAINBASE_API_KEY');
    if (!apiKey) {
      console.log(`[CHAINBASE-HOLDERS] CHAINBASE_API_KEY not configured`);
      return null;
    }

    const url = `${CHAINBASE_BASE}/token/top-holders?chain_id=${chainConfig.goplus}&contract_address=${tokenAddress.toLowerCase()}&page=1&limit=100`;
    const response = await fetch(url, { headers: { 'x-api-key': apiKey, Accept: 'application/json' } });

    if (!response.ok) {
      console.error(`[CHAINBASE-HOLDERS] HTTP error: ${response.status}`);
      return null;
    }

    const body = await response.json();
    if (body.code !== 0 || !Array.isArray(body.data)) {
      console.error(`[CHAINBASE-HOLDERS] API error: ${body.message || 'unknown'}`);
      return null;
    }

    const holders = body.data as Array<{ wallet_address: string; amount: string; usd_value: string }>;
    console.log(`[CHAINBASE-HOLDERS] Got ${holders.length} holders`);

    if (holders.length === 0) {
      return { holders_analyzed: 0, top_10_pct_of_supply: null, top_holders: [] };
    }

    let top10PctOfSupply: number | null = null;
    if (totalSupply && totalSupply > 0) {
      const top10Sum = holders
        .slice(0, 10)
        .reduce((sum, h) => sum + (parseFloat(h.amount) || 0), 0);
      top10PctOfSupply = (top10Sum / totalSupply) * 100;
      console.log(`[CHAINBASE-HOLDERS] Top 10 hold ${top10PctOfSupply.toFixed(2)}% of total supply`);
    } else {
      console.log(`[CHAINBASE-HOLDERS] No total supply available — can't compute % of supply`);
    }

    return {
      holders_analyzed: holders.length,
      top_10_pct_of_supply: top10PctOfSupply,
      top_holders: holders.slice(0, 10).map((h) => ({
        wallet_address: h.wallet_address,
        amount: h.amount,
        usd_value: h.usd_value,
      })),
    };
  } catch (error) {
    console.error(`[CHAINBASE-HOLDERS] Error:`, error);
    return null;
  }
}

export async function fetchPriceVolatility(
  tokenAddress: string,
  chainId: string,
  periodDays = 7,
): Promise<PriceVolatilityData | null> {
  console.log(`[CHAINBASE-VOLATILITY] === STARTING PRICE HISTORY LOOKUP ===`);
  console.log(`[CHAINBASE-VOLATILITY] Token: ${tokenAddress}, Chain: ${chainId}, Period: ${periodDays}d`);

  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig?.goplus) {
      console.log(`[CHAINBASE-VOLATILITY] No numeric chain id mapping for chain: ${chainId}`);
      return null;
    }

    const apiKey = Deno.env.get('CHAINBASE_API_KEY');
    if (!apiKey) {
      console.log(`[CHAINBASE-VOLATILITY] CHAINBASE_API_KEY not configured`);
      return null;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const fromSec = nowSec - periodDays * 86400;

    const url = `${CHAINBASE_BASE}/token/price/history?chain_id=${chainConfig.goplus}&contract_address=${tokenAddress.toLowerCase()}&from_timestamp=${fromSec}&end_timestamp=${nowSec}`;
    const response = await fetch(url, { headers: { 'x-api-key': apiKey, Accept: 'application/json' } });

    if (!response.ok) {
      console.error(`[CHAINBASE-VOLATILITY] HTTP error: ${response.status}`);
      return null;
    }

    const body = await response.json();
    if (body.code !== 0 || !Array.isArray(body.data)) {
      console.error(`[CHAINBASE-VOLATILITY] API error: ${body.message || 'unknown'}`);
      return null;
    }

    const points = (body.data as Array<{ price: number }>)
      .map((p) => p.price)
      .filter((p) => typeof p === 'number' && p > 0);

    console.log(`[CHAINBASE-VOLATILITY] Got ${points.length} price points`);

    // Need at least a few points for a range-based volatility figure to mean
    // anything — otherwise fall through to null and let the caller keep
    // using the single 24h price_change figure it already has.
    if (points.length < 3) {
      console.log(`[CHAINBASE-VOLATILITY] Too few points (${points.length}) for a meaningful figure`);
      return null;
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const avg = points.reduce((a, b) => a + b, 0) / points.length;
    // Range-based volatility: how wide the price swung relative to its own
    // average over the period. Simpler and more robust to sparse/irregular
    // ticks than a standard deviation of returns would be with an unknown,
    // possibly uneven, sampling interval.
    const volatilityPct = avg > 0 ? ((max - min) / avg) * 100 : 0;

    console.log(`[CHAINBASE-VOLATILITY] Range: $${min} - $${max}, avg $${avg}, volatility ${volatilityPct.toFixed(2)}%`);

    return {
      data_points: points.length,
      volatility_pct: volatilityPct,
      period_days: periodDays,
    };
  } catch (error) {
    console.error(`[CHAINBASE-VOLATILITY] Error:`, error);
    return null;
  }
}
