/**
 * Netlify Edge Function — Bot Prerender (Backup Layer)
 *
 * This is a backup for when Cloudflare proxy is disabled (grey cloud).
 * When Cloudflare proxy is ON, the workers/bot-prerender.js Cloudflare Worker
 * handles bot routing instead (it runs before Cloudflare's cache).
 *
 * Uses Deno — no Chromium, no Puppeteer, no headless browsers.
 * Queries Supabase REST API directly and builds HTML from data.
 *
 * Env vars required in Netlify dashboard:
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 */

import type { Context } from 'https://edge.netlify.com';

const BOT_UA_PATTERNS = [
  // Search engines
  'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
  'yandexbot', 'sogou', 'exabot', 'ia_archiver', 'applebot',
  'msnbot', 'teoma', 'rogerbot', 'seznambot',
  // AI crawlers
  'gptbot', 'chatgpt-user', 'claudebot', 'anthropic-ai',
  'perplexitybot', 'ccbot', 'google-extended', 'meta-externalagent',
  'bytespider', 'amazonbot', 'cohere-ai',
  // Social media
  'twitterbot', 'facebookexternalhit', 'linkedinbot', 'slackbot',
  'whatsapp', 'telegrambot', 'discordbot',
  // SEO tools
  'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'screaming frog',
];

const SITE_URL = 'https://tokenhealthscan.com';

function isBot(request: Request): boolean {
  const ua = (request.headers.get('User-Agent') || '').toLowerCase();
  return BOT_UA_PATTERNS.some(pattern => ua.includes(pattern));
}

export default async function handler(request: Request, context: Context) {
  // Only intercept GET requests for bots
  if (request.method !== 'GET' || !isBot(request)) {
    return context.next();
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // Don't intercept static files
  if (/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|json|xml|txt|webp)$/i.test(path)) {
    return context.next();
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  if (!supabaseUrl || !supabaseKey) {
    // Env vars not set — pass through
    return context.next();
  }

  try {
    // Dynamic token pages
    const tokenMatch = path.match(/^\/token\/([a-zA-Z0-9_-]+)\/?$/);
    if (tokenMatch) {
      const symbol = tokenMatch[1].toLowerCase();
      const apiUrl = `${supabaseUrl}/rest/v1/token_reports?token_symbol=ilike.${encodeURIComponent(symbol)}&limit=1&select=*`;

      const res = await fetch(apiUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
      });

      if (res.ok) {
        const rows = await res.json();
        const token = rows && rows[0];
        if (token) {
          const html = buildTokenHTML(token, symbol);
          return new Response(html, {
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
              'X-Prerendered-By': 'netlify-edge-function',
            },
          });
        }
      }
    }

    // Static page templates
    const staticHtml = getStaticPageHtml(path);
    if (staticHtml) {
      return new Response(staticHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600, s-maxage=86400',
          'X-Prerendered-By': 'netlify-edge-function',
        },
      });
    }

    // Unknown page — pass through to SPA
    return context.next();

  } catch (err) {
    console.error('Edge function error:', err);
    return context.next();
  }
}

