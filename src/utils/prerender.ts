
interface PrerenderTokenData {
  symbol: string;
  name: string;
  logo_url?: string;
  description?: string;
  website_url?: string;
  twitter_handle?: string;
  coingecko_id?: string;
  current_price_usd?: number;
  market_cap_usd?: number;
  overall_score?: number;
  token_address: string;
  chain_id: string;
}

export const generateStaticHTML = (tokenData: PrerenderTokenData, reportContent: any) => {
  const title = `${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report | Token Health Scan`;
  const description = `Comprehensive risk analysis and security report for ${tokenData.name} (${tokenData.symbol.toUpperCase()}). Get detailed insights on security, tokenomics, liquidity, community, and development${tokenData.overall_score ? ` with an overall risk score of ${tokenData.overall_score}/100` : ''}.`;
  const canonicalUrl = `https://tokenhealthscan.com/token/${tokenData.symbol.toLowerCase()}`;
  const imageUrl = tokenData.logo_url || "https://tokenhealthscan.com/tokenhealthscan-og.png";

  const financialProductSchema = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "name": tokenData.name,
    "alternateName": tokenData.symbol.toUpperCase(),
    "url": canonicalUrl,
    "description": tokenData.description || description,
    "category": "Cryptocurrency",
    "image": tokenData.logo_url,
    "provider": {
      "@type": "Organization",
      "name": "Token Health Scan",
      "url": "https://tokenhealthscan.com"
    }
  };

  const reviewSchema = tokenData.overall_score ? {
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
    "url": canonicalUrl
  } : null;

  const faqSchema = reportContent?.faq ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": reportContent.faq.map((item: any) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer
      }
    }))
  } : null;

  const breadcrumbSchema = {
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
        "item": canonicalUrl
      }
    ]
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Dynamic Token-Specific Meta Tags -->
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
  
  <!-- Structured Data -->
  <script type="application/ld+json">
    ${JSON.stringify(financialProductSchema)}
  </script>
  
  ${reviewSchema ? `<script type="application/ld+json">
    ${JSON.stringify(reviewSchema)}
  </script>` : ''}
  
  ${faqSchema ? `<script type="application/ld+json">
    ${JSON.stringify(faqSchema)}
  </script>` : ''}
  
  <script type="application/ld+json">
    ${JSON.stringify(breadcrumbSchema)}
  </script>
  
  <!-- Favicon -->
  <link rel="icon" href="/lovable-uploads/ae39e42e-1394-4b63-8dd4-8ca4bf332fa3.png" type="image/png">
  
  <!-- Preload critical resources -->
  <link rel="preload" as="image" href="${imageUrl}">
  <link rel="dns-prefetch" href="//fonts.googleapis.com">
</head>
<body>
  <!-- This content will be hydrated by React -->
  <div id="root"></div>
  
  <!-- Load React app -->
  <script type="module" src="/src/main.tsx"></script>
  
  <!-- Bot detection and redirect script -->
  <script>
    // Only load React for regular users, not bots
    if (!navigator.userAgent.match(/bot|crawler|spider|crawling/i)) {
      // React will hydrate this page
    }
  </script>
</body>
</html>`;
};

export const isBot = (userAgent: string): boolean => {
  const botPatterns = [
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /facebookexternalhit/i,
    /twitterbot/i,
    /rogerbot/i,
    /linkedinbot/i,
    /embedly/i,
    /quora link preview/i,
    /showyoubot/i,
    /outbrain/i,
    /pinterest\/0\./i,
    /developers\.google\.com\/\+\/web\/snippet\//i,
    /slackbot/i,
    /vkshare/i,
    /w3c_validator/i,
    /redditbot/i,
    /applebot/i,
    /whatsapp/i,
    /flipboard/i,
    /tumblr/i,
    /bitlybot/i,
    /skypeuripreview/i,
    /nuzzel/i,
    /discordbot/i,
    /google page speed/i,
    /qwantify/i,
    /pinterestbot/i,
    /bitrix link preview/i,
    /xing-contenttabreceiver/i,
    /chrome-lighthouse/i,
    /telegrambot/i
  ];
  
  return botPatterns.some(pattern => pattern.test(userAgent));
};
