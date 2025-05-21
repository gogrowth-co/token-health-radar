
// Mock token profiles
export const tokenProfiles = {
  "bitcoin": {
    name: "Bitcoin",
    symbol: "BTC",
    logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    address: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    website: "https://bitcoin.org",
    twitter: "https://twitter.com/bitcoin",
    github: "https://github.com/bitcoin/bitcoin",
    price: 63420.12,
    priceChange: 2.34,
    marketCap: "1.23T",
    tvl: "42.6B",
    launchDate: "2009-01-03"
  },
  "ethereum": {
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    address: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    website: "https://ethereum.org",
    twitter: "https://twitter.com/ethereum",
    github: "https://github.com/ethereum/ethereum-js",
    price: 3245.67,
    priceChange: -1.2,
    marketCap: "389.5B",
    tvl: "34.2B",
    launchDate: "2015-07-30"
  },
  "solana": {
    name: "Solana",
    symbol: "SOL",
    logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    address: "0x7dff46370e9ea5f0bad3c4e29711ad50062ea7a4",
    website: "https://solana.com",
    twitter: "https://twitter.com/solana",
    github: "https://github.com/solana-labs",
    price: 143.25,
    priceChange: 5.67,
    marketCap: "67.2B",
    tvl: "3.1B",
    launchDate: "2020-03-16"
  },
  "chainlink": {
    name: "Chainlink",
    symbol: "LINK",
    logo: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    address: "0x514910771af9ca656af840dff83e8264ecf986ca",
    website: "https://chain.link",
    twitter: "https://twitter.com/chainlink",
    github: "https://github.com/smartcontractkit/chainlink",
    price: 14.38,
    priceChange: 1.23,
    marketCap: "8.7B",
    tvl: "1.8B",
    launchDate: "2017-09-19"
  }
};

// Mock search results
export const searchResults = [
  {
    name: "Bitcoin",
    symbol: "BTC",
    logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    marketCap: "1.23T",
    price: 63420.12
  },
  {
    name: "Bitcoin Cash",
    symbol: "BCH",
    logo: "https://assets.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png",
    marketCap: "7.2B",
    price: 368.45
  },
  {
    name: "Bitcoin SV",
    symbol: "BSV",
    logo: "https://assets.coingecko.com/coins/images/6799/large/BSV.png",
    marketCap: "1.3B",
    price: 68.12
  },
  {
    name: "Bitcoin Gold",
    symbol: "BTG",
    logo: "https://assets.coingecko.com/coins/images/1043/large/bitcoin-gold-logo.png",
    marketCap: "580.4M",
    price: 33.24
  }
];

// Mock category scores data
export const categoryScores = {
  security: {
    score: 85,
    level: "high", // high, medium, low
    color: "success"
  },
  liquidity: {
    score: 72,
    level: "medium",
    color: "info"
  },
  tokenomics: {
    score: 65,
    level: "medium",
    color: "info"
  },
  community: {
    score: 91,
    level: "high",
    color: "success"
  },
  development: {
    score: 45,
    level: "low",
    color: "warning"
  }
};

// Mock data for security tab
export const securityData = {
  ownershipRenounced: true,
  canMint: false,
  codeAudit: "verified",
  freezeAuthority: false,
  honeypotCheck: "safe",
  scoreBreakdown: [
    { metric: "Contract Security", score: 90 },
    { metric: "Access Controls", score: 85 },
    { metric: "Vulnerability Risk", score: 75 },
    { metric: "Audit Quality", score: 90 }
  ]
};

// Mock data for liquidity tab
export const liquidityData = {
  liquidityLock: "180 days locked",
  holderDistribution: "32% top 10",
  cexListings: 5,
  dexDepth: "Good",
  tradingVolume: "$24.3M (24h)",
  lpUnlockRisk: "Low",
  scoreBreakdown: [
    { metric: "Liquidity Depth", score: 85 },
    { metric: "Lock Duration", score: 70 },
    { metric: "Distribution", score: 60 },
    { metric: "Exchange Coverage", score: 75 }
  ]
};

// Mock data for tokenomics tab
export const tokenomicsData = {
  supplyCap: {
    capped: true,
    maxSupply: "21,000,000"
  },
  tvl: "$42.6B",
  circulatingSupply: "19,456,281 (92.6%)",
  treasurySize: "$245.8M",
  burnMechanism: true,
  unlockSchedules: "None",
  scoreBreakdown: [
    { metric: "Supply Model", score: 95 },
    { metric: "Value Locked", score: 85 },
    { metric: "Inflation Rate", score: 90 },
    { metric: "Treasury Strength", score: 75 }
  ]
};

