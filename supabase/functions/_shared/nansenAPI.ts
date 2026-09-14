// Nansen Token God Mode — holder concentration, primary source.
//
// Added 2026-09-14. Deployed on THS's existing paid NANSEN_API_KEY at
// Gabriel's explicit instruction, ahead of a possible paid-tier upgrade —
// see project memory for the ToS/licensing note this carries (Nansen's
// terms restrict data redistribution and competing-product use; this is a
// known, accepted decision, not an oversight).
//
// Why this over the Chainbase fallback (chainbaseAPI.ts, kept as tier-2):
// Nansen's `tgm/holders` returns `ownership_percentage` directly (computed
// from Nansen's own supply figure — no dependency on our CoinGecko-sourced
// total_supply, unlike Chainbase's version of this) AND a human-readable
// `address_label` per holder. That label is the important part: verified
// live on AERO, the #1 "holder" at 49.9% of supply is labeled `veNFT` —
// Aerodrome's own vote-escrow governance-lock contract, not a whale — and
// several more are DEX pool addresses (e.g. `vAMM-USDC/AERO`). Chainbase's
// raw address list can't distinguish these from genuine concentration risk;
// this module excludes them by label pattern so the result reflects actual
// external-party concentration, not protocol infrastructure.
export interface NansenHolderData {
  holders_analyzed: number;
  top_10_pct_of_supply: number | null;
  excluded_infra_pct: number;
  top_holders: Array<{ address: string; label: string | null; ownership_pct: number }>;
}

const NANSEN_BASE = 'https://api.nansen.ai/api/v1';

// Nansen's chain slugs differ from every other vendor already wired into
// this file (GoPlus's numeric ids, Etherscan's chainid, GeckoTerminal's
// short slugs) — confirmed live 2026-09-14 against Nansen's own API.
const NANSEN_CHAIN_SLUGS: Record<string, string> = {
  '0x1': 'ethereum',
  '0x38': 'bnb',
  '0xa4b1': 'arbitrum',
  '0xa': 'optimism',
  '0x2105': 'base',
  '0x89': 'polygon',
};

// Address labels that mark protocol infrastructure — vote-escrow/lock
// contracts, treasuries, and DEX pools — rather than a genuine external
// holder. Deliberately conservative (favors under- over over-excluding):
// an unlabeled address or a generic tag like "Token Millionaire" still
// counts as real concentration.
const INFRA_LABEL_PATTERN = /veNFT|vest|lock|escrow|treasury|\bamm\b|vamm|samm|\bpool\b|uniswap|curve|balancer|liquidity/i;

function isInfraLabel(label: string | null | undefined): boolean {
  return !!label && INFRA_LABEL_PATTERN.test(label);
}

export async function fetchNansenTopHolders(
  tokenAddress: string,
  chainId: string,
): Promise<NansenHolderData | null> {
  console.log(`[NANSEN-HOLDERS] === STARTING TOP HOLDERS LOOKUP ===`);
  console.log(`[NANSEN-HOLDERS] Token: ${tokenAddress}, Chain: ${chainId}`);

  try {
    const nansenChain = NANSEN_CHAIN_SLUGS[chainId];
    if (!nansenChain) {
      console.log(`[NANSEN-HOLDERS] No Nansen chain mapping for: ${chainId}`);
      return null;
    }

    const apiKey = Deno.env.get('NANSEN_API_KEY');
    if (!apiKey) {
      console.log(`[NANSEN-HOLDERS] NANSEN_API_KEY not configured`);
      return null;
    }

    const response = await fetch(`${NANSEN_BASE}/tgm/holders`, {
      method: 'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token_address: tokenAddress.toLowerCase(),
        chain: nansenChain,
        aggregate_by_entity: false,
        label_type: 'all_holders',
        pagination: { page: 1, per_page: 100 },
      }),
    });

    if (!response.ok) {
      console.error(`[NANSEN-HOLDERS] HTTP error: ${response.status}`);
      return null;
    }

    const body = await response.json();
    const holders = body?.data as Array<{
      address: string;
      address_label: string | null;
      ownership_percentage: number;
    }> | undefined;

    if (!Array.isArray(holders)) {
      console.error(`[NANSEN-HOLDERS] Unexpected response shape`);
      return null;
    }

    console.log(`[NANSEN-HOLDERS] Got ${holders.length} holders`);

    let excludedPct = 0;
    const realHolders = holders.filter((h) => {
      if (isInfraLabel(h.address_label)) {
        excludedPct += h.ownership_percentage * 100;
        console.log(`[NANSEN-HOLDERS] Excluding infra address ${h.address} (${h.address_label}): ${(h.ownership_percentage * 100).toFixed(2)}%`);
        return false;
      }
      return true;
    });

    const top10 = realHolders.slice(0, 10);
    const top10Pct = top10.reduce((sum, h) => sum + h.ownership_percentage * 100, 0);

    console.log(`[NANSEN-HOLDERS] Top 10 real holders: ${top10Pct.toFixed(2)}% of supply (excluded ${excludedPct.toFixed(2)}% as infra)`);

    return {
      holders_analyzed: holders.length,
      top_10_pct_of_supply: top10Pct,
      excluded_infra_pct: excludedPct,
      top_holders: top10.map((h) => ({
        address: h.address,
        label: h.address_label,
        ownership_pct: h.ownership_percentage * 100,
      })),
    };
  } catch (error) {
    console.error(`[NANSEN-HOLDERS] Error:`, error);
    return null;
  }
}
