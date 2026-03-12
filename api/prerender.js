/**
 * Vercel Serverless Function — Bot Prerender
 *
 * Handles bot/crawler requests for token pages and static pages.
 * Returns data-driven HTML without needing a headless browser.
 *
 * Referenced in vercel.json routes:
 *   /token/:id  → /api/prerender?token=$1
 *   /token-scan-guide, /solana-launchpads, etc. → /api/prerender
 *
 * Env vars (Vercel dashboard or .env):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const SITE_URL = 'https://tokenhealthscan.com';

const STATIC_PAGES = {
  '/token-scan-guide': {
    title: 'How to Read a Token Health Scan | Complete Guide',
    description: 'Learn to interpret token health scores, understand security risks, and evaluate liquidity, tokenomics, community, and development scores.',
    h1: 'How to Read a Token Health Scan',
  },
  '/solana-launchpads': {
    title: 'Solana Launchpads Directory 2025 | Token Health Scan',
    description: 'Curated directory of Solana launchpads. Compare vetting standards, community size, and investor protections.',
    h1: 'Solana Launchpads Directory',
  },
  '/ethereum-launchpads': {
    title: 'Ethereum Launchpads Directory 2025 | Token Health Scan',
    description: 'Curated directory of Ethereum IDO launchpads. Compare smart contract audits and investor protections.',
    h1: 'Ethereum Launchpads Directory',
  },
  '/token-sniffer-comparison': {
    title: 'Token Health Scan vs TokenSniffer Comparison',
    description: 'Side-by-side feature comparison of Token Health Scan and TokenSniffer.',
    h1: 'Token Health Scan vs TokenSniffer',
  },
};

module.exports = async function handler(req, res) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(500).json({ error: 'SUPABASE_URL and SUPABASE_ANON_KEY env vars required' });
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Token page: /api/prerender?token=aave
  const tokenSymbol = req.query.token;
  if (tokenSymbol) {
    return serveTokenPage(tokenSymbol.toLowerCase(), supabase, res);
  }

  // Static page: derive from Referer or x-matched-path header
  const matchedPath = req.headers['x-matched-path'] || req.headers['x-vercel-id'] || '';
  const pageKey = Object.keys(STATIC_PAGES).find(k => matchedPath.includes(k));
  if (pageKey) {
    return serveStaticPage(pageKey, res);
  }

  // Fallback
  res.status(200).setHeader('Content-Type', 'text/html').send(buildMinimalHTML(
    'Token Health Scan',
    'Analyze any crypto token\'s health across security, liquidity, tokenomics, community, and development.',
    '/',
  ));
};

async function serveTokenPage(symbol, supabase, res) {
  const { data: rows, error } = await supabase
    .from('token_reports')
    .select('*')
    .ilike('token_symbol', symbol)
    .limit(1);

  if (error || !rows || rows.length === 0) {
    res.status(404).setHeader('Content-Type', 'text/html').send(buildMinimalHTML(
      'Token Not Found | Token Health Scan',
      `No report found for ${symbol.toUpperCase()}.`,
      `/token/${symbol}`,
    ));
    return;
  }

  const token = rows[0];
  const html = buildTokenHTML(token, symbol);

  res
    .status(200)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
    .send(html);
}

function serveStaticPage(path, res) {
  const page = STATIC_PAGES[path];
  const html = buildMinimalHTML(page.title, page.description, path, page.h1);
  res
    .status(200)
    .setHeader('Content-Type', 'text/html; charset=utf-8')
    .setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400')
    .send(html);
}

function buildTokenHTML(token, symbol) {
  const name = token.token_name || token.name || symbol.toUpperCase();
  const sym = (token.token_symbol || symbol).toUpperCase();
  const overallScore = token.overall_score ?? token.score ?? 'N/A';
  const securityScore = token.security_score ?? 'N/A';
  const liquidityScore = token.liquidity_score ?? 'N/A';
  const tokenomicsScore = token.tokenomics_score ?? 'N/A';
  const communityScore = token.community_score ?? 'N/A';
  const devScore = token.dev_score ?? token.development_score ?? 'N/A';
  const aiAnalysis = token.ai_analysis || token.report_content || '';
  const heroImage = token.hero_image_url || `${SITE_URL}/og-default.png`;
  const price = token.price ? `$${parseFloat(String(token.price)).toFixed(6)}` : '';
  const chain = token.chain || 'ethereum';
  const address = token.token_address || token.contract_address || '';
  const canonical = `${SITE_URL}/token/${symbol}`;
  const title = `${sym} Token Risk Analysis — ${new Date().getFullYear()} Health Scan | Token Health Scan`;
  const description = `${name} (${sym}) health score: ${overallScore}/100. Security: ${securityScore}, Liquidity: ${liquidityScore}, Tokenomics: ${tokenomicsScore}. Full AI-powered risk analysis.`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}"/>
  <meta name="robots" content="index,follow"/>
  <link rel="canonical" href="${canonical}"/>
  <meta property="og:title" content="${esc(title)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:url" content="${canonical}"/>
  <meta property="og:image" content="${esc(heroImage)}"/>
  <meta property="og:image:width" content="1200"/>
  <meta property="og:image:height" content="630"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <meta name="twitter:site" content="@tokenhealthscan"/>
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Token Directory', item: `${SITE_URL}/token` },
      { '@type': 'ListItem', position: 3, name: `${sym} Risk Analysis`, item: canonical },
    ],
  })}</script>
  <style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#0a0a0f;color:#e5e7eb}a{color:#7c3aed}h1{font-size:2rem}h2{color:#c4b5fd}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin:1.5rem 0}.card{background:#1a1a2e;border-radius:8px;padding:1rem;text-align:center}.val{font-size:2rem;font-weight:700}.lbl{font-size:.8rem;color:#9ca3af}.good .val{color:#22c55e}.med .val{color:#f59e0b}.bad .val{color:#ef4444}.analysis{background:#1a1a2e;border-radius:8px;padding:1.5rem;margin:1.5rem 0;line-height:1.6}</style>
</head>
<body>
  <nav style="font-size:.9em;margin-bottom:1.5rem;color:#9ca3af">
    <a href="${SITE_URL}">Token Health Scan</a> &rsaquo; <a href="${SITE_URL}/token">Token Directory</a> &rsaquo; ${esc(sym)}
  </nav>
  <main>
    <h1>${esc(name)} (${esc(sym)}) Risk Analysis</h1>
    <p style="color:#9ca3af">${price ? `Price: <strong style="color:#e5e7eb">${esc(price)}</strong> · ` : ''}Last updated: ${String(token.updated_at || token.created_at || '').split('T')[0]}</p>
    <div class="grid">
      ${scoreCard('Overall', overallScore)}
      ${scoreCard('Security', securityScore)}
      ${scoreCard('Liquidity', liquidityScore)}
      ${scoreCard('Tokenomics', tokenomicsScore)}
      ${scoreCard('Community', communityScore)}
      ${scoreCard('Development', devScore)}
    </div>
    ${aiAnalysis ? `<section><h2>AI Risk Analysis</h2><div class="analysis">${esc(aiAnalysis)}</div></section>` : ''}
    <section>
      <h2>About ${esc(sym)}</h2>
      <p>Independent risk assessment across security, liquidity, tokenomics, community, and development.</p>
      ${address ? `<p>Chain: ${esc(chain)} · Contract: <code>${esc(address)}</code></p>` : ''}
    </section>
    <a href="${SITE_URL}/scan/${chain}/${address || sym}" style="background:#7c3aed;color:#fff;padding:.75rem 1.5rem;border-radius:6px;text-decoration:none;display:inline-block;margin:1rem 0">Run a Fresh Scan →</a>
  </main>
  <footer style="margin-top:3rem;padding-top:1rem;border-top:1px solid #374151;color:#6b7280;font-size:.85em">
    <a href="${SITE_URL}">Token Health Scan</a> · <a href="${SITE_URL}/token">Token Directory</a> · <a href="${SITE_URL}/pricing">Pricing</a>
  </footer>
</body>
</html>`;
}

function scoreCard(label, score) {
  const n = parseInt(String(score));
  const cls = isNaN(n) ? '' : n >= 70 ? 'good' : n >= 40 ? 'med' : 'bad';
  return `<div class="card ${cls}"><div class="val">${esc(String(score))}</div><div class="lbl">${label}</div></div>`;
}

function buildMinimalHTML(title, description, path, h1) {
  const canonical = `${SITE_URL}${path}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}"/>
  <link rel="canonical" href="${canonical}"/>
  <meta property="og:title" content="${esc(title)}"/>
  <meta property="og:description" content="${esc(description)}"/>
  <meta property="og:url" content="${canonical}"/>
  <meta name="twitter:card" content="summary"/>
  <meta name="twitter:site" content="@tokenhealthscan"/>
  <style>body{font-family:system-ui,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#0a0a0f;color:#e5e7eb}a{color:#7c3aed}</style>
</head>
<body>
  <main>
    <h1>${esc(h1 || title)}</h1>
    <p>${esc(description)}</p>
    <ul>
      <li><a href="${SITE_URL}/token">Browse Token Reports</a></li>
      <li><a href="${SITE_URL}/token-scan-guide">How It Works</a></li>
      <li><a href="${SITE_URL}/pricing">Pricing</a></li>
    </ul>
  </main>
</body>
</html>`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