function escHtml(str: unknown): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildTokenHTML(token: Record<string, unknown>, symbol: string): string {
  const name = (token.token_name as string) || (token.name as string) || symbol.toUpperCase();
  const sym = ((token.token_symbol as string) || symbol).toUpperCase();
  const overallScore = token.overall_score ?? token.score ?? 'N/A';
  const securityScore = token.security_score ?? 'N/A';
  const liquidityScore = token.liquidity_score ?? 'N/A';
  const tokenomicsScore = token.tokenomics_score ?? 'N/A';
  const communityScore = token.community_score ?? 'N/A';
  const devScore = token.dev_score ?? token.development_score ?? 'N/A';
  const aiAnalysis = (token.ai_analysis as string) || (token.report_content as string) || '';
  const heroImage = (token.hero_image_url as string) || `${SITE_URL}/og-default.png`;
  const price = token.price ? `$${parseFloat(String(token.price)).toFixed(6)}` : '';
  const chain = (token.chain as string) || 'ethereum';
  const address = (token.token_address as string) || (token.contract_address as string) || '';
  const lastmod = ((token.updated_at as string) || (token.created_at as string) || new Date().toISOString()).split('T')[0];
  const canonical = `${SITE_URL}/token/${symbol}`;
  const title = `${sym} Token Risk Analysis — ${new Date().getFullYear()} Health Scan | Token Health Scan`;
  const description = `${name} (${sym}) health score: ${overallScore}/100. Security: ${securityScore}, Liquidity: ${liquidityScore}, Tokenomics: ${tokenomicsScore}. Full AI-powered risk analysis.`;

  const schemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'FinancialProduct',
      name: `${name} (${sym})`,
      description,
      url: canonical,
      brand: { '@type': 'Brand', name: 'Token Health Scan' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Token Directory', item: `${SITE_URL}/token` },
        { '@type': 'ListItem', position: 3, name: `${sym} Risk Analysis`, item: canonical },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: `What is the ${sym} health score?`,
          acceptedAnswer: { '@type': 'Answer', text: `${name} (${sym}) has an overall health score of ${overallScore}/100. Security: ${securityScore}/100, Liquidity: ${liquidityScore}/100, Tokenomics: ${tokenomicsScore}/100.` },
        },
      ],
    },
  ].map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ');

  const scoreCard = (label: string, score: unknown) => {
    const n = parseInt(String(score));
    const cls = isNaN(n) ? '' : n >= 70 ? 'good' : n >= 40 ? 'medium' : 'poor';
    return `<div class="score-card ${cls}"><div class="score-value">${escHtml(String(score))}</div><div class="score-label">${label}</div></div>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${escHtml(heroImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  ${schemas}
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#0a0a0f;color:#e5e7eb;line-height:1.6}
    a{color:#7c3aed} nav{font-size:.9em;margin-bottom:1.5rem;color:#9ca3af}
    h1{font-size:2rem} h2{font-size:1.25rem;color:#c4b5fd;margin-top:1.5rem}
    .scores-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin:1.5rem 0}
    .score-card{background:#1a1a2e;border-radius:8px;padding:1rem;text-align:center}
    .score-value{font-size:2rem;font-weight:700} .score-label{font-size:.8rem;color:#9ca3af;margin-top:.25rem}
    .good .score-value{color:#22c55e} .medium .score-value{color:#f59e0b} .poor .score-value{color:#ef4444}
    .analysis{background:#1a1a2e;border-radius:8px;padding:1.5rem;margin:1.5rem 0}
    .cta{background:#7c3aed;color:#fff;padding:.75rem 1.5rem;border-radius:6px;text-decoration:none;display:inline-block;margin:1rem 0}
    footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #374151;color:#6b7280;font-size:.85em}
  </style>
</head>
<body>
  <nav><a href="${SITE_URL}">Token Health Scan</a> &rsaquo; <a href="${SITE_URL}/token">Token Directory</a> &rsaquo; ${escHtml(sym)} Risk Analysis</nav>
  <main>
    <h1>${escHtml(name)} (${escHtml(sym)}) Risk Analysis</h1>
    <p style="color:#9ca3af">${price ? `Current price: <strong style="color:#e5e7eb">${escHtml(price)}</strong> · ` : ''}Last updated: ${lastmod}</p>
    <div class="scores-grid">
      ${scoreCard('Overall', overallScore)}
      ${scoreCard('Security', securityScore)}
      ${scoreCard('Liquidity', liquidityScore)}
      ${scoreCard('Tokenomics', tokenomicsScore)}
      ${scoreCard('Community', communityScore)}
      ${scoreCard('Development', devScore)}
    </div>
    ${aiAnalysis ? `<section><h2>AI Risk Analysis</h2><div class="analysis">${escHtml(aiAnalysis)}</div></section>` : ''}
    <section>
      <h2>About ${escHtml(sym)}</h2>
      <p>This report evaluates ${escHtml(name)} (${escHtml(sym)}) across security (contract safety, honeypot detection), liquidity (DEX depth, lock status), tokenomics (supply, distribution), community (social presence), and development (GitHub activity, team transparency).</p>
    </section>
    ${address ? `<section><h2>Contract Details</h2><p>Chain: ${escHtml(chain)} · Contract: <code>${escHtml(address)}</code></p></section>` : ''}
    <a href="${SITE_URL}/scan/${chain}/${address || sym}" class="cta">Run a Fresh Scan →</a>
  </main>
  <footer>
    <a href="${SITE_URL}">Token Health Scan</a> · <a href="${SITE_URL}/token">Token Directory</a> · <a href="${SITE_URL}/pricing">Pricing</a> · <a href="${SITE_URL}/token-scan-guide">Guide</a>
  </footer>
</body>
</html>`;
}

