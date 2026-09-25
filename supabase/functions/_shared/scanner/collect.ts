// Scanner orchestrator: collect every field for one token into a ScanRecord.
// Pure data collection: no DB access, no scoring. Used by run-token-scan and
// by the golden-set tests, so what the tests check is what production runs.
import { corroborated, type Field, ok, type SourceRef, unknown, usable } from './field.ts';
import { ScanContext } from './http.ts';
import { fetchMarketData, fetchUnlocks } from './market.ts';
import { runPlausibility } from './plausibility.ts';
import { isValidSolanaAddress, solanaAdapter } from './solana.ts';
import { EVM_CHAINS, evmAdapter } from './evm.ts';
import type { ChainAdapter, DataQuality, LiquidityFacts, ScanRecord } from './types.ts';

// Required for a trustworthy scan (drives scoring; see scoring.ts).
export const REQUIRED_FIELDS = ['chain.total_supply_onchain', 'market.circulating_supply', 'chain.top10_pct', 'chain.mint_authority_active'] as const;

export function normalizeChain(chainId: string | undefined | null): string | null {
  const c = String(chainId ?? '0x1').toLowerCase().trim();
  if (c === 'solana' || c === 'sol') return 'solana';
  const names: Record<string, string> = { ethereum: '0x1', eth: '0x1', bsc: '0x38', bnb: '0x38', base: '0x2105', arbitrum: '0xa4b1', polygon: '0x89', optimism: '0xa' };
  if (names[c]) return names[c];
  const hex = c.startsWith('0x') ? c : /^\d+$/.test(c) ? '0x' + parseInt(c, 10).toString(16) : null;
  return hex && EVM_CHAINS[hex] ? hex : null;
}

/** Thrown when a Solana mint cannot be resolved to its exact-case form: no provider call is made with a guessed address. */
export class AddressResolutionError extends Error {
  code = 'address_not_resolved' as const;
}

// Solana addresses are case-sensitive base58, but the DB lowercases them. A lowercased mint can
// contain `l` (from `L`), which is not a base58 character, so lowercase input is accepted as a
// recovery candidate and must be resolved to its exact-case form before any provider call.
const SOL_LOWERCASE_CANDIDATE = /^[1-9a-z]{32,44}$/;

export function adapterFor(chainId: string): ChainAdapter {
  return chainId === 'solana' ? solanaAdapter : evmAdapter;
}

