
// Vercel serverless function for prerendering token and guide pages
export default async function handler(req, res) {
  const { token } = req.query;
  const pathname = req.url;
  
  // Check if request is from a bot/crawler
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|discordbot/i.test(userAgent);
  
  if (!isBot) {
    // Regular users get the normal React app
    if (token) {
      return res.redirect(307, `/token/${token}`);
    }
    return res.redirect(307, pathname);
  }
  
  try {
    // Handle guide pages
    if (pathname.includes('/token-scan-guide') || 
        pathname.includes('/token-sniffer-comparison') || 
        pathname.includes('/solana-launchpads') || 
        pathname.includes('/ethereum-launchpads')) {
      return handleGuidePage(req, res, pathname);
    }
    
    // Handle token pages
    if (token) {
      return handleTokenPage(req, res, token);
    }
    
    // Default fallback
    return res.redirect(307, pathname);
    
  } catch (error) {
    console.error('Prerender error:', error);
    res.status(500).send('Internal server error');
  }
}

async function handleGuidePage(req, res, pathname) {
  const guideData = getGuidePageData(pathname);
  
  if (!guideData) {
    return res.status(404).send('Guide page not found');
  }
  
  const html = generateGuidePageHTML(guideData);
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}

async function handleTokenPage(req, res, token) {
  const supabaseUrl = 'https://qaqebpcqespvzbfwawlp.supabase.co';
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3ODkxNzEsImV4cCI6MjA2MzM2NTE3MX0.11hoagaFRKXswTNtXTwDM4NDHpPMO5EDEUhyFS3N8v4';
  
  // Fetch token report
  const reportResponse = await fetch(`${supabaseUrl}/rest/v1/token_reports?token_symbol=eq.${token.toLowerCase()}&select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  const reportData = await reportResponse.json();
  
  if (!reportData || reportData.length === 0) {
    return res.status(404).send('Token report not found');
  }
  
  const report = reportData[0];
  
  // Fetch token cache data
  const cacheResponse = await fetch(`${supabaseUrl}/rest/v1/token_data_cache?token_address=eq.${report.token_address}&chain_id=eq.${report.chain_id}&select=*`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`
    }
  });
  
  const cacheData = await cacheResponse.json();
  const tokenCache = cacheData && cacheData.length > 0 ? cacheData[0] : null;
  
  // Generate prerendered HTML
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
  
  const html = generateStaticHTML(tokenData, report.report_content);
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}

function getGuidePageData(pathname) {
  const currentDate = new Date().toISOString();
  
  const routes = {
    '/token-scan-guide': {
      title: "Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens",
      description: "Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques.",
      canonical_url: "https://tokenhealthscan.com/token-scan-guide",
      image_url: "https://tokenhealthscan.com/lovable-uploads/ths-cover-token-scan-guide.png",
      published_date: "2025-06-19T17:58:00Z"
    },
    '/token-sniffer-comparison': {
      title: "TokenHealthScan vs Token Sniffer: 2025 Comparison Guide",
      description: "Compare TokenHealthScan and Token Sniffer for crypto token analysis. See features, pricing, accuracy, and which tool is best for your needs.",
      canonical_url: "https://tokenhealthscan.com/token-sniffer-comparison",
      image_url: "https://tokenhealthscan.com/lovable-uploads/token-sniffer-vs-tokenhealthscan-cover.png",
      published_date: "2025-06-19"
    },
    '/solana-launchpads': {
      title: "Solana Launchpads Guide 2025: From Pump.fun to MetaDAO | TokenHealthScan",
      description: "Discover and compare the best Solana launchpads for your token. From Pump.fun's viral memes to MetaDAO's governance-first approach - find the perfect platform for your project.",
      canonical_url: "https://tokenhealthscan.com/solana-launchpads",
      image_url: "https://tokenhealthscan.com/lovable-uploads/solana-launchpads2.png",
      published_date: "2025-01-15T10:00:00.000Z"
    },
    '/ethereum-launchpads': {
      title: "Ethereum Launchpads Explained: Platforms, Projects, and Best Practices",
      description: "Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token. Includes trends, tips, and platform comparisons.",
      canonical_url: "https://tokenhealthscan.com/ethereum-launchpads",
      image_url: "https://tokenhealthscan.com/lovable-uploads/ethereum-token-launchpad-progress.png",
      published_date: "2025-01-15"
    }
  };
  
  return routes[pathname] || null;
}

function generateGuidePageHTML(guideData) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <title>${guideData.title}</title>
  <meta name="description" content="${guideData.description}" />
  <meta name="author" content="Token Health Scan" />
  
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
  <div id="root">
    <div style="padding: 2rem; text-align: center; font-family: system-ui;">
      <h1>${guideData.title}</h1>
      <p>Loading comprehensive guide...</p>
    </div>
  </div>
  
  <script>
    // Redirect to React app for interactive experience
    if (typeof window !== 'undefined') {
      window.location.href = '${guideData.canonical_url.replace('https://tokenhealthscan.com', '')}';
    }
  </script>
