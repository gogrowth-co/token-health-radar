// THS element-atlas capture rig — P2/P4 of the redesign blueprint plan.
// Usage: node design/tools/capture.mjs '<config-json>'
// Config: { url, slug, type, outPng, outJson, breakpoints?, themes?, states?,
//           storageState?, settleMs? }
// Produces, per breakpoint × theme × state:
//   PNG  → <outPng>/<slug>.<bp>.<state>.<theme>.png        (full page)
//   JSON → <outJson>/<slug>.<bp>.<state>.<theme>.json      (element map)
// Never prints env values. Playwright resolved from the marketing workspace.

import pkg from '/Users/gabrielmangabeira/Documents/Gabriel Mangabeira/marketing/node_modules/playwright/index.js';
const { chromium } = pkg;
import fs from 'fs';
import path from 'path';

const cfg = JSON.parse(process.argv[2]);
const BPS = cfg.breakpoints ?? [{ w: 375, h: 812, name: '375' }, { w: 768, h: 1024, name: '768' }, { w: 1440, h: 900, name: '1440' }];
const THEMES = cfg.themes ?? ['light', 'dark'];
const STATES = cfg.states ?? ['default'];
const SETTLE = cfg.settleMs ?? 2500;

fs.mkdirSync(cfg.outPng, { recursive: true });
fs.mkdirSync(cfg.outJson, { recursive: true });