export async function collectToken(
  addressInput: string,
  chainIdInput: string,
  opts: { ctx?: ScanContext; previous?: { total_supply_onchain?: number | null; scanned_at?: string; record?: ScanRecord | null } | null; canonicalHint?: string | null; now?: Date } = {},
): Promise<ScanRecord> {
  const ctx = opts.ctx ?? new ScanContext();
  const scannedAt = (opts.now ?? new Date()).toISOString();
  const chainId = normalizeChain(chainIdInput);
  if (!chainId) throw new Error(`unsupported chain: ${chainIdInput}`);
  const adapter = adapterFor(chainId);
  const input = addressInput.trim();
  const isSol = chainId === 'solana';
  const lowercaseSolana = isSol && !/[A-Z]/.test(input) && SOL_LOWERCASE_CANDIDATE.test(input);
  if (isSol ? !(isValidSolanaAddress(input) || lowercaseSolana) : !/^0x[0-9a-fA-F]{40}$/.test(input)) throw new Error(`invalid ${chainId} address: ${input}`);
  const platform = adapter.cgPlatform(chainId)!;

  // 1. Resolve the exact-case address BEFORE any address-dependent provider call.
  let canonical: Field<string>;
  let usedHint = false;
  if (!isSol) canonical = ok(input.toLowerCase(), { source: 'input', fetched_at: scannedAt }, { confidence: 'high', detail: 'EVM addresses are case-insensitive' });
  else if (!lowercaseSolana) canonical = ok(input, { source: 'input', fetched_at: scannedAt }, { confidence: 'high', detail: 'mixed-case input used as-is' });
  else {
    const hint = opts.canonicalHint?.trim();
    if (hint && isValidSolanaAddress(hint) && hint.toLowerCase() === input) {
      usedHint = true;
      canonical = ok(hint, { source: 'stored_canonical_address', fetched_at: scannedAt }, { confidence: 'high', detail: 'exact-case mint from a previous scan; verified below by a positive mint-account read' });
    } else {
      // CoinGecko's contract lookup is case-insensitive and returns the exact-case address. CoinMarketCap is skipped here: it needs the exact case.
      const probe = await fetchMarketData(ctx, platform, input, null);
      const cg = probe.canonical_address;
      if (usable(cg) && isValidSolanaAddress(cg.value) && cg.value.toLowerCase() === input) {
        canonical = { ...cg, detail: 'exact-case mint recovered from CoinGecko (input was lowercased)' };
      } else {
        throw new AddressResolutionError(`cannot resolve the exact-case Solana mint for ${input}: it is all-lowercase and CoinGecko does not list it (${cg.reason ?? 'no_data'}). No provider was called with a guessed address.`);
      }
    }
  }
  const address = canonical.value as string;
  const marketFinal = await fetchMarketData(ctx, platform, address, address);

  // 2. Chain facts, liquidity, unlocks.
  const chain = await adapter.collect(ctx, address, marketFinal, chainId);
  // Positive identity check (Codex round 2, finding 6): a Solana address is only accepted when a mint account exists
  // at exactly that case. A wrong stored hint is dropped and recovery retried; otherwise the scan stops before any write.
  if (isSol && chain.token_standard.status === 'unknown' && chain.token_standard.reason === 'not_found') {
    if (usedHint) return collectToken(addressInput, chainIdInput, { ...opts, canonicalHint: null });
    throw new AddressResolutionError(`no mint account exists at ${address} (exact case); nothing was written`);
  }
  const liquidity = await collectLiquidity(ctx, chainId, address, adapter, chain.decimals, marketFinal.price_usd);
  // The raw DeFiLlama dataset is cached in market.ts (24h from its original fetch); time-dependent values are recomputed every scan.
  const unlocks = await fetchUnlocks(ctx, usable(marketFinal.coingecko_id) ? marketFinal.coingecko_id.value : null, usable(marketFinal.name) ? marketFinal.name.value : null, chainId, address, new Date(scannedAt));

  const rec: ScanRecord = {
    schema_version: 1,
    scanned_at: scannedAt,
    chain_id: chainId,
    address_input: input,
    address_canonical: canonical,
    address_key: address.toLowerCase(),
    market: marketFinal,
    chain,
    liquidity,
    unlocks,
    derived: {} as ScanRecord['derived'],
    quality: {} as DataQuality,
  };
  const flags = runPlausibility(rec, opts.previous);
  rec.unlocks = inferNoUnlocks(rec);
  rec.derived = derive(rec);
  rec.quality = quality(rec, ctx, flags);
  return rec;
}

const DEXSCREENER_CHAIN: Record<string, string> = { solana: 'solana', '0x1': 'ethereum', '0x38': 'bsc', '0x2105': 'base', '0xa4b1': 'arbitrum', '0x89': 'polygon', '0xa': 'optimism' };

