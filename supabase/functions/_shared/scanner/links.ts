// Social links, found and checked on every scan (2026-10-27; Gabriel: "needs to triple check every run if can not really find it,
// dont just give up"). CoinGecko's listed links are often stale: expired Discord invites (PENDLE, IQ, FRAX), a bot or a person
// instead of a Telegram group (WLD, BGB). A dead link used to read as "provider_failed" and blocked the page.
//
// Every scan gathers candidates from the verified overrides, CoinGecko, CoinMarketCap, DefiLlama and the project's own website
// (homepage links and its /discord and /telegram redirects), checks each one live, and keeps the largest valid community. A missing
// value names what was checked: 'link_dead' (links listed, none alive), 'not_found' (no source lists one), or a provider failure
// only when a source we needed could not be read this run (that scan is retried, never published).
import { type Field, ok, type ReasonCode, type SourceRef, unknown } from './field.ts';
import type { ScanContext } from './http.ts';

export type LinkKind = 'github' | 'discord' | 'telegram';
export interface Candidate { kind: LinkKind; url: string; source: string }
export interface LinkSearch { candidates: Candidate[]; read: string[]; unread: Array<{ source: string; reason: ReasonCode | string }> }

const GH_SKIP = new Set(['orgs', 'sponsors', 'features', 'about', 'login', 'settings', 'topics', 'collections', 'marketplace', 'apps', 'site', 'enterprise', 'pricing', 'security', 'explore']);
const TG_SKIP = new Set(['s', 'joinchat', 'share', 'addstickers', 'proxy', 'socks', 'iv', 'login', 'telegram']);

/** Links of each kind in a piece of text (a homepage, an API answer). */
export function extractLinks(text: string, source: string): Candidate[] {
  const out: Candidate[] = [];
  for (const m of text.matchAll(/github\.com\/([A-Za-z0-9-]{1,39})(?:\/([A-Za-z0-9._-]{1,100}))?/gi)) {
    if (GH_SKIP.has(m[1].toLowerCase())) continue;
    out.push({ kind: 'github', url: `https://github.com/${m[1]}${m[2] && !/\.(png|svg|jpg|gif)$/i.test(m[2]) ? `/${m[2].replace(/\.git$/, '')}` : ''}`, source });
  }
  for (const m of text.matchAll(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]{2,40})/gi)) out.push({ kind: 'discord', url: `https://discord.gg/${m[1]}`, source });
  for (const m of text.matchAll(/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]{4,40})(?![A-Za-z0-9_\/])/gi)) {
    if (TG_SKIP.has(m[1].toLowerCase()) || /bot$/i.test(m[1])) continue;   // a bot is never the community
    out.push({ kind: 'telegram', url: `https://t.me/${m[1]}`, source });
  }
  return out;
}

let llama: { at: number; data: any[] } | null = null;
const LLAMA_TTL_MS = 60 * 60 * 1000;   // protocol metadata (repositories), not a market reading

