
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

interface GuidePageData {
  title: string;
  description: string;
  canonical_url: string;
  image_url: string;
  published_date: string;
  modified_date: string;
  article_content: string;
  word_count: number;
  schema_markup: any;
  breadcrumb_schema: any;
  faq_schema?: any;
  how_to_schema?: any;
}

export const generateStaticHTML = (tokenData: PrerenderTokenData, reportContent: any) => {
  const title = `${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report | Token Health Scan`;
  const description = `Comprehensive risk analysis and security report for ${tokenData.name} (${tokenData.symbol.toUpperCase()}). Get detailed insights on security, tokenomics, liquidity, community, and development${tokenData.overall_score ? ` with an overall risk score of ${tokenData.overall_score}/100` : ''}.`;
  const canonicalUrl = `https://tokenhealthscan.com/token/${tokenData.symbol.toLowerCase()}`;
  const imageUrl = tokenData.logo_url || "https://tokenhealthscan.com/tokenhealthscan-og.png";

  // Import and use the centralized schema generation
  const { generateAllTokenSchemas } = require('./seoUtils');
  const schemas = generateAllTokenSchemas(tokenData, canonicalUrl, reportContent);

  return generateHTMLTemplate(title, description, canonicalUrl, imageUrl, schemas);
};

export const generateGuidePageHTML = (guideData: GuidePageData) => {
  const schemas = [
    guideData.schema_markup,
    guideData.breadcrumb_schema,
    guideData.faq_schema,
    guideData.how_to_schema
  ].filter(Boolean);

  return generateHTMLTemplate(
    guideData.title,
    guideData.description,
    guideData.canonical_url,
    guideData.image_url,
    schemas
  );
};

const generateHTMLTemplate = (title: string, description: string, canonicalUrl: string, imageUrl: string, schemas: any[]) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <!-- Dynamic Meta Tags -->
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="author" content="Token Health Scan" />
  
  <!-- Open Graph -->
  <meta property="og:title" content="${title}" />
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
  <meta name="twitter:title" content="${title}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <!-- Canonical URL -->
  <link rel="canonical" href="${canonicalUrl}" />
  
  <!-- Structured Data -->
  ${schemas.map(schema => `<script type="application/ld+json">
    ${JSON.stringify(schema)}
  </script>`).join('\n  ')}
  
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

