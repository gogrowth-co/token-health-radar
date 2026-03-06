// Netlify Function for prerendering pages to AI crawlers and bots

const SUPABASE_URL = 'https://qaqebpcqespvzbfwawlp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3ODkxNzEsImV4cCI6MjA2MzM2NTE3MX0.11hoagaFRKXswTNtXTwDM4NDHpPMO5EDEUhyFS3N8v4';

export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.searchParams.get('path') || url.pathname;

  try {
    // Handle guide pages
    if (path.includes('/token-scan-guide') || 
        path.includes('/token-sniffer-comparison') ||
        path.includes('/token-sniffer-vs-tokenhealthscan') ||
        path.includes('/solana-launchpads') || 
        path.includes('/ethereum-launchpads')) {
      return handleGuidePage(path);
    }

    // Handle token pages: /token/{symbol}
    const tokenMatch = path.match(/\/token\/([^/?]+)/);
    if (tokenMatch) {
      return handleTokenPage(tokenMatch[1]);
    }

    // Handle homepage
    if (path === '/' || path === '') {
      return handleHomePage();
    }

    // Fallback: return basic HTML with meta tags
    return new Response(generateFallbackHTML(path), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });

  } catch (error) {
    console.error('Prerender error:', error);
    return new Response(generateFallbackHTML(path), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
};

function handleHomePage() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Token Health Scan — AI-Powered Crypto Risk Analysis</title>
  <meta name="description" content="Scan any crypto token for risks across security, liquidity, tokenomics, community, and development. Free AI-powered token health reports." />
  <meta property="og:title" content="Token Health Scan — AI-Powered Crypto Risk Analysis" />
  <meta property="og:description" content="Scan any crypto token for risks across security, liquidity, tokenomics, community, and development." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="https://tokenhealthscan.com/" />
  <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
  <meta property="og:site_name" content="Token Health Scan" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <meta name="twitter:title" content="Token Health Scan — AI-Powered Crypto Risk Analysis" />
  <meta name="twitter:description" content="Scan any crypto token for risks across security, liquidity, tokenomics, community, and development." />
  <meta name="twitter:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
  <link rel="canonical" href="https://tokenhealthscan.com/" />
  <link rel="icon" href="/lovable-uploads/ae39e42e-1394-4b63-8dd4-8ca4bf332fa3.png" type="image/png">
  <script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "Token Health Scan",
    "url": "https://tokenhealthscan.com",
    "applicationCategory": "FinanceApplication",
    "description": "AI-powered cryptocurrency risk analysis platform providing comprehensive token security and risk assessments.",
    "operatingSystem": "Web Browser",
    "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
    "provider": { "@type": "Organization", "name": "Token Health Scan", "url": "https://tokenhealthscan.com" }
  })}</script>
</head>
<body>
  <main>
    <h1>Token Health Scan — AI-Powered Crypto Risk Analysis</h1>
    <p>Scan any crypto token for risks across security, liquidity, tokenomics, community, and development. Get a comprehensive health score and detailed risk report.</p>
    <section>
      <h2>How It Works</h2>
      <ol>
        <li>Enter a token name or contract address</li>
        <li>Our AI analyzes the token across 5 risk categories</li>
        <li>Get a detailed health report with actionable insights</li>
      </ol>
    </section>
    <section>
      <h2>Risk Categories</h2>
      <ul>
        <li>Security — Smart contract risks, honeypot detection, ownership analysis</li>
        <li>Liquidity — DEX depth, liquidity locks, trading volume</li>
        <li>Tokenomics — Supply distribution, inflation, holder concentration</li>
        <li>Community — Social presence, growth metrics, engagement</li>
        <li>Development — GitHub activity, commit frequency, open source status</li>
      </ul>
    </section>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
}

