// Canonical replay (2026-11-18): node scripts/replay/canonical_replay.mjs https://tokenhealthscan.com  (needs playwright; CHROME_EXE)
// Chrome UA after hydration: every canonical, the title; then the Googlebot HTML for the same routes.
import { chromium } from 'playwright';
const base = process.argv[2] || 'https://tokenhealthscan.com';
const routes = (process.argv[3] || '/,/token/jup,/publications/best-token-scanners,/ethereum-launchpads,/pricing').split(',');
const b = await chromium.launch({ executablePath: process.env.CHROME_EXE });
const ctx = await b.newContext({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36' });
let bad = 0;
for (const r of routes) {
  const p = await ctx.newPage();
  await p.goto(base + r, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const c = await p.$$eval('link[rel="canonical"]', (ls) => ls.map((l) => l.getAttribute('href')));
  const t = await p.title();
  const want = 'https://tokenhealthscan.com' + (r === '/' ? '/' : r);
  const ok = c.length === 1 && c[0] === want;
  if (!ok) bad++;
  const g = await (await fetch(base + r, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' } })).text();
  const gc = [...g.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${r}\n  browser canonical(s): ${JSON.stringify(c)} title: ${t}\n  googlebot canonical(s): ${JSON.stringify(gc)} title: ${(g.match(/<title>([^<]*)/) || [])[1]}`);
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
