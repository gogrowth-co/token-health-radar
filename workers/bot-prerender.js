/**
 * Cloudflare Worker — Bot Prerender
 *
 * Runs at the Cloudflare edge BEFORE the cache. Detects known bot/crawler
 * User-Agents and serves fully-rendered, data-driven HTML directly from
 * Supabase. Human visitors are passed through unchanged to Netlify.
 *
 * Deploy: wrangler deploy
 * Secrets: wrangler secret put SUPABASE_URL
 *          wrangler secret put SUPABASE_ANON_KEY
 */

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

function isBot(request) {
  const ua = (request.headers.get('User-Agent') || '').toLowerCase();
  return BOT_UA_PATTERNS.some(pattern => ua.includes(pattern));
}

export default {
  async fetch(request, env) {
    // Only intercept GET requests
    if (request.method !== 'GET') {
      return fetch(request);
    }

    // Pass humans through to Netlify SPA unchanged
    if (!isBot(request)) {
      return fetch(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Dynamic token pages: /token/:symbol
      const tokenMatch = path.match(/^\/token\/([a-zA-Z0-9_-]+)\/?$/);
      if (tokenMatch) {
        return await serveTokenPage(tokenMatch[1].toLowerCase(), env);
      }

      // Static page templates
      return serveStaticPage(path, env);

    } catch (err) {
      // On any error, fall back to the SPA shell
      console.error('Worker error:', err);
      return fetch(request);
    }
  },
};

// ─── Token Report Pages ────────────────────────────────────────────────────

async function serveTokenPage(symbol, env) {
  const supabaseUrl = env.SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY;

  const apiUrl = `${supabaseUrl}/rest/v1/token_reports?token_symbol=ilike.${encodeURIComponent(symbol)}&limit=1&select=*`;

  const res = await fetch(apiUrl, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    // Fall through to SPA on API error
    return fetch(`${SITE_URL}/`);
  }

  const rows = await res.json();
  const token = rows && rows[0];

  if (!token) {
    // Token not found — serve SPA
    return fetch(`${SITE_URL}/`);
  }

  const html = buildTokenHTML(token, symbol);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'X-Robots-Tag': 'index, follow',
    },
  });
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
  const price = token.price ? `$${parseFloat(token.price).toFixed(6)}` : '';
  const chain = token.chain || token.chain_id || 'ethereum';
  const address = token.token_address || token.contract_address || '';
  const heroImage = token.hero_image_url || token.score_snapshot_url || `${SITE_URL}/og-default.png`;
  const lastmod = token.updated_at || token.created_at || new Date().toISOString();

  const title = `${sym} Token Risk Analysis — ${new Date().getFullYear()} Health Scan | Token Health Scan`;
  const description = `${name} (${sym}) health score: ${overallScore}/100. Security: ${securityScore}, Liquidity: ${liquidityScore}, Tokenomics: ${tokenomicsScore}. Full risk analysis and AI-powered audit.`;
  const canonical = `${SITE_URL}/token/${symbol}`;

  const financialProductSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: `${name} (${sym})`,
    description: description,
    url: canonical,
    brand: { '@type': 'Brand', name: 'Token Health Scan' },
    offers: price ? { '@type': 'Offer', price: token.price, priceCurrency: 'USD' } : undefined,
  });

  const breadcrumbSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Token Directory', item: `${SITE_URL}/token` },
      { '@type': 'ListItem', position: 3, name: `${sym} Risk Analysis`, item: canonical },
    ],
  });

  const faqSchema = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `What is the ${sym} health score?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${name} (${sym}) has an overall health score of ${overallScore}/100 on Token Health Scan. Security: ${securityScore}/100, Liquidity: ${liquidityScore}/100, Tokenomics: ${tokenomicsScore}/100.`,
        },
      },
      {
        '@type': 'Question',
        name: `Is ${sym} safe to invest in?`,
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Based on our analysis, ${name} (${sym}) received a security score of ${securityScore}/100. Always do your own research before investing in any cryptocurrency.`,
        },
      },
    ],
  });

  const scoreClass = (score) => {
    if (score === 'N/A') return '';
    const n = parseInt(score);
    if (n >= 70) return 'score-good';
    if (n >= 40) return 'score-medium';
    return 'score-poor';
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  <meta name="author" content="Token Health Scan" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonical}" />

  <!-- Open Graph -->
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:image" content="${escHtml(heroImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Token Health Scan" />

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <meta name="twitter:title" content="${escHtml(title)}" />
  <meta name="twitter:description" content="${escHtml(description)}" />
  <meta name="twitter:image" content="${escHtml(heroImage)}" />

  <!-- Structured Data -->
  <script type="application/ld+json">${financialProductSchema}</script>
  <script type="application/ld+json">${breadcrumbSchema}</script>
  <script type="application/ld+json">${faqSchema}</script>

  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #0a0a0f; color: #e5e7eb; }
    a { color: #7c3aed; }
    nav { font-size: 0.9em; margin-bottom: 2rem; color: #9ca3af; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .subtitle { color: #9ca3af; margin-bottom: 2rem; }
    .scores-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .score-card { background: #1a1a2e; border-radius: 8px; padding: 1rem; text-align: center; }
    .score-value { font-size: 2rem; font-weight: bold; }
    .score-good .score-value { color: #22c55e; }
    .score-medium .score-value { color: #f59e0b; }
    .score-poor .score-value { color: #ef4444; }
    .score-label { font-size: 0.85rem; color: #9ca3af; margin-top: 0.25rem; }
    .analysis { background: #1a1a2e; border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; line-height: 1.6; }
    .cta { background: #7c3aed; color: white; padding: 0.75rem 1.5rem; border-radius: 6px; text-decoration: none; display: inline-block; margin: 1rem 0; }
    .links { margin-top: 2rem; }
    .links a { display: inline-block; margin: 0.25rem 0.5rem; }
  </style>
</head>
<body>
  <nav>
    <a href="${SITE_URL}">Token Health Scan</a> &rsaquo;
    <a href="${SITE_URL}/token">Token Directory</a> &rsaquo;
    ${escHtml(sym)} Risk Analysis
  </nav>

  <main>
    <h1>${escHtml(name)} (${escHtml(sym)}) Risk Analysis</h1>
    <p class="subtitle">
      Comprehensive token health audit — security, liquidity, tokenomics, community &amp; development.
      ${price ? `Current price: <strong>${escHtml(price)}</strong>.` : ''}
      Last updated: ${lastmod.split('T')[0]}.
    </p>

    <div class="scores-grid">
      <div class="score-card ${scoreClass(overallScore)}">
        <div class="score-value">${overallScore}</div>
        <div class="score-label">Overall Score</div>
      </div>
      <div class="score-card ${scoreClass(securityScore)}">
        <div class="score-value">${securityScore}</div>
        <div class="score-label">Security</div>
      </div>
      <div class="score-card ${scoreClass(liquidityScore)}">
        <div class="score-value">${liquidityScore}</div>
        <div class="score-label">Liquidity</div>
      </div>
      <div class="score-card ${scoreClass(tokenomicsScore)}">
        <div class="score-value">${tokenomicsScore}</div>
        <div class="score-label">Tokenomics</div>
      </div>
      <div class="score-card ${scoreClass(communityScore)}">
        <div class="score-value">${communityScore}</div>
        <div class="score-label">Community</div>
      </div>
      <div class="score-card ${scoreClass(devScore)}">
        <div class="score-value">${devScore}</div>
        <div class="score-label">Development</div>
      </div>
    </div>

    ${aiAnalysis ? `
    <section>
      <h2>AI Risk Analysis</h2>
      <div class="analysis">${escHtml(aiAnalysis)}</div>
    </section>
    ` : ''}

    <section>
      <h2>About ${escHtml(name)} (${escHtml(sym)})</h2>
      <p>
        Token Health Scan provides an independent risk assessment of ${escHtml(sym)} across five
        categories: <strong>security</strong> (smart contract safety, ownership risks, honeypot detection),
        <strong>liquidity</strong> (trading volume, DEX depth, lock status),
        <strong>tokenomics</strong> (supply distribution, vesting, inflation),
        <strong>community</strong> (social presence, holder growth),
        and <strong>development</strong> (GitHub activity, team transparency).
      </p>
    </section>

    ${address ? `
    <section>
      <h2>Contract &amp; Chain</h2>
      <p>Chain: ${escHtml(chain)} | Contract: <code>${escHtml(address)}</code></p>
    </section>
    ` : ''}

    <a href="${SITE_URL}/scan/${chain}/${address || sym}" class="cta">Run a Fresh Scan →</a>

    <section class="links">
      <h2>Related Pages</h2>
      <a href="${SITE_URL}/token">← All Token Reports</a>
      <a href="${SITE_URL}/token-scan-guide">How to Read a Health Scan</a>
      <a href="${SITE_URL}/pricing">Pricing</a>
    </section>
  </main>
</body>
</html>`;
}