export async function collectLiquidity(ctx: ScanContext, chainId: string, address: string, adapter: ChainAdapter, decimals: Field<number>, price: Field<number>): Promise<LiquidityFacts> {
  // Fallback chain: GeckoTerminal (intermittently serves a bot challenge) -> DexScreener.
  const net = chainId === 'solana' ? 'solana' : EVM_CHAINS[chainId].gecko;
  type Pool = { dex: string; name: string; address: string; liquidity_usd: number; volume_24h_usd: number };
  let pools: Pool[] | null = null;
  let ref: SourceRef | null = null;
  let totalOnPage = 0;
  let volumeComplete = true;
  const failRefs: SourceRef[] = [];
  let failReason: any = 'no_data';
  let failDetail: string | undefined;
  const gt = await ctx.fetchJson('geckoterminal', `https://api.geckoterminal.com/api/v2/networks/${net}/tokens/${address}/pools?page=1`, { headers: { Accept: 'application/json' }, retries: 3 });
  // A pool without a numeric reserve/volume is INCOMPLETE data, not a measured zero (Codex finding 11).
  const finite = (v: unknown): number | null => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const gtRows: any[] = gt.ok && Array.isArray(gt.data?.data) ? gt.data.data : [];
  const gtUsable = gt.ok && Array.isArray(gt.data?.data) && (gtRows.length === 0 || gtRows.some((p: any) => finite(p.attributes?.reserve_in_usd) !== null));
  if (gt.ok && gtUsable) {
    totalOnPage = gtRows.length;
    const all = gtRows.slice(0, 10);
    pools = all.filter((p: any) => finite(p.attributes?.reserve_in_usd) !== null).map((p: any) => ({
      dex: p.relationships?.dex?.data?.id ?? 'unknown',
      name: p.attributes?.name ?? '',
      address: p.attributes?.address ?? '',
      liquidity_usd: finite(p.attributes?.reserve_in_usd) as number,
      volume_24h_usd: finite(p.attributes?.volume_usd?.h24) as number,
    }));
    volumeComplete = pools.every((p) => Number.isFinite(p.volume_24h_usd));
    pools = pools.map((p) => ({ ...p, volume_24h_usd: Number.isFinite(p.volume_24h_usd) ? p.volume_24h_usd : 0 }));
    ref = { ...gt.ref, raw_excerpt: { pools_on_page: totalOnPage, pools_without_reserve_data: all.length - pools.length } };
  } else {
    failRefs.push(gt.ref);
    failReason = gt.ok ? 'no_data' : gt.reason;
    failDetail = gt.ok ? 'GeckoTerminal answered but its pools carry no numeric reserve data' : gt.detail;
    const ds = await ctx.fetchJson('dexscreener', `https://api.dexscreener.com/token-pairs/v1/${DEXSCREENER_CHAIN[chainId]}/${address}`, { retries: 2 });
    if (ds.ok && Array.isArray(ds.data)) {
      const sorted = [...ds.data].sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      totalOnPage = sorted.length;
      const dsRows = sorted.slice(0, 10).filter((p: any) => finite(p.liquidity?.usd) !== null);
      pools = dsRows.map((p: any) => ({ dex: p.dexId ?? 'unknown', name: `${p.baseToken?.symbol ?? '?'} / ${p.quoteToken?.symbol ?? '?'}`, address: p.pairAddress ?? '', liquidity_usd: finite(p.liquidity?.usd) as number, volume_24h_usd: finite(p.volume?.h24) ?? 0 }));
      volumeComplete = dsRows.every((p: any) => finite(p.volume?.h24) !== null);
      if (sorted.length > 0 && pools.length === 0) pools = null; // pairs without liquidity data are not a measurement
      ref = { ...ds.ref, raw_excerpt: { pairs: sorted.length, fallback_after: `geckoterminal ${gt.ok ? 'no_data' : gt.reason}` } };
    } else {
      failRefs.push(ds.ref);
      if (!ds.ok) failDetail = `${failDetail ?? ''}; dexscreener: ${ds.reason}`;
    }
  }
  let base: Omit<LiquidityFacts, 'slippage_10k_pct' | 'slippage_100k_pct'>;
  if (pools && ref) {
    const opt = { confidence: 'medium' as const, detail: `top 10 pools containing the token (${ref.source}); reserves count both sides of each pool` };
    base = pools.length
      ? {
        dex_liquidity_usd: ok(Math.round(pools.reduce((s, p) => s + p.liquidity_usd, 0)), ref, { unit: 'usd', ...opt }),
        pool_count: ok(totalOnPage, ref, { unit: 'pools', detail: 'pools on the first result page' }),
        top_pools: ok(pools, ref, opt),
        dex_volume_24h_usd: volumeComplete ? ok(Math.round(pools.reduce((s, p) => s + p.volume_24h_usd, 0)), ref, { unit: 'usd', ...opt }) : unknown('no_data', 'some pools carry no 24h volume; the total would be understated', [ref], { unit: 'usd' }),
      }
      : { dex_liquidity_usd: ok(0, ref, { unit: 'usd', detail: 'no DEX pools found' }), pool_count: ok(0, ref, { unit: 'pools' }), top_pools: ok([], ref), dex_volume_24h_usd: ok(0, ref, { unit: 'usd' }) };
  } else {
    const f = unknown<any>(failReason, failDetail, failRefs);
    base = { dex_liquidity_usd: f, pool_count: f, top_pools: f, dex_volume_24h_usd: f };
  }
  let slip: Pick<LiquidityFacts, 'slippage_10k_pct' | 'slippage_100k_pct'>;
  if (usable(decimals) && usable(price)) slip = await adapter.sellQuotes(ctx, address, decimals.value, price.value, chainId);
  else {
    const f = unknown<number>('missing_input', 'needs decimals and a USD price to size the quote', [], { unit: 'pct' });
    slip = { slippage_10k_pct: f, slippage_100k_pct: f };
  }
  return { ...base, ...slip };
}

