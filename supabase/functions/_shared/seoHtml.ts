/**
 * Shared SEO/AEO HTML builder.
 *
 * Single source of truth for per-route HTML used by:
 *  - regenerate-seo-snapshot (writes to seo-snapshots bucket)
 *  - seo-snapshot (live fallback when bucket has no entry)
 *  - workers/bot-prerender.js (delegates to seo-snapshot)
 *
 * Every page returns a complete <!DOCTYPE html> document with:
 *   - unique <title> + meta description
 *   - canonical link
 *   - OpenGraph + Twitter card tags
 *   - 1+ JSON-LD blocks tuned to the route type
 *   - visible <main> body so AEO crawlers (GPTBot, ClaudeBot, PerplexityBot...)
 *     receive actual prose, not just metadata.
 */

export const SITE_URL = "https://tokenhealthscan.com";
export const SITE_NAME = "Token Health Scan";
export const TWITTER_HANDLE = "@tokenhealthscan";
export const DEFAULT_OG_IMAGE =
  "https://storage.googleapis.com/gpt-engineer-file-uploads/vPREpio8p8h1iruSSNkQMQeWPo62/social-images/social-1757447352992-tokenhealthscan%20web%20image3.png";

export function escHtml(input: unknown): string {
  if (input === null || input === undefined) return "";
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function escJsonLd(obj: unknown): string {
  // Avoid </script> closing the JSON-LD block
  return JSON.stringify(obj).replaceAll("<", "\\u003c");
}

interface PageBase {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  jsonLd: unknown[];
  bodyHtml: string;
  robots?: string;
}

export function renderPage(page: PageBase): string {
  const ogImage = page.ogImage || DEFAULT_OG_IMAGE;
  const ogType = page.ogType || "website";
  const robots = page.robots || "index, follow, max-image-preview:large, max-snippet:-1";
  const ldBlocks = page.jsonLd
    .map((b) => `<script type="application/ld+json">${escJsonLd(b)}</script>`)
    .join("\n  ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(page.title)}</title>
  <meta name="description" content="${escHtml(page.description)}" />
  <meta name="author" content="${SITE_NAME}" />
  <meta name="robots" content="${escHtml(robots)}" />
  <link rel="canonical" href="${escHtml(page.canonical)}" />

  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="${SITE_NAME}" />
  <meta property="og:title" content="${escHtml(page.title)}" />
  <meta property="og:description" content="${escHtml(page.description)}" />
  <meta property="og:url" content="${escHtml(page.canonical)}" />
  <meta property="og:image" content="${escHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${TWITTER_HANDLE}" />
  <meta name="twitter:title" content="${escHtml(page.title)}" />
  <meta name="twitter:description" content="${escHtml(page.description)}" />
  <meta name="twitter:image" content="${escHtml(ogImage)}" />

  ${ldBlocks}

  <style>
    body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:24px;background:#0a0a0f;color:#e5e7eb;line-height:1.6}
    a{color:#a78bfa}
    nav{font-size:.9em;color:#9ca3af;margin-bottom:1.5rem}
    h1{font-size:2rem;margin:.25rem 0 .5rem}
    h2{margin-top:2rem;color:#c4b5fd;font-size:1.25rem}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:1rem;margin:1.5rem 0}
    .card{background:#161629;border-radius:8px;padding:1rem}
    .score{font-size:1.75rem;font-weight:700}
    .good{color:#22c55e}.med{color:#f59e0b}.bad{color:#ef4444}
    .label{font-size:.85rem;color:#9ca3af;margin-top:.25rem}
    .cta{background:#7c3aed;color:#fff;padding:.6rem 1.2rem;border-radius:6px;text-decoration:none;display:inline-block;margin:1rem 0}
    code{background:#161629;padding:2px 6px;border-radius:4px;font-size:.9em}
  </style>
</head>
<body>
${page.bodyHtml}
</body>
</html>`;
}

function scoreClass(s: unknown): string {
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  if (n >= 70) return "good";
  if (n >= 40) return "med";
  return "bad";
}

// ─── Token report page ────────────────────────────────────────────────────
export interface TokenSnapshotInput {
  symbol: string;
  name?: string | null;
  address?: string | null;
  chain?: string | null;
  overall_score?: number | null;
  security_score?: number | null;
  liquidity_score?: number | null;
  tokenomics_score?: number | null;
  community_score?: number | null;
  development_score?: number | null;
  ai_analysis?: string | null;
  description?: string | null;
  price_usd?: number | null;
  market_cap_usd?: number | null;
  hero_image_url?: string | null;
  updated_at?: string | null;
}

export function renderTokenPage(t: TokenSnapshotInput): string {
  const sym = (t.symbol || "").toUpperCase();
  const name = t.name || sym;
  const overall = t.overall_score ?? "—";
  const sec = t.security_score ?? "—";
  const liq = t.liquidity_score ?? "—";
  const tok = t.tokenomics_score ?? "—";
  const com = t.community_score ?? "—";
  const dev = t.development_score ?? "—";
  const canonical = `${SITE_URL}/token/${encodeURIComponent(t.symbol.toLowerCase())}`;
  const title = `${sym} Token Risk Analysis ${new Date().getFullYear()} | ${SITE_NAME}`;
  const description =
    `${name} (${sym}) health score: ${overall}/100. Security ${sec}, Liquidity ${liq}, ` +
    `Tokenomics ${tok}, Community ${com}, Development ${dev}. Independent risk audit.`;

  const jsonLd: unknown[] = [
    {
      "@context": "https://schema.org",
      "@type": "FinancialProduct",
      name: `${name} (${sym})`,
      description,
      url: canonical,
      brand: { "@type": "Brand", name: SITE_NAME },
      ...(typeof overall === "number"
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: overall,
              bestRating: 100,
              worstRating: 0,
              ratingCount: 1,
            },
          }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Tokens", item: `${SITE_URL}/token` },
        { "@type": "ListItem", position: 3, name: `${sym}`, item: canonical },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `What is the ${sym} health score?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${name} has an overall health score of ${overall}/100 — Security ${sec}, Liquidity ${liq}, Tokenomics ${tok}, Community ${com}, Development ${dev}.`,
          },
        },
        {
          "@type": "Question",
          name: `Is ${sym} safe?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${name} received a security score of ${sec}/100. Always do your own research.`,
          },
        },
      ],
    },
  ];

  const body = `
  <nav><a href="${SITE_URL}">${SITE_NAME}</a> › <a href="${SITE_URL}/token">Tokens</a> › ${escHtml(sym)}</nav>
  <main>
    <h1>${escHtml(name)} (${escHtml(sym)}) Risk Analysis</h1>
    <p>Independent token health audit covering security, liquidity, tokenomics, community and development. ${
      t.price_usd ? `Current price: <strong>$${Number(t.price_usd).toFixed(6)}</strong>.` : ""
    } Last updated ${(t.updated_at || new Date().toISOString()).split("T")[0]}.</p>

    <div class="grid">
      <div class="card"><div class="score ${scoreClass(overall)}">${overall}</div><div class="label">Overall</div></div>
      <div class="card"><div class="score ${scoreClass(sec)}">${sec}</div><div class="label">Security</div></div>
      <div class="card"><div class="score ${scoreClass(liq)}">${liq}</div><div class="label">Liquidity</div></div>
      <div class="card"><div class="score ${scoreClass(tok)}">${tok}</div><div class="label">Tokenomics</div></div>
      <div class="card"><div class="score ${scoreClass(com)}">${com}</div><div class="label">Community</div></div>
      <div class="card"><div class="score ${scoreClass(dev)}">${dev}</div><div class="label">Development</div></div>
    </div>

    ${t.ai_analysis ? `<h2>AI Risk Analysis</h2><p>${escHtml(t.ai_analysis).slice(0, 4000)}</p>` : ""}
    ${t.description ? `<h2>About ${escHtml(name)}</h2><p>${escHtml(t.description).slice(0, 2000)}</p>` : ""}

    ${
      t.address
        ? `<h2>Contract</h2><p>Chain: ${escHtml(t.chain || "ethereum")} · Address: <code>${escHtml(t.address)}</code></p>`
        : ""
    }

    <a class="cta" href="${SITE_URL}/scan/${escHtml(t.chain || "ethereum")}/${escHtml(t.address || sym)}">Run a fresh scan →</a>

    <h2>Related</h2>
    <ul>
      <li><a href="${SITE_URL}/token">All token reports</a></li>
      <li><a href="${SITE_URL}/token-scan-guide">How to read a token health scan</a></li>
      <li><a href="${SITE_URL}/pricing">Pricing</a></li>
    </ul>
  </main>`;

  return renderPage({
    title,
    description,
    canonical,
    ogImage: t.hero_image_url || DEFAULT_OG_IMAGE,
    jsonLd,
    bodyHtml: body,
  });
}

// ─── Agent scan page ──────────────────────────────────────────────────────
export interface AgentSnapshotInput {
  chain: string;
  agentId: string;
  name?: string | null;
  description?: string | null;
  trustScore?: number | null;
}

export function renderAgentPage(a: AgentSnapshotInput): string {
  const name = a.name || `Agent #${a.agentId}`;
  const canonical = `${SITE_URL}/agent-scan/${encodeURIComponent(a.chain)}/${encodeURIComponent(a.agentId)}`;
  const title = `${name} — ERC-8004 Agent Trust Score | ${SITE_NAME}`;
  const description = a.description
    ? `${name}: ${a.description.slice(0, 140)}`
    : `Trust score and health analysis for ERC-8004 agent ${name} on ${a.chain}. ${
        a.trustScore != null ? `Current trust score: ${a.trustScore}/100.` : ""
      }`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Thing",
      name,
      description,
      url: canonical,
      identifier: a.agentId,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Agent Directory", item: `${SITE_URL}/agent-directory` },
        { "@type": "ListItem", position: 3, name, item: canonical },
      ],
    },
  ];

  const body = `
  <nav><a href="${SITE_URL}">${SITE_NAME}</a> › <a href="${SITE_URL}/agent-directory">Agents</a> › ${escHtml(name)}</nav>
  <main>
    <h1>${escHtml(name)} — Agent Trust Score</h1>
    <p>${escHtml(description)}</p>
    ${
      a.trustScore != null
        ? `<div class="grid"><div class="card"><div class="score ${scoreClass(a.trustScore)}">${a.trustScore}</div><div class="label">Trust score</div></div></div>`
        : ""
    }
    <p>Chain: <code>${escHtml(a.chain)}</code> · Agent ID: <code>${escHtml(a.agentId)}</code></p>
    <a class="cta" href="${canonical}">View full report →</a>
  </main>`;

  return renderPage({
    title,
    description,
    canonical,
    jsonLd,
    bodyHtml: body,
  });
}

// ─── Static page templates ────────────────────────────────────────────────
type StaticKey =
  | "/"
  | "/pricing"
  | "/token"
  | "/token-directory"
  | "/token-scan-guide"
  | "/token-sniffer-comparison"
  | "/solana-launchpads"
  | "/ethereum-launchpads"
  | "/ai-agents"
  | "/agent-directory"
  | "/agent-scan"
  | "/copilot"
  | "/privacy"
  | "/terms"
  | "/ltd";

const STATIC_DEFS: Record<StaticKey, { title: string; description: string; h1: string; body: string; jsonLd?: unknown[] }> = {
  "/": {
    title: `${SITE_NAME} — Crypto Token Risk Analysis & Health Scoring`,
    description:
      "Scan any crypto token across security, liquidity, tokenomics, community and development. Independent health scores in seconds for Ethereum, Solana, Base, BSC, Polygon, Arbitrum.",
    h1: SITE_NAME,
    body: `
      <p>${SITE_NAME} analyzes any cryptocurrency token across five dimensions to surface hidden risks before you invest.</p>
      <h2>What we analyze</h2>
      <ul>
        <li><strong>Security</strong> — smart contract audit, ownership renouncement, honeypot detection, mint/freeze authority</li>
        <li><strong>Liquidity</strong> — DEX depth, 24h volume, locked liquidity</li>
        <li><strong>Tokenomics</strong> — supply distribution, holder concentration, vesting</li>
        <li><strong>Community</strong> — sentiment, social dominance, holder growth</li>
        <li><strong>Development</strong> — GitHub activity, contributors, code health</li>
      </ul>
      <h2>Supported chains</h2>
      <p>Ethereum, BNB Chain, Polygon, Arbitrum, Optimism, Base, and Solana.</p>
      <p><a href="${SITE_URL}/token">Browse the token directory →</a></p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/scan/{search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
        logo: DEFAULT_OG_IMAGE,
        sameAs: [`https://x.com/${TWITTER_HANDLE.replace("@", "")}`],
      },
    ],
  },
  "/pricing": {
    title: `Pricing — ${SITE_NAME}`,
    description: "Free tier with 3 Pro scans. Pro plans from $20/month for 10 monthly scans, full reports and API access.",
    h1: "Pricing",
    body: `
      <h2>Plans</h2>
      <ul>
        <li><strong>Free</strong> — 3 lifetime Pro scans, basic scoring</li>
        <li><strong>Monthly</strong> — $20/month, 10 Pro scans per month, full reports</li>
        <li><strong>Annual</strong> — $120/year, 10 Pro scans per month, full reports</li>
      </ul>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: `${SITE_NAME} Pro`,
        description: "Pro subscription with full token risk analysis access.",
        offers: [
          { "@type": "Offer", price: "20", priceCurrency: "USD", name: "Monthly" },
          { "@type": "Offer", price: "120", priceCurrency: "USD", name: "Annual" },
        ],
      },
    ],
  },
  "/token": {
    title: `Token Directory — ${SITE_NAME}`,
    description: "Browse independent risk analyses of crypto tokens across Ethereum, Solana, Base, BSC and more.",
    h1: "Token Directory",
    body: `<p>Explore token health reports across every supported chain. Each report includes scores for security, liquidity, tokenomics, community and development.</p>`,
  },
  "/token-directory": {
    title: `Token Directory — ${SITE_NAME}`,
    description: "Browse independent risk analyses of crypto tokens.",
    h1: "Token Directory",
    body: `<p>Explore token health reports across every supported chain.</p>`,
  },
  "/token-scan-guide": {
    title: `How to Read a Token Health Scan — Complete Guide | ${SITE_NAME}`,
    description: "Learn how to interpret token health scores. Understand security risks, liquidity traps, tokenomics red flags, and community signals.",
    h1: "How to Read a Token Health Scan",
    body: `
      <p>This guide explains every metric in a Token Health Scan report.</p>
      <h2>Overall score (0–100)</h2><p>Composite of all five categories. Above 70 = lower risk; below 40 = high risk.</p>
      <h2>Security</h2><p>Honeypot detection, ownership centralization, mint/freeze authority, blacklist capability.</p>
      <h2>Liquidity</h2><p>Trading depth, 24h volume, locked liquidity duration.</p>
      <h2>Tokenomics</h2><p>Supply distribution, top-holder concentration, vesting schedules.</p>
      <h2>Community</h2><p>Sentiment, social dominance, follower growth, holder count.</p>
      <h2>Development</h2><p>GitHub activity, contributors, last commit, repo health.</p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "How to Read a Token Health Scan",
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME, logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE } },
        mainEntityOfPage: `${SITE_URL}/token-scan-guide`,
      },
    ],
  },
  "/token-sniffer-comparison": {
    title: `Token Sniffer vs Token Health Scan — Honest Comparison`,
    description: "Compare Token Sniffer and Token Health Scan: scoring depth, chains, AI analysis, security signals, pricing.",
    h1: "Token Sniffer vs Token Health Scan",
    body: `<p>Both tools surface token risks. ${SITE_NAME} adds AI risk analysis, multi-chain coverage including Solana, locked-liquidity duration data, GitHub-backed development scoring, and LunarCrush social sentiment.</p>`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: "Token Sniffer vs Token Health Scan",
        author: { "@type": "Organization", name: SITE_NAME },
        publisher: { "@type": "Organization", name: SITE_NAME },
      },
    ],
  },
  "/solana-launchpads": {
    title: `Solana Launchpads Directory ${new Date().getFullYear()} | ${SITE_NAME}`,
    description: "Curated directory of Solana launchpads. Compare vetting, liquidity locking, and community size.",
    h1: "Solana Launchpads Directory",
    body: `<p>Discover the top Solana launchpads. Each platform is evaluated for security, vetting, and track record.</p>`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "ItemList", name: "Solana Launchpads", url: `${SITE_URL}/solana-launchpads` },
    ],
  },
  "/ethereum-launchpads": {
    title: `Ethereum Launchpads Directory ${new Date().getFullYear()} | ${SITE_NAME}`,
    description: "Curated directory of Ethereum launchpads with vetting, KYC, and liquidity-lock comparison.",
    h1: "Ethereum Launchpads Directory",
    body: `<p>Discover the top Ethereum launchpads, evaluated for security and track record.</p>`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "ItemList", name: "Ethereum Launchpads", url: `${SITE_URL}/ethereum-launchpads` },
    ],
  },
  "/ai-agents": {
    title: `AI Agent Tokens — Featured Projects | ${SITE_NAME}`,
    description: "Health-scanned AI agent tokens. Compare market cap, framework, and risk scores across Virtuals, ai16z, and more.",
    h1: "AI Agent Tokens",
    body: `<p>Featured AI agent tokens with up-to-date health scoring across security, liquidity, tokenomics, community and development.</p>`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "ItemList", name: "AI Agent Tokens", url: `${SITE_URL}/ai-agents` },
    ],
  },
  "/agent-directory": {
    title: `ERC-8004 Agent Directory | ${SITE_NAME}`,
    description: "Organic registry of ERC-8004 agents with trust scores and health metrics.",
    h1: "Agent Directory",
    body: `<p>Browse ERC-8004 agents that have been scanned for trust, capability, and operational health.</p>`,
    jsonLd: [
      { "@context": "https://schema.org", "@type": "ItemList", name: "ERC-8004 Agents", url: `${SITE_URL}/agent-directory` },
    ],
  },
  "/agent-scan": {
    title: `Scan an AI Agent — ERC-8004 Trust Score | ${SITE_NAME}`,
    description: "Scan any ERC-8004 agent for trust score, identity, capability, reputation, and operational health.",
    h1: "Scan an AI Agent",
    body: `<p>Enter an agent ID to receive a trust score across five ERC-8004 dimensions.</p>`,
  },
  "/copilot": {
    title: `Token Copilot — Conversational Crypto Research | ${SITE_NAME}`,
    description: "Chat with a crypto research copilot powered by CoinGecko MCP and full Token Health Scan data.",
    h1: "Token Copilot",
    body: `<p>Ask natural-language questions about any token. Get prices, holders, security flags, and risk insights without leaving chat.</p>`,
  },
  "/privacy": {
    title: `Privacy Policy — ${SITE_NAME}`,
    description: "Privacy policy for Token Health Scan.",
    h1: "Privacy Policy",
    body: `<p>How we handle data. See the live page for the full text.</p>`,
  },
  "/terms": {
    title: `Terms of Service — ${SITE_NAME}`,
    description: "Terms of service for Token Health Scan.",
    h1: "Terms of Service",
    body: `<p>The terms governing use of Token Health Scan. See the live page for the full text.</p>`,
  },
  "/ltd": {
    title: `Lifetime Deal — ${SITE_NAME}`,
    description: "Lifetime access to Token Health Scan Pro features.",
    h1: "Lifetime Deal",
    body: `<p>One-time payment for lifetime Pro access. Limited availability.</p>`,
  },
};

export const STATIC_ROUTES = Object.keys(STATIC_DEFS) as StaticKey[];

export function renderStaticPage(path: string): string | null {
  const def = STATIC_DEFS[path as StaticKey];
  if (!def) return null;
  const canonical = path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
  const body = `
  <nav><a href="${SITE_URL}">${SITE_NAME}</a>${path !== "/" ? ` › ${escHtml(def.h1)}` : ""}</nav>
  <main>
    <h1>${escHtml(def.h1)}</h1>
    ${def.body}
  </main>`;
  return renderPage({
    title: def.title,
    description: def.description,
    canonical,
    jsonLd: def.jsonLd || [],
    bodyHtml: body,
  });
}

// ─── Storage path helpers ────────────────────────────────────────────────
/** Map a URL path to a storage object key in the seo-snapshots bucket. */
export function pathToStorageKey(path: string): string {
  const clean = path.replace(/\/+$/, "") || "/";
  if (clean === "/") return "index.html";
  // Strip leading slash, keep nested segments
  return `${clean.replace(/^\//, "")}/index.html`;
}
