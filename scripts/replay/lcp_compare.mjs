// Real-browser LCP on tokenhealthscan.com, third-party scripts allowed vs blocked (rule 4 of manga-os-v4 docs/standards/third-party-scripts.md).
//   node scripts/replay/lcp_compare.mjs [runs=5] [url ...]   (needs playwright; CHROME_EXE defaults to the installed Google Chrome)
// Phone 390 px, Slow 4G (150 ms RTT, 1.6 Mbit/s down, 750 kbit/s up) and CPU x4 through CDP, a fresh context per load (cold cache).
// "blocked" aborts every request to a tag, analytics or pixel host, so the difference is what the scripts cost the largest paint.
import { chromium } from 'playwright';

const exe = process.env.CHROME_EXE ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const runs = Number(process.argv[2] ?? 5);
const urls = process.argv.slice(3).length ? process.argv.slice(3) : [
  'https://tokenhealthscan.com/', 'https://tokenhealthscan.com/token/jup', 'https://tokenhealthscan.com/pricing'];
export const TAG_HOSTS = /googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net|google\.com(\.[a-z]{2})?\/(ads|pagead|ccm)|clarity\.ms|bing\.com|tiktok\.com|tiktokw\.us|reddit\.com|redditstatic\.com|ads-twitter\.com|t\.co\/|twitter\.com|x\.com\/|cloudflareinsights\.com/;
const b = await chromium.launch({ executablePath: exe });
const median = (a) => { const s = [...a].filter((x) => x != null).sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const url of urls) {
  const res = { allowed: [], blocked: [] };
  for (let i = 0; i < runs; i++) for (const mode of ['allowed', 'blocked']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'en-US' });
    if (mode === 'blocked') await ctx.route((u) => TAG_HOSTS.test(u.href), (r) => r.abort());
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8, uploadThroughput: 750e3 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await p.goto(url + (url.includes('?') ? '&' : '?') + 'lcp=' + Date.now() + i, { waitUntil: 'load', timeout: 120000 });
    await p.waitForTimeout(4000);   // the loader fires after load, two frames and idle: give a late LCP candidate time to show
    const lcp = await p.evaluate(() => new Promise((r) => { let v = null; new PerformanceObserver((l) => { const e = l.getEntries().pop(); if (e) v = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); setTimeout(() => r(v), 200); }));
    res[mode].push(lcp == null ? null : lcp / 1000);
    await ctx.close();
  }
  const a = median(res.allowed), k = median(res.blocked);
  const f = (x) => (x == null ? 'n/a' : x.toFixed(2));
  console.log(`${url}\n  LCP median allowed ${f(a)} s, blocked ${f(k)} s, cost ${f(a - k)} s  [allowed ${res.allowed.map(f).join(' ')} | blocked ${res.blocked.map(f).join(' ')}]`);
}
await b.close();
