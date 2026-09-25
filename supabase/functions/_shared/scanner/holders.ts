// Holder concentration + labeling, shared by the Solana and EVM adapters.
//
// Concentration is always a share of ON-CHAIN total supply of this chain
// (holder balances are on-chain amounts; see shared/decisions.md 2026-09-14),
// computed here from raw balances, never from a vendor's own % field.
import { crossCheckNumber, type Field, ok, type SourceRef, unknown, usable } from './field.ts';
import type { ScanContext } from './http.ts';

export type HolderCategory = 'project_controlled' | 'dex_pool' | 'bonding_curve' | 'cex' | 'burn' | 'lock_or_vesting' | 'bridge' | 'contract' | 'unknown';

export interface Holder {
  address: string; // token account (Solana) or holder address (EVM)
  owner?: string; // Solana: wallet/program that owns the token account
  amount: number; // decimal-adjusted
  pct: number; // of on-chain total supply
  label?: string | null;
  label_source?: string; // 'nansen' | 'goplus' | 'onchain_program' | 'sns_name' ...
  category: HolderCategory;
  category_confidence?: 'high' | 'medium' | 'low';
}

// Holders in these categories do not represent tradable, external-party supply.
const NON_CIRCULATING: HolderCategory[] = ['project_controlled', 'dex_pool', 'bonding_curve', 'cex', 'burn', 'lock_or_vesting', 'bridge'];

// Conservative pattern classification of a free-text label. Generic tags
// ("Token Millionaire", "Whale", "Smart Trader") stay 'unknown' on purpose.
// `(?<![a-z])x(?![a-z])` instead of `\b`: labels use `_` separators
// (`jupiter_dao_wallet.sol`), and `\b` treats `_` as part of a word.
// No generic "exchange" for CEX: "Jupiter Exchange" is a DEX.
const w = (s: string) => `(?<![a-z])(?:${s})(?![a-z])`;
const PATTERNS: Array<[RegExp, HolderCategory]> = [
  [new RegExp(w('dead|burn|burned|null address'), 'i'), 'burn'],
  [new RegExp(w('binance|coinbase|okx|bybit|kraken|kucoin|gate\\.io|bitget|htx|huobi|crypto\\.com|upbit|mexc|cex'), 'i'), 'cex'],
  [/vest|lock|escrow|timelock|venft|staking contract/i, 'lock_or_vesting'],
  [new RegExp(w('bridge|portal|wormhole|gateway'), 'i'), 'bridge'],
  [new RegExp(w('amm|vamm|samm|pool|lp|uniswap|curve|balancer|raydium|orca|meteora|whirlpool|pancakeswap|aerodrome'), 'i'), 'dex_pool'],
  [new RegExp(w('team|treasury|dao|community|reserve|foundation|ecosystem|multisig|buyback|cold|hot wallet|deployer'), 'i'), 'project_controlled'],
];

export function classifyLabel(label: string | null | undefined, source: string): { category: HolderCategory; confidence: 'high' | 'medium' | 'low' } {
  if (!label) return { category: 'unknown', confidence: 'low' };
  for (const [re, cat] of PATTERNS) {
    if (re.test(label)) {
      // A Solana .sol name is self-registered by the wallet owner: indicative, not verified.
      const conf = source === 'sns_name' || /\.sol$/i.test(label) ? 'medium' : source === 'nansen' ? 'high' : 'medium';
      return { category: cat, confidence: conf };
    }
  }
  return { category: 'unknown', confidence: 'low' };
}

export interface ConcentrationFields {
  holder_count: Field<number>;
  top1_pct: Field<number>;
  top5_pct: Field<number>;
  top10_pct: Field<number>;
  top20_pct: Field<number>;
  top10_excl_noncirculating_pct: Field<number>;
  noncirculating_labeled_pct: Field<number>;
  gini_coefficient: Field<number>;
  top_holders: Field<Holder[]>;
}