// ─── Static Page Templates ─────────────────────────────────────────────────

async function serveStaticPage(path, env) {
  const templates = {
    '/': homePage(),
    '/pricing': pricingPage(),
    '/token-scan-guide': scanGuidePage(),
    '/solana-launchpads': solanaLaunchpadsPage(),
    '/ethereum-launchpads': ethereumLaunchpadsPage(),
    '/token-sniffer-vs-tokenhealthscan': comparisonPage(),
    '/token-sniffer-comparison': comparisonPage(),
    '/privacy': legalPage('Privacy Policy', '/privacy'),
    '/terms': legalPage('Terms of Service', '/terms'),
  };

  const html = templates[path];
  if (html) {
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    });
  }

  // Unknown path — pass through to Netlify SPA
  return fetch(`${SITE_URL}${path}`);
}

function homePage() {
  return buildStaticHTML({
    title: 'Token Health Scan - Find Hidden Risks Before You Dive In',
    description: 'Analyze any crypto token\'s health across security, liquidity, tokenomics, community, and development. Uncover hidden risks in seconds.',
    path: '/',
    h1: 'Token Health Scan',
    content: `
      <p>Token Health Scan analyzes any cryptocurrency token across five critical dimensions to help you identify risks before investing.</p>
      <h2>What We Analyze</h2>
      <ul>
        <li><strong>Security</strong> — Smart contract audits, ownership risks, honeypot detection, mint capabilities</li>
        <li><strong>Liquidity</strong> — DEX depth, trading volume, liquidity lock status</li>
        <li><strong>Tokenomics</strong> — Supply distribution, vesting schedules, inflation rate</li>
        <li><strong>Community</strong> — Social media presence, holder growth, engagement metrics</li>
        <li><strong>Development</strong> — GitHub activity, team transparency, code quality</li>
      </ul>
      <h2>Supported Chains</h2>
      <p>Ethereum, BSC (BNB Chain), Polygon, Arbitrum, Optimism, Base, and Solana.</p>
      <h2>How It Works</h2>
      <ol>
        <li>Paste a token contract address or symbol</li>
        <li>Our system scans security APIs, on-chain data, and social signals</li>
        <li>Receive a comprehensive health score (0–100) with detailed breakdown</li>
      </ol>
      <a href="${SITE_URL}/token" style="color:#7c3aed">Browse Token Reports →</a>
    `,
  });
}

