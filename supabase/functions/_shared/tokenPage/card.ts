// The token score card (og 1200x630, app hero background 1200x630, story 1080x1920), drawn as SVG and rasterised with resvg inside the
// edge function (2026-10-27): the same design scripts/render-hero-image.mjs drew with a headless browser on GitHub, without the browser.
import { initWasm, Resvg } from 'npm:@resvg/resvg-wasm@2.6.2';

export interface CardInput {
  name: string; symbol: string; chainLabel: string; logo: string | null;   // logo: a data: URI (fetched by the caller) or null
  overall: number | null; scores: Record<'security' | 'liquidity' | 'tokenomics' | 'community' | 'development', number | null>;
  price: string | null; mcap: string | null; date: string;
}

const DIMS = [['Security', 'security'], ['Liquidity', 'liquidity'], ['Tokenomics', 'tokenomics'], ['Community', 'community'], ['Development', 'development']] as const;
export const scoreColor = (n: number | null) => (n == null ? '#8b93a7' : n >= 70 ? '#34d399' : n >= 40 ? '#fbbf24' : '#f87171');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DASH = '–';

function background(w: number, h: number, id: string) {
  return `<defs>
    <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1120"/><stop offset=".55" stop-color="#0a0f1e"/><stop offset="1" stop-color="#0d1526"/></linearGradient>
    <radialGradient id="${id}g1" cx=".85" cy="-.1" r=".8"><stop offset="0" stop-color="#2563eb" stop-opacity=".28"/><stop offset=".6" stop-color="#2563eb" stop-opacity="0"/></radialGradient>
    <radialGradient id="${id}g2" cx="-.05" cy="1.1" r=".6"><stop offset="0" stop-color="#2563eb" stop-opacity=".14"/><stop offset=".55" stop-color="#2563eb" stop-opacity="0"/></radialGradient>
    <pattern id="${id}grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#788cb4" stroke-opacity=".07" stroke-width="1"/></pattern>
    <linearGradient id="${id}dot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#2563eb"/></linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#${id}bg)"/><rect width="${w}" height="${h}" fill="url(#${id}g1)"/><rect width="${w}" height="${h}" fill="url(#${id}g2)"/>
  <rect width="${w}" height="${h}" fill="url(#${id}grid)" opacity=".35"/>`;
}

function ring(cx: number, cy: number, r: number, stroke: number, value: number | null, size: number) {
  const c = 2 * Math.PI * r, frac = Math.max(0, Math.min(100, value ?? 0)) / 100, col = scoreColor(value);
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#788cb4" stroke-opacity=".12" stroke-width="${stroke}"/>
    ${value != null ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${cx} ${cy})"/>` : ''}
    <circle cx="${cx}" cy="${cy}" r="${r - stroke / 2}" fill="#0c1322"/>
    <text x="${cx}" y="${cy + size * 0.3}" text-anchor="middle" font-size="${size}" font-weight="800" fill="${col}" letter-spacing="-2">${value ?? DASH}</text>
    <text x="${cx}" y="${cy + size * 0.3 + size * 0.42}" text-anchor="middle" font-size="${Math.round(size * 0.26)}" font-weight="600" fill="#8b93a7">/100</text>`;
}

function bars(x: number, y: number, rowH: number, labelW: number, barW: number, fs: number, barH: number, scores: CardInput['scores']) {
  return DIMS.map(([label, key], i) => {
    const v = scores[key], yy = y + i * rowH, col = scoreColor(v);
    return `<text x="${x}" y="${yy + fs * 0.35}" font-size="${fs}" font-weight="600" fill="#aeb6c8">${label}</text>
      <rect x="${x + labelW}" y="${yy - barH / 2}" width="${barW}" height="${barH}" rx="${barH / 2}" fill="#788cb4" fill-opacity=".13"/>
      ${v != null && v > 0 ? `<rect x="${x + labelW}" y="${yy - barH / 2}" width="${(barW * v) / 100}" height="${barH}" rx="${barH / 2}" fill="${col}"/>` : ''}
      <text x="${x + labelW + barW + Math.round(fs * 2.9)}" y="${yy + fs * 0.35}" text-anchor="end" font-size="${fs + 1}" font-weight="800" fill="${col}">${v ?? DASH}</text>`;
  }).join('');
}

function chip(x: number, y: number, label: string, value: string, fs: number, h: number) {
  const w = Math.round((label.length + value.length + 1) * fs * 0.58 + 36);
  return { w, svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="#131b2e" fill-opacity=".85" stroke="#7896d2" stroke-opacity=".18"/>
    <text x="${x + 18}" y="${y + h / 2 + fs * 0.36}" font-size="${fs}" font-weight="600" fill="#aeb6c8">${esc(label)} <tspan fill="#e8ecf4">${esc(value)}</tspan></text>` };
}

