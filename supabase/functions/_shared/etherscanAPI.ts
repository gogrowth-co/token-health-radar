// Etherscan V2 unified multichain API — Moralis Stats (supply) fallback.
//
// Added 2026-09-14. Etherscan's V2 API (https://api.etherscan.io/v2/api)
// unifies all of Etherscan/BscScan/PolygonScan/Arbiscan/BaseScan behind ONE
// API key and a `chainid` query param — the old per-domain V1 endpoints
// (still listed in chainConfig.ts's `etherscan` field, kept there for
// reference/back-compat) were deprecated 2025-08-15. This module always uses
// V2, and reuses the numeric EVM chain ID already present as `goplus` in
// chainConfig.ts / run-token-scan's CHAINS map — Etherscan's chainid and the
// GoPlus chain id are the same standard EVM chain IDs (1, 56, 137, 42161,
// 8453), so no new mapping was needed.
//
// Total supply is available on Etherscan's free tier. Holder count/top-holder
// list (`module=token&action=tokenholderlist`) is an Etherscan Pro feature on
// most plans — this function attempts it opportunistically and returns null
// rather than failing the whole call if it's not available on the configured
// key's plan. It does NOT provide holder concentration/Gini — see the
// separate research note on that gap.
import { getChainConfigByMoralisId } from './chainConfig.ts';

export interface EtherscanTokenStats {
  total_supply: string | null;
  holder_count: number | null;
}

export async function fetchEtherscanTokenStats(
  tokenAddress: string,
  chainId: string,
): Promise<EtherscanTokenStats | null> {
  console.log(`[ETHERSCAN-V2] === STARTING TOKEN STATS LOOKUP ===`);
  console.log(`[ETHERSCAN-V2] Token: ${tokenAddress}, Chain: ${chainId}`);

  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig?.goplus) {
      console.log(`[ETHERSCAN-V2] No numeric chain id mapping for chain: ${chainId}`);
      return null;
    }

    const apiKey = Deno.env.get('ETHERSCAN_API_KEY');
    if (!apiKey) {
      console.log(`[ETHERSCAN-V2] ETHERSCAN_API_KEY not configured`);
      return null;
    }

    const numericChainId = chainConfig.goplus; // e.g. '8453' for Base
    const base = `https://api.etherscan.io/v2/api?chainid=${numericChainId}&apikey=${apiKey}`;

    const supplyUrl = `${base}&module=stats&action=tokensupply&contractaddress=${tokenAddress.toLowerCase()}`;
    const supplyRes = await fetch(supplyUrl);
    let totalSupply: string | null = null;
    if (supplyRes.ok) {
      const supplyData = await supplyRes.json();
      if (supplyData.status === '1' && supplyData.result) {
        totalSupply = supplyData.result;
      } else {
        console.log(`[ETHERSCAN-V2] tokensupply returned no result: ${supplyData.message || supplyData.result}`);
      }
    } else {
      console.error(`[ETHERSCAN-V2] tokensupply HTTP error: ${supplyRes.status}`);
    }

    // Opportunistic — holder list is Pro-tier on most Etherscan plans.
    let holderCount: number | null = null;
    try {
      const holdersUrl = `${base}&module=token&action=tokenholderlist&contractaddress=${tokenAddress.toLowerCase()}&page=1&offset=1`;
      const holdersRes = await fetch(holdersUrl);
      if (holdersRes.ok) {
        const holdersData = await holdersRes.json();
        if (holdersData.status === '1' && Array.isArray(holdersData.result)) {
          // This endpoint returns a paginated row list, not a total count, and
          // is gated to Etherscan Pro on most plans anyway. A successful call
          // only confirms the plan supports it — it does not give us a number
          // to report here without fetching every page, which we don't do.
          console.log(`[ETHERSCAN-V2] tokenholderlist is available on this plan (holder count still requires full pagination — not fetched)`);
        } else {
          console.log(`[ETHERSCAN-V2] tokenholderlist not available on this plan: ${holdersData.message || holdersData.result}`);
        }
      }
    } catch (holderError) {
      console.log(`[ETHERSCAN-V2] tokenholderlist attempt failed (expected on non-Pro plans):`, holderError);
    }

    if (totalSupply === null && holderCount === null) {
      return null;
    }

    console.log(`[ETHERSCAN-V2] Result: total_supply=${totalSupply}, holder_count=${holderCount}`);
    return { total_supply: totalSupply, holder_count: holderCount };
  } catch (error) {
    console.error(`[ETHERSCAN-V2] Error:`, error);
    return null;
  }
}
