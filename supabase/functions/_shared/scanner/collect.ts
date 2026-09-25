// Scanner orchestrator: collect every field for one token into a ScanRecord.
// Pure data collection: no DB access, no scoring. Used by run-token-scan and
// by the golden-set tests, so what the tests check is what production runs.
import { type Field, ok, type SourceRef, unknown, usable } from './field.ts';
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

export function adapterFor(chainId: string): ChainAdapter {
  return chainId === 'solana' ? solanaAdapter : evmAdapter;
}

export async function collectToken(
  addressInput: string,
  chainIdInput: string,
  opts: { ctx?: ScanContext; previous?: { total_supply_onchain?: number | null; scanned_at?: string; record?: ScanRecord | null } | null; now?: Date } = {},
): Promise<ScanRecord> {
  const ctx = opts.ctx ?? new ScanContext();
  const scannedAt = (opts.now ?? new Date()).toISOString();
  const chainId = normalizeChain(chainIdInput);
  if (!chainId) throw new Error(`unsupported chain: ${chainIdInput}`);
  const adapter = adapterFor(chainId);
  const input = addressInput.trim();
  if (chainId === 'solana' ? !isValidSolanaAddress(input) : !/^0x[0-9a-fA-F]{40}$/.test(input)) throw new Error(`invalid ${chainId} address: ${input}`);
  const platform = adapter.cgPlatform(chainId)!;

  // 1. Market data first: CoinGecko's contract lookup is case-insensitive and
  //    returns the exact-case address, which rescues a lowercased Solana mint.
  const market = await fetchMarketData(ctx, platform, chainId === 'solana' ? input : input.toLowerCase(), chainId === 'solana' ? input : input.toLowerCase());
  let canonical: Field<string>;
  if (chainId !== 'solana') canonical = ok(input.toLowerCase(), { source: 'input', fetched_at: scannedAt }, { confidence: 'high', detail: 'EVM addresses are case-insensitive' });
  else if (/[A-Z]/.test(input)) canonical = ok(input, { source: 'input', fetched_at: scannedAt }, { confidence: 'high', detail: 'mixed-case input used as-is' });
  else if (usable(market.canonical_address) && market.canonical_address.value.toLowerCase() === input.toLowerCase()) canonical = { ...market.canonical_address, detail: 'exact-case mint recovered from CoinGecko (input was lowercased)' };
  else canonical = unknown('not_found', 'input is all-lowercase and no source listed the exact-case mint; Solana addresses are case-sensitive', market.canonical_address.sources);

  const address = canonical.value ?? input;
  // CoinMarketCap needs the exact-case Solana mint: refetch market data if we only now know it.
  const marketFinal = chainId === 'solana' && address !== input ? await fetchMarketData(ctx, platform, address, address) : market;

  // 2. Chain facts, liquidity, unlocks.
  const chain = await adapter.collect(ctx, address, marketFinal, chainId);
  const liquidity = await collectLiquidity(ctx, chainId, address, adapter, chain.decimals, marketFinal.price_usd);
  const cachedUnlocks = reuseIfFresh(opts.previous?.record ?? null, 'unlocks', scannedAt);
  const unlocks = cachedUnlocks ?? await fetchUnlocks(ctx, usable(marketFinal.coingecko_id) ? marketFinal.coingecko_id.value : null, usable(marketFinal.name) ? marketFinal.name.value : null, chainId, address, new Date(scannedAt));

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

async function collectLiquidity(ctx: ScanContext, chainId: string, address: string, adapter: ChainAdapter, decimals: Field<number>, price: Field<number>): Promise<LiquidityFacts> {
  // Fallback chain: GeckoTerminal (intermittently serves a bot challenge) -> DexScreener.
  const net = chainId === 'solana' ? 'solana' : EVM_CHAINS[chainId].gecko;
  type Pool = { dex: string; name: string; address: string; liquidity_usd: number; volume_24h_usd: number };
  let pools: Pool[] | null = null;
  let ref: SourceRef | null = null;
  let totalOnPage = 0;
  const failRefs: SourceRef[] = [];
  let failReason: any = 'no_data';
  let failDetail: string | undefined;
  const gt = await ctx.fetchJson('geckoterminal', `https://api.geckoterminal.com/api/v2/networks/${net}/tokens/${address}/pools?page=1`, { headers: { Accept: 'application/json' }, retries: 3 });
  if (gt.ok && Array.isArray(gt.data?.data)) {
    totalOnPage = gt.data.data.length;
    pools = gt.data.data.slice(0, 10).map((p: any) => ({
      dex: p.relationships?.dex?.data?.id ?? 'unknown',
      name: p.attributes?.name ?? '',
      address: p.attributes?.address ?? '',
      liquidity_usd: Number(p.attributes?.reserve_in_usd ?? 0),
      volume_24h_usd: Number(p.attributes?.volume_usd?.h24 ?? 0),
    }));
    ref = { ...gt.ref, raw_excerpt: { pools_on_page: totalOnPage } };
  } else {
    failRefs.push(gt.ref);
    failReason = gt.ok ? 'no_data' : gt.reason;
    failDetail = gt.ok ? 'unexpected response' : gt.detail;
    const ds = await ctx.fetchJson('dexscreener', `https://api.dexscreener.com/token-pairs/v1/${DEXSCREENER_CHAIN[chainId]}/${address}`, { retries: 2 });
    if (ds.ok && Array.isArray(ds.data)) {
      const sorted = [...ds.data].sort((a: any, b: any) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
      totalOnPage = sorted.length;
      pools = sorted.slice(0, 10).map((p: any) => ({ dex: p.dexId ?? 'unknown', name: `${p.baseToken?.symbol ?? '?'} / ${p.quoteToken?.symbol ?? '?'}`, address: p.pairAddress ?? '', liquidity_usd: Number(p.liquidity?.usd ?? 0), volume_24h_usd: Number(p.volume?.h24 ?? 0) }));
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
        dex_volume_24h_usd: ok(Math.round(pools.reduce((s, p) => s + p.volume_24h_usd, 0)), ref, { unit: 'usd', ...opt }),
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

// Cache by field type (handoff requirement 10). Only slow-moving, schedule-type
// data is reused from the previous stored scan; prices, supply, holders,
// authorities and liquidity are always fetched fresh. A reused field keeps its
// original sources and fetched_at, and says it was reused.
export const FIELD_TTL_HOURS: Record<'unlocks', number> = { unlocks: 24 };

export function reuseIfFresh(prev: ScanRecord | null, group: 'unlocks', nowIso: string): ScanRecord['unlocks'] | null {
  if (!prev?.[group] || !prev.scanned_at) return null;
  const ageH = (Date.parse(nowIso) - Date.parse(prev.scanned_at)) / 3_600_000;
  if (!(ageH >= 0 && ageH < FIELD_TTL_HOURS[group])) return null;
  const src = prev[group].emissions_source;
  // Only reuse a real dataset read; never reuse failures or the derived inference (recomputed from fresh data).
  if (src?.status !== 'ok' || src.value === 'derived_fully_circulating') return null;
  const note = `reused from scan at ${prev.scanned_at} (unlock schedules cached ${FIELD_TTL_HOURS[group]}h)`;
  return Object.fromEntries(Object.entries(prev[group]).map(([k, f]) => [k, { ...f, detail: f.detail ? `${f.detail}; ${note}` : note }])) as ScanRecord['unlocks'];
}

/**
 * No unlock dataset, but nothing left to unlock: when both market sources report
 * (practically) all supply circulating AND supply cannot increase, upcoming
 * unlocks are 0 by construction. Runs after plausibility, so a disputed or
 * failed circulating figure never qualifies. Labeled as derived, with inputs.
 */
export function inferNoUnlocks(rec: ScanRecord): ScanRecord['unlocks'] {
  const u = rec.unlocks;
  if (u.emissions_source.reason !== 'not_found') return u; // dataset exists (or lookup failed): leave as is
  const m = rec.market;
  const c = rec.chain;
  if (!usable(m.circulating_supply) || m.circulating_supply.confidence !== 'high' || !usable(m.total_supply_market)) return u;
  const ratio = m.circulating_supply.value / m.total_supply_market.value;
  if (ratio < 0.995) return u;
  if (!usable(c.mint_authority_active) || c.mint_authority_active.value !== false) return u;
  const sources = [...m.circulating_supply.sources, ...m.total_supply_market.sources, ...c.mint_authority_active.sources];
  const detail = `derived: ${(ratio * 100).toFixed(2)}% of supply already circulating per CoinGecko and CoinMarketCap, and supply cannot increase (${rec.chain_id === 'solana' ? 'mint authority revoked' : 'not mintable'}); no DeFiLlama schedule exists`;
  const zero = ok(0, sources, { unit: 'tokens', confidence: 'medium', detail });
  return {
    emissions_source: ok('derived_fully_circulating', sources, { confidence: 'medium', detail }),
    next_unlock_date: ok('none_scheduled', sources, { unit: 'date', confidence: 'medium', detail }),
    next_unlock_amount: zero,
    unlock_30d_amount: zero,
    unlock_90d_amount: zero,
    last_scheduled_event: unknown('no_data', 'no schedule dataset', u.last_scheduled_event.sources),
  };
}

function derive(rec: ScanRecord): ScanRecord['derived'] {
  const m = rec.market;
  const ratio = (a: Field<number>, b: Field<number>, label: string, unit: string, mult = 1): Field<number> => {
    if (!usable(a) || !usable(b) || b.value === 0) return unknown(a.status === 'disputed' || b.status === 'disputed' ? 'sources_disagree' : 'missing_input', `${label}: input missing or disputed`, [], { unit });
    return ok(Math.round((a.value / b.value) * mult * 1e4) / 1e4, [...a.sources, ...b.sources], { unit, confidence: a.confidence === 'high' && b.confidence === 'high' ? 'high' : 'medium', detail: label });
  };
  const diff = (a: Field<number>, b: Field<number>, label: string): Field<number> => {
    if (!usable(a) || !usable(b)) return unknown('missing_input', `${label}: input missing or disputed`, [], { unit: 'tokens' });
    return ok(Math.max(0, a.value - b.value), [...a.sources, ...b.sources], { unit: 'tokens', confidence: 'medium', detail: label });
  };
  return {
    circulating_ratio: ratio(m.circulating_supply, m.total_supply_market, 'circulating / total supply (market data, same definition)', 'ratio'),
    noncirculating_supply: diff(m.total_supply_market, m.circulating_supply, 'total minus circulating (market data)'),
    burned_since_max: usable(m.max_supply) && usable(rec.chain.total_supply_onchain) && usable(m.platform_count) && m.platform_count.value <= 1
      ? diff(m.max_supply, rec.chain.total_supply_onchain, 'max supply (CoinGecko) minus current on-chain supply; single-chain tokens only')
      : unknown('missing_input', 'needs max supply and on-chain supply of a single-chain token', [], { unit: 'tokens' }),
    fdv_to_mcap: ratio(m.fdv_usd, m.market_cap_usd, 'FDV / market cap (CoinGecko)', 'ratio'),
    unlock_30d_pct_of_circ: ratio(rec.unlocks.unlock_30d_amount, m.circulating_supply, 'tokens unlocking in 30 days as % of circulating', 'pct', 100),
    unlock_90d_pct_of_circ: ratio(rec.unlocks.unlock_90d_amount, m.circulating_supply, 'tokens unlocking in 90 days as % of circulating', 'pct', 100),
  };
}

function quality(rec: ScanRecord, ctx: ScanContext, flags: DataQuality['flags']): DataQuality {
  const fields: Array<[string, Field<unknown>]> = [];
  for (const [grp, obj] of Object.entries({ market: rec.market, chain: rec.chain, liquidity: rec.liquidity, unlocks: rec.unlocks, derived: rec.derived })) {
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
