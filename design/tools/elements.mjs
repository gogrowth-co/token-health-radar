// Element-state crop rig — captures every UI primitive variant in every interaction state.
// Usage: node design/tools/elements.mjs '<targets-json-path>' '<outDir>' [theme]
// targets: [{id, url, selector, nth?, states?:[...], pad?}]  states ⊆ default|hover|focus|active|disabled
// Output: <outDir>/<id>.<theme>.<state>.png  +  <outDir>/index.json
import pkg from '/Users/gabrielmangabeira/Documents/Gabriel Mangabeira/marketing/node_modules/playwright/index.js';
const { chromium } = pkg;
import fs from 'fs';
import path from 'path';

const targets = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const OUT = process.argv[3];
const THEMES = (process.argv[4] || 'dark,light').split(',');
fs.mkdirSync(OUT, { recursive: true });

const b = await chromium.launch();
const index = [];
const byUrl = {};
for (const t of targets) (byUrl[t.url] ||= []).push(t);

for (const theme of THEMES) {
  for (const [url, list] of Object.entries(byUrl)) {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    await page.addInitScript(t => { try { localStorage.setItem('theme', t); } catch {} }, theme);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(url.includes('127.0.0.1') ? 3000 : 7000);
    } catch (e) { for (const t of list) index.push({ id: t.id, theme, ok: false, error: 'nav:' + String(e).slice(0, 80) }); await ctx.close(); continue; }

    for (const t of list) {
      const states = t.states || ['default', 'hover', 'focus', 'active'];
      let loc;
      try {
        loc = page.locator(t.selector).nth(t.nth || 0);
        await loc.waitFor({ state: 'visible', timeout: 8000 });
        await loc.scrollIntoViewIfNeeded();
        await page.waitForTimeout(150);
      } catch (e) { index.push({ id: t.id, theme, ok: false, error: 'locate:' + String(e).slice(0, 80) }); continue; }

      const cs = await loc.evaluate(el => { const s = getComputedStyle(el); const r = el.getBoundingClientRect();
        return { tag: el.tagName.toLowerCase(), cls: (typeof el.className === 'string' ? el.className : '').slice(0, 160),
          w: Math.round(r.width), h: Math.round(r.height), bg: s.backgroundColor, fg: s.color, border: s.borderTopWidth + ' ' + s.borderTopColor,
          radius: s.borderRadius, font: s.fontFamily.split(',')[0], size: s.fontSize, weight: s.fontWeight, pad: s.padding, shadow: s.boxShadow }; });

      for (const st of states) {
        try {
          if (st === 'hover') await loc.hover({ force: true });
          else if (st === 'focus') await loc.focus();
          else if (st === 'active') { await loc.hover({ force: true }); await page.mouse.down(); }
          else if (st === 'disabled') await loc.evaluate(el => { el.setAttribute('disabled', ''); el.classList.add('disabled'); });
          await page.waitForTimeout(220);
          const pad = t.pad ?? 8;
          const box = await loc.boundingBox();
          if (!box) throw new Error('no box');
          const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: Math.min(1440, box.width + pad * 2), height: Math.min(900, box.height + pad * 2) };
          const file = `${t.id}.${theme}.${st}.png`;
          await page.screenshot({ path: path.join(OUT, file), clip, animations: 'disabled' });
          const live = await loc.evaluate(el => { const s = getComputedStyle(el); return { bg: s.backgroundColor, fg: s.color, border: s.borderTopColor, shadow: s.boxShadow, outline: s.outlineStyle + ' ' + s.outlineColor }; });
          index.push({ id: t.id, theme, state: st, ok: true, file, computed: st === 'default' ? cs : live });
          if (st === 'active') await page.mouse.up();
          if (st === 'disabled') await loc.evaluate(el => { el.removeAttribute('disabled'); el.classList.remove('disabled'); });
          if (st === 'focus') await loc.evaluate(el => el.blur());
          if (st === 'hover') await page.mouse.move(0, 0);
        } catch (e) { index.push({ id: t.id, theme, state: st, ok: false, error: String(e).slice(0, 90) }); }
      }
    }
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
const ok = index.filter(i => i.ok).length;
console.log(JSON.stringify({ total: index.length, ok, failed: index.length - ok }));