export const getGuidePageData = (pathname: string): GuidePageData | null => {
  const currentDate = new Date().toISOString();
  
  switch (pathname) {
    case '/token-scan-guide':
      return {
        title: "Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens",
        description: "Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques.",
        canonical_url: "https://tokenhealthscan.com/token-scan-guide",
        image_url: "https://tokenhealthscan.com/lovable-uploads/ths-cover-token-scan-guide.png",
        published_date: "2025-06-19T17:58:00Z",
        modified_date: currentDate,
        article_content: "Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques covering smart contract security, liquidity verification, team analysis, and more.",
        word_count: 3500,
        schema_markup: {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "The Complete Guide to Token Scanning (2025)",
          "description": "Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques.",
          "author": {
            "@type": "Organization",
            "name": "TokenHealthScan"
          },
          "publisher": {
            "@type": "Organization",
            "name": "TokenHealthScan",
            "logo": {
              "@type": "ImageObject",
              "url": "https://tokenhealthscan.com/lovable-uploads/token-health-scan-product.png"
            }
          },
          "datePublished": "2025-06-19T17:58:00Z",
          "dateModified": currentDate,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": "https://tokenhealthscan.com/token-scan-guide"
          },
          "image": "https://tokenhealthscan.com/lovable-uploads/ths-cover-token-scan-guide.png"
        },
        breadcrumb_schema: {
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
              "name": "Token Scan Guide",
              "item": "https://tokenhealthscan.com/token-scan-guide"
            }
          ]
        }
      };

    case '/token-sniffer-comparison':
      return {
        title: "TokenHealthScan vs Token Sniffer: 2025 Comparison Guide",
        description: "Compare TokenHealthScan and Token Sniffer for crypto token analysis. See features, pricing, accuracy, and which tool is best for your needs.",
        canonical_url: "https://tokenhealthscan.com/token-sniffer-comparison",
        image_url: "https://tokenhealthscan.com/lovable-uploads/token-sniffer-vs-tokenhealthscan-cover.png",
        published_date: "2025-06-19",
        modified_date: currentDate,
        article_content: "Compare TokenHealthScan and Token Sniffer for crypto token analysis. Detailed comparison of features, pricing, accuracy, and capabilities.",
        word_count: 2500,
        schema_markup: {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "TokenHealthScan vs Token Sniffer: 2025 Comparison Guide",
          "description": "Compare TokenHealthScan and Token Sniffer for crypto token analysis. See features, pricing, accuracy, and which tool is best for your needs.",
          "author": {
            "@type": "Organization",
            "name": "TokenHealthScan"
          },
          "publisher": {
            "@type": "Organization",
            "name": "TokenHealthScan"
          },
          "datePublished": "2025-06-19",
          "dateModified": currentDate,
          "image": "https://tokenhealthscan.com/lovable-uploads/token-sniffer-vs-tokenhealthscan-cover.png"
        },
        breadcrumb_schema: {
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
              "name": "Token Sniffer Comparison",
              "item": "https://tokenhealthscan.com/token-sniffer-comparison"
            }
          ]
        }
      };

    case '/solana-launchpads':
      return {
        title: "Solana Launchpads Guide 2025: From Pump.fun to MetaDAO | TokenHealthScan",
        description: "Discover and compare the best Solana launchpads for your token. From Pump.fun's viral memes to MetaDAO's governance-first approach - find the perfect platform for your project.",
        canonical_url: "https://tokenhealthscan.com/solana-launchpads",
        image_url: "https://tokenhealthscan.com/lovable-uploads/solana-launchpads2.png",
        published_date: "2025-01-15T10:00:00.000Z",
        modified_date: currentDate,
        article_content: "Discover and compare the best Solana launchpads for your token. From Pump.fun's viral memes to MetaDAO's governance-first approach - find the perfect platform for your project.",
        word_count: 4000,
        schema_markup: {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Solana Launchpads Guide 2025: From Pump.fun to MetaDAO",
          "description": "Discover and compare the best Solana launchpads for your token. From Pump.fun's viral memes to MetaDAO's governance-first approach - find the perfect platform for your project.",
          "author": {
            "@type": "Organization",
            "name": "TokenHealthScan"
          },
          "publisher": {
            "@type": "Organization",
            "name": "TokenHealthScan"
          },
          "datePublished": "2025-01-15T10:00:00.000Z",
          "dateModified": currentDate,
          "image": "https://tokenhealthscan.com/lovable-uploads/solana-launchpads2.png"
        },
        breadcrumb_schema: {
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
              "name": "Guides",
              "item": "https://tokenhealthscan.com/guides"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": "Solana Launchpads Guide",
              "item": "https://tokenhealthscan.com/solana-launchpads"
            }
          ]
        }
      };

    case '/ethereum-launchpads':
      return {
        title: "Ethereum Launchpads Explained: Platforms, Projects, and Best Practices",
        description: "Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token. Includes trends, tips, and platform comparisons.",
        canonical_url: "https://tokenhealthscan.com/ethereum-launchpads",
        image_url: "https://tokenhealthscan.com/lovable-uploads/ethereum-token-launchpad-progress.png",
        published_date: "2025-01-15",
        modified_date: currentDate,
        article_content: "Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token.",
        word_count: 3000,
        schema_markup: {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Ethereum Launchpads Explained: Platforms, Projects, and Best Practices",
          "description": "Explore the top Ethereum launchpads of 2025, how they work, and what builders need to know before launching a token. Includes trends, tips, and platform comparisons.",
          "author": {
            "@type": "Organization",
            "name": "Token Health Scan"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Token Health Scan"
          },
          "datePublished": "2025-01-15",
          "dateModified": currentDate,
          "image": "https://tokenhealthscan.com/lovable-uploads/ethereum-token-launchpad-progress.png"
        },
        breadcrumb_schema: {
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
              "name": "Ethereum Launchpads Guide",
              "item": "https://tokenhealthscan.com/ethereum-launchpads"
            }
          ]
        }
      };

    default:
      return null;
  }
};