function pricingPage() {
  return buildStaticHTML({
    title: 'Pricing — Token Health Scan',
    description: 'Token Health Scan pricing plans. Start for free or upgrade for unlimited scans, PDF reports, and priority access.',
    path: '/pricing',
    h1: 'Pricing Plans',
    content: `
      <p>Token Health Scan offers flexible plans for individual investors and professional analysts.</p>
      <h2>Plans</h2>
      <ul>
        <li><strong>Free</strong> — Limited scans per day, basic scores</li>
        <li><strong>Pro</strong> — Unlimited scans, full AI analysis, PDF reports, API access</li>
        <li><strong>Enterprise</strong> — Custom integrations, team accounts, white-label</li>
      </ul>
      <p>Visit <a href="${SITE_URL}/pricing">our pricing page</a> for current rates and a free trial.</p>
    `,
  });
}

function scanGuidePage() {
  return buildStaticHTML({
    title: 'How to Read a Token Health Scan | Token Health Scan Guide',
    description: 'Learn how to interpret token health scores, understand security risks, spot liquidity traps, and evaluate tokenomics. Complete guide for crypto investors.',
    path: '/token-scan-guide',
    h1: 'How to Read a Token Health Scan',
    content: `
      <p>This guide explains every metric in a Token Health Scan report so you can make informed investment decisions.</p>
      <h2>Overall Health Score (0–100)</h2>
      <p>A composite score across all five categories. Scores above 70 indicate lower risk; below 40 indicates high risk.</p>
      <h2>Security Score</h2>
      <p>Evaluates smart contract safety. Checks for honeypot patterns, ownership centralization, mint functions, and blacklist capabilities.</p>
      <h2>Liquidity Score</h2>
      <p>Measures trading depth and sustainability. Locked liquidity gets a higher score than unlocked pools.</p>
      <h2>Tokenomics Score</h2>
      <p>Analyzes supply distribution, top holder concentration, and vesting schedules.</p>
      <h2>Community Score</h2>
      <p>Tracks Twitter/X followers, Telegram member count, and engagement quality.</p>
      <h2>Development Score</h2>
      <p>GitHub commit frequency, team doxxing status, and code audit history.</p>
      <a href="${SITE_URL}/token">See Token Reports →</a>
    `,
  });
}

function solanaLaunchpadsPage() {
  return buildStaticHTML({
    title: 'Solana Launchpads Directory 2025 | Token Health Scan',
    description: 'Curated list of Solana launchpads for token launches in 2025. Compare features, vetting process, and community size.',
    path: '/solana-launchpads',
    h1: 'Solana Launchpads Directory',
    content: `
      <p>Discover the top Solana launchpads for new token launches. Each platform is evaluated for security, community vetting, and track record.</p>
      <h2>What to Look For in a Solana Launchpad</h2>
      <ul>
        <li>KYC/vetting requirements for projects</li>
        <li>Liquidity locking mechanisms</li>
        <li>Community size and engagement</li>
        <li>Historical launch performance</li>
        <li>Refund policies and investor protection</li>
      </ul>
      <p>Before investing in any launchpad project, always run a <a href="${SITE_URL}">Token Health Scan</a> to check for risks.</p>
    `,
  });
}

