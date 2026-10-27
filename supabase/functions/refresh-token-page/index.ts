// refresh-token-page (2026-10-27): a token page is its latest complete scan. The free internal path that replaces the GitHub workflow
// (token-health-scan .github/workflows/fresh-token-page.yml): rescan when the latest scan is past the age limit or missing, rebuild the
// report, the score card (SVG, rasterised here, no browser) and the bot page from that scan, then read the live page back.
//
// Gabriel's rules: "if the token scan is older than 24h, scan it again, if the scan doesnt exist, scan it now and create the page";
// "we can not have this drop": a scan whose inputs fell out because a data provider failed (timeout, rate limit, provider error) is
// never published. It is rescanned (up to RESCANS times); if the gap stays, the current page stays and the answer names the gap.
//
// Auth: x-refresh-secret = TOKEN_PAGE_REFRESH_SECRET (the V4 server: it can only ask for page refreshes), x-internal-secret, or the
// service role key. Body: { tokens: [{ symbol } | { address, chain }], max_age_hours?: 24, no_rescan?: bool, force?: bool }
// or { due: true, limit?: 2, max_age_hours?: 20 } (the cron: the tokens whose scan is oldest past the limit).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { projectKeyRole } from '../_shared/authGuard.ts';
import { DIMS, reportFromScan, scanTime } from '../_shared/tokenPage/report.ts';
import { renderTokenPage } from '../_shared/tokenPage/page.ts';
import { heroBgSvg, ogCardSvg, storySvg, svgToPng, type CardInput } from '../_shared/tokenPage/card.ts';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const supabase = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = 'https://tokenhealthscan.com';
const RESCANS = 2;
const BUDGET_MS = 120_000;
const TRANSIENT = /^(provider_failed|timeout|rate_limited)/;
const CHAIN_LABEL: Record<string, string> = { '0x1': 'Ethereum', '0x38': 'BNB Chain', '0x89': 'Polygon', '0xa4b1': 'Arbitrum', '0x2105': 'Base', solana: 'Solana' };
const CG_PLATFORM: Record<string, string> = { ethereum: '0x1', 'binance-smart-chain': '0x38', 'polygon-pos': '0x89', 'arbitrum-one': '0xa4b1', base: '0x2105', solana: 'solana' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function authorized(req: Request): Promise<boolean> {
  const refresh = Deno.env.get('TOKEN_PAGE_REFRESH_SECRET');
  if (refresh && req.headers.get('x-refresh-secret') === refresh) return true;
  const internal = Deno.env.get('INTERNAL_API_SECRET');
  if (internal && req.headers.get('x-internal-secret') === internal) return true;
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  return (await projectKeyRole(bearer)) === 'service_role';
}

// ---------- the token ----------
type Token = { symbol: string; address: string; chain: string; report: any | null };
async function findToken(ref: { symbol?: string; address?: string; chain?: string }): Promise<Token> {
  const s = String(ref.symbol ?? '').toLowerCase();
  if (s) {
    const { data } = await supabase.from('token_reports').select('token_symbol, token_name, token_address, chain_id, report_content').ilike('token_symbol', s).order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (data) return { symbol: s, address: data.token_address, chain: data.chain_id, report: data };
  }
  if (ref.address && ref.chain) {
    const { data } = await supabase.from('token_reports').select('token_symbol, token_name, token_address, chain_id, report_content').eq('token_address', ref.address.toLowerCase()).eq('chain_id', ref.chain).limit(1).maybeSingle();
    return { symbol: s || String(data?.token_symbol ?? ''), address: ref.address, chain: ref.chain, report: data ?? null };
  }
  if (!s) throw new Error('give a symbol, or an address and a chain');
  const { data: cache } = await supabase.from('token_data_cache').select('token_address, chain_id').ilike('symbol', s).order('market_cap_usd', { ascending: false, nullsFirst: false }).limit(1).maybeSingle();
  if (cache?.chain_id) return { symbol: s, address: cache.token_address, chain: cache.chain_id, report: null };
  const cg = Deno.env.get('COINGECKO_API_KEY');
  if (!cg) throw new Error(`${s.toUpperCase()} is new to us: pass address and chain`);
  const pro = !cg.startsWith('CG-');
  const base = pro ? 'https://pro-api.coingecko.com/api/v3' : 'https://api.coingecko.com/api/v3';
  const hdr: Record<string, string> = pro ? { 'x-cg-pro-api-key': cg } : { 'x-cg-demo-api-key': cg };
  const found = await (await fetch(`${base}/search?query=${encodeURIComponent(s)}`, { headers: hdr })).json();
  const coin = (found.coins ?? []).filter((c: any) => c.symbol?.toLowerCase() === s).sort((a: any, b: any) => (a.market_cap_rank ?? 1e9) - (b.market_cap_rank ?? 1e9))[0];
  if (!coin) throw new Error(`${s.toUpperCase()}: CoinGecko has no coin with that symbol; pass address and chain`);
  const detail = await (await fetch(`${base}/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`, { headers: hdr })).json();
  for (const [platform, chain] of Object.entries(CG_PLATFORM)) if (detail.platforms?.[platform]) return { symbol: s, address: detail.platforms[platform], chain, report: null };
  throw new Error(`${s.toUpperCase()}: CoinGecko ${coin.id} has no contract on a chain we scan`);
}

// ---------- the scan ----------
async function latestScan(t: Token) {
  const { data } = await supabase.from('token_scans').select('id, scanned_at, score_total, dimension_scores, field_data, scoring_version, canonical_address')
    .eq('token_address', t.address.toLowerCase()).eq('chain_id', t.chain).not('dimension_scores', 'is', null).order('scanned_at', { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}
const ageHours = (scan: any) => (Date.now() - Date.parse(scanTime(scan))) / 3600000;

/** Inputs a scan lost because a data provider failed (not because the data does not exist): such a scan is never published. */
export function transientGaps(scan: any): string[] {
  const gaps: string[] = [];
  for (const [dim, d] of Object.entries<any>(scan?.dimension_scores?.dimensions ?? {})) {
    for (const [input, why] of Object.entries<any>(d?.inputs_excluded ?? {})) if (TRANSIENT.test(String(why))) gaps.push(`${dim}.${input}: ${why}`);
  }
  return gaps;
}

async function runScan(t: Token) {
  const r = await fetch(`${URL_}/functions/v1/run-token-scan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-internal-secret': Deno.env.get('INTERNAL_API_SECRET') ?? '' },
    body: JSON.stringify({ token_address: t.address, chain_id: t.chain, force_refresh: true }), signal: AbortSignal.timeout(110_000),
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body.success === false) throw new Error(`run-token-scan answered ${r.status}: ${body.error ?? body.error_code ?? 'no detail'}`);
}

// ---------- the live page ----------
async function livePage(sym: string) {
  const r = await fetch(`${SITE}/token/${sym}?fresh=${Date.now()}`, { headers: { 'user-agent': 'Twitterbot/1.0' }, signal: AbortSignal.timeout(20000) });
  const html = r.ok ? await r.text() : '';
  const m = html.match(/health score: ([\d—]+)\/100\. Security ([\d—]+), Liquidity ([\d—]+), Tokenomics ([\d—]+), Community ([\d—]+), Development ([\d—]+)/);
  const num = (v: string) => (v === '—' ? null : Number(v));
  return { status: r.status, scores: m ? { overall: num(m[1]), ...Object.fromEntries(DIMS.map((k, i) => [k, num(m[i + 2])])) } as Record<string, number | null> : null,
    scannedAt: html.match(/<time datetime="([^"]+)"/)?.[1] ?? null };
}

const fmtPrice = (p: number | null) => (p == null ? null : p >= 1 ? '$' + p.toLocaleString('en-US', { maximumFractionDigits: 2 }) : p >= 0.01 ? '$' + p.toFixed(4) : '$' + p.toPrecision(3));
const fmtCap = (c: number | null) => (c == null ? null : c >= 1e9 ? '$' + (c / 1e9).toFixed(1) + 'B' : c >= 1e6 ? '$' + (c / 1e6).toFixed(0) + 'M' : '$' + Math.round(c).toLocaleString('en-US'));
async function logoData(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const type = r.headers.get('content-type') ?? '';
    if (!r.ok || !/image\/(png|jpe?g)/.test(type)) return null;   // resvg draws png and jpeg; anything else keeps the card without a logo
    const bytes = new Uint8Array(await r.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:${type.split(';')[0]};base64,${btoa(bin)}`;
  } catch { return null; }
}
async function upload(bucket: string, key: string, body: Uint8Array | string, contentType: string) {
  const { error } = await supabase.storage.from(bucket).upload(key, body, { upsert: true, contentType, cacheControl: '300' });
  if (error) throw new Error(`${bucket}/${key} upload failed: ${error.message}`);
}

// ---------- one token ----------
async function refresh(ref: any, opts: { maxAge: number; noRescan: boolean; force: boolean }) {
  const out: Record<string, any> = { token: String(ref.symbol ?? ref.address ?? '').toUpperCase(), ok: false };
  try {
    const t = await findToken(ref);
    out.token = (t.symbol || out.token).toUpperCase();
    Object.assign(out, { chain: t.chain, address: t.address, page: `${SITE}/token/${t.symbol}`, new_page: !t.report });
    let scan = await latestScan(t);
    out.previous_scan = scan ? scanTime(scan) : null;
    // rescan when there is no scan, it is past the age limit, or it lost inputs to a provider failure; a gap that survives RESCANS
    // fresh scans is reported and nothing is published
    for (let attempt = 0; !opts.noRescan && (!scan || ageHours(scan) > opts.maxAge || transientGaps(scan).length) && attempt < RESCANS; attempt++) {
      await runScan(t);
      scan = await latestScan(t);
      if (!scan || ageHours(scan) > 1) throw new Error('the scan ran but no new scan was stored');
      out.rescanned = (out.rescanned ?? 0) + 1;
    }
    if (!scan) throw new Error('no scan on record');
    const gaps = transientGaps(scan);
    if (gaps.length) { out.gaps = gaps; throw new Error(`scan incomplete after ${RESCANS} fresh scans (data provider failed: ${gaps.join('; ')}): the current page stays`); }
    const at = scanTime(scan);
    out.scan = { id: scan.id, scanned_at: at, overall: scan.dimension_scores?.overall ?? scan.score_total ?? null, scores: Object.fromEntries(DIMS.map((k) => [k, scan.dimension_scores?.dimensions?.[k]?.score ?? null])) };

    if (!opts.force && t.report?.report_content?.metadata?.scanId === scan.id) {
      const live = await livePage(t.symbol).catch(() => null);
      if (live?.scannedAt && Date.parse(live.scannedAt) === Date.parse(at)) return Object.assign(out, { live, live_matches_scan: true, unchanged: true, ok: true });
    }

    const { data: cache } = await supabase.from('token_data_cache').select('name, description, logo_url, current_price_usd, market_cap_usd').eq('token_address', t.address.toLowerCase()).limit(1).maybeSingle();
    const rc: any = reportFromScan(t, scan, t.report, cache);
    const addr = t.address.toLowerCase();
    const base = `${t.chain === '0x1' ? 'ethereum' : t.chain}/${addr}`;
    rc.hero_image_url = `${URL_}/storage/v1/object/public/reports/${base}/og_1200x630.png`;

    // the card first: a page never points at a card that failed to upload
    const card: CardInput = {
      name: rc.metadata.tokenName, symbol: t.symbol, chainLabel: CHAIN_LABEL[t.chain] ?? t.chain, logo: await logoData(cache?.logo_url ?? null),
      overall: rc.metadata.overallScore ?? null, scores: rc.metadata.scores, price: fmtPrice(cache?.current_price_usd ?? rc.metadata.currentPrice ?? null),
      mcap: fmtCap(cache?.market_cap_usd ?? rc.metadata.marketCap ?? null), date: at.slice(0, 10),
    };
    await upload('reports', `${base}/og_1200x630.png`, await svgToPng(ogCardSvg(card), 2), 'image/png');
    await upload('reports', `${base}/hero_1200x630.png`, await svgToPng(heroBgSvg(card), 2), 'image/png');
    await upload('reports', `${base}/hero_1080x1920.png`, await svgToPng(storySvg(card), 1), 'image/png');
    out.card = rc.hero_image_url;

    if (t.report) {
      const { error } = await supabase.from('token_reports').update({ report_content: rc, token_name: rc.metadata.tokenName }).eq('token_symbol', t.report.token_symbol);
      if (error) throw new Error(`token_reports update failed: ${error.message}`);
    } else {
      const { error } = await supabase.from('token_reports').insert({ token_symbol: t.symbol, token_name: rc.metadata.tokenName, token_address: addr, chain_id: t.chain, report_content: rc });
      if (error) throw new Error(`token_reports insert failed: ${error.message}`);
    }
    const { data: row } = await supabase.from('token_reports').select('updated_at').eq('token_symbol', t.report?.token_symbol ?? t.symbol).limit(1).maybeSingle();
    const html = renderTokenPage({
      symbol: t.symbol, name: rc.metadata.tokenName, address: addr, chain: t.chain, overall_score: rc.metadata.overallScore,
      ...Object.fromEntries(DIMS.map((k) => [`${k}_score`, rc.metadata.scores[k]])), price_usd: rc.metadata.currentPrice, updated_at: row?.updated_at ?? null,
      scanned_at: at, hero_image_url: rc.hero_image_url, what_is: rc.whatIsToken, risk_overview: rc.riskOverview, security_analysis: rc.securityAnalysis,
      liquidity_analysis: rc.liquidityAnalysis, tokenomics_analysis: rc.tokenomicsAnalysis, community_analysis: rc.communityAnalysis,
      development_analysis: rc.developmentAnalysis, how_to_buy: rc.howToBuy, faq: rc.faq,
    });
    await upload('seo-snapshots', `token/${t.symbol}/index.html`, html, 'text/html; charset=utf-8');
    if (!t.report) out.sitemap = (await fetch(`${URL_}/functions/v1/generate-sitemap`, { method: 'POST' }).catch(() => null))?.ok ? 'regenerated' : 'FAILED';

    const live = await livePage(t.symbol);
    const match = !!live.scores && live.scores.overall === out.scan.overall && DIMS.every((k) => live.scores![k] === out.scan.scores[k]) && live.scannedAt != null && Date.parse(live.scannedAt) === Date.parse(at);
    Object.assign(out, { live, live_matches_scan: match, ok: match });
    if (!match) out.error = `the live page ${live.status === 200 ? `shows ${JSON.stringify(live.scores)} from ${live.scannedAt}` : `answered ${live.status}`}; the page was written, the site cache may still hold the old one`;
  } catch (e) {
    out.error = (e as Error).message;
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405);
  if (!(await authorized(req))) return json({ ok: false, error: 'Unauthorized' }, 401);
  const body = await req.json().catch(() => ({}));
  const started = Date.now();
  const maxAge = Number(body.max_age_hours ?? (body.due ? 20 : 24));
  const opts = { maxAge, noRescan: !!body.no_rescan, force: !!body.force };
  let refs: any[] = Array.isArray(body.tokens) ? body.tokens : [];
  if (body.due) {
    // the cron: tokens whose latest scan is oldest and past the limit (or lost inputs to a provider failure), a few per call
    const { data: reports } = await supabase.from('token_reports').select('token_symbol, token_address, chain_id');
    const due: Array<{ symbol: string; age: number }> = [];
    for (const r of reports ?? []) {
      const scan = await latestScan({ symbol: r.token_symbol, address: r.token_address, chain: r.chain_id, report: null });
      const age = scan ? ageHours(scan) : Infinity;
      if (age > maxAge || (scan && transientGaps(scan).length)) due.push({ symbol: r.token_symbol, age });
    }
    due.sort((a, b) => b.age - a.age);
    refs = due.slice(0, Math.max(1, Math.min(5, Number(body.limit ?? 2)))).map((d) => ({ symbol: d.symbol }));
  }
  if (!refs.length) return json({ ok: true, results: [], note: body.due ? 'nothing due' : 'no tokens given' });
  const results: any[] = [];
  for (const ref of refs) {
    if (Date.now() - started > BUDGET_MS) { results.push({ token: String(ref.symbol ?? ref.address).toUpperCase(), ok: false, error: 'skipped: time budget used, call again' }); continue; }
    results.push(await refresh(ref, opts));
  }
  return json({ ok: results.every((r) => r.ok), results, ms: Date.now() - started });
});
