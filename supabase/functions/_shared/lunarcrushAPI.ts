// LunarCrush social metrics from the structured API our plan includes (2026-10-27). The old reader pattern-matched the text summary
// at lunarcrush.ai/topic/<symbol>: social dominance and trend came back empty in 70-78% of scans, and a symbol can name several coins.
//
// - GET /api4/public/coins/list/v1 (sorted by market cap, 1000 a page): sentiment, social_dominance, galaxy_score, alt_rank,
//   interactions_24h for every coin, each with its contract addresses, so a token is matched by ADDRESS, never by symbol.
// - GET /api4/public/topic/<symbol>/time-series/v1?bucket=day&interval=1w: 8 daily points; the trend compares the last 3 days of
//   interactions with the 4 before, and is used only when the series belongs to the same coin (config.asset = coins::<id>).
// Read fresh on every scan (Gabriel: no stale data); a list page is shared for 10 minutes inside one isolate. The single-coin and
// topic endpoints answer 402 on our plan.
export interface LunarCrushData {
  galaxy_score: number | null;
  alt_rank: number | null;
  sentiment: number | null;
  interactions_24h: number | null;
  posts_active: number | null;
  contributors_active: number | null;
  social_dominance: number | null;
  trend: string | null;
  fetched_at?: string;
  coin_id?: number | null;
  lookup?: 'ok' | 'not_listed' | 'failed';
  detail?: string;
}

const BASE = 'https://lunarcrush.com/api4/public';
const PAGE_TTL_MS = 10 * 60 * 1000;
const MAX_PAGES = 6;   // 5,537 coins on 2026-10-27
const pages = new Map<number, { at: number; rows: any[] }>();

async function getJson(url: string, key: string, tries = 3): Promise<{ ok: boolean; status: number; data?: any }> {
  let status = 0;
  for (let i = 0; i < tries; i++) {
    if (i) await new Promise((r) => setTimeout(r, i * 4000));   // LunarCrush answers 429 after a burst of calls in one minute
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(12_000) });
      status = r.status;
      if (r.ok) return { ok: true, status, data: await r.json() };
      await r.body?.cancel();
      if (r.status !== 429 && r.status < 500) break;
    } catch { status = 0; }
  }
  return { ok: false, status };
}

async function listPage(page: number, key: string): Promise<any[] | null> {
  const hit = pages.get(page);
  if (hit && Date.now() - hit.at < PAGE_TTL_MS) return hit.rows;
  // the default order is rank 1 first (the API's 'desc' flag reads backwards)
  const r = await getJson(`${BASE}/coins/list/v1?limit=1000&page=${page}&sort=market_cap_rank`, key);
  if (!r.ok) return null;
  const rows = Array.isArray(r.data?.data) ? r.data.data : [];
  pages.set(page, { at: Date.now(), rows });
  return rows;
}

function trendOf(points: any[]): string | null {
  const v = points.map((p) => Number(p?.interactions)).filter((n) => Number.isFinite(n));
  if (v.length < 7) return null;
  const recent = v.slice(-3).reduce((s, n) => s + n, 0) / 3;
  const before = v.slice(-7, -3).reduce((s, n) => s + n, 0) / 4;
  if (!(before > 0)) return null;
  const change = recent / before - 1;
  return change > 0.1 ? 'up' : change < -0.1 ? 'down' : 'flat';
}

/** The token's LunarCrush reading, matched by contract address. `lookup` says whether it was found, absent, or not answered. */
export async function fetchLunarCrushCoin(address: string, symbol: string | null): Promise<LunarCrushData> {
  const empty = (lookup: LunarCrushData['lookup'], detail: string): LunarCrushData => ({ galaxy_score: null, alt_rank: null, sentiment: null, interactions_24h: null, posts_active: null, contributors_active: null, social_dominance: null, trend: null, fetched_at: new Date().toISOString(), coin_id: null, lookup, detail });
  const key = Deno.env.get('LUNARCRUSH_API_KEY');
  if (!key) return empty('failed', 'LUNARCRUSH_API_KEY not configured');
  const addr = address.toLowerCase();
  let coin: any = null;
  for (let page = 0; page < MAX_PAGES && !coin; page++) {
    const rows = await listPage(page, key);
    if (!rows) return empty('failed', `LunarCrush coin list page ${page} did not answer`);
    coin = rows.find((c) => (c.blockchains ?? []).some((b: any) => String(b?.address ?? '').toLowerCase() === addr)) ?? null;
    if (rows.length < 1000) break;
  }
  if (!coin) return empty('not_listed', 'LunarCrush does not track this contract');
  let trend: string | null = null, contributors: number | null = null, posts: number | null = null;
  if (symbol) {
    const ts = await getJson(`${BASE}/topic/${encodeURIComponent(symbol.toLowerCase())}/time-series/v1?bucket=day&interval=1w`, key, 2);
    if (ts.ok && new RegExp(`^coins:+${coin.id}$`).test(String(ts.data?.config?.asset ?? ''))) {   // the API writes 'coins::3154'
      const pts = Array.isArray(ts.data.data) ? ts.data.data : [];
      trend = trendOf(pts);
      const last = pts[pts.length - 1];
      contributors = Number.isFinite(Number(last?.contributors_active)) ? Number(last.contributors_active) : null;
      posts = Number.isFinite(Number(last?.posts_active)) ? Number(last.posts_active) : null;
    }
  }
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    galaxy_score: num(coin.galaxy_score), alt_rank: num(coin.alt_rank), sentiment: num(coin.sentiment), interactions_24h: num(coin.interactions_24h),
    posts_active: posts, contributors_active: contributors, social_dominance: num(coin.social_dominance), trend,
    fetched_at: new Date().toISOString(), coin_id: coin.id ?? null, lookup: 'ok',
  };
}

/** Kept for run-token-scan's call site: always a fresh reading (the 6-hour cache reuse is gone). */
export async function fetchLunarCrushWithCache(tokenSymbol: string, tokenAddress: string, _chainId: string, _supabase: unknown, _forceRefresh = false): Promise<LunarCrushData | null> {
  return await fetchLunarCrushCoin(tokenAddress, tokenSymbol);
}
