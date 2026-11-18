// Consent replay: node scripts/replay/consent_replay.mjs https://tokenhealthscan.com   (needs playwright; CHROME_EXE = a Chrome/Chromium binary)
// The THS consent model (manga-os-v4 docs/standards/third-party-scripts.md, the EkkoGreen opt-out model; Gabriel 2026-11-18):
//   outside the EU/EEA/UK/CH list: opt-out, every tag from the first visit, a notice with Decline / OK;
//   inside it: no cookies before Accept, THS's own Accept/Decline bar; Decline everywhere: no cookies on this and every later page,
//   GA4 and Clarity keep measuring cookieless, the TikTok, Reddit and X pixels stop.
// An EU visitor is simulated with a European device time zone and Cloudflare's /cdn-cgi/trace answering an EU country (the page's
// own two signals); Google's IP-based region default cannot be moved from here, so the GA4 checks read the gcs value the page sends.
import { chromium } from 'playwright';

const base = (process.argv[2] || 'https://tokenhealthscan.com').replace(/\/$/, '');
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE });
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`); if (!ok) fails++; };
const PIX = /analytics\.tiktok\.com\/api|analytics-ipv6\.tiktokw\.us|alb\.reddit\.com\/rp|t\.co\/1\/i\/adsct|analytics\.twitter\.com\/1\/i\/adsct|ads-twitter\.com\/uwt/;
const GA = /\/g\/collect/;
const CLARITY = /clarity\.ms\/collect/;
const TOOL = /^(_ga|_gid|_clck|_clsk|_ttp|ttcsid|_tt_enable_cookie|_rdt|_twclid|muc_ads)/;
const host = new URL(base).hostname;
const firstParty = async (ctx) => (await ctx.cookies()).filter((c) => c.domain.replace(/^\./, '').endsWith(host.replace(/^www\./, '')) || c.domain === host).map((c) => c.name);
const tools = (names) => names.filter((n) => TOOL.test(n));

async function newCtx({ timezoneId = 'America/Sao_Paulo', loc = null } = {}) {
  const ctx = await b.newContext({ userAgent: UA, timezoneId, viewport: { width: 390, height: 844 } });
  if (loc) await ctx.route('**/cdn-cgi/trace', (r) => r.fulfill({ status: 200, contentType: 'text/plain', body: `fl=0\nh=${host}\nloc=${loc}\n` }));
  return ctx;
}

// open a page and record every request with its time; wait without any interaction
async function open(ctx, path = '/') {
  const p = await ctx.newPage();
  const reqs = [];
  p.on('request', (r) => reqs.push({ t: Date.now(), u: r.url() }));
  await p.addInitScript(() => {
    window.__lcp = 0;
    new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await p.goto(base + path, { waitUntil: 'load' });
  const loadAt = Date.now();
  await p.waitForTimeout(8000);
  return { p, reqs, loadAt };
}
const since = (reqs, t, re) => reqs.filter((r) => r.t >= t && re.test(r.u));
const gcs = (u) => (/[?&]gcs=([^&]+)/.exec(u) || [])[1] || '?';
const barMode = async (p) => (await p.locator('[data-consent-bar]').count()) ? p.locator('[data-consent-bar]').getAttribute('data-consent-bar') : null;

// 1. outside the list (this machine's IP, a Brazilian time zone): opt-out, timing with no interaction
console.log('-- outside the EU/EEA/UK/CH list, fresh visitor, no interaction');
let ctx = await newCtx();
let v = await open(ctx);
const gtm = v.reqs.find((r) => /gtm\.js\?id=GTM-P84WRMG9/.test(r.u));
const nav = await v.p.evaluate(() => ({ origin: performance.timeOrigin, lcp: window.__lcp }));
check(!!gtm && gtm.t >= v.loadAt - 50, `GTM loads after the load event with no interaction (${gtm ? gtm.t - v.loadAt : 'none'} ms after load)`);
check(!!gtm && nav.lcp > 0 && nav.origin + nav.lcp <= gtm.t, `the largest paint comes before GTM (LCP ${Math.round(nav.lcp)} ms, GTM at ${gtm ? Math.round(gtm.t - nav.origin) : '?'} ms)`);
let ga = since(v.reqs, 0, GA);
check(ga.length > 0 && ga.every((r) => gcs(r.u) === 'G111'), `GA4 collects with storage granted (gcs ${[...new Set(ga.map((r) => gcs(r.u)))].join(',') || 'none'})`);
check(since(v.reqs, 0, CLARITY).length > 0, 'Clarity records');
check(since(v.reqs, 0, PIX).length > 0, `the pixels run before any choice (${since(v.reqs, 0, PIX).length} requests)`);
let names = await firstParty(ctx);
check(names.includes('_ga') && names.includes('_clck'), `opt-out: cookies from the first visit (${tools(names).join(',')})`);
check(await barMode(v.p) === 'notice', 'the notice (Decline / OK) is shown, not the Accept bar');
check(await v.p.locator('[data-consent-bar] [data-consent="deny"]').isVisible(), 'the notice offers Decline');

// 2. Decline on the same page, then a route change inside the app (no reload)
console.log('-- Decline, same document');
await v.p.click('[data-consent-bar] [data-consent="deny"]');
const declinedAt = Date.now();
await v.p.waitForTimeout(3000);
names = await firstParty(ctx);
check(names.includes('ths_consent') && tools(names).length === 0, `Decline clears every tool cookie at once (left: ${tools(names).join(',') || 'none'})`);
await v.p.evaluate(() => { history.pushState({}, '', '/pricing'); dispatchEvent(new PopStateEvent('popstate')); });
await v.p.waitForTimeout(2000);
await v.p.mouse.wheel(0, 600);
await v.p.waitForTimeout(5000);
names = await firstParty(ctx);
check(tools(names).length === 0, `after a route change: still no tool cookie (${tools(names).join(',') || 'none'})`);
const pixAfter = since(v.reqs, declinedAt + 500, PIX);
check(pixAfter.length === 0, `no pixel request after Decline on the same document (${pixAfter.length}: ${pixAfter.slice(0, 2).map((r) => r.u.slice(0, 60)).join(' ')})`);
ga = since(v.reqs, declinedAt + 200, GA);
check(ga.length > 0 && ga.every((r) => gcs(r.u) === 'G100'), `GA4 keeps collecting cookieless after Decline (gcs ${[...new Set(ga.map((r) => gcs(r.u)))].join(',') || 'none'}, ${ga.length} hits)`);
check(since(v.reqs, declinedAt + 200, CLARITY).length > 0, 'Clarity keeps recording after Decline');
await v.p.close();

// 3. the next page load, a returning refuser
console.log('-- Decline, every later page');
v = await open(ctx, '/token/jup');
names = await firstParty(ctx);
check(tools(names).length === 0, `next page: no tool cookie (${names.join(',')})`);
ga = since(v.reqs, 0, GA);
check(ga.length > 0 && ga.every((r) => gcs(r.u) === 'G100'), `next page: GA4 cookieless (gcs ${[...new Set(ga.map((r) => gcs(r.u)))].join(',') || 'none'})`);
check(since(v.reqs, 0, CLARITY).length > 0, 'next page: Clarity records without cookies');
check(since(v.reqs, 0, PIX).length === 0, `next page: no pixel request (${since(v.reqs, 0, PIX).length})`);
check(await barMode(v.p) === null, 'the bar stays closed after a choice');
check(await v.p.locator('[data-consent-link="allow"]').count() > 0, 'the footer link now offers to allow cookies again');
await ctx.close();

// 4. OK closes the notice and changes nothing else
console.log('-- OK');
ctx = await newCtx();
v = await open(ctx);
await v.p.click('[data-consent-bar] [data-consent="ok"]');
await v.p.close();
v = await open(ctx, '/pricing');
names = await firstParty(ctx);
check(await barMode(v.p) === null && names.includes('_ga'), `after OK: no notice on the next page, cookies continue (${tools(names).join(',')})`);
check(await v.p.locator('[data-consent-link="deny"]').count() > 0, 'after OK: the footer still offers Decline cookies');
await ctx.close();

// 5. inside the list: a European time zone and Cloudflare answering DE
console.log('-- inside the list (Europe/Berlin, loc=DE), no interaction');
ctx = await newCtx({ timezoneId: 'Europe/Berlin', loc: 'DE' });
v = await open(ctx);
names = await firstParty(ctx);
check(await barMode(v.p) === 'ask', 'the Accept / Decline bar asks');
check(tools(names).length === 0, `no tool cookie before Accept (${names.join(',')})`);
ga = since(v.reqs, 0, GA);
check(ga.length > 0 && ga.every((r) => gcs(r.u) === 'G100'), `GA4 collects cookieless before a choice (gcs ${[...new Set(ga.map((r) => gcs(r.u)))].join(',') || 'none'})`);
check(since(v.reqs, 0, CLARITY).length > 0, 'Clarity records without cookies before a choice');
check(since(v.reqs, 0, PIX).length === 0, `no pixel request before Accept (${since(v.reqs, 0, PIX).length})`);
await v.p.click('[data-consent-bar] [data-consent="deny"]');
await v.p.close();
v = await open(ctx, '/pricing');
names = await firstParty(ctx);
check(tools(names).length === 0 && since(v.reqs, 0, PIX).length === 0 && since(v.reqs, 0, GA).length > 0, `inside, Decline: next page no cookies, no pixels, GA4 still sends (${tools(names).join(',') || 'no tool cookie'})`);
await ctx.close();

// 6. inside, Accept
console.log('-- inside the list, Accept');
ctx = await newCtx({ timezoneId: 'Europe/Paris', loc: 'FR' });
v = await open(ctx);
const acceptedAt = Date.now();
await v.p.click('[data-consent-bar] [data-consent="allow"]');
await v.p.waitForTimeout(5000);
check(since(v.reqs, acceptedAt, PIX).length > 0, `Accept starts the pixels on the same document, no reload (${since(v.reqs, acceptedAt, PIX).length} requests)`);
names = await firstParty(ctx);
check(names.includes('_ga') && names.includes('_clck'), `Accept sets cookies on the same document (${tools(names).join(',')})`);
await v.p.close();
v = await open(ctx, '/pricing');
names = await firstParty(ctx);
check(names.includes('ths_consent') && names.includes('_ga') && names.includes('_clck'), `after Accept: cookies set (${tools(names).join(',')})`);
ga = since(v.reqs, 0, GA);
check(ga.length > 0 && ga.every((r) => gcs(r.u) === 'G111'), `after Accept GA4 runs with storage granted (gcs ${[...new Set(ga.map((r) => gcs(r.u)))].join(',') || 'none'})`);
check(since(v.reqs, 0, PIX).length > 0, `after Accept the pixels run (${since(v.reqs, 0, PIX).length} requests)`);
await ctx.close();

// 7. inside by Cloudflare's country only (a device set to New York, an IP in France)
console.log('-- inside by country only (America/New_York, loc=FR)');
ctx = await newCtx({ timezoneId: 'America/New_York', loc: 'FR' });
v = await open(ctx);
names = await firstParty(ctx);
check(await barMode(v.p) === 'ask', 'the Accept / Decline bar asks');
check(!names.some((n) => /^_clck|^_clsk|^_ttp|^ttcsid|^_rdt/.test(n)), `no Clarity or pixel cookie before Accept (${tools(names).join(',') || 'none'})`);
check(since(v.reqs, 0, PIX).length === 0, `no pixel request before Accept (${since(v.reqs, 0, PIX).length})`);
ga = since(v.reqs, 0, GA);
check(ga.length > 0 && ga.every((r) => gcs(r.u) === 'G100') && !names.some((n) => /^_ga/.test(n)), `GA4 cookieless before a choice (gcs ${[...new Set(ga.map((r) => gcs(r.u)))].join(',') || 'none'}; GA4 cookies: ${names.filter((n) => /^_ga/.test(n)).join(',') || 'none'})`);
await ctx.close();

await b.close();
console.log(fails ? `${fails} FAIL` : 'ALL PASS');
process.exit(fails ? 1 : 0);
