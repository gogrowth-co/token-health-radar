// Crops every [data-id] cell from the regenerated Cobalt catalog, dark + light, at 2×.
// Usage: node design/tools/elements-new.mjs <outDir>
import pkg from '/Users/gabrielmangabeira/Documents/Gabriel Mangabeira/marketing/node_modules/playwright/index.js';
const { chromium } = pkg;
import fs from 'fs';
import path from 'path';
const OUT = process.argv[2]; fs.mkdirSync(OUT, { recursive: true });
const FILE = 'file:///Users/gabrielmangabeira/Documents/token-health-radar/design/reference/elements-cobalt.html';
const b = await chromium.launch();
const index = [];
for (const theme of ['dark', 'light']) {
  const page = await b.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 2 });
  await page.goto(FILE + (theme === 'light' ? '#light' : ''), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const ids = await page.$$eval('[data-id]', els => els.map(e => e.dataset.id));
  for (const id of ids) {
    const loc = page.locator(`[data-id="${id}"]`);
    await loc.scrollIntoViewIfNeeded();
    const file = `${id}.${theme}.png`;
    await loc.screenshot({ path: path.join(OUT, file), animations: 'disabled' });
    const meta = await loc.evaluate(el => {
      const first = el.querySelector('.el > *'); const s = first ? getComputedStyle(first) : null;
      return { label: el.querySelector('.lab')?.textContent, sample: s ? { bg: s.backgroundColor, fg: s.color, border: s.borderTopWidth + ' ' + s.borderTopColor, radius: s.borderRadius, font: s.fontFamily.split(',')[0], size: s.fontSize, weight: s.fontWeight } : null };
    });
    index.push({ id, theme, file, ...meta });
  }
  await page.close();
}
await b.close();
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
console.log(JSON.stringify({ crops: index.length }));