function ethereumLaunchpadsPage() {
  return buildStaticHTML({
    title: 'Ethereum Launchpads Directory 2025 | Token Health Scan',
    description: 'Curated list of Ethereum launchpads for ERC-20 token launches. Compare IDO platforms, vetting standards, and investor protections.',
    path: '/ethereum-launchpads',
    h1: 'Ethereum Launchpads Directory',
    content: `
      <p>Discover the top Ethereum launchpads for ERC-20 token launches. Each platform is evaluated for smart contract security and investor protections.</p>
      <h2>Evaluating Ethereum Launchpads</h2>
      <ul>
        <li>Smart contract audit requirements</li>
        <li>Vesting schedule enforcement</li>
        <li>KYC requirements for project teams</li>
        <li>Whitelist and allocation fairness</li>
        <li>Post-launch support and monitoring</li>
      </ul>
      <p>Always run a <a href="${SITE_URL}">Token Health Scan</a> before participating in any launch.</p>
    `,
  });
}

function comparisonPage() {
  return buildStaticHTML({
    title: 'Token Health Scan vs TokenSniffer — Comparison',
    description: 'How does Token Health Scan compare to TokenSniffer? Side-by-side feature comparison of crypto token analysis tools.',
    path: '/token-sniffer-vs-tokenhealthscan',
    h1: 'Token Health Scan vs TokenSniffer',
    content: `
      <p>Both Token Health Scan and TokenSniffer help crypto investors evaluate token risks. Here\'s how they compare.</p>
      <h2>Key Differences</h2>
      <ul>
        <li><strong>AI Analysis</strong> — Token Health Scan uses GPT-powered analysis; TokenSniffer uses rule-based scoring</li>
        <li><strong>Coverage</strong> — Token Health Scan covers Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, and Solana</li>
        <li><strong>Categories</strong> — Token Health Scan scores Security, Liquidity, Tokenomics, Community, and Development separately</li>
        <li><strong>Reports</strong> — Token Health Scan provides downloadable PDF reports and shareable results</li>
      </ul>
      <a href="${SITE_URL}">Try Token Health Scan Free →</a>
    `,
  });
}

function legalPage(title, path) {
  return buildStaticHTML({
    title: `${title} | Token Health Scan`,
    description: `Token Health Scan ${title.toLowerCase()}.`,
    path,
    h1: title,
    content: `<p>Please visit <a href="${SITE_URL}${path}">${SITE_URL}${path}</a> to read our full ${title.toLowerCase()}. JavaScript is required to view the complete document.</p>`,
  });
}

function buildStaticHTML({ title, description, path, h1, content }) {
  const canonical = `${SITE_URL}${path}`;
  const breadcrumb = path === '/' ? '' : `<nav style="font-size:0.9em;margin-bottom:1.5rem;color:#9ca3af"><a href="${SITE_URL}" style="color:#7c3aed">Home</a> &rsaquo; ${escHtml(h1)}</nav>`;

  const breadcrumbSchema = path !== '/' ? JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: h1, item: canonical },
    ],
  }) : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(description)}" />
  <meta name="author" content="Token Health Scan" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escHtml(title)}" />
  <meta property="og:description" content="${escHtml(description)}" />
  <meta property="og:url" content="${canonical}" />
  <meta property="og:site_name" content="Token Health Scan" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  ${breadcrumbSchema ? `<script type="application/ld+json">${breadcrumbSchema}</script>` : ''}
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; background: #0a0a0f; color: #e5e7eb; line-height: 1.6; }
    a { color: #7c3aed; }
    h1 { font-size: 2rem; }
    h2 { font-size: 1.25rem; color: #c4b5fd; margin-top: 1.5rem; }
    ul, ol { padding-left: 1.5rem; }
    li { margin: 0.5rem 0; }
  </style>
</head>
<body>
  ${breadcrumb}
  <main>
    <h1>${escHtml(h1)}</h1>
    ${content}
  </main>
  <footer style="margin-top:3rem;padding-top:1rem;border-top:1px solid #374151;color:#6b7280;font-size:0.85em">
    <a href="${SITE_URL}">Token Health Scan</a> ·
    <a href="${SITE_URL}/token">Token Directory</a> ·
    <a href="${SITE_URL}/pricing">Pricing</a> ·
    <a href="${SITE_URL}/privacy">Privacy</a> ·
    <a href="${SITE_URL}/terms">Terms</a>
  </footer>
</body>
</html>`;
}

// ─── Utilities ─────────────────────────────────────────────────────────────

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
