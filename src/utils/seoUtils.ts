
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

  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": "FinancialProduct",
      "name": token.name,
      "alternateName": token.symbol.toUpperCase()
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
    "reviewBody": `Comprehensive risk analysis of ${token.name} covering security, liquidity, tokenomics, community, and development aspects.`,
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
