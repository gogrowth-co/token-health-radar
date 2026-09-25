// Market-data sources shared by every chain adapter: CoinGecko (primary),
// CoinMarketCap (second source for circulating/total), DeFiLlama emissions
// datasets (unlock schedule). All values are GLOBAL scope (aggregated across
// chains), which is why they are never compared 1:1 against one chain's
// on-chain totalSupply (USDC: 75.2B global vs 50.2B on Ethereum).
import { crossCheckNumber, type Field, ok, type SourceRef, unknown } from './field.ts';
import type { ScanContext } from './http.ts';

export interface MarketData {
  coingecko_id: Field<string>;
  name: Field<string>;
  symbol: Field<string>;
  logo_url: Field<string>;
  links: Field<{ twitter?: string; telegram?: string; discord?: string; github?: string; website?: string }>;
  categories: Field<string[]>;
  platform_count: Field<number>;
  canonical_address: Field<string>; // exact-case contract/mint as CoinGecko lists it for this chain
  price_usd: Field<number>;
  market_cap_usd: Field<number>;
  fdv_usd: Field<number>;
  volume_24h_usd: Field<number>;
  circulating_supply: Field<number>;
  total_supply_market: Field<number>;
  max_supply: Field<number>;
}

const CG_BASE = 'https://api.coingecko.com/api/v3';

export async function fetchMarketData(ctx: ScanContext, cgPlatform: string, address: string, cmcAddress: string | null): Promise<MarketData> {
  const key = Deno.env.get('COINGECKO_API_KEY');
  const cg = await ctx.fetchJson(`coingecko`, `${CG_BASE}/coins/${cgPlatform}/contract/${address}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`, {
    headers: key ? { 'x-cg-demo-api-key': key, Accept: 'application/json' } : { Accept: 'application/json' },
    excerpt: (d) => ({ id: d.id, circulating_supply: d.market_data?.circulating_supply, total_supply: d.market_data?.total_supply, max_supply: d.market_data?.max_supply, last_updated: d.market_data?.last_updated }),
  });
  const cmc = cmcAddress ? await fetchCmc(ctx, cmcAddress) : cmcSkipped();

  const miss = <T>(r: { reason: any; detail?: string; ref: SourceRef }): Field<T> =>
    unknown<T>(r.reason === 'not_found' ? 'not_listed' : r.reason, r.detail, [r.ref]);

  let cgF: Record<string, Field<any>>;
  if (cg.ok) {
    const d = cg.data;
    const m = d.market_data ?? {};
    const num = (v: unknown, unit: string, what: string): Field<number> =>
      typeof v === 'number' && Number.isFinite(v) && v > 0 ? ok(v, cg.ref, { unit, scope: 'global', confidence: 'medium' }) : unknown('no_data', `CoinGecko has no ${what}`, [cg.ref], { unit, scope: 'global' });
    const l = d.links ?? {};
    const detail = d.detail_platforms?.[cgPlatform];
    cgF = {
      coingecko_id: ok(d.id, cg.ref, { confidence: 'high' }),
      name: ok(d.name, cg.ref),
      symbol: ok(String(d.symbol ?? '').toUpperCase(), cg.ref),
      logo_url: d.image?.large ? ok(d.image.large, cg.ref) : unknown('no_data', undefined, [cg.ref]),
      links: ok({
        twitter: l.twitter_screen_name ? `https://twitter.com/${l.twitter_screen_name}` : undefined,
        telegram: l.telegram_channel_identifier ? `https://t.me/${l.telegram_channel_identifier}` : undefined,
        discord: (l.chat_url ?? []).find((u: string) => u?.includes('discord')) || undefined,
        github: l.repos_url?.github?.[0] || undefined,
        website: (l.homepage ?? []).find((u: string) => !!u) || undefined,
      }, cg.ref),
      categories: ok((d.categories ?? []).filter(Boolean), cg.ref),
      platform_count: ok(Object.keys(d.platforms ?? {}).filter((k) => k && d.platforms[k]).length, cg.ref),
      canonical_address: detail?.contract_address ? ok(detail.contract_address, cg.ref, { confidence: 'high' }) : unknown('no_data', undefined, [cg.ref]),
      price_usd: num(m.current_price?.usd, 'usd', 'price'),
      market_cap_usd: num(m.market_cap?.usd, 'usd', 'market cap'),
      fdv_usd: num(m.fully_diluted_valuation?.usd, 'usd', 'FDV'),
      volume_24h_usd: num(m.total_volume?.usd, 'usd', '24h volume'),
      circulating_supply: num(m.circulating_supply, 'tokens', 'circulating supply'),
      total_supply_market: num(m.total_supply, 'tokens', 'total supply'),
      max_supply: num(m.max_supply, 'tokens', 'max supply'),
    };
  } else {
    const f = miss<any>(cg);
    cgF = Object.fromEntries(['coingecko_id', 'name', 'symbol', 'logo_url', 'links', 'categories', 'platform_count', 'canonical_address', 'price_usd', 'market_cap_usd', 'fdv_usd', 'volume_24h_usd', 'circulating_supply', 'total_supply_market', 'max_supply'].map((k) => [k, f]));
  }

  return {
    ...(cgF as unknown as MarketData),
    // Two-source fields. Note: CoinGecko and CoinMarketCap often share the
    // same upstream (project self-reports), so agreement is necessary, not
    // sufficient. Disagreement is always meaningful.
    circulating_supply: crossCheckNumber(cgF.circulating_supply, cmc.circulating_supply, { tolerance: 0.02, label: 'circulating supply (CoinGecko vs CoinMarketCap)' }),
    total_supply_market: crossCheckNumber(cgF.total_supply_market, cmc.total_supply, { tolerance: 0.02, label: 'total supply (CoinGecko vs CoinMarketCap)' }),
    // Max supply definitions differ across aggregators (JUP: CoinGecko 10B launch cap vs
    // CoinMarketCap 6.86B post-burn), so it is single-source and never score-driving.
    max_supply: cgF.max_supply.status === 'ok' ? { ...cgF.max_supply, sources: [...cgF.max_supply.sources, ...cmc.max_supply.sources.map((s) => ({ ...s, value: cmc.max_supply.value }))] } : cgF.max_supply,
  };
}