/** Build concentration fields from a primary holder list plus an independent top-10 reading. */
export function buildConcentration(opts: {
  holders: Holder[] | null;
  holdersRef: SourceRef | SourceRef[];
  holdersReason?: Field<unknown>['reason'];
  holdersDetail?: string;
  secondTop10: Field<number>;
  holderCount: Field<number>;
  maxListed: number; // how many holders the primary source can return (Solana free RPC: 20)
}): ConcentrationFields {
  const { holders } = opts;
  const refs = Array.isArray(opts.holdersRef) ? opts.holdersRef : [opts.holdersRef];
  const pctU = (reason: any, detail?: string) => unknown<number>(reason, detail, refs, { unit: 'pct' });
  const gini = unknown<number>('no_data', `needs the full holder list from an indexer; the free source returns only the top ${opts.maxListed}`, refs, { unit: 'ratio' });
  if (!holders || holders.length === 0) {
    const f = pctU(opts.holdersReason ?? 'no_data', opts.holdersDetail);
    return { holder_count: opts.holderCount, top1_pct: f, top5_pct: f, top10_pct: crossCheckNumber(f, opts.secondTop10, { absTolerance: 5, unit: 'pct', label: 'top-10 share' }), top20_pct: f, top10_excl_noncirculating_pct: f, noncirculating_labeled_pct: f, gini_coefficient: gini, top_holders: unknown('no_data', opts.holdersDetail, refs) };
  }
  const sorted = [...holders].sort((a, b) => b.pct - a.pct);
  const sum = (n: number) => sorted.slice(0, n).reduce((a, h) => a + h.pct, 0);
  const topN = (n: number) => (sorted.length >= n ? ok(round(sum(n)), refs, { unit: 'pct', confidence: 'medium' }) : pctU('no_data', `source returned only ${sorted.length} holders`));
  // Only VERIFIED classifications may take a holder out of the external share: a curated Nansen label, an
  // on-chain fact (burn address, known program owner). Self-registered names (`team_cold.sol`), GoPlus tags and
  // pattern guesses stay in, so a whale cannot vanish from the risk figure by naming its wallet (Codex finding 4).
  const verified = (h: Holder) => NON_CIRCULATING.includes(h.category) && h.category_confidence === 'high';
  const external = sorted.filter((h) => !verified(h));
  const labeledNonCirc = sorted.filter(verified);
  const anyLabels = sorted.some((h) => h.label_source);
  const burnedPct = sorted.filter((h) => h.category === 'burn' && h.category_confidence === 'high').reduce((a, h) => a + h.pct, 0);
  return {
    holder_count: opts.holderCount,
    top1_pct: topN(1),
    top5_pct: topN(5),
    top10_pct: crossCheckNumber(topN(10), opts.secondTop10, { absTolerance: 5, unit: 'pct', label: 'top-10 share of on-chain supply' }),
    top20_pct: topN(20),
    // Among the listed holders only: external (not labeled non-circulating) top 10.
    // Denominator excludes supply parked at burn addresses (CAKE: ~94% of on-chain
    // totalSupply sits at 0x...dead), otherwise external concentration is understated.
    // Needs ten holders LEFT after the exclusions: a top 10 built from fewer would understate concentration
    // (all top-20 labeled -> "0%" while ranks 21+ were never fetched).
    top10_excl_noncirculating_pct: anyLabels && sorted.length >= Math.min(20, opts.maxListed) && burnedPct < 99.9 && external.length >= 10
      ? ok(round(external.slice(0, 10).reduce((a, h) => a + h.pct, 0) / (1 - burnedPct / 100)), refs, { unit: 'pct', confidence: 'medium', detail: `excludes ${labeledNonCirc.length} verified non-circulating holders within the top ${sorted.length}${burnedPct > 0 ? `; share of supply excluding ${burnedPct.toFixed(2)}% held at burn addresses` : ''}` })
      : pctU('no_data', !anyLabels ? 'no holder labels available' : external.length < 10 ? `only ${external.length} holders remain after excluding verified non-circulating ones; ten are needed and the source lists at most ${opts.maxListed}` : 'holder list too short'),
    noncirculating_labeled_pct: anyLabels ? ok(round(labeledNonCirc.reduce((a, h) => a + h.pct, 0)), refs, { unit: 'pct', confidence: 'medium', detail: 'verified (curated-label or on-chain) project/pool/exchange/lock/burn holders within the listed top holders' }) : pctU('no_data', 'no holder labels available'),
    gini_coefficient: gini,
    top_holders: ok(sorted.slice(0, 20), refs, { confidence: 'medium' }),
  };
}

/** Nansen labeled holders (5 credits/call). Returns address -> label. Never used for amounts. */
export async function fetchNansenLabels(ctx: ScanContext, chain: string, address: string): Promise<{ labels: Map<string, string>; amounts: number[]; ref: SourceRef | null; reason?: any }> {
  const key = Deno.env.get('NANSEN_API_KEY');
  if (!key) return { labels: new Map(), amounts: [], ref: null, reason: 'provider_failed' };
  const r = await ctx.fetchJson('nansen', 'https://api.nansen.ai/api/v1/tgm/holders', {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ token_address: address, chain, aggregate_by_entity: false, label_type: 'all_holders', pagination: { page: 1, per_page: 25 } }),
    credits: 5,
    retries: 1,
    timeoutMs: 15_000,
  });
  if (!r.ok) return { labels: new Map(), amounts: [], ref: r.ref, reason: r.reason };
  const labels = new Map<string, string>();
  const rows: any[] = Array.isArray(r.data?.data) ? r.data.data : [];
  for (const h of rows) if (h.address && h.address_label) labels.set(String(h.address).toLowerCase(), String(h.address_label));
  // Raw amounts only (Nansen's own ownership_percentage is unreliable: flat 0.0 for USDT, 2026-09-14).
  const amounts = rows.map((h) => Number(h.token_amount)).filter((n) => Number.isFinite(n) && n > 0).sort((x, y) => y - x);
  r.ref.raw_excerpt = { holders: rows.length, labeled: labels.size };
  return { labels, amounts, ref: r.ref };
}

export function applyLabel(h: Holder, label: string | undefined, source: string) {
  if (!label) return;
  const c = classifyLabel(label, /\.sol$/i.test(label) ? 'sns_name' : source);
  h.label = label;
  h.label_source = /\.sol$/i.test(label) ? `${source}:sns_name` : source;
  if (c.category !== 'unknown' || h.category === 'unknown') {
    h.category = c.category;
    h.category_confidence = c.confidence;
  }
}

export function round(n: number, d = 4) {
  return Math.round(n * 10 ** d) / 10 ** d;
}

export function emptyConcentration(reason: any, detail: string, refs: SourceRef[] = []): ConcentrationFields {
  const f = unknown<any>(reason, detail, refs, { unit: 'pct' });
  return { holder_count: f, top1_pct: f, top5_pct: f, top10_pct: f, top20_pct: f, top10_excl_noncirculating_pct: f, noncirculating_labeled_pct: f, gini_coefficient: f, top_holders: f };
}

export { usable };
