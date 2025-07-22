
interface TokenSEOData {
  name: string;
  symbol: string;
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

export const generateTokenTitle = (token: TokenSEOData): string => {
  return `${token.name} (${token.symbol.toUpperCase()}) Risk Report | Token Health Scan`;
};

export const generateTokenDescription = (token: TokenSEOData): string => {
  const scoreText = token.overall_score ? ` with an overall risk score of ${token.overall_score}/100` : '';
  return `Comprehensive risk analysis and security report for ${token.name} (${token.symbol.toUpperCase()}). Get detailed insights on security, tokenomics, liquidity, community, and development${scoreText}.`;
};

export const generateTokenKeywords = (token: TokenSEOData): string => {
  return `${token.name}, ${token.symbol}, crypto risk, token analysis, security report, DeFi, cryptocurrency, smart contract audit, liquidity analysis, tokenomics`;
};

export const getTokenImageUrl = (token: TokenSEOData): string => {
  if (token.logo_url) return token.logo_url;
  return "https://tokenhealthscan.com/tokenhealthscan-og.png";
};

export const generateCanonicalUrl = (symbol: string): string => {
  return `https://tokenhealthscan.com/token/${symbol.toLowerCase()}`;
};

export const generateFinancialProductSchema = (token: TokenSEOData, reportUrl: string) => {
  const schema: any = {
    "@context": "https://schema.org",
    "@type": "FinancialProduct",
    "name": token.name,
    "alternateName": token.symbol.toUpperCase(),
    "url": reportUrl,
    "description": token.description || generateTokenDescription(token),
    "category": "Cryptocurrency",
    "provider": {
      "@type": "Organization",
      "name": "Token Health Scan",
      "url": "https://tokenhealthscan.com"
    }
  };

  if (token.logo_url) {
    schema.image = token.logo_url;
  }

  const sameAs = [];
  if (token.coingecko_id) {
    sameAs.push(`https://www.coingecko.com/en/coins/${token.coingecko_id}`);
  }
  if (token.website_url) {
    sameAs.push(token.website_url.startsWith('http') ? token.website_url : `https://${token.website_url}`);
  }
  if (token.token_address) {
    sameAs.push(`https://etherscan.io/token/${token.token_address}`);
  }

  if (sameAs.length > 0) {
    schema.sameAs = sameAs;
  }

  return schema;
};

export const generateReviewSchema = (token: TokenSEOData, reportUrl: string) => {
  if (!token.overall_score) return null;

  const reviewBody = `Comprehensive risk analysis of ${token.name} (${token.symbol.toUpperCase()}) covering security vulnerabilities, liquidity depth, tokenomics structure, community engagement, and development activity. Our analysis provides a ${token.overall_score}/100 risk score based on multiple data sources and real-time blockchain metrics.`;

  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "Product",
      "name": token.name,
      "alternateName": token.symbol.toUpperCase(),
      "url": reportUrl
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": token.overall_score,
      "bestRating": 100,
      "worstRating": 0
    },
    "author": {
      "@type": "Organization",
      "name": "Token Health Scan"
    },
    "reviewBody": reviewBody,
    "url": reportUrl
  };
};

export const generateOrganizationSchema = () => {
  return {
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
  };
};

export const generateFAQSchema = (reportContent: any) => {
  if (!reportContent?.faq) return null;
  
  return {
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
  };
};

export const generateBreadcrumbSchema = (token: TokenSEOData, reportUrl: string) => {
  return {
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
        "name": `${token.name} Report`,
        "item": reportUrl
      }
    ]
  };
};

// Centralized function to generate all schemas for a token with no duplicates
export const generateAllTokenSchemas = (token: TokenSEOData, reportUrl: string, reportContent?: any) => {
  const schemas = [];
  
  // Always include FinancialProduct schema
  schemas.push(generateFinancialProductSchema(token, reportUrl));
  
  // Add Review schema only if we have a score
  const reviewSchema = generateReviewSchema(token, reportUrl);
  if (reviewSchema) {
    schemas.push(reviewSchema);
  }
  
  // Add FAQ schema only if we have FAQ content
  const faqSchema = generateFAQSchema(reportContent);
  if (faqSchema) {
    schemas.push(faqSchema);
  }
  
  // Always include breadcrumb schema
  schemas.push(generateBreadcrumbSchema(token, reportUrl));
  
  // Always include organization schema
  schemas.push(generateOrganizationSchema());
  
  return schemas.filter(Boolean);
};
