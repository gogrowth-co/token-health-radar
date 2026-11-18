// Consent replay (2026-11-18): node scripts/replay/consent_replay.mjs https://tokenhealthscan.com  (needs playwright; CHROME_EXE = a Chromium binary)
// Consent replay: timing (no interaction), opt-out default, Refuse (cookieless GA, no pixels, no cookies), Accept.
import { chromium } from 'playwright';
const base = process.argv[2];
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
let fails = 0; const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`); if (!ok) fails++; };
const PIX = /analytics\.tiktok\.com\/api|alb\.reddit\.com\/rp|t\.co\/1\/i\/adsct|ads-twitter\.com\/uwt/;
async function visit(ctx, path = '/', act) {
  const p = await ctx.newPage(); const reqs = []; let loadAt = 0;
  p.on('request', (r) => reqs.push({ t: Date.now(), u: r.url() }));
  p.on('load', () => { loadAt = Date.now(); });
  await p.goto(base + path, { waitUntil: 'load' }); await p.waitForTimeout(7000);
  if (act) { await act(p); await p.waitForTimeout(4000); }
  const cookies = (await ctx.cookies()).filter((c) => /tokenhealthscan|localhost/.test(c.domain)).map((c) => c.name);   // first-party only
  return { p, reqs, loadAt, cookies };
}
// 1. fresh visitor, no interaction
let ctx = await b.newContext({ userAgent: UA });
let v = await visit(ctx);
const gtm = v.reqs.find((r) => /gtm\.js\?id=GTM-P84WRMG9/.test(r.u));
check(!!gtm && gtm.t >= v.loadAt, `GTM loads after the load event with no interaction (${gtm ? gtm.t - v.loadAt : 'none'} ms after load)`);
check(v.reqs.some((r) => /g\/collect/.test(r.u)), 'GA4 collects on a fresh visit');
check(await v.p.locator('[data-consent-bar]').isVisible(), 'the bar is shown to a new visitor');
check(v.cookies.includes('_ga'), `opt-out default: _ga set before any choice (cookies: ${v.cookies.join(',')})`);
// 2. Refuse
const before = v.reqs.length;
await v.p.click('[data-consent="deny"]'); await v.p.waitForTimeout(1500);
let names = (await ctx.cookies()).filter((c) => /tokenhealthscan|localhost/.test(c.domain)).map((c) => c.name);
check(names.includes('ths_consent') && !names.some((n) => /^_ga|^_clck|^_clsk/.test(n)), `Refuse clears _ga/_clck/_clsk (cookies: ${names.join(',')})`);
v = await visit(ctx, '/token/jup');
names = v.cookies;
const ga = v.reqs.filter((r) => /g\/collect/.test(r.u));
check(ga.length > 0 && ga.every((r) => /gcs=G100/.test(r.u)), `after Refuse GA4 still collects, cookieless (gcs=G100, ${ga.length} hits)`);
check(!names.some((n) => /^_ga|^_clck|^_clsk|^_ttp|^ttcsid|^_rdt|^_twclid|^muc_ads/.test(n)), `after Refuse, next page: no tool cookies (cookies: ${names.join(',')})`);
check(!(await v.p.locator('[data-consent-bar]').isVisible()), 'the bar stays closed after a choice');
const pix = v.reqs.filter((r) => PIX.test(r.u)).map((r) => r.u.slice(0, 60));
check(pix.length === 0, `after Refuse no pixel request (${pix.length}: ${pix.slice(0, 2).join(' ')})`);
await ctx.close();
// 3. Accept
ctx = await b.newContext({ userAgent: UA });
v = await visit(ctx, '/', async (p) => p.click('[data-consent="allow"]'));
v = await visit(ctx, '/pricing');
check(v.cookies.includes('ths_consent') && v.cookies.includes('_ga'), `after Accept: cookies set (${v.cookies.join(',')})`);
check(v.reqs.filter((r) => /g\/collect/.test(r.u)).every((r) => /gcs=G111/.test(r.u)), 'after Accept GA4 runs with storage granted (gcs=G111)');
await b.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS'); process.exit(fails ? 1 : 0);