/**
 * No unlock dataset. When both market sources report (practically) all supply circulating AND supply cannot
 * increase, the most that could still unlock is the non-circulating remainder. That is stated as an UPPER BOUND
 * (worst case, marked `bound: 'upper'`), never as a scheduled amount and never as zero: 0.4% locked supply is
 * not "no unlocks" (Codex review 2026-09-25, finding 7). Runs after plausibility, so a disputed or
 * single-source circulating figure never qualifies.
 */
export function inferNoUnlocks(rec: ScanRecord): ScanRecord['unlocks'] {
  const u = rec.unlocks;
  if (u.emissions_source.reason !== 'not_found') return u; // dataset exists (or lookup failed): leave as is
  const m = rec.market;
  const c = rec.chain;
  if (!corroborated(m.circulating_supply) || !usable(m.total_supply_market)) return u;
  const ratio = m.circulating_supply.value / m.total_supply_market.value;
  if (ratio < 0.995) return u;
  if (!corroborated(c.mint_authority_active) || c.mint_authority_active.value !== false) return u;
  const sources = [...m.circulating_supply.sources, ...m.total_supply_market.sources, ...c.mint_authority_active.sources];
  const residual = Math.max(0, m.total_supply_market.value - m.circulating_supply.value);
  const pct = ((residual / m.total_supply_market.value) * 100).toFixed(3);
  const detail = `derived, not scheduled data: no DeFiLlama schedule exists; ${(ratio * 100).toFixed(2)}% of supply already circulates per CoinGecko and CoinMarketCap and supply cannot increase (${rec.chain_id === 'solana' ? 'mint authority revoked' : 'not mintable'}), so at most ${pct}% of supply (${Math.round(residual).toLocaleString('en-US')} tokens) could still enter circulation`;
  const bound = ok(residual, sources, { unit: 'tokens', confidence: 'medium', bound: 'upper', detail: `upper bound: ${detail}` });
  return {
    emissions_source: ok('derived_fully_circulating', sources, { confidence: 'medium', detail }),
    next_unlock_date: unknown('no_data', `no dated schedule exists; ${detail}`, sources, { unit: 'date' }),
    next_unlock_amount: unknown('no_data', `no dated schedule exists; ${detail}`, sources, { unit: 'tokens' }),
    unlock_30d_amount: bound,
    unlock_90d_amount: bound,
    last_scheduled_event: unknown('no_data', 'no schedule dataset', u.last_scheduled_event.sources),
    unscheduled_supply: bound,
  };
}