const ROLE_RULES = [
  ['nav',        el => el.closest('nav') !== null],
  ['footer',     el => el.closest('footer') !== null],
  ['heading',    el => /^H[1-6]$/.test(el.tagName)],
  ['cta',        el => (el.tagName === 'A' || el.tagName === 'BUTTON') && el.offsetWidth > 60],
  ['input',      el => ['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)],
  ['image',      el => ['IMG', 'SVG', 'CANVAS', 'VIDEO'].includes(el.tagName)],
  ['data',       el => /\btabular-nums\b|font-mono/.test(el.className || '') || el.tagName === 'TABLE'],
  ['card',       el => /\b(card|panel)\b/i.test(el.className || '')],
  ['badge',      el => /\b(badge|chip|pill|tag)\b/i.test(el.className || '')],
  ['text',       () => true],
];

async function setTheme(page, theme, mechanism) {
  // mechanism injected before nav; default = class-on-html + localStorage('theme')
  await page.addInitScript(([t, m]) => {
    try {
      localStorage.setItem(m?.storageKey || 'theme', t);
    } catch {}
  }, [theme, mechanism]);
}

async function applyState(page, state) {
  if (state === 'loading') {
    // hold all supabase/api responses so skeletons persist
    await page.route(/supabase\.co|functions\/v1|api\./, r => { /* never fulfil */ });
  } else if (state === 'error') {
    await page.route(/supabase\.co\/rest|functions\/v1/, r =>
      r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"synthetic"}' }));
  }
}

async function extractElements(page) {
  return page.evaluate(() => {
    const roleOf = el => {
      if (el.closest('nav')) return 'nav';
      if (el.closest('footer')) return 'footer';
      if (/^H[1-6]$/.test(el.tagName)) return 'heading';
      if ((el.tagName === 'A' || el.tagName === 'BUTTON') && el.offsetWidth > 60) return 'cta';
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return 'input';
      if (['IMG', 'SVG', 'CANVAS', 'VIDEO'].includes(el.tagName)) return 'image';
      if (el.tagName === 'TABLE' || /font-mono|tabular-nums/.test(el.className && el.className.baseVal !== undefined ? '' : el.className || '')) return 'data';
      if (/\b(card|panel)\b/i.test(typeof el.className === 'string' ? el.className : '')) return 'card';
      if (/\b(badge|chip|pill|tag)\b/i.test(typeof el.className === 'string' ? el.className : '')) return 'badge';
      return 'text';
    };
    const cssPath = el => {
      const bits = [];
      let n = el;
      while (n && n !== document.body && bits.length < 5) {
        let s = n.tagName.toLowerCase();
        if (n.id) { bits.unshift(`#${n.id}`); break; }
        const cls = (typeof n.className === 'string' ? n.className : '').trim().split(/\s+/).filter(c => c && !c.startsWith('css-'))[0];
        if (cls) s += `.${CSS.escape(cls)}`;
        bits.unshift(s);
        n = n.parentElement;
      }
      return bits.join(' > ');
    };
    const seen = new Set();
    const out = [];
    const walk = (root) => {
      for (const el of root.querySelectorAll('*')) {
        if (out.length >= 400) return;
        const r = el.getBoundingClientRect();
        if (r.width < 8 || r.height < 8) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
        // keep leaf-ish + structural elements only: skip pure wrappers
        const isLeafish = el.children.length === 0 ||
          ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'IMG', 'SVG', 'TABLE', 'NAV', 'FOOTER', 'HEADER', 'SECTION', 'ARTICLE', 'FORM'].includes(el.tagName) ||
          /^H[1-6]$/.test(el.tagName);
        if (!isLeafish) continue;
        const key = `${el.tagName}|${Math.round(r.x)}|${Math.round(r.y)}|${Math.round(r.width)}|${Math.round(r.height)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
          role: roleOf(el),
          tag: el.tagName.toLowerCase(),
          selector: cssPath(el),
          text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('alt') || '').trim().slice(0, 80) || null,
          bbox: { x: Math.round(r.x + scrollX), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height) },
          typography: { family: cs.fontFamily.split(',')[0].replace(/"/g, ''), size: cs.fontSize, weight: cs.fontWeight, lh: cs.lineHeight, ls: cs.letterSpacing },
          colors: { fg: cs.color, bg: cs.backgroundColor, border: cs.borderTopWidth !== '0px' ? cs.borderTopColor : null, radius: cs.borderRadius },
          component: null, // filled post-hoc by mapping pass against component-inventory
          cobaltTarget: null, // filled by P5 design-system pass
        });
      }
    };
    walk(document.body);
    return { count: out.length, elements: out };
  });
}

const b = await chromium.launch();
const results = [];
for (const bp of BPS) {
  for (const theme of THEMES) {
    for (const state of STATES) {
      const ctx = await b.newContext({
        viewport: { width: bp.w, height: bp.h },
        deviceScaleFactor: 2,
        ...(cfg.storageState ? { storageState: cfg.storageState } : {}),
      });
      const page = await ctx.newPage();
      try {
        await setTheme(page, theme, cfg.themeMechanism);
        await applyState(page, state);
        await page.goto(cfg.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForTimeout(state === 'loading' ? 1500 : SETTLE);
        // pre-scroll to trigger lazy content, return to top
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 900) { scrollTo(0, y); await new Promise(r => setTimeout(r, 90)); }
          scrollTo(0, 0);
        });
        await page.waitForTimeout(400);
        const base = `${cfg.slug}.${bp.name}.${state}.${theme}`;
        await page.screenshot({ path: path.join(cfg.outPng, base + '.png'), fullPage: true, animations: 'disabled' });
        const map = await extractElements(page);
        const doc = {
          route: cfg.url, slug: cfg.slug, type: cfg.type,
          breakpoint: bp.name, state, theme,
          capturedAt: cfg.now || null,
          pageTitle: await page.title(),
          pageHeight: await page.evaluate(() => document.body.scrollHeight),
          ...map,
        };
        fs.writeFileSync(path.join(cfg.outJson, base + '.json'), JSON.stringify(doc, null, 1));
        results.push({ base, ok: true, elements: map.count, height: doc.pageHeight });
      } catch (e) {
        results.push({ base: `${cfg.slug}.${bp.name}.${state}.${theme}`, ok: false, error: String(e).slice(0, 160) });
      } finally {
        await ctx.close();
      }
    }
  }
}
await b.close();
console.log(JSON.stringify(results, null, 1));
