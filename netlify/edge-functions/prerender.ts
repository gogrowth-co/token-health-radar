// Netlify Edge Function — Deno runtime
// Intercepts bot/crawler requests and returns server-rendered HTML
// so search engines and AI crawlers see real content instead of an empty SPA shell.

const SUPABASE_URL = "https://qaqebpcqespvzbfwawlp.supabase.co";
const SUPABASE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3ODkxNzEsImV4cCI6MjA2MzM2NTE3MX0.11hoagaFRKXswTNtXTwDM4NDHpPMO5EDEUhyFS3N8v4";

// Expanded bot pattern — covers search engines, social scrapers, and AI crawlers
const BOT_PATTERN =
  /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|discordbot|telegrambot|googlebot|bingbot|yandex|baidu|semrush|ahrefs|mj12bot|dotbot|rogerbot|applebot|gptbot|chatgpt|perplexitybot|claudebot|anthropic|ccbot|cohere|ia_archiver|archive\.org/i;

const STATIC_ASSET_PATTERN =
  /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|json|xml|txt|map)$/i;

const SUPABASE_HEADERS: Record<string, string> = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

export default async function handler(request: Request, context: any) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. Always pass through static assets — no overhead for these
  if (STATIC_ASSET_PATTERN.test(path)) {
    return context.next();
  }

  // 2. Pass through for regular users
  const ua = request.headers.get("user-agent") ?? "";
  if (!BOT_PATTERN.test(ua)) {
    return context.next();
  }

  // --- Bot detected below this line ---

  // 3. Token report pages: /token/:symbol
  const tokenMatch = path.match(/^\/token\/([^/]+)\/?$/);
  if (tokenMatch) {
    return renderTokenPage(tokenMatch[1], context);
  }

  // 4. Guide pages — static pre-built HTML
  const guideHtml = getGuideHtml(path);
  if (guideHtml) {
    return new Response(guideHtml, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    });
  }

  // 5. Everything else — pass through to SPA
  return context.next();
}

// ---------------------------------------------------------------------------
// Token page rendering
// ---------------------------------------------------------------------------

