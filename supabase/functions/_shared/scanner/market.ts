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

export async function fetchMarketData(ctx: ScanContext, cgPlatform: string, address: string, cmcAddress: string): Promise<MarketData> {
  const key = Deno.env.get('COINGECKO_API_KEY');
  const cg = await ctx.fetchJson(`coingecko`, `${CG_BASE}/coins/${cgPlatform}/contract/${address}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`, {
    headers: key ? { 'x-cg-demo-api-key': key, Accept: 'application/json' } : { Accept: 'application/json' },
    excerpt: (d) => ({ id: d.id, circulating_supply: d.market_data?.circulating_supply, total_supply: d.market_data?.total_supply, max_supply: d.market_data?.max_supply, last_updated: d.market_data?.last_updated }),
  });
  const cmc = await fetchCmc(ctx, cmcAddress);

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
  emissions_source: Field<string>; // DeFiLlama dataset slug used
  next_unlock_date: Field<string>;
  next_unlock_amount: Field<number>;
  unlock_30d_amount: Field<number>;
  unlock_90d_amount: Field<number>;
  last_scheduled_event: Field<string>;
}

/**
 * Unlock schedule from DeFiLlama's free emissions datasets.
 * A token with no dataset gets `not_found` — which means "not measured",
 * NEVER "no unlocks". Only a dataset with no future events means no dated unlocks.
 */
export async function fetchUnlocks(ctx: ScanContext, coingeckoId: string | null, name: string | null, now = new Date()): Promise<UnlockData> {
  const all = (reason: any, detail?: string, refs: SourceRef[] = []): UnlockData => {
    const f = unknown<any>(reason, detail, refs);
    return { emissions_source: f, next_unlock_date: f, next_unlock_amount: f, unlock_30d_amount: f, unlock_90d_amount: f, last_scheduled_event: f };
  };
  if (!coingeckoId) return all('missing_input', 'no CoinGecko id to map to a DeFiLlama emissions dataset');
  const slugs = [...new Set([coingeckoId, name ? name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-') : ''].filter(Boolean))];
  const refs: SourceRef[] = [];
  for (const slug of slugs) {
    const r = await ctx.fetchJson('defillama_emissions', `https://defillama-datasets.llama.fi/emissions/${slug}`, { timeoutMs: 20_000, retries: 1 });
    if (!r.ok) {
      refs.push(r.ref);
      if (r.reason === 'not_found') continue;
      return all(r.reason, r.detail, refs);
    }
    // Guard against a slug collision: the dataset must be for this exact CoinGecko asset.
    if (r.data?.gecko_id !== coingeckoId) {
      refs.push({ ...r.ref, raw_excerpt: { gecko_id: r.data?.gecko_id } });
      continue;
    }
    r.ref.raw_excerpt = { slug, gecko_id: r.data.gecko_id, supplyMetrics: r.data.supplyMetrics };
    return computeUnlocks(r.data, slug, r.ref, now);
  }
  return all('not_found', `no DeFiLlama emissions dataset matched CoinGecko id "${coingeckoId}" (not measured, which is not the same as no unlocks)`, refs);
}

export function computeUnlocks(data: any, slug: string, ref: SourceRef, now: Date): UnlockData {
  const nowS = now.getTime() / 1000;
  const src = ok(slug, ref, { confidence: 'medium' });
  const events: Array<{ timestamp: number; noOfTokens?: number[]; unlockType?: string }> = data?.metadata?.events ?? [];
  const cliffs = events.filter((e) => e.unlockType !== 'linear');
  const future = cliffs.filter((e) => e.timestamp > nowS).sort((a, b) => a.timestamp - b.timestamp);
  const past = events.filter((e) => e.timestamp <= nowS).sort((a, b) => b.timestamp - a.timestamp);
  const lastAny = [...events].sort((a, b) => b.timestamp - a.timestamp)[0];

  // Window amounts from the daily cumulative series (covers linear vesting too).
  const series: Array<{ label: string; data: Array<{ timestamp: number; unlocked: number }> }> = data?.documentedData?.data ?? [];
  const cumAt = (t: number): number | null => {
    if (!series.length) return null;
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
  const c0 = cumAt(nowS);
  const window = (days: number): Field<number> => {
    const c1 = cumAt(nowS + days * 86400);
    const lastPoint = series.length ? Math.max(...series.map((s) => s.data[s.data.length - 1]?.timestamp ?? 0)) : 0;
    if (c0 === null || c1 === null) return unknown('no_data', 'dataset has no cumulative series', [ref], { unit: 'tokens' });
    if (lastPoint < nowS + days * 86400 && future.length) return unknown('no_data', 'series ends before window with events still scheduled', [ref], { unit: 'tokens' });
    return ok(Math.max(0, c1 - c0), ref, { unit: 'tokens', confidence: 'medium' });
  };

  const iso = (s: number) => new Date(s * 1000).toISOString().slice(0, 10);
  let nextDate: Field<string>;
  let nextAmt: Field<number>;
  if (future.length) {
    const t = future[0].timestamp;
    const amt = future.filter((e) => e.timestamp === t).reduce((a, e) => a + (e.noOfTokens ?? []).reduce((x, y) => x + (y || 0), 0), 0);
    nextDate = ok(iso(t), ref, { unit: 'date', confidence: 'medium' });
    nextAmt = ok(amt, ref, { unit: 'tokens', confidence: 'medium' });
  } else {
    // Dataset exists and lists no future cliff: "no dated unlocks" is a measured fact here.
    nextDate = ok('none_scheduled', ref, { unit: 'date', confidence: 'medium', detail: 'no future dated unlock events in dataset' });
    nextAmt = ok(0, ref, { unit: 'tokens', confidence: 'medium' });
  }
  return {
    emissions_source: src,
    next_unlock_date: nextDate,
    next_unlock_amount: nextAmt,
    unlock_30d_amount: window(30),
    unlock_90d_amount: window(90),
    last_scheduled_event: lastAny ? ok(iso(lastAny.timestamp), ref, { unit: 'date' }) : unknown('no_data', undefined, [ref]),
  };
}