function cmcSkipped() {
  const f = unknown<number>('missing_input', 'CoinMarketCap not queried yet: exact-case address not resolved', [], { unit: 'tokens', scope: 'global' });
  return { circulating_supply: f, total_supply: f, max_supply: f };
}

async function fetchCmc(ctx: ScanContext, address: string): Promise<{ circulating_supply: Field<number>; total_supply: Field<number>; max_supply: Field<number> }> {
  const key = Deno.env.get('COINMARKETCAP_API_KEY');
  const none = (reason: any, detail?: string, refs: SourceRef[] = []) => {
    const f = unknown<number>(reason, detail, refs, { unit: 'tokens', scope: 'global' });
    return { circulating_supply: f, total_supply: f, max_supply: f };
  };
  if (!key) return none('provider_failed', 'COINMARKETCAP_API_KEY not configured');
  const H = { 'X-CMC_PRO_API_KEY': key, Accept: 'application/json' };
  const info = await ctx.fetchJson('coinmarketcap', `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${encodeURIComponent(address)}&skip_invalid=true`, { headers: H, credits: 1, retries: 1 });
  if (!info.ok) return none(info.reason === 'not_found' ? 'not_listed' : info.reason, info.detail, [info.ref]);
  const entry: any = info.data?.data ? Object.values(info.data.data)[0] : null;
  if (!entry?.id) return none('not_listed', 'CoinMarketCap has no asset for this address', [info.ref]);
  const q = await ctx.fetchJson('coinmarketcap', `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${entry.id}`, {
    headers: H,
    credits: 1,
    retries: 1,
    excerpt: (d) => {
      const x = d.data?.[entry.id];
      return { id: entry.id, circulating_supply: x?.circulating_supply, total_supply: x?.total_supply, max_supply: x?.max_supply, last_updated: x?.last_updated };
    },
  });
  if (!q.ok) return none(q.reason, q.detail, [q.ref]);
  const d = q.data?.data?.[entry.id];
  const num = (v: unknown, what: string): Field<number> =>
    typeof v === 'number' && v > 0 ? ok(v, q.ref, { unit: 'tokens', scope: 'global' }) : unknown('no_data', `CoinMarketCap has no ${what}`, [q.ref], { unit: 'tokens', scope: 'global' });
  return { circulating_supply: num(d?.circulating_supply, 'circulating supply'), total_supply: num(d?.total_supply, 'total supply'), max_supply: num(d?.max_supply, 'max supply') };
}