async function renderTokenPage(symbol: string, context: any): Promise<Response> {
  try {
    // Step 1: fetch report by symbol
    const reportRes = await fetch(
      `${SUPABASE_URL}/rest/v1/token_reports?token_symbol=eq.${encodeURIComponent(
        symbol.toLowerCase()
      )}&select=*`,
      { headers: SUPABASE_HEADERS }
    );

    if (!reportRes.ok) return context.next();
    const reports = await reportRes.json();
    const report = Array.isArray(reports) ? reports[0] : null;
    if (!report) return context.next(); // token not found → graceful fallback to SPA

    // Step 2: fetch token cache data (price, logo, description, etc.)
    const cacheRes = await fetch(
      `${SUPABASE_URL}/rest/v1/token_data_cache?token_address=eq.${encodeURIComponent(
        report.token_address
      )}&chain_id=eq.${encodeURIComponent(report.chain_id)}&select=*`,
      { headers: SUPABASE_HEADERS }
    );

    const cacheRows = cacheRes.ok ? await cacheRes.json() : [];
    const cache = Array.isArray(cacheRows) ? cacheRows[0] : null;

    const content: Record<string, unknown> = report.report_content ?? {};
    const metadata: Record<string, unknown> = (content.metadata as Record<string, unknown>) ?? {};
    const scores = (metadata.scores as Record<string, number>) ?? {};

    const tokenData: TokenData = {
      symbol: ((cache?.symbol || symbol) as string).toUpperCase(),
      name: (cache?.name || symbol.toUpperCase()) as string,
      logo_url: (cache?.logo_url as string) ?? null,
      description: (cache?.description as string) ?? null,
      website_url: (cache?.website_url as string) ?? null,
      twitter_handle: (cache?.twitter_handle as string) ?? null,
      coingecko_id: (cache?.coingecko_id as string) ?? null,
      current_price_usd: (cache?.current_price_usd as number) ?? null,
      market_cap_usd: (cache?.market_cap_usd as number) ?? null,
      overall_score: (scores.overall as number) ?? (metadata.overallScore as number) ?? null,
      token_address: report.token_address as string,
      chain_id: report.chain_id as string,
    };

    const html = generateTokenHtml(tokenData, content);
    return new Response(html, {
      status: 200,
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (_err) {
    // On any network/parse error, fall through to the SPA
    return context.next();
  }
}

// ---------------------------------------------------------------------------
// HTML generation — token pages
// ---------------------------------------------------------------------------

function extractText(field: unknown): string {
  if (typeof field === "string") return field;
  if (field && typeof field === "object") {
    const f = field as Record<string, unknown>;
    return (f.summary as string) || (f.overview as string) || "";
  }
  return "";
}

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface TokenData {
  symbol: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  twitter_handle: string | null;
  coingecko_id: string | null;
  current_price_usd: number | null;
  market_cap_usd: number | null;
  overall_score: number | null;
  token_address: string;
  chain_id: string;
}

function generateTokenHtml(token: TokenData, content: Record<string, unknown>): string {
  const currentYear = new Date().getFullYear();
  const symbolLower = token.symbol.toLowerCase();
  const canonicalUrl = `https://tokenhealthscan.com/token/${symbolLower}`;
  const imageUrl = token.logo_url || "https://tokenhealthscan.com/tokenhealthscan-og.png";
  const scoreText =
    token.overall_score != null ? ` with an overall risk score of ${token.overall_score}/100` : "";
  const title = `${token.name} Risk Score & Audit (${currentYear}) | Token Health Scan`;
  const description = `Comprehensive risk analysis and security report for ${token.name} (${token.symbol}). Get detailed insights on security, tokenomics, liquidity, community, and development${scoreText}.`;

  // JSON-LD schemas
  const sameAs: string[] = [];
  if (token.coingecko_id) sameAs.push(`https://www.coingecko.com/en/coins/${token.coingecko_id}`);
  if (token.website_url) {
    sameAs.push(
      token.website_url.startsWith("http") ? token.website_url : `https://${token.website_url}`
    );
  }
  if (token.token_address) sameAs.push(`https://etherscan.io/token/${token.token_address}`);

  const financialProduct: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    name: token.name,
    alternateName: token.symbol,
    url: canonicalUrl,
    description: token.description || description,
    category: "Cryptocurrency",
    provider: {
      "@type": "Organization",
      name: "Token Health Scan",
      url: "https://tokenhealthscan.com",
    },
  };
  if (token.logo_url) financialProduct.image = token.logo_url;
  if (sameAs.length) financialProduct.sameAs = sameAs;

  const schemas: unknown[] = [financialProduct];

  const faq = content.faq;
  if (Array.isArray(faq) && faq.length > 0) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: (faq as Array<Record<string, string>>).map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }

  schemas.push({
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Buy ${token.name} (${token.symbol})`,
    description: `A step-by-step guide to safely buying ${token.name} tokens`,
    image: imageUrl,
    totalTime: "PT5M",
    step: [
      {
        "@type": "HowToStep",
        name: "Set up a cryptocurrency wallet",
        text: "Download and set up a secure cryptocurrency wallet that supports Ethereum-based tokens, such as MetaMask or Trust Wallet.",
      },
      {
        "@type": "HowToStep",
        name: "Purchase ETH or USDC",
        text: "Buy Ethereum (ETH) or USD Coin (USDC) from a reputable cryptocurrency exchange like Coinbase, Binance, or Kraken.",
      },
      {
        "@type": "HowToStep",
        name: "Transfer funds to your wallet",
        text: "Withdraw your ETH or USDC from the exchange to your personal cryptocurrency wallet address.",
      },
      {
        "@type": "HowToStep",
        name: "Connect to a decentralized exchange",
        text: "Visit a DEX like Uniswap or SushiSwap and connect your wallet to the platform.",
      },
      {
        "@type": "HowToStep",
        name: `Swap for ${token.symbol}`,
        text: `Use the DEX interface to swap your ETH or USDC for ${token.name} (${token.symbol}). Always verify the token contract address before completing the transaction.`,
      },
    ],
  });

  schemas.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tokenhealthscan.com" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Token Reports",
        item: "https://tokenhealthscan.com/token",
      },
      { "@type": "ListItem", position: 3, name: `${token.name} Report`, item: canonicalUrl },
    ],
  });

  schemas.push({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Token Health Scan",
    url: "https://tokenhealthscan.com",
    logo: "https://tokenhealthscan.com/tokenhealthscan-og.png",
    description:
      "AI-powered cryptocurrency risk analysis platform providing comprehensive token security and risk assessments.",
    foundingDate: "2024",
    sameAs: ["https://twitter.com/tokenhealthscan"],
  });

  const ldBlocks = schemas
    .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join("\n  ");

  const whatIsToken = esc(
    extractText(content.whatIsToken) || `${token.name} is a cryptocurrency token.`
  );
  const securityAnalysis = esc(
    extractText(content.securityAnalysis) || "Security analysis available on the full report."
  );
  const liquidityAnalysis = esc(
    extractText(content.liquidityAnalysis) || "Liquidity analysis available on the full report."
  );
  const tokenomicsAnalysis = esc(
    extractText(content.tokenomicsAnalysis) || "Tokenomics analysis available on the full report."
  );
  const communityAnalysis = esc(extractText(content.communityAnalysis));
  const developmentAnalysis = esc(extractText(content.developmentAnalysis));

  const faqHtml =
    Array.isArray(faq) && faq.length > 0
      ? `<section>
      <h2>Frequently Asked Questions about ${esc(token.name)}</h2>
      ${(faq as Array<Record<string, string>>)
        .map((item) => `<div><h3>${esc(item.question)}</h3><p>${esc(item.answer)}</p></div>`)
        .join("\n      ")}
    </section>`
      : "";

  const priceHtml =
    token.current_price_usd != null ? `<span>Current Price: $${token.current_price_usd}</span> &nbsp;` : "";
  const mcapHtml =
    token.market_cap_usd != null
      ? `<span>Market Cap: $${Number(token.market_cap_usd).toLocaleString()}</span>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="keywords" content="${esc(token.name)}, ${esc(token.symbol)}, crypto risk, token analysis, security report, DeFi, cryptocurrency, smart contract audit, liquidity analysis, tokenomics" />
  <meta name="author" content="Token Health Scan" />
  <meta property="og:title" content="${esc(token.name)} (${esc(token.symbol)}) Risk Report" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${esc(imageUrl)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Token Health Scan" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <meta name="twitter:title" content="${esc(token.name)} Risk Report" />
  <meta name="twitter:description" content="${esc(description)}" />
  <meta name="twitter:image" content="${esc(imageUrl)}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${ldBlocks}
  <link rel="icon" href="/lovable-uploads/ae39e42e-1394-4b63-8dd4-8ca4bf332fa3.png" type="image/png">
</head>
<body>
  <main>
    <article>
      <header>
        <h1>${esc(token.name)} (${esc(token.symbol)}) Risk Report</h1>
        <p>Comprehensive risk analysis and security assessment for ${esc(token.name)}</p>
        <p>
          ${token.overall_score != null ? `<strong>Overall Risk Score: ${token.overall_score}/100</strong> &nbsp;` : ""}
          ${priceHtml}${mcapHtml}
        </p>
      </header>

      <section>
        <h2>What is ${esc(token.name)}?</h2>
        <p>${whatIsToken}</p>
      </section>

      <section>
        <h2>Security Analysis</h2>
        <p>${securityAnalysis}</p>
      </section>

      <section>
        <h2>Liquidity Analysis</h2>
        <p>${liquidityAnalysis}</p>
      </section>

      <section>
        <h2>Tokenomics Analysis</h2>
        <p>${tokenomicsAnalysis}</p>
      </section>

      ${communityAnalysis ? `<section><h2>Community Analysis</h2><p>${communityAnalysis}</p></section>` : ""}
      ${developmentAnalysis ? `<section><h2>Development Analysis</h2><p>${developmentAnalysis}</p></section>` : ""}

      ${faqHtml}
    </article>
  </main>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Guide pages — static HTML
// ---------------------------------------------------------------------------

interface GuideMeta {
  title: string;
  description: string;
  canonical: string;
  image: string;
  published: string;
}

const GUIDE_PAGES: Record<string, GuideMeta> = {
  "/token-scan-guide": {
    title: "Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens",
    description:
      "Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques.",
    canonical: "https://tokenhealthscan.com/token-scan-guide",
    image: "https://tokenhealthscan.com/lovable-uploads/ths-cover-token-scan-guide.png",
    published: "2025-06-19T17:58:00Z",
  },
  "/token-sniffer-comparison": {
    title: "TokenHealthScan vs Token Sniffer: 2025 Comparison Guide",
    description:
      "Compare TokenHealthScan and Token Sniffer for crypto token analysis. See features, pricing, accuracy, and which tool is best for your needs.",
    canonical: "https://tokenhealthscan.com/token-sniffer-comparison",
    image: "https://tokenhealthscan.com/lovable-uploads/token-sniffer-vs-tokenhealthscan-cover.png",
    published: "2025-06-19",
  },
  "/token-sniffer-vs-tokenhealthscan": {
    title: "TokenHealthScan vs Token Sniffer: 2025 Comparison Guide",
    description:
      "Compare TokenHealthScan and Token Sniffer for crypto token analysis. See features, pricing, accuracy, and which tool is best for your needs.",
    canonical: "https://tokenhealthscan.com/token-sniffer-vs-tokenhealthscan",
    image: "https://tokenhealthscan.com/lovable-uploads/token-sniffer-vs-tokenhealthscan-cover.png",
    published: "2025-06-19",
  },
  "/solana-launchpads": {
    title: "Solana Launchpads Guide 2025: From Pump.fun to MetaDAO | TokenHealthScan",
    description:
      "Discover and compare the best Solana launchpads for your token. From Pump.fun's viral memes to MetaDAO's governance-first approach - find the perfect platform for your project.",
    canonical: "https://tokenhealthscan.com/solana-launchpads",
    image: "https://tokenhealthscan.com/lovable-uploads/solana-launchpads2.png",
    published: "2025-01-15T10:00:00.000Z",
  },
  "/ethereum-launchpads": {
    title: "Ethereum Launchpads Explained: Platforms, Projects, and Best Practices",
    description:
      "Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token. Includes trends, tips, and platform comparisons.",
    canonical: "https://tokenhealthscan.com/ethereum-launchpads",
    image: "https://tokenhealthscan.com/lovable-uploads/ethereum-token-launchpad-progress.png",
    published: "2025-01-15",
  },
};

function getGuideHtml(path: string): string | null {
  const meta = GUIDE_PAGES[path];
  if (!meta) return null;
  const modifiedDate = new Date().toISOString();

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: meta.title,
    description: meta.description,
    author: { "@type": "Organization", name: "TokenHealthScan" },
    publisher: {
      "@type": "Organization",
      name: "TokenHealthScan",
      logo: {
        "@type": "ImageObject",
        url: "https://tokenhealthscan.com/tokenhealthscan-og.png",
      },
    },
    datePublished: meta.published,
    dateModified: modifiedDate,
    mainEntityOfPage: { "@type": "WebPage", "@id": meta.canonical },
    image: meta.image,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://tokenhealthscan.com" },
      { "@type": "ListItem", position: 2, name: meta.title, item: meta.canonical },
    ],
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(meta.title)}</title>
  <meta name="description" content="${esc(meta.description)}" />
  <meta name="author" content="Token Health Scan" />
  <meta property="og:title" content="${esc(meta.title)}" />
  <meta property="og:description" content="${esc(meta.description)}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${meta.canonical}" />
  <meta property="og:image" content="${esc(meta.image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Token Health Scan" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <meta name="twitter:title" content="${esc(meta.title)}" />
  <meta name="twitter:description" content="${esc(meta.description)}" />
  <meta name="twitter:image" content="${esc(meta.image)}" />
  <link rel="canonical" href="${meta.canonical}" />
  <script type="application/ld+json">${JSON.stringify(articleSchema)}</script>
  <script type="application/ld+json">${JSON.stringify(breadcrumbSchema)}</script>
  <link rel="icon" href="/lovable-uploads/ae39e42e-1394-4b63-8dd4-8ca4bf332fa3.png" type="image/png">
</head>
<body>
  <main>
    <article>
      <h1>${esc(meta.title)}</h1>
      <p>${esc(meta.description)}</p>
      <p>Visit <a href="${meta.canonical}">${meta.canonical}</a> for the full interactive guide.</p>
    </article>
  </main>
</body>
</html>`;
}