/** Gather candidate links from every source. `base` = CoinGecko's links; `overrides` = verified corrections (token_social_overrides). */
export async function gatherLinks(ctx: ScanContext, a: {
  address: string; coingeckoId: string | null; website?: string | null;
  base: Partial<Record<LinkKind, string>>; overrides?: Partial<Record<LinkKind | 'website', string | null>>;
}): Promise<LinkSearch> {
  const candidates: Candidate[] = [];
  const read: string[] = [], unread: LinkSearch['unread'] = [];
  for (const kind of ['github', 'discord', 'telegram'] as const) {
    if (a.overrides?.[kind]) candidates.push({ kind, url: a.overrides[kind]!, source: 'override' });
    if (a.base[kind]) candidates.push({ kind, url: a.base[kind]!, source: 'coingecko' });
  }
  read.push('coingecko');

  const website = a.overrides?.website || a.website || null;
  const cmcKey = Deno.env.get('COINMARKETCAP_API_KEY');
  const tasks: Array<Promise<void>> = [];
  // CoinMarketCap: the project's own listed chat, source code and website
  if (cmcKey) tasks.push((async () => {
    const r = await ctx.fetchJson('coinmarketcap_info', `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${encodeURIComponent(a.address)}`, { headers: { 'X-CMC_PRO_API_KEY': cmcKey }, retries: 2 });
    if (!r.ok) { if (r.reason !== 'not_found') unread.push({ source: 'coinmarketcap', reason: r.reason }); else read.push('coinmarketcap'); return; }
    read.push('coinmarketcap');
    for (const coin of Object.values<any>(r.data?.data ?? {})) {
      const urls = coin?.urls ?? {};
      candidates.push(...extractLinks([...(urls.chat ?? []), ...(urls.source_code ?? []), ...(urls.announcement ?? [])].join(' '), 'coinmarketcap'));
    }
  })());
  else unread.push({ source: 'coinmarketcap', reason: 'missing_input' });
  // DefiLlama: the protocol's GitHub organisations
  tasks.push((async () => {
    if (!llama || Date.now() - llama.at > LLAMA_TTL_MS) {
      const r = await ctx.fetchJson('defillama_protocols', 'https://api.llama.fi/protocols', { retries: 1, timeoutMs: 15_000 });
      if (!r.ok) { unread.push({ source: 'defillama', reason: r.reason }); return; }
      llama = { at: Date.now(), data: Array.isArray(r.data) ? r.data : [] };
    }
    read.push('defillama');
    const addr = a.address.toLowerCase();
    for (const p of llama.data) {
      const pa = String(p.address ?? '').toLowerCase();
      if ((a.coingeckoId && p.gecko_id === a.coingeckoId) || (pa && (pa === addr || pa.endsWith(`:${addr}`)))) {
        for (const org of p.github ?? []) candidates.push({ kind: 'github', url: `https://github.com/${org}`, source: 'defillama' });
      }
    }
  })());
  // The project's own website: homepage links, and its /discord and /telegram redirects (Pendle's /discord pointed at the live invite)
  if (website) tasks.push((async () => {
    let origin: string;
    try { origin = new URL(website).origin; } catch { unread.push({ source: 'website', reason: 'missing_input' }); return; }
    const page = await ctx.fetchJson<{ text: string; url: string }>('website', website, { asText: true, retries: 1, timeoutMs: 12_000, headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' } });
    if (page.ok) { read.push('website'); candidates.push(...extractLinks(page.data.text, 'website')); }
    else unread.push({ source: 'website', reason: page.reason });
    for (const path of ['discord', 'telegram']) {
      const r = await ctx.fetchJson<{ text: string; url: string }>('website', `${origin}/${path}`, { asText: true, retries: 0, timeoutMs: 8_000, redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (r.ok && !r.data.url.startsWith(origin)) candidates.push(...extractLinks(r.data.url, 'website_redirect'));
    }
  })());
  else unread.push({ source: 'website', reason: 'not_found' });
  await Promise.all(tasks);

  const seen = new Set<string>();
  return { candidates: candidates.filter((c) => { const k = `${c.kind}|${c.url.toLowerCase().replace(/\/$/, '')}`; if (seen.has(k)) return false; seen.add(k); return true; }), read, unread };
}

type Check = { status: 'ok'; members: number; ref: SourceRef } | { status: 'dead' | 'failed'; reason: ReasonCode | string; detail: string; ref: SourceRef };

/** A Discord invite: alive with a member count, dead (expired, unknown), or not answered this run. */
export async function checkDiscord(ctx: ScanContext, url: string): Promise<Check> {
  const code = url.match(/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([A-Za-z0-9-]+)/i)?.[1];
  const ref: SourceRef = { source: 'discord', fetched_at: ctx.now().toISOString() };
  if (!code) return { status: 'dead', reason: 'link_dead', detail: `${url} is not an invite link`, ref };
  const r = await ctx.fetchJson('discord', `https://discord.com/api/v10/invites/${code}?with_counts=true`, { retries: 3, excerpt: (d) => ({ code, guild: d?.guild?.name, members: d?.approximate_member_count }) });
  if (r.ok && typeof r.data?.approximate_member_count === 'number' && r.data.approximate_member_count > 0) return { status: 'ok', members: r.data.approximate_member_count, ref: r.ref };
  if (r.ok || r.reason === 'not_found') return { status: 'dead', reason: 'link_dead', detail: `discord.gg/${code}: invite expired or unknown`, ref: r.ref };
  return { status: 'failed', reason: r.reason, detail: `discord.gg/${code}: ${r.detail ?? r.reason}`, ref: r.ref };
}

/** A public Telegram group or channel page: a member or subscriber count, dead (a person, a bot, nothing), or not answered. */
export async function checkTelegram(ctx: ScanContext, url: string): Promise<Check> {
  const handle = url.match(/(?:t\.me|telegram\.me)\/([A-Za-z0-9_]+)/i)?.[1];
  const ref: SourceRef = { source: 'telegram', fetched_at: ctx.now().toISOString() };
  if (!handle) return { status: 'dead', reason: 'link_dead', detail: `${url} is not a Telegram link`, ref };
  const r = await ctx.fetchJson<{ text: string; url: string }>('telegram', `https://t.me/${handle}`, { asText: true, retries: 2, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TokenHealthScan/1.0)' } });
  if (!r.ok) return { status: 'failed', reason: r.reason, detail: `t.me/${handle}: ${r.detail ?? r.reason}`, ref: r.ref };
  const extra = r.data.text.match(/tgme_page_extra[^>]*>([^<]*)</)?.[1] ?? '';
  const n = extra.match(/([\d\s  ,.]+)\s*(members|subscribers)/i);
  if (n) {
    const members = parseInt(n[1].replace(/[^\d]/g, ''), 10);
    if (members > 0) return { status: 'ok', members, ref: { ...r.ref, raw_excerpt: { handle, extra: extra.trim().slice(0, 80) } } };
  }
  return { status: 'dead', reason: 'link_dead', detail: `t.me/${handle}: not a public group or channel (no member count; a person, a bot, or no such name)`, ref: r.ref };
}

/** The member count of the largest live community among the candidates, with what was checked when there is none. */
export async function bestCommunity(ctx: ScanContext, search: LinkSearch, kind: 'discord' | 'telegram'): Promise<{ field: Field<number>; url: string | null }> {
  const cands = search.candidates.filter((c) => c.kind === kind).slice(0, 6);
  const checks = await Promise.all(cands.map((c) => (kind === 'discord' ? checkDiscord(ctx, c.url) : checkTelegram(ctx, c.url)).then((r) => ({ c, r }))));
  const live = checks.filter((x) => x.r.status === 'ok').sort((a, b) => (b.r as any).members - (a.r as any).members);
  const refs = checks.map((x) => ({ ...x.r.ref, raw_excerpt: { ...(x.r.ref.raw_excerpt ?? {}), url: x.c.url, listed_by: x.c.source, status: x.r.status } }));
  if (live.length) {
    const best = live[0];
    return { field: ok((best.r as any).members, refs.find((r) => r.raw_excerpt.url === best.c.url)!, { unit: 'members', confidence: live.length > 1 ? 'high' : 'medium', detail: `${best.c.url} (listed by ${best.c.source}); ${checks.length} link(s) checked` }), url: best.c.url };
  }
  const failed = checks.filter((x) => x.r.status === 'failed');
  const unreadTransient = search.unread.filter((u) => ['provider_failed', 'timeout', 'rate_limited', 'circuit_open'].includes(String(u.reason)));
  const checkedIn = `checked: ${search.read.join(', ')}${search.unread.length ? `; could not read ${search.unread.map((u) => `${u.source} (${u.reason})`).join(', ')}` : ''}`;
  if (failed.length) return { field: unknown((failed[0].r as any).reason, `${kind}: ${failed.map((x) => (x.r as any).detail).join('; ')}`, refs, { unit: 'members' }), url: null };
  if (checks.length) return { field: unknown('link_dead', `${kind}: every listed link is dead (${checks.map((x) => (x.r as any).detail).join('; ')}); ${checkedIn}`, refs, { unit: 'members' }), url: null };
  if (unreadTransient.length) return { field: unknown(unreadTransient[0].reason as ReasonCode, `${kind}: no link found yet, but ${unreadTransient.map((u) => u.source).join(', ')} could not be read this run; ${checkedIn}`, refs, { unit: 'members' }), url: null };
  return { field: unknown('not_found', `no ${kind} listed anywhere (${checkedIn})`, refs, { unit: 'members' }), url: null };
}

/** GitHub candidates in trust order: verified override, CoinGecko, CoinMarketCap, DefiLlama, the website. */
export function githubCandidates(search: LinkSearch): string[] {
  const order = ['override', 'coingecko', 'coinmarketcap', 'defillama', 'website', 'website_redirect'];
  const seen = new Set<string>();
  return search.candidates.filter((c) => c.kind === 'github').sort((a, b) => order.indexOf(a.source) - order.indexOf(b.source))
    .map((c) => c.url.replace(/\/$/, '')).filter((u) => { const k = u.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
}
