// Plausibility rules, run on every scan. A failed rule adds a flag, and for
// errors marks the offending field `unknown` (failed_plausibility) or
// `disputed` so it can't feed a score. Rules never invent a replacement value.
import { type Field, relDiff, usable } from './field.ts';
import type { Flag, ScanRecord } from './types.ts';

const FUTURE_SKEW_MS = 5 * 60_000;

function fail<T>(f: Field<T>, detail: string, how: 'unknown' | 'disputed' = 'disputed'): Field<T> {
  return how === 'unknown'
    ? { ...f, value: null, status: 'unknown', reason: 'failed_plausibility', confidence: undefined, detail }
    : { ...f, status: 'disputed', reason: 'failed_plausibility', confidence: 'low', detail };
}

export function runPlausibility(rec: ScanRecord, previous?: { total_supply_onchain?: number | null; scanned_at?: string } | null): Flag[] {
  const flags: Flag[] = [];
  const m = rec.market;
  const c = rec.chain;
  const now = new Date(rec.scanned_at).getTime();

  // 1. circulating <= total <= max (same-definition, global pair).
  if (usable(m.circulating_supply) && usable(m.total_supply_market) && m.circulating_supply.value > m.total_supply_market.value * 1.005) {
    flags.push({ rule: 'circulating_le_total', severity: 'error', field: 'market.circulating_supply', detail: `circulating ${m.circulating_supply.value} > total ${m.total_supply_market.value}` });
    m.circulating_supply = fail(m.circulating_supply, 'circulating exceeds total supply');
  }
  if (usable(m.total_supply_market) && usable(m.max_supply) && m.total_supply_market.value > m.max_supply.value * 1.005) {
    flags.push({ rule: 'total_le_max', severity: 'warning', field: 'market.max_supply', detail: `total ${m.total_supply_market.value} > max ${m.max_supply.value}` });
  }
  // 2. Circulating == total is allowed only when a source reports it (never derived);
  //    confirmed by two sources = fine (WBTC, BONK); single source = warning.
  if (usable(m.circulating_supply) && usable(m.total_supply_market) && relDiff(m.circulating_supply.value, m.total_supply_market.value) < 0.001) {
    const twoSources = m.circulating_supply.confidence === 'high';
    flags.push({ rule: 'circulating_equals_total', severity: twoSources ? 'info' : 'warning', field: 'market.circulating_supply', detail: twoSources ? 'fully circulating, reported by two sources' : 'fully circulating per a single source only' });
  }
  // 3. Percentages: 0..100 and monotonic top-N.
  const tops = [c.top1_pct, c.top5_pct, c.top10_pct, c.top20_pct];
  for (const t of tops) {
    if (usable(t) && (t.value < 0 || t.value > 100.5)) flags.push({ rule: 'pct_range', severity: 'error', detail: `holder share out of range: ${t.value}` });
  }
  const tv = tops.map((t) => (usable(t) ? t.value : null));
  for (let i = 1; i < tv.length; i++) {
    if (tv[i] !== null && tv[i - 1] !== null && tv[i]! + 0.01 < tv[i - 1]!) flags.push({ rule: 'pct_monotonic', severity: 'error', detail: `top-N shares not monotonic: ${tv.join(', ')}` });
  }
  if (tops.some((t) => usable(t) && (t.value < 0 || t.value > 100.5)) || flags.some((f) => f.rule === 'pct_monotonic')) {
    for (const k of ['top1_pct', 'top5_pct', 'top10_pct', 'top20_pct'] as const) c[k] = fail(c[k], 'holder shares failed range/monotonic check', 'unknown');
  }
  // 4. Decimals applied correctly: on-chain vs market total must be the same order of
  //    magnitude when the token lives on one chain. A 10^k gap = decimals bug.
  if (usable(c.total_supply_onchain) && usable(m.total_supply_market)) {
    const ratio = c.total_supply_onchain.value / m.total_supply_market.value;
    const single = usable(m.platform_count) && m.platform_count.value <= 1;
    if (ratio > 50 || ratio < 0.02) {
      flags.push({ rule: 'decimals_order_of_magnitude', severity: 'error', field: 'chain.total_supply_onchain', detail: `on-chain ${c.total_supply_onchain.value} vs market ${m.total_supply_market.value} (x${ratio.toExponential(2)}): decimals likely misapplied` });
      c.total_supply_onchain = fail(c.total_supply_onchain, 'order-of-magnitude mismatch with market total supply');
    } else if (single && relDiff(c.total_supply_onchain.value, m.total_supply_market.value) > 0.02) {
      // Single-chain token: on-chain and market totals should agree (2%).
      flags.push({ rule: 'onchain_vs_market_total', severity: 'warning', field: 'chain.total_supply_onchain', detail: `single-chain token: on-chain ${c.total_supply_onchain.value} vs market ${m.total_supply_market.value}` });
      c.total_supply_onchain = { ...c.total_supply_onchain, status: 'disputed', reason: 'sources_disagree', confidence: 'low', detail: 'on-chain vs market total supply differ >2% on a single-chain token' };
    } else if (!single && relDiff(c.total_supply_onchain.value, m.total_supply_market.value) > 0.02) {
      flags.push({ rule: 'onchain_vs_market_total', severity: 'info', field: 'chain.total_supply_onchain', detail: `multichain or differently-defined total: on-chain (this chain) ${c.total_supply_onchain.value} vs market (global) ${m.total_supply_market.value}` });
    }
  }
  // 5. Market cap ~ price x circulating (catches circulating/decimals errors in the provider).
  if (usable(m.market_cap_usd) && usable(m.price_usd) && usable(m.circulating_supply)) {
    const implied = m.price_usd.value * m.circulating_supply.value;
    if (relDiff(implied, m.market_cap_usd.value) > 0.1) flags.push({ rule: 'mcap_eq_price_x_circ', severity: 'warning', detail: `market cap ${m.market_cap_usd.value} vs price x circulating ${implied.toFixed(0)}` });
  }
  // 6. No timestamps in the future (provider-reported dates and our own fetch times).
  const allFields: Array<[string, Field<unknown>]> = [];
  for (const [grp, obj] of Object.entries({ market: rec.market, chain: rec.chain, liquidity: rec.liquidity, unlocks: rec.unlocks, derived: rec.derived })) {
    for (const [k, f] of Object.entries(obj as Record<string, Field<unknown>>)) allFields.push([`${grp}.${k}`, f]);
  }
  for (const [name, f] of allFields) {
    for (const s of f.sources ?? []) {
      const t = Date.parse(s.fetched_at);
      if (Number.isFinite(t) && t > now + FUTURE_SKEW_MS) flags.push({ rule: 'no_future_timestamps', severity: 'error', field: name, detail: `fetched_at ${s.fetched_at} is in the future` });
      const lu = (s.raw_excerpt as any)?.last_updated;
      if (typeof lu === 'string' && Date.parse(lu) > now + FUTURE_SKEW_MS) flags.push({ rule: 'no_future_timestamps', severity: 'error', field: name, detail: `provider last_updated ${lu} is in the future` });
    }
  }
  if (usable(rec.unlocks.last_scheduled_event) && rec.unlocks.next_unlock_date.value && rec.unlocks.next_unlock_date.value !== 'none_scheduled') {
    if (Date.parse(rec.unlocks.next_unlock_date.value as string) < now - 86400_000) flags.push({ rule: 'next_unlock_in_future', severity: 'error', field: 'unlocks.next_unlock_date', detail: 'next unlock date is in the past' });
  }
  // 7. Supply within a sane band of the previous scan (unexplained jumps).
  if (previous?.total_supply_onchain && usable(c.total_supply_onchain)) {
    const d = relDiff(previous.total_supply_onchain, c.total_supply_onchain.value);
    if (d > 0.1) flags.push({ rule: 'supply_vs_previous_scan', severity: 'warning', field: 'chain.total_supply_onchain', detail: `on-chain supply moved ${(d * 100).toFixed(1)}% since ${previous.scanned_at ?? 'previous scan'} (${previous.total_supply_onchain} -> ${c.total_supply_onchain.value}); unexplained until reviewed` });
  }
  return flags;
}