export interface UnlockData {
  emissions_source: Field<string>; // DeFiLlama dataset slug used, or 'derived_fully_circulating'
  next_unlock_date: Field<string>;
  next_unlock_amount: Field<number>;
  unlock_30d_amount: Field<number>;
  unlock_90d_amount: Field<number>;
  unlock_365d_amount: Field<number>;
  last_scheduled_event: Field<string>;
  // Supply the dataset does not schedule at all ("tbd"): the residual uncertainty behind every "no unlocks" claim.
  unscheduled_supply: Field<number>;
}

/**
 * Unlock schedule from DeFiLlama's free emissions datasets.
 * A token with no dataset gets `not_found` — which means "not measured",
 * NEVER "no unlocks". "No more unlocks" is only stated when the dataset itself
 * says its schedule is complete: the unscheduled ("tbd") supply is reported and
 * negligible, and the schedule is not still emitting when it ends.
 */
// DeFiLlama's chain names in `metadata.token` ("ethereum:0x...", "base:0x...").
const LLAMA_CHAIN: Record<string, string> = { solana: 'solana', '0x1': 'ethereum', '0x38': 'bsc', '0x2105': 'base', '0xa4b1': 'arbitrum', '0x89': 'polygon', '0xa': 'optimism' };

/** A dataset belongs to this token if its CoinGecko id or its `metadata.token` identifies it. */
export function datasetMatches(data: any, coingeckoId: string | null, chainId: string, address: string): string | null {
  const token = String(data?.metadata?.token ?? '').toLowerCase();
  if (coingeckoId && data?.gecko_id === coingeckoId) return 'gecko_id';
  if (coingeckoId && token === `coingecko:${coingeckoId}`) return 'token_coingecko_id';
  if (LLAMA_CHAIN[chainId] && token === `${LLAMA_CHAIN[chainId]}:${address.toLowerCase()}`) return 'token_contract_address';
  return null;
}

/** Candidate dataset slugs. Safe to be generous: every candidate must pass datasetMatches(). */
export function unlockSlugCandidates(coingeckoId: string | null, name: string | null): string[] {
  const slug = (x: string) => x.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const out: string[] = [];
  if (coingeckoId) out.push(coingeckoId, coingeckoId.replace(/-(finance|network|protocol|token|exchange-solana|exchange|dao|labs)$/, ''));
  if (name) out.push(slug(name), slug(name.split(/\s+/)[0]));
  return [...new Set(out.filter(Boolean))].slice(0, 4);
}

// Raw dataset cache (handoff requirement 10). Only the RAW dataset is cached, keyed by slug and expiring
// 24h after it was ORIGINALLY fetched; every time-dependent value (next unlock, 30/90-day windows) is
// recomputed from it on each scan. (Caching computed fields from a previous scan let a schedule renew
// itself indefinitely and kept stale windows: Codex review 2026-09-25, finding 6.)
export const UNLOCK_DATASET_TTL_MS = 24 * 3600_000;
const datasetCache = new Map<string, { data: any; ref: SourceRef; fetchedAtMs: number }>();
export function resetUnlockCache() {
  datasetCache.clear();
}