function derive(rec: ScanRecord): ScanRecord['derived'] {
  const m = rec.market;
  const ratio = (a: Field<number>, b: Field<number>, label: string, unit: string, mult = 1): Field<number> => {
    if (!usable(a) || !usable(b) || b.value === 0) return unknown(a.status === 'disputed' || b.status === 'disputed' ? 'sources_disagree' : 'missing_input', `${label}: input missing or disputed`, [], { unit });
    const both = a.corroborated === true && b.corroborated === true;
    return ok(Math.round((a.value / b.value) * mult * 1e4) / 1e4, [...a.sources, ...b.sources], { unit, confidence: both ? 'high' : 'medium', corroborated: both, ...(a.bound === 'upper' ? { bound: 'upper' as const, detail: `upper bound: ${label}` } : { detail: label }) });
  };
  const diff = (a: Field<number>, b: Field<number>, label: string): Field<number> => {
    if (!usable(a) || !usable(b)) return unknown('missing_input', `${label}: input missing or disputed`, [], { unit: 'tokens' });
    return ok(Math.max(0, a.value - b.value), [...a.sources, ...b.sources], { unit: 'tokens', confidence: 'medium', detail: label });
  };
  return {
    circulating_ratio: ratio(m.circulating_supply, m.total_supply_market, 'circulating / total supply (market data, same definition)', 'ratio'),
    noncirculating_supply: diff(m.total_supply_market, m.circulating_supply, 'total minus circulating (market data)'),
    max_supply_headroom: usable(m.max_supply) && usable(rec.chain.total_supply_onchain) && usable(m.platform_count) && m.platform_count.value <= 1
      ? diff(m.max_supply, rec.chain.total_supply_onchain, 'max supply (CoinGecko) minus current on-chain supply; single-chain tokens only. Tokens that may never have been minted or that were burned: NOT a burn figure')
      : unknown('missing_input', 'needs max supply and on-chain supply of a single-chain token', [], { unit: 'tokens' }),
    fdv_to_mcap: ratio(m.fdv_usd, m.market_cap_usd, 'FDV / market cap (CoinGecko)', 'ratio'),
    unlock_30d_pct_of_circ: ratio(rec.unlocks.unlock_30d_amount, m.circulating_supply, 'tokens unlocking in 30 days as % of circulating', 'pct', 100),
    unlock_90d_pct_of_circ: ratio(rec.unlocks.unlock_90d_amount, m.circulating_supply, 'tokens unlocking in 90 days as % of circulating', 'pct', 100),
  };
}

export function quality(rec: ScanRecord, ctx: ScanContext, flags: DataQuality['flags']): DataQuality {
  const fields: Array<[string, Field<unknown>]> = [];
  const groups: Record<string, unknown> = { market: rec.market, chain: rec.chain, liquidity: rec.liquidity, unlocks: rec.unlocks, derived: rec.derived };
  if (rec.social) Object.assign(groups, { github: rec.social.github, community: rec.social.community });
  for (const [grp, obj] of Object.entries(groups)) {
    for (const [k, f] of Object.entries(obj as Record<string, Field<unknown>>)) fields.push([`${grp}.${k}`, f]);
  }
  const na = fields.filter(([, f]) => f.reason === 'not_applicable').length;
  const okN = fields.filter(([, f]) => f.status === 'ok').length;
  const get = (path: string) => fields.find(([k]) => k === path)?.[1];
  return {
    fields_total: fields.length,
    fields_ok: okN,
    fields_disputed: fields.filter(([, f]) => f.status === 'disputed').length,
    fields_unknown: fields.filter(([, f]) => f.status === 'unknown' && f.reason !== 'not_applicable').length,
    fields_not_applicable: na,
    completeness_pct: Math.round((okN / Math.max(1, fields.length - na)) * 1000) / 10,
    required_missing: REQUIRED_FIELDS.filter((p) => !usable(get(p) as Field<unknown>)),
    provider_failures: ctx.failures(),
    provider_calls: Object.fromEntries(Object.entries(ctx.stats).map(([k, s]) => [k, { calls: s.calls, failures: s.failures, credits: s.credits, ms: s.ms }])),
    paid_credits: ctx.credits,
    flags,
  };
}