function handleGuidePage(pathname) {
  const guides = {
    '/token-scan-guide': {
      title: "Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens",
      description: "Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques.",
      canonical_url: "https://tokenhealthscan.com/token-scan-guide",
      image_url: "https://tokenhealthscan.com/lovable-uploads/ths-cover-token-scan-guide.png",
    },
    '/token-sniffer-comparison': {
      title: "TokenHealthScan vs Token Sniffer: 2025 Comparison Guide",
      description: "Compare TokenHealthScan and Token Sniffer for crypto token analysis. See features, pricing, accuracy, and which tool is best for your needs.",
      canonical_url: "https://tokenhealthscan.com/token-sniffer-comparison",
      image_url: "https://tokenhealthscan.com/lovable-uploads/token-sniffer-vs-tokenhealthscan-cover.png",
    },
    '/token-sniffer-vs-tokenhealthscan': {
      title: "TokenHealthScan vs Token Sniffer: 2025 Comparison Guide",
      description: "Compare TokenHealthScan and Token Sniffer for crypto token analysis.",
      canonical_url: "https://tokenhealthscan.com/token-sniffer-vs-tokenhealthscan",
      image_url: "https://tokenhealthscan.com/lovable-uploads/token-sniffer-vs-tokenhealthscan-cover.png",
    },
    '/solana-launchpads': {
      title: "Solana Launchpads Guide 2025: From Pump.fun to MetaDAO | TokenHealthScan",
      description: "Discover and compare the best Solana launchpads for your token. From Pump.fun to MetaDAO - find the perfect platform for your project.",
      canonical_url: "https://tokenhealthscan.com/solana-launchpads",
      image_url: "https://tokenhealthscan.com/lovable-uploads/solana-launchpads2.png",
    },
    '/ethereum-launchpads': {
      title: "Ethereum Launchpads Explained: Platforms, Projects, and Best Practices",
      description: "Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token.",
      canonical_url: "https://tokenhealthscan.com/ethereum-launchpads",
      image_url: "https://tokenhealthscan.com/lovable-uploads/ethereum-token-launchpad-progress.png",
    }
  };

  // Find matching guide by checking if path contains the key
  let guideData = null;
  for (const [key, data] of Object.entries(guides)) {
    if (pathname.includes(key.slice(1))) {
      guideData = data;
      break;
    }
  }

  if (!guideData) {
    return new Response('Not found', { status: 404 });
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${guideData.title}</title>
  <meta name="description" content="${guideData.description}" />
  <meta property="og:title" content="${guideData.title}" />
  <meta property="og:description" content="${guideData.description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${guideData.canonical_url}" />
  <meta property="og:image" content="${guideData.image_url}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Token Health Scan" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <meta name="twitter:title" content="${guideData.title}" />
  <meta name="twitter:description" content="${guideData.description}" />
  <meta name="twitter:image" content="${guideData.image_url}" />
  <link rel="canonical" href="${guideData.canonical_url}" />
  <link rel="icon" href="/lovable-uploads/ae39e42e-1394-4b63-8dd4-8ca4bf332fa3.png" type="image/png">
</head>
<body>
  <main>
    <h1>${guideData.title}</h1>
    <p>${guideData.description}</p>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600' }
  });
}