/** The full social card (og:image, 1200x630). */
export function ogCardSvg(t: CardInput): string {
  const sym = esc(t.symbol.toUpperCase());
  let cx = 64; const chips: string[] = [];
  for (const [label, value] of [['Price', t.price], ['Market cap', t.mcap]] as const) {
    if (!value) continue; const c = chip(cx, 368, label, value, 19, 42); chips.push(c.svg); cx += c.w + 14;
  }
  const scanned = chip(64, t.price || t.mcap ? 424 : 368, 'Scanned', t.date, 19, 42);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Inter">
  ${background(1200, 630, 'o')}
  <text x="1170" y="690" text-anchor="end" font-size="250" font-weight="800" fill="#7896d2" fill-opacity=".055" letter-spacing="-10">${sym}</text>
  <rect x="64" y="166" width="34" height="34" rx="10" fill="url(#odot)"/><text x="81" y="190" text-anchor="middle" font-size="19" font-weight="800" fill="#fff">T</text>
  <text x="110" y="191" font-size="22" font-weight="700" fill="#e8ecf4">TokenHealthScan</text>
  ${t.logo ? `<clipPath id="ologo"><circle cx="102" cy="292" r="38"/></clipPath><circle cx="102" cy="292" r="39" fill="#131b2e" stroke="#7896d2" stroke-opacity=".25" stroke-width="2"/><image href="${t.logo}" x="64" y="254" width="76" height="76" clip-path="url(#ologo)" preserveAspectRatio="xMidYMid slice"/>` : ''}
  <text x="${t.logo ? 160 : 64}" y="290" font-size="44" font-weight="800" fill="#e8ecf4" letter-spacing="-1">${esc(t.name.length > 18 ? t.name.slice(0, 17) + '…' : t.name)}</text>
  <text x="${t.logo ? 160 : 64}" y="324" font-size="22" font-weight="600" fill="#8b93a7">$${sym} · ${esc(t.chainLabel)}</text>
  ${chips.join('')}${scanned.svg}
  <text x="64" y="594" font-size="18" font-weight="600" fill="#66708a">tokenhealthscan.com/token/${esc(t.symbol.toLowerCase())} · independent 5-dimension risk audit</text>
  ${ring(690, 300, 102, 14, t.overall, 78)}
  <text x="690" y="440" text-anchor="middle" font-size="17" font-weight="700" fill="#8b93a7" letter-spacing="2.4">HEALTH SCORE</text>
  ${bars(840, 245, 31, 136, 112, 19, 10, t.scores)}
</svg>`;
}

/** The app's hero background (1200x630): ring and bars on the right, the left zone kept clear for the app's own text. */
export function heroBgSvg(t: CardInput): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" font-family="Inter">
  ${background(1200, 630, 'h')}
  <text x="24" y="170" font-size="230" font-weight="800" fill="#7896d2" fill-opacity=".05" letter-spacing="-9">${esc(t.symbol.toUpperCase())}</text>
  ${ring(700, 300, 92, 13, t.overall, 70)}
  <text x="700" y="428" text-anchor="middle" font-size="15" font-weight="700" fill="#8b93a7" letter-spacing="2">HEALTH SCORE</text>
  ${bars(836, 255, 26, 118, 140, 17, 9, t.scores)}
</svg>`;
}

/** The vertical story card (1080x1920). */
export function storySvg(t: CardInput): string {
  const sym = esc(t.symbol.toUpperCase());
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920" font-family="Inter">
  ${background(1080, 1920, 's')}
  <text x="540" y="1960" text-anchor="middle" font-size="280" font-weight="800" fill="#7896d2" fill-opacity=".055" letter-spacing="-11">${sym}</text>
  <rect x="425" y="110" width="44" height="44" rx="12" fill="url(#sdot)"/><text x="447" y="141" text-anchor="middle" font-size="24" font-weight="800" fill="#fff">T</text>
  <text x="483" y="143" font-size="30" font-weight="700" fill="#e8ecf4">TokenHealthScan</text>
  ${t.logo ? `<clipPath id="slogo"><circle cx="540" cy="300" r="60"/></clipPath><circle cx="540" cy="300" r="61" fill="#131b2e" stroke="#7896d2" stroke-opacity=".25" stroke-width="3"/><image href="${t.logo}" x="480" y="240" width="120" height="120" clip-path="url(#slogo)" preserveAspectRatio="xMidYMid slice"/>` : ''}
  <text x="540" y="440" text-anchor="middle" font-size="64" font-weight="800" fill="#e8ecf4" letter-spacing="-1">${esc(t.name.length > 20 ? t.name.slice(0, 19) + '…' : t.name)}</text>
  <text x="540" y="492" text-anchor="middle" font-size="32" font-weight="600" fill="#8b93a7">$${sym} · ${esc(t.chainLabel)}</text>
  ${ring(540, 740, 160, 20, t.overall, 120)}
  <text x="540" y="966" text-anchor="middle" font-size="24" font-weight="700" fill="#8b93a7" letter-spacing="3.8">HEALTH SCORE</text>
  ${bars(150, 1060, 64, 210, 470, 30, 16, t.scores)}
  ${(() => { const w = chip(0, 0, 'Scanned', t.date, 27, 58).w; return chip(Math.round(540 - w / 2), 1440, 'Scanned', t.date, 27, 58).svg; })()}
  <text x="540" y="1864" text-anchor="middle" font-size="26" font-weight="600" fill="#66708a">tokenhealthscan.com/token/${esc(t.symbol.toLowerCase())}</text>
</svg>`;
}

let ready: Promise<Uint8Array[]> | null = null;
const FONT_BASE = 'https://cdn.jsdelivr.net/fontsource/fonts/inter@5.0.18/latin-';
/** Load resvg's wasm and the Inter faces once per isolate. */
function load(): Promise<Uint8Array[]> {
  ready ??= (async () => {
    await initWasm(fetch('https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm'));
    return Promise.all(['600', '700', '800'].map(async (w) => {
      const r = await fetch(`${FONT_BASE}${w}-normal.ttf`);
      if (!r.ok) throw new Error(`font ${w} answered ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    }));
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

/** SVG to PNG at `scale` (the browser renderer drew the 1200x630 cards at device scale 2). */
export async function svgToPng(svg: string, scale = 2): Promise<Uint8Array> {
  const fontBuffers = await load();
  const r = new Resvg(svg, { fitTo: { mode: 'zoom', value: scale }, font: { fontBuffers, defaultFontFamily: 'Inter', loadSystemFonts: false } });
  const png = r.render().asPng();
  r.free();
  return png;
}