// Mock data for community tab
export const communityData = {
  twitterFollowers: "5.8M",
  weeklyGrowthRate: "1.2%",
  verifiedAccount: true,
  activeChannels: ["Twitter", "Discord", "Telegram", "Reddit"],
  teamVisibility: "visible",
  scoreBreakdown: [
    { metric: "Social Engagement", score: 95 },
    { metric: "Growth Trend", score: 82 },
    { metric: "Community Size", score: 98 },
    { metric: "Team Transparency", score: 85 }
  ]
};

// Mock data for development tab
export const developmentData = {
  githubRepo: "https://github.com/bitcoin/bitcoin",
  lastCommit: "2 days ago",
  commitFrequency: "86 commits (last 30d)",
  contributorCount: 827,
  openSource: true,
  roadmapProgress: "75% complete",
  scoreBreakdown: [
    { metric: "Development Activity", score: 92 },
    { metric: "Contributor Diversity", score: 98 },
    { metric: "Code Quality", score: 85 },
    { metric: "Documentation", score: 80 }
  ]
};

// Crypto trivia for loading screen
export const cryptoTrivia = [
  "Over 75% of new tokens have mint functions enabled.",
  "The first Bitcoin transaction was for two pizzas worth 10,000 BTC.",
  "There are over 20,000 different cryptocurrencies in existence.",
  "Lost Bitcoin wallets may contain up to 20% of all Bitcoin in existence.",
  "Ethereum processes more transactions daily than all other blockchains combined.",
  "Approximately 70% of all cryptocurrencies fail within the first year.",
  "The Solana blockchain can process up to 65,000 transactions per second.",
  "The smallest unit of Bitcoin is called a 'satoshi' (0.00000001 BTC).",
  "Over 53% of crypto projects have less than 1,000 daily active users.",
  "The average ICO in 2017 returned over 1,300% to early investors.",
  "Tokens with renounced ownership often have lower security scores.",
  "The NFT market exceeded $40 billion in total sales in 2021."
];

// Pricing tiers
export const pricingTiers = [
  {
    name: "Free",
    price: "0",
    features: [
      "3 Pro token scans",
      "Basic metrics only",
      "Limited scan history",
      "Standard scan speed",
    ],
    limitation: "Limited to 3 full token scans per month",
    cta: "Start Free"
  },
  {
    name: "Monthly",
    price: "20",
    interval: "/month",
    features: [
      "10 Pro token scans per month",
      "Full metrics access",
      "30-day scan history",
      "Priority scan speed",
      "CSV export",
    ],
    popular: true,
    cta: "Subscribe"
  },
  {
    name: "Annual",
    price: "120",
    interval: "/year",
    discount: "Save 50%",
    features: [
      "10 Pro token scans per month",
      "Full metrics access",
      "Unlimited scan history",
      "Priority scan speed",
      "CSV export",
      "API access",
    ],
    cta: "Subscribe"
  }
];

// FAQ data for pricing page
export const faqData = [
  {
    question: "What are Pro token scans?",
    answer: "Pro token scans provide detailed analysis across all 5 categories: Security, Liquidity, Tokenomics, Community, and Development. Free users get limited access to these metrics."
  },
  {
    question: "Can I upgrade or downgrade my plan?",
    answer: "Yes, you can upgrade your plan at any time. Downgrades will take effect at the end of your current billing period."
  },
  {
    question: "Do you offer refunds?",
    answer: "We offer a 7-day money-back guarantee for all new subscriptions. If you're not satisfied, contact our support team within 7 days of purchase."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards and cryptocurrency payments through Stripe."
  },
  {
    question: "How accurate are the scan results?",
    answer: "Our scans aggregate data from multiple on-chain and off-chain sources to provide the most accurate analysis possible. However, always conduct your own research before making investment decisions."
  }
];

// User dashboard data
export const dashboardData = {
  remainingScans: 7,
  totalScans: 10,
  planType: "Monthly",
  recentScans: [
    {
      token: "Bitcoin (BTC)",
      time: "2023-05-20T14:23:45Z",
      score: 85,
      id: "btc-scan-1"
    },
    {
      token: "Ethereum (ETH)",
      time: "2023-05-19T09:12:30Z",
      score: 82,
      id: "eth-scan-1"
    },
    {
      token: "Solana (SOL)",
      time: "2023-05-17T16:45:22Z",
      score: 76,
      id: "sol-scan-1"
    },
    {
      token: "Chainlink (LINK)",
      time: "2023-05-15T11:33:10Z",
      score: 79,
      id: "link-scan-1"
    }
  ]
};