function getStaticPageHtml(path: string): string | null {
  const pages: Record<string, { title: string; description: string; h1: string; body: string }> = {
    '/': {
      title: 'Token Health Scan - Find Hidden Risks Before You Dive In',
      description: 'Analyze any crypto token\'s health across security, liquidity, tokenomics, community, and development. Uncover hidden risks in seconds.',
      h1: 'Token Health Scan',
      body: '<p>Analyze any cryptocurrency token for security risks, liquidity issues, tokenomics problems, and development health. Supports Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, and Solana.</p><ul><li><a href="' + SITE_URL + '/token">Browse Token Reports</a></li><li><a href="' + SITE_URL + '/token-scan-guide">How It Works</a></li><li><a href="' + SITE_URL + '/pricing">Pricing</a></li></ul>',
    },
    '/pricing': {
      title: 'Pricing — Token Health Scan',
      description: 'Token Health Scan pricing. Free, Pro, and Enterprise plans for crypto investors and analysts.',
      h1: 'Pricing Plans',
      body: '<p>Token Health Scan offers Free, Pro, and Enterprise plans. Visit <a href="' + SITE_URL + '/pricing">our pricing page</a> for current rates.</p>',
    },
    '/token-scan-guide': {
      title: 'How to Read a Token Health Scan | Complete Guide',
      description: 'Learn to interpret token health scores, understand security risks, and evaluate liquidity, tokenomics, community, and development scores.',
      h1: 'How to Read a Token Health Scan',
      body: '<p>This guide explains every metric in a Token Health Scan report. Scores above 70 indicate lower risk; below 40 indicates high risk. The five categories are: Security, Liquidity, Tokenomics, Community, and Development.</p>',
    },
    '/solana-launchpads': {
      title: 'Solana Launchpads Directory 2025 | Token Health Scan',
      description: 'Curated directory of Solana launchpads. Compare vetting standards, community size, and investor protections.',
      h1: 'Solana Launchpads Directory',
      body: '<p>Discover the top Solana launchpads. Always run a <a href="' + SITE_URL + '">Token Health Scan</a> before investing in any launchpad project.</p>',
    },
    '/ethereum-launchpads': {
      title: 'Ethereum Launchpads Directory 2025 | Token Health Scan',
      description: 'Curated directory of Ethereum IDO launchpads. Compare smart contract audits and investor protections.',
      h1: 'Ethereum Launchpads Directory',
      body: '<p>Discover the top Ethereum launchpads for ERC-20 token launches. Always run a <a href="' + SITE_URL + '">Token Health Scan</a> first.</p>',
    },
    '/token-sniffer-vs-tokenhealthscan': {
      title: 'Token Health Scan vs TokenSniffer Comparison',
      description: 'Side-by-side comparison of Token Health Scan vs TokenSniffer. Features, chain coverage, and AI analysis.',
      h1: 'Token Health Scan vs TokenSniffer',
      body: '<p>Token Health Scan uses AI-powered analysis across 5 categories (Security, Liquidity, Tokenomics, Community, Development) and supports 7 chains including Solana.</p>',
    },
  };

  const page = pages[path];
  if (!page) return null;

  const canonical = `${SITE_URL}${path}`;
  const breadcrumb = path !== '/'
    ? `<nav style="font-size:.9em;margin-bottom:1.5rem;color:#9ca3af"><a href="${SITE_URL}" style="color:#7c3aed">Home</a> &rsaquo; ${escHtml(page.h1)}</nav>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(page.title)}</title>
  <meta name="description" content="${escHtml(page.description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:title" content="${escHtml(page.title)}" />
  <meta property="og:description" content="${escHtml(page.description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:20px;background:#0a0a0f;color:#e5e7eb;line-height:1.6}
    a{color:#7c3aed} h1{font-size:2rem} h2{color:#c4b5fd;margin-top:1.5rem}
    footer{margin-top:3rem;padding-top:1rem;border-top:1px solid #374151;color:#6b7280;font-size:.85em}
  </style>
</head>
<body>
  ${breadcrumb}
  <main>
    <h1>${escHtml(page.h1)}</h1>
    ${page.body}
  </main>
  <footer>
    <a href="${SITE_URL}">Token Health Scan</a> · <a href="${SITE_URL}/token">Token Directory</a> · <a href="${SITE_URL}/pricing">Pricing</a> · <a href="${SITE_URL}/token-scan-guide">Guide</a>
  </footer>
</body>
</html>`;
}