async function handleTokenPage(token) {
  try {
    const reportResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/token_reports?token_symbol=eq.${token.toLowerCase()}&select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const reportData = await reportResponse.json();

    if (!reportData || reportData.length === 0) {
      return new Response(generateFallbackHTML(`/token/${token}`), {
        status: 200,
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
      });
    }

    const report = reportData[0];

    const cacheResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/token_data_cache?token_address=eq.${report.token_address}&chain_id=eq.${report.chain_id}&select=*`,
      { headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` } }
    );
    const cacheData = await cacheResponse.json();
    const tokenCache = cacheData?.[0] || null;

    const tokenData = {
      symbol: tokenCache?.symbol || token,
      name: tokenCache?.name || token.toUpperCase(),
      logo_url: tokenCache?.logo_url,
      description: tokenCache?.description,
      website_url: tokenCache?.website_url,
      twitter_handle: tokenCache?.twitter_handle,
      coingecko_id: tokenCache?.coingecko_id,
      current_price_usd: tokenCache?.current_price_usd,
      market_cap_usd: tokenCache?.market_cap_usd,
      overall_score: report.report_content?.metadata?.scores?.overall,
      token_address: report.token_address,
      chain_id: report.chain_id
    };

    const html = generateTokenHTML(tokenData, report.report_content);
    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600, s-maxage=86400' }
    });

  } catch (error) {
    console.error('Token page error:', error);
    return new Response(generateFallbackHTML(`/token/${token}`), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

function generateTokenHTML(tokenData, reportContent) {
  const currentYear = new Date().getFullYear();
  const title = `${tokenData.name} Risk Score & Audit (${currentYear}) | Token Health Scan`;
  const description = `Comprehensive risk analysis for ${tokenData.name} (${tokenData.symbol.toUpperCase()}). Security, tokenomics, liquidity, community, and development insights${tokenData.overall_score ? ` — score ${tokenData.overall_score}/100` : ''}.`;
  const canonicalUrl = `https://tokenhealthscan.com/token/${tokenData.symbol.toLowerCase()}`;
  const imageUrl = tokenData.logo_url || "https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png";

  const schemas = generateAllTokenSchemas(tokenData, canonicalUrl, reportContent);
  const structuredDataHTML = schemas.map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ');

  const securityAnalysis = typeof reportContent?.securityAnalysis === 'string'
    ? reportContent.securityAnalysis
    : reportContent?.securityAnalysis?.summary || 'Security analysis available.';
  const liquidityAnalysis = typeof reportContent?.liquidityAnalysis === 'string'
    ? reportContent.liquidityAnalysis
    : reportContent?.liquidityAnalysis?.summary || 'Liquidity analysis available.';
  const tokenomicsAnalysis = typeof reportContent?.tokenomicsAnalysis === 'string'
    ? reportContent.tokenomicsAnalysis
    : reportContent?.tokenomicsAnalysis?.summary || 'Tokenomics analysis available.';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${tokenData.name}, ${tokenData.symbol}, crypto risk, token analysis, security report" />
  <meta property="og:title" content="${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Token Health Scan" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <meta name="twitter:title" content="${tokenData.name} Risk Report" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  <link rel="canonical" href="${canonicalUrl}" />
  ${structuredDataHTML}
  <link rel="icon" href="/lovable-uploads/ae39e42e-1394-4b63-8dd4-8ca4bf332fa3.png" type="image/png">
</head>
<body>
  <main>
    <article>
      <h1>${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report</h1>
      <p>Comprehensive risk analysis and security assessment for ${tokenData.name}</p>
      <div>
        <span>Overall Risk Score: ${tokenData.overall_score || 'Calculating'}/100</span>
        ${tokenData.current_price_usd ? `<span>Price: $${tokenData.current_price_usd}</span>` : ''}
        ${tokenData.market_cap_usd ? `<span>Market Cap: $${Number(tokenData.market_cap_usd).toLocaleString()}</span>` : ''}
      </div>
      <section>
        <h2>What is ${tokenData.name}?</h2>
        <p>${reportContent?.whatIsToken || tokenData.description || `${tokenData.name} is a cryptocurrency token analyzed for risk factors.`}</p>
      </section>
      <section><h2>Security Analysis</h2><p>${securityAnalysis}</p></section>
      <section><h2>Liquidity Analysis</h2><p>${liquidityAnalysis}</p></section>
      <section><h2>Tokenomics Analysis</h2><p>${tokenomicsAnalysis}</p></section>
      ${reportContent?.faq ? `<section><h2>FAQ</h2>${reportContent.faq.map(i => `<div><h3>${i.question}</h3><p>${i.answer}</p></div>`).join('')}</section>` : ''}
    </article>
  </main>
</body>
</html>`;
}

function generateFallbackHTML(path) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Token Health Scan</title>
  <meta name="description" content="AI-powered crypto token risk analysis. Scan any token for security, liquidity, and tokenomics risks." />
  <meta property="og:title" content="Token Health Scan" />
  <meta property="og:description" content="AI-powered crypto token risk analysis." />
  <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
  <meta property="og:url" content="https://tokenhealthscan.com${path}" />
  <link rel="canonical" href="https://tokenhealthscan.com${path}" />
</head>
<body>
  <main><h1>Token Health Scan</h1><p>AI-powered crypto token risk analysis platform.</p></main>
</body>
</html>`;
}

function generateAllTokenSchemas(tokenData, reportUrl, reportContent) {
  const schemas = [];

  schemas.push({
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "name": tokenData.name,
    "alternateName": tokenData.symbol.toUpperCase(),
    "url": reportUrl,
    "description": tokenData.description || `Risk analysis for ${tokenData.name} (${tokenData.symbol.toUpperCase()}).`,
    "category": "Cryptocurrency",
    "provider": { "@type": "Organization", "name": "Token Health Scan", "url": "https://tokenhealthscan.com" },
    ...(tokenData.logo_url && { image: tokenData.logo_url }),
    ...((() => {
      const sameAs = [];
      if (tokenData.coingecko_id) sameAs.push(`https://www.coingecko.com/en/coins/${tokenData.coingecko_id}`);
      if (tokenData.website_url) sameAs.push(tokenData.website_url.startsWith('http') ? tokenData.website_url : `https://${tokenData.website_url}`);
      if (tokenData.token_address) sameAs.push(`https://etherscan.io/token/${tokenData.token_address}`);
      return sameAs.length > 0 ? { sameAs } : {};
    })())
  });

  if (reportContent?.faq) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": reportContent.faq.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": { "@type": "Answer", "text": item.answer }
      }))
    });
  }

  schemas.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://tokenhealthscan.com" },
      { "@type": "ListItem", "position": 2, "name": "Token Reports", "item": "https://tokenhealthscan.com/reports" },
      { "@type": "ListItem", "position": 3, "name": `${tokenData.name} Report`, "item": reportUrl }
    ]
  });

  return schemas;
}