export async function fetchUnlocks(ctx: ScanContext, coingeckoId: string | null, name: string | null, chainId: string, address: string, now = new Date()): Promise<UnlockData> {
  const all = (reason: any, detail?: string, refs: SourceRef[] = []): UnlockData => {
    const f = unknown<any>(reason, detail, refs);
    return { emissions_source: f, next_unlock_date: f, next_unlock_amount: f, unlock_30d_amount: f, unlock_90d_amount: f, unlock_365d_amount: f, last_scheduled_event: f, unscheduled_supply: f };
  };
  const slugs = unlockSlugCandidates(coingeckoId, name);
  if (!slugs.length) return all('missing_input', 'no CoinGecko id or name to map to a DeFiLlama emissions dataset');
  const refs: SourceRef[] = [];
  for (const slug of slugs) {
    let data: any;
    let ref: SourceRef;
    const hit = datasetCache.get(slug);
    const age = hit ? now.getTime() - hit.fetchedAtMs : -1;
    if (hit && age >= 0 && age < UNLOCK_DATASET_TTL_MS) {
      data = hit.data;
      ref = { ...hit.ref }; // keeps the ORIGINAL fetched_at
    } else {
      const r = await ctx.fetchJson('defillama_emissions', `https://defillama-datasets.llama.fi/emissions/${slug}`, { timeoutMs: 20_000, retries: 1 });
      if (!r.ok) {
        refs.push(r.ref);
        if (r.reason === 'not_found') continue;
        return all(r.reason, r.detail, refs);
      }
      data = r.data;
      ref = r.ref;
    }
    // Guard against slug collisions: the dataset must identify this exact token
    // (CoinGecko id, or chain:contract address — ARB's dataset has no gecko_id).
    const matchedBy = datasetMatches(data, coingeckoId, chainId, address);
    if (!matchedBy) {
      refs.push({ ...ref, raw_excerpt: { slug, gecko_id: data?.gecko_id, token: data?.metadata?.token } });
      continue;
    }
    if (!hit || age < 0 || age >= UNLOCK_DATASET_TTL_MS) {
      if (datasetCache.size >= 32) datasetCache.delete(datasetCache.keys().next().value as string);
      datasetCache.set(slug, { data, ref: { ...ref }, fetchedAtMs: now.getTime() });
    }
    ref.raw_excerpt = { slug, matched_by: matchedBy, gecko_id: data.gecko_id, token: data.metadata?.token, supplyMetrics: data.supplyMetrics, ...(hit && age >= 0 && age < UNLOCK_DATASET_TTL_MS ? { dataset_cached_since: hit.ref.fetched_at } : {}) };
    return computeUnlocks(data, slug, ref, now);
  }
  return all('not_found', `no DeFiLlama emissions dataset matched this token (tried ${slugs.join(', ')}; not measured, which is not the same as no unlocks)`, refs);
}