</body>
</html>`;
}

function generateStaticHTML(tokenData, reportContent) {
  const title = `${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report | Token Health Scan`;
  const description = `Comprehensive risk analysis and security report for ${tokenData.name} (${tokenData.symbol.toUpperCase()}). Get detailed insights on security, tokenomics, liquidity, community, and development${tokenData.overall_score ? ` with an overall risk score of ${tokenData.overall_score}/100` : ''}.`;
  const canonicalUrl = `https://tokenhealthscan.com/token/${tokenData.symbol.toLowerCase()}`;
  const imageUrl = tokenData.logo_url || "https://tokenhealthscan.com/tokenhealthscan-og.png";
  
  // Generate all structured data schemas - no duplicates
  const schemas = generateAllTokenSchemas(tokenData, canonicalUrl, reportContent);
  const structuredDataHTML = schemas.map(schema => 
    `<script type="application/ld+json">${JSON.stringify(schema)}</script>`
  ).join('\n  ');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Dynamic Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${tokenData.name}, ${tokenData.symbol}, crypto risk, token analysis, security report, DeFi, cryptocurrency, smart contract audit, liquidity analysis, tokenomics" />
  <meta name="author" content="Token Health Scan" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Token Health Scan" />
  
  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <meta name="twitter:title" content="${tokenData.name} Risk Report" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${canonicalUrl}" />
  
  <!-- Structured Data - All schemas in one place, no duplicates -->
  ${structuredDataHTML}
  
  <!-- Favicon -->
  <link rel="icon" href="/lovable-uploads/ae39e42e-1394-4b63-8dd4-8ca4bf332fa3.png" type="image/png">
  
  <!-- Preload critical resources -->
  <link rel="preload" as="image" href="${imageUrl}">
  <link rel="dns-prefetch" href="//fonts.googleapis.com">
</head>
<body>
  <!-- This content will be hydrated by React -->
  <div id="root">
    <div style="padding: 2rem; text-align: center; font-family: system-ui;">
      <h1>${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report</h1>
      <p>Loading comprehensive risk analysis...</p>
      <p>Score: ${tokenData.overall_score || 'Calculating'}/100</p>
    </div>
  </div>
  
  <!-- Load React app -->
  <script type="module" src="/src/main.tsx"></script>
  
  <!-- Bot detection and redirect script -->
  <script>
    // Only load React for regular users, not bots
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling/i)) {
      // React will hydrate this page
    } else {
      // For bots, redirect to React app after brief delay
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/token/${tokenData.symbol.toLowerCase()}';
        }
      }, 1000);
    }
  </script>
</body>
</html>`;
}

// Schema generation functions for the serverless environment
function generateAllTokenSchemas(tokenData, reportUrl, reportContent) {
  const schemas = [];
  
  // FinancialProduct schema
  const financialProductSchema = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "name": tokenData.name,
    "alternateName": tokenData.symbol.toUpperCase(),
    "url": reportUrl,
    "description": tokenData.description || `Comprehensive risk analysis and security report for ${tokenData.name} (${tokenData.symbol.toUpperCase()}).`,
    "category": "Cryptocurrency",
    "provider": {
      "@type": "Organization",
      "name": "Token Health Scan",
      "url": "https://tokenhealthscan.com"
    }
  };
  
  if (tokenData.logo_url) {
    financialProductSchema.image = tokenData.logo_url;
  }
  
  const sameAs = [];
  if (tokenData.coingecko_id) {
    sameAs.push(`https://www.coingecko.com/en/coins/${tokenData.coingecko_id}`);
  }
  if (tokenData.website_url) {
    sameAs.push(tokenData.website_url.startsWith('http') ? tokenData.website_url : `https://${tokenData.website_url}`);
  }
  if (tokenData.token_address) {
    sameAs.push(`https://etherscan.io/token/${tokenData.token_address}`);
  }
  
  if (sameAs.length > 0) {
    financialProductSchema.sameAs = sameAs;
  }
  
  schemas.push(financialProductSchema);
  
  // Review schema (only if we have a score)
  if (tokenData.overall_score) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Review",
      "itemReviewed": {
        "@type": "FinancialProduct",
        "name": tokenData.name,
        "alternateName": tokenData.symbol.toUpperCase()
      },
      "reviewRating": {
        "@type": "Rating",
        "ratingValue": tokenData.overall_score,
        "bestRating": 100,
        "worstRating": 0
      },
      "author": {
        "@type": "Organization",
        "name": "Token Health Scan"
      },
      "reviewBody": `Comprehensive risk analysis of ${tokenData.name} covering security, liquidity, tokenomics, community, and development aspects.`,
      "url": reportUrl
    });
  }
  
  // FAQ schema (only if we have FAQ content)
  if (reportContent?.faq) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": reportContent.faq.map(item => ({
        "@type": "Question",
        "name": item.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": item.answer
        }
      }))
    });
  }
  
  // Breadcrumb schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://tokenhealthscan.com"
      },
      {
        "@type": "ListItem", 
        "position": 2,
        "name": "Token Reports",
        "item": "https://tokenhealthscan.com/reports"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": `${tokenData.name} Report`,
        "item": reportUrl
      }
    ]
  });
  
  // Organization schema
  schemas.push({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Token Health Scan",
    "url": "https://tokenhealthscan.com",
    "logo": "https://tokenhealthscan.com/tokenhealthscan-og.png",
    "description": "AI-powered cryptocurrency risk analysis platform providing comprehensive token security and risk assessments.",
    "foundingDate": "2024",
    "sameAs": [
      "https://twitter.com/tokenhealthscan"
    ]
  });
  
  return schemas;
}