const finiteNum = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function computeUnlocks(data: any, slug: string, ref: SourceRef, now: Date): UnlockData {
  const nowS = now.getTime() / 1000;
  const src = ok(slug, ref, { confidence: 'medium' });
  const eventsRaw = data?.metadata?.events;
  const seriesRaw = data?.documentedData?.data;
  // Every component must be a non-empty, ascending, finite, non-negative and non-decreasing cumulative series.
  const seriesValid = Array.isArray(seriesRaw) && seriesRaw.length > 0 && seriesRaw.every((s: any) => s && Array.isArray(s.data) && s.data.length > 0 && s.data.every((p: any, i: number, a: any[]) => Number.isFinite(p?.timestamp) && Number.isFinite(p?.unlocked) && p.unlocked >= 0 && (i === 0 || (p.timestamp >= a[i - 1].timestamp && p.unlocked >= a[i - 1].unlocked))));
  const eventsValid = Array.isArray(eventsRaw) && eventsRaw.every((e: any) => e && Number.isFinite(e.timestamp));
  // Events, the unscheduled ("tbd") supply and the cumulative series are validated INDEPENDENTLY: a broken series must not
  // hide a valid dated event or the reported unscheduled supply (Codex round 3), it only stops window amounts and completeness.
  const events: Array<{ timestamp: number; noOfTokens?: number[]; unlockType?: string }> = eventsValid ? eventsRaw : [];
  const cliffs = events.filter((e) => e.unlockType !== 'linear');
  const future = cliffs.filter((e) => e.timestamp > nowS).sort((a, b) => a.timestamp - b.timestamp);
  const lastAny = [...events].sort((a, b) => b.timestamp - a.timestamp)[0];

  // Window amounts from the daily cumulative series (covers linear vesting too).
  const series: Array<{ label: string; data: Array<{ timestamp: number; unlocked: number }> }> = seriesValid ? seriesRaw : [];
  const cumAt = (t: number): number => {
    let total = 0;
    for (const s of series) {
      let v = 0;
      for (const p of s.data) {
        if (p.timestamp <= t) v = p.unlocked;
        else break;
      }
      total += v;
    }
    return total;
  };
  const iso = (s: number) => new Date(s * 1000).toISOString().slice(0, 10);
  // Where the dataset's schedule stops, and whether tokens were still unlocking right up to that point
  // (AERO: weekly emissions set by governance; AAVE, UNI: daily drips).
  const seriesEnd = series.length ? Math.max(...series.map((s) => s.data[s.data.length - 1]?.timestamp ?? 0)) : 0;
  const tail = Math.min(seriesEnd, nowS);
  const days = [...new Set(series.flatMap((s) => s.data.map((p) => p.timestamp)))].filter((t) => t > tail - 30 * 86400 && t <= tail).sort((a, b) => a - b);
  let increaseDays = 0;
  for (let i = 1; i < days.length; i++) if (cumAt(days[i]) > cumAt(days[i - 1]) + 1e-6) increaseDays++;
  const stillEmitting = increaseDays >= 3 && seriesEnd < nowS + 90 * 86400;

  // Completeness: the dataset must say how much supply is unscheduled ("tbd"), and it must be negligible.
  // Without that, "no future events" only means "none listed", not "none left".
  const maxSupply = finiteNum(data?.supplyMetrics?.maxSupply) ?? finiteNum(data?.metadata?.total);
  const tbd = finiteNum(data?.supplyMetrics?.tbdAmount);
  const tbdShare = tbd !== null && maxSupply && maxSupply > 0 ? tbd / maxSupply : null;
  const unscheduled: Field<number> = tbd !== null
    ? ok(tbd, ref, { unit: 'tokens', confidence: 'medium', detail: tbdShare !== null ? `${(tbdShare * 100).toFixed(2)}% of the dataset's max supply (${Math.round(maxSupply as number).toLocaleString('en-US')}) has no schedule ("tbd")` : 'supply without a schedule ("tbd") in the dataset' })
    : unknown('no_data', 'dataset does not report how much supply is unscheduled', [ref], { unit: 'tokens' });
  // "Complete" needs NO unscheduled supply (a tolerance would turn residual uncertainty into an exact zero) and a
  // series that accounts for the whole max supply (a truncated schedule leaves it short).
  const cumEnd = cumAt(Number.MAX_SAFE_INTEGER);
  const coverage = maxSupply && maxSupply > 0 ? cumEnd / maxSupply : null;
  const incompleteWhy = !eventsValid
    ? 'the dataset has no valid event list'
    : !seriesValid
    ? 'the dataset has no valid cumulative series (empty, unordered, negative or decreasing)'
    : tbd === null || tbdShare === null
    ? 'the dataset does not report how much supply is unscheduled, so a finished schedule cannot be confirmed'
    : tbd >= 1
    ? `${(tbdShare * 100).toFixed(2)}% of supply (${Math.round(tbd).toLocaleString('en-US')} tokens) is unscheduled ("tbd") in the dataset`
    : maxSupply === null || cumEnd < maxSupply - Math.max(1, maxSupply * 1e-9)
    ? `the schedule accounts for only ${coverage === null ? 'an unknown share' : (coverage * 100).toFixed(2) + '%'} of the dataset's max supply, so it looks truncated`
    : stillEmitting
    ? `dataset schedule ends ${iso(seriesEnd)} while tokens were still unlocking (${increaseDays} increase days in its final 30 days); later emissions are not scheduled and are not measured`
    : null;
  const complete = incompleteWhy === null;

  const window = (d: number): Field<number> => {
    if (!complete) return unknown('no_data', `not measured: schedule incomplete (${incompleteWhy}); scheduled amounts alone would understate what can unlock`, [ref], { unit: 'tokens' });
    const coveredNote = seriesEnd < nowS + d * 86400 ? `dataset schedule ends ${iso(seriesEnd)} with no further scheduled unlocks` : undefined;
    const amount = Math.max(0, cumAt(nowS + d * 86400) - cumAt(nowS));
    // The completeness check only looks 90 days out. A schedule that is emitting now and ends inside a longer
    // window may be renewed (governance-set emissions), so beyond 90 days the figure is only a lower bound.
    if (d > 90 && seriesEnd < nowS + d * 86400 && increaseDays >= 3) {
      return ok(amount, ref, { unit: 'tokens', confidence: 'low', bound: 'lower', detail: `lower bound: dataset schedule ends ${iso(seriesEnd)} while tokens are still unlocking; emissions after that date are not scheduled and not counted` });
    }
    return ok(amount, ref, { unit: 'tokens', confidence: 'medium', detail: coveredNote });
  };

  let nextDate: Field<string>;
  let nextAmt: Field<number>;
  if (future.length) {
    // A dated event in the dataset is a fact, even when the schedule as a whole is incomplete.
    const t = future[0].timestamp;
    const amt = future.filter((e) => e.timestamp === t).reduce((a, e) => a + (e.noOfTokens ?? []).reduce((x, y) => x + (y || 0), 0), 0);
    nextDate = ok(iso(t), ref, { unit: 'date', confidence: 'medium' });
    nextAmt = Number.isFinite(amt) && amt > 0 ? ok(amt, ref, { unit: 'tokens', confidence: 'medium' }) : unknown('no_data', 'dated event without a token amount', [ref], { unit: 'tokens' });
  } else if (complete && cumAt(Number.MAX_SAFE_INTEGER) - cumAt(nowS) <= 1e-6) {
    nextDate = ok('none_scheduled', ref, { unit: 'date', confidence: 'medium', detail: 'no future dated unlock events, nothing further in the cumulative series, and the dataset reports a complete schedule' });
    nextAmt = ok(0, ref, { unit: 'tokens', confidence: 'medium' });
  } else if (complete) {
    nextDate = unknown('no_data', `unlocks continue gradually until ${iso(seriesEnd)}; there is no single next unlock date`, [ref], { unit: 'date' });
    nextAmt = unknown('no_data', nextDate.detail, [ref], { unit: 'tokens' });
  } else {
    nextDate = unknown('no_data', `no dated unlock in the dataset, but the schedule is incomplete: ${incompleteWhy}`, [ref], { unit: 'date' });
    nextAmt = unknown('no_data', nextDate.detail, [ref], { unit: 'tokens' });
  }
  return {
    emissions_source: src,
    next_unlock_date: nextDate,
    next_unlock_amount: nextAmt,
    unlock_30d_amount: window(30),
    unlock_90d_amount: window(90),
    unlock_365d_amount: window(365),
    last_scheduled_event: lastAny ? ok(iso(lastAny.timestamp), ref, { unit: 'date' }) : unknown('no_data', undefined, [ref]),
    unscheduled_supply: unscheduled,
  };
}
