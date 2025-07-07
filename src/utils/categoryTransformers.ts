
import { formatCurrency, formatNumber } from "./formattingUtils";
import { 
  Shield, 
  Lock, 
  AlertCircle, 
  Activity, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Coins, 
  BarChart3, 
  Github, 
  Code, 
  GitCommit,
  LucideIcon
} from "lucide-react";

export interface CategoryFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  badgeLabel: string;
  badgeVariant: "gray" | "blue" | "green" | "red" | "orange" | "yellow";
}

export interface SecurityData {
  token_address: string;
  ownership_renounced: boolean | null;
  can_mint: boolean | null;
  honeypot_detected: boolean | null;
  freeze_authority: boolean | null;
  audit_status: string | null;
  multisig_status: string | null;
  score: number | null;
  // Webacy-specific fields
  webacy_risk_score?: number | null;
  webacy_severity?: string | null;
  webacy_flags?: any[] | null;
  is_proxy?: boolean | null;
  is_blacklisted?: boolean | null;
  access_control?: boolean | null;
  contract_verified?: boolean | null;
  // GoPlus tax information
  buy_tax?: number | null;
  sell_tax?: number | null;
  transfer_tax?: number | null;
}

export interface TokenomicsData {
  token_address: string;
  circulating_supply: number | null;
  supply_cap: number | null;
  tvl_usd: number | null;
  treasury_usd: number | null;
  burn_mechanism: boolean | null;
  distribution_score: string | null;
  vesting_schedule: string | null;
  score: number | null;
  // Enhanced tokenomics fields
  actual_circulating_supply?: number | null;
  total_supply?: number | null;
  inflation_rate?: number | null;
  dex_liquidity_usd?: number | null;
  major_dex_pairs?: any[] | null;
  burn_events_detected?: boolean | null;
  burn_addresses_found?: string[] | null;
  top_holders_count?: number | null;
  distribution_gini_coefficient?: number | null;
  holder_concentration_risk?: string | null;
  treasury_addresses?: string[] | null;
  data_confidence_score?: number | null;
  last_holder_analysis?: string | null;
}

export interface LiquidityData {
  token_address: string;
  trading_volume_24h_usd: number | null;
  cex_listings: number | null;
  liquidity_locked_days: number | null;
  dex_depth_status: string | null;
  holder_distribution: string | null;
  score: number | null;
}

export interface CommunityData {
  token_address: string;
  twitter_followers: number | null;
  twitter_verified: boolean | null;
  twitter_growth_7d: number | null;
  discord_members: number | null;
  telegram_members: number | null;
  team_visibility: string | null;
  active_channels: string[] | null;
  score: number | null;
}

export interface DevelopmentData {
  token_address: string;
  github_repo: string | null;
  is_open_source: boolean | null;
  contributors_count: number | null;
  commits_30d: number | null;
  last_commit: string | null;
  roadmap_progress: string | null;
  score: number | null;
}

// Helper function for safe property access
const safeAccess = <T>(data: any, key: string, fallback: T): T => {
  return data && data[key] != null ? data[key] : fallback;
};

// Helper function for safe boolean access
const safeBooleanAccess = (data: any, key: string, fallback: boolean = false): boolean => {
  return data && data[key] != null ? Boolean(data[key]) : fallback;
};

// Helper function for safe number access
const safeNumberAccess = (data: any, key: string, fallback: number = 0): number => {
  return data && data[key] != null ? Number(data[key]) : fallback;
};

// Helper to get badge variant for boolean values
const getBooleanBadgeVariant = (value: boolean, positive: boolean): "green" | "red" => {
  return (value && positive) || (!value && !positive) ? "green" : "red";
};

// Helper to get badge label for boolean values
const getBooleanBadgeLabel = (value: boolean): string => {
  return value ? "Yes" : "No";
};

// Transform security data into feature format
export const transformSecurityData = (data: SecurityData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { icon: Shield, title: "Ownership Renounced", description: "Contract ownership has been renounced (more secure)", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Lock, title: "Can Mint", description: "Ability to create new tokens", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: AlertCircle, title: "Honeypot Detection", description: "Checks if token can be sold after purchase", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Activity, title: "Freeze Authority", description: "Ability to freeze token transfers", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Shield, title: "Audit Status", description: "Security audit verification by third-party firm", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  const features: CategoryFeature[] = [
    {
      icon: Shield,
      title: "Ownership Renounced",
      description: "Contract ownership has been renounced (more secure)",
      badgeLabel: safeBooleanAccess(data, 'ownership_renounced') ? "Yes" : "No",
      badgeVariant: getBooleanBadgeVariant(safeBooleanAccess(data, 'ownership_renounced'), true)
    },
    {
      icon: Lock,
      title: "Can Mint",
      description: "Ability to create new tokens",
      badgeLabel: safeBooleanAccess(data, 'can_mint') ? "Yes" : "No",
      badgeVariant: getBooleanBadgeVariant(safeBooleanAccess(data, 'can_mint'), false)
    },
    {
      icon: AlertCircle,
      title: "Honeypot Detection",
      description: "Checks if token can be sold after purchase",
      badgeLabel: safeBooleanAccess(data, 'honeypot_detected') ? "Detected" : "Clean",
      badgeVariant: getBooleanBadgeVariant(safeBooleanAccess(data, 'honeypot_detected'), false)
    },
    {
      icon: Activity,
      title: "Freeze Authority",
      description: "Ability to freeze token transfers",
      badgeLabel: safeBooleanAccess(data, 'freeze_authority') ? "Yes" : "No",
      badgeVariant: getBooleanBadgeVariant(safeBooleanAccess(data, 'freeze_authority'), false)
    },
    {
      icon: Shield,
      title: "Smart Contract Risk Flags (via Webacy)",
      description: "No significant risk flags detected or data unavailable",
      badgeLabel: "Clean",
      badgeVariant: "green"
    },
    {
      icon: Shield,
      title: "Audit Status",
      description: "Security audit verification by third-party firm",
      badgeLabel: safeAccess(data, 'audit_status', 'Unknown'),
      badgeVariant: data.audit_status === 'verified' ? 'green' : data.audit_status === 'unverified' ? 'red' : 'gray'
    }
  ];

  // Add Webacy-enhanced features if available
  if (data.is_proxy !== null && data.is_proxy !== undefined) {
    features.push({
      icon: Shield,
      title: "Proxy Contract",
      description: "Contract is upgradeable through proxy pattern",
      badgeLabel: data.is_proxy ? "Yes" : "No",
      badgeVariant: data.is_proxy ? "yellow" : "green"
    });
  }

  if (data.is_blacklisted !== null && data.is_blacklisted !== undefined) {
    features.push({
      icon: AlertCircle,
      title: "Blacklist Function",
      description: "Contract can blacklist specific addresses",
      badgeLabel: data.is_blacklisted ? "Present" : "None",
      badgeVariant: data.is_blacklisted ? "red" : "green"
    });
  }

  if (data.access_control !== null && data.access_control !== undefined) {
    features.push({
      icon: Lock,
      title: "Access Control",
      description: "Special privileges for certain addresses",
      badgeLabel: data.access_control ? "Present" : "None",
      badgeVariant: data.access_control ? "yellow" : "green"
    });
  }

  if (data.contract_verified !== null && data.contract_verified !== undefined) {
    features.push({
      icon: Shield,
      title: "Contract Verified",
      description: "Source code is public and verified",
      badgeLabel: data.contract_verified ? "Yes" : "No",
      badgeVariant: data.contract_verified ? "green" : "red"
    });
  }

  // Add transaction tax information from GoPlus if available
  if (data.buy_tax !== null && data.buy_tax !== undefined && data.buy_tax > 0) {
    features.push({
      icon: DollarSign,
      title: "Buy Tax",
      description: "Transaction fee when purchasing tokens",
      badgeLabel: `${(data.buy_tax * 100).toFixed(1)}%`,
      badgeVariant: data.buy_tax > 0.1 ? "red" : data.buy_tax > 0.05 ? "yellow" : "blue"
    });
  }

  if (data.sell_tax !== null && data.sell_tax !== undefined && data.sell_tax > 0) {
    features.push({
      icon: DollarSign,
      title: "Sell Tax", 
      description: "Transaction fee when selling tokens",
      badgeLabel: `${(data.sell_tax * 100).toFixed(1)}%`,
      badgeVariant: data.sell_tax > 0.1 ? "red" : data.sell_tax > 0.05 ? "yellow" : "blue"
    });
  }

  return features;
};

// Transform tokenomics data into feature format
export const transformTokenomicsData = (data: TokenomicsData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { icon: Coins, title: "Circulating Supply", description: "Number of tokens currently in circulation", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: BarChart3, title: "Supply Cap", description: "Maximum number of tokens that can exist", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: DollarSign, title: "DEX Liquidity (USD)", description: "Total liquidity across decentralized exchanges", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: TrendingUp, title: "Treasury (USD)", description: "Value held in project treasury", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Activity, title: "Burn Mechanism", description: "Tokens are permanently removed from supply", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Distribution Quality", description: "How well distributed the token supply is among holders", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  // Enhanced supply analysis with real vs total supply
  const totalSupply = safeNumberAccess(data, 'total_supply');
  const circulatingSupply = safeNumberAccess(data, 'actual_circulating_supply') || safeNumberAccess(data, 'circulating_supply');
  const supplyCap = safeNumberAccess(data, 'supply_cap');
  
  // Enhanced liquidity from DEX pairs
  const dexLiquidityUsd = safeNumberAccess(data, 'dex_liquidity_usd');
  const treasuryUsd = safeNumberAccess(data, 'treasury_usd');
  const burnMechanism = safeBooleanAccess(data, 'burn_mechanism');
  
  // Enhanced distribution metrics
  const distributionScore = safeAccess(data, 'distribution_score', 'Unknown');
  const concentrationRisk = safeAccess(data, 'holder_concentration_risk', 'Unknown');
  const giniCoefficient = safeNumberAccess(data, 'distribution_gini_coefficient');
  const topHoldersCount = safeNumberAccess(data, 'top_holders_count');
  
  // Data quality indicators
  const confidenceScore = safeNumberAccess(data, 'data_confidence_score');

  return [
    { 
      icon: Coins, 
      title: "Circulating Supply", 
      description: totalSupply > 0 ? "Tokens currently in circulation from total supply" : "Number of tokens currently in circulation",
      badgeLabel: totalSupply > 0 ? formatNumber(totalSupply) : formatNumber(circulatingSupply),
      badgeVariant: "blue"
    },
    { 
      icon: BarChart3, 
      title: "Supply Cap", 
      description: "Maximum number of tokens that can exist",
      badgeLabel: supplyCap > 0 ? formatNumber(supplyCap) : totalSupply > 0 ? formatNumber(totalSupply) : "No Cap",
      badgeVariant: supplyCap > 0 ? "blue" : totalSupply > 0 ? "blue" : "orange"
    },
    { 
      icon: DollarSign, 
      title: "DEX Liquidity (USD)", 
      description: "Total liquidity across decentralized exchanges",
      badgeLabel: formatCurrency(dexLiquidityUsd),
      badgeVariant: dexLiquidityUsd > 10000000 ? "green" : dexLiquidityUsd > 1000000 ? "blue" : dexLiquidityUsd > 100000 ? "orange" : "gray"
    },
    { 
      icon: TrendingUp, 
      title: "Treasury (USD)", 
      description: "Value held in project treasury",
      badgeLabel: treasuryUsd > 0 ? formatCurrency(treasuryUsd) : "Not Available",
      badgeVariant: treasuryUsd > 500000 ? "green" : treasuryUsd > 50000 ? "blue" : treasuryUsd > 0 ? "orange" : "gray"
    },
    { 
      icon: Activity, 
      title: "Burn Mechanism", 
      description: "Tokens are permanently removed from supply",
      badgeLabel: burnMechanism !== null ? getBooleanBadgeLabel(burnMechanism) : "Not Detected",
      badgeVariant: burnMechanism !== null ? getBooleanBadgeVariant(burnMechanism, true) : "gray"
    },
    { 
      icon: Users, 
      title: "Distribution Quality", 
      description: giniCoefficient !== null ? 
        `Token distribution among ${topHoldersCount || 'N/A'} holders (Gini: ${giniCoefficient.toFixed(3)})` :
        "How well distributed the token supply is among holders",
      badgeLabel: distributionScore !== "Unknown" ? distributionScore : concentrationRisk !== "Unknown" ? `${concentrationRisk} Risk` : "Unknown",
      badgeVariant: getDistributionVariant(distributionScore, concentrationRisk)
    }
  ];
};

// Helper function to determine distribution badge variant
function getDistributionVariant(distributionScore: string, concentrationRisk: string): "gray" | "blue" | "green" | "red" | "orange" | "yellow" {
  if (distributionScore !== "Unknown") {
    switch (distributionScore) {
      case "Excellent": return "green";
      case "Good": return "blue";
      case "Fair": return "orange";
      case "Poor": return "red";
      default: return "gray";
    }
  }
  
  if (concentrationRisk !== "Unknown") {
    switch (concentrationRisk) {
      case "Low": return "green";
      case "Medium": return "blue";
      case "High": return "orange";
      case "Very High": return "red";
      default: return "gray";
    }
  }
  
  return "gray";
}

// Transform liquidity data into feature format
export const transformLiquidityData = (data: LiquidityData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { icon: TrendingUp, title: "Trading Volume (24h)", description: "Total trading volume in the last 24 hours", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: BarChart3, title: "CEX Listings", description: "Number of centralized exchange listings", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Lock, title: "Liquidity Lock", description: "How long liquidity is locked for", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Activity, title: "DEX Depth", description: "Liquidity depth on decentralized exchanges", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Holder Distribution", description: "How tokens are distributed among holders", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  const tradingVolume = safeNumberAccess(data, 'trading_volume_24h_usd');
  const cexListings = safeNumberAccess(data, 'cex_listings');
  const liquidityLocked = safeNumberAccess(data, 'liquidity_locked_days');
  const dexDepth = safeAccess(data, 'dex_depth_status', 'Unknown');
  const holderDistribution = safeAccess(data, 'holder_distribution', 'Unknown');

  return [
    { 
      icon: TrendingUp, 
      title: "Trading Volume (24h)", 
      description: "Total trading volume in the last 24 hours",
      badgeLabel: formatCurrency(tradingVolume),
      badgeVariant: tradingVolume > 1000000 ? "green" : tradingVolume > 100000 ? "blue" : "gray"
    },
    { 
      icon: BarChart3, 
      title: "CEX Listings", 
      description: "Number of centralized exchange listings",
      badgeLabel: cexListings.toString(),
      badgeVariant: cexListings >= 5 ? "green" : cexListings >= 2 ? "blue" : cexListings >= 1 ? "orange" : "gray"
    },
    { 
      icon: Lock, 
      title: "Liquidity Lock", 
      description: "How long liquidity is locked for",
      badgeLabel: liquidityLocked > 0 ? `${liquidityLocked} days` : "Not Locked",
      badgeVariant: liquidityLocked >= 365 ? "green" : liquidityLocked >= 90 ? "blue" : liquidityLocked > 0 ? "orange" : "red"
    },
    { 
      icon: Activity, 
      title: "DEX Depth", 
      description: "Liquidity depth on decentralized exchanges",
      badgeLabel: dexDepth,
      badgeVariant: dexDepth === "Unknown" ? "gray" : dexDepth === "High" ? "green" : dexDepth === "Medium" ? "blue" : dexDepth === "Low" ? "orange" : "gray"
    },
    { 
      icon: Users, 
      title: "Holder Distribution", 
      description: "How tokens are distributed among holders",
      badgeLabel: holderDistribution,
      badgeVariant: holderDistribution === "Unknown" ? "gray" : holderDistribution === "Good" ? "green" : holderDistribution === "Fair" ? "blue" : holderDistribution === "Poor" ? "red" : "gray"
    }
  ];
};

// Transform community data into feature format
export const transformCommunityData = (data: CommunityData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { icon: Users, title: "Twitter Followers", description: "Number of followers on Twitter/X", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Shield, title: "Twitter Verified", description: "Twitter/X account verification status", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: TrendingUp, title: "Twitter Growth (7d)", description: "Follower growth in the last 7 days", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Discord Members", description: "Number of Discord community members", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Activity, title: "Team Visibility", description: "How visible and accessible the team is", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  const twitterFollowers = safeNumberAccess(data, 'twitter_followers');
  const twitterVerified = safeBooleanAccess(data, 'twitter_verified');
  const twitterGrowth = safeNumberAccess(data, 'twitter_growth_7d');
  const discordMembers = safeNumberAccess(data, 'discord_members');
  const teamVisibility = safeAccess(data, 'team_visibility', 'Unknown');

  return [
    { 
      icon: Users, 
      title: "Twitter Followers", 
      description: "Number of followers on Twitter/X",
      badgeLabel: formatNumber(twitterFollowers),
      badgeVariant: twitterFollowers >= 100000 ? "green" : twitterFollowers >= 10000 ? "blue" : twitterFollowers >= 1000 ? "orange" : "gray"
    },
    { 
      icon: Shield, 
      title: "Twitter Verified", 
      description: "Twitter/X account verification status",
      badgeLabel: getBooleanBadgeLabel(twitterVerified),
      badgeVariant: getBooleanBadgeVariant(twitterVerified, true)
    },
    { 
      icon: TrendingUp, 
      title: "Twitter Growth (7d)", 
      description: "Follower growth in the last 7 days",
      badgeLabel: `${twitterGrowth}%`,
      badgeVariant: twitterGrowth > 5 ? "green" : twitterGrowth > 0 ? "blue" : twitterGrowth < 0 ? "red" : "gray"
    },
    { 
      icon: Users, 
      title: "Discord Members", 
      description: "Number of Discord community members",
      badgeLabel: formatNumber(discordMembers),
      badgeVariant: discordMembers >= 50000 ? "green" : discordMembers >= 5000 ? "blue" : discordMembers >= 500 ? "orange" : "gray"
    },
    { 
      icon: Activity, 
      title: "Team Visibility", 
      description: "How visible and accessible the team is",
      badgeLabel: teamVisibility,
      badgeVariant: teamVisibility === "Unknown" ? "gray" : teamVisibility === "High" ? "green" : teamVisibility === "Medium" ? "blue" : teamVisibility === "Low" ? "red" : "gray"
    }
  ];
};

// Transform development data into feature format
export const transformDevelopmentData = (data: DevelopmentData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { icon: Github, title: "Open Source", description: "Code is publicly available for review", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Contributors", description: "Number of active code contributors", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: GitCommit, title: "Commits (30d)", description: "Code commits in the last 30 days", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Activity, title: "Last Commit", description: "When the last code update was made", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Code, title: "Roadmap Progress", description: "Progress on the development roadmap", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  const isOpenSource = safeBooleanAccess(data, 'is_open_source');
  const contributorsCount = safeNumberAccess(data, 'contributors_count');
  const commits30d = safeNumberAccess(data, 'commits_30d');
  const lastCommit = safeAccess(data, 'last_commit', null);
  const roadmapProgress = safeAccess(data, 'roadmap_progress', 'Unknown');

  // Calculate days since last commit
  const daysSinceCommit = lastCommit ? Math.floor((Date.now() - new Date(lastCommit).getTime()) / (1000 * 60 * 60 * 24)) : null;

  return [
    { 
      icon: Github, 
      title: "Open Source", 
      description: "Code is publicly available for review",
      badgeLabel: getBooleanBadgeLabel(isOpenSource),
      badgeVariant: getBooleanBadgeVariant(isOpenSource, true)
    },
    { 
      icon: Users, 
      title: "Contributors", 
      description: "Number of active code contributors",
      badgeLabel: contributorsCount.toString(),
      badgeVariant: contributorsCount >= 10 ? "green" : contributorsCount >= 3 ? "blue" : contributorsCount >= 1 ? "orange" : "gray"
    },
    { 
      icon: GitCommit, 
      title: "Commits (30d)", 
      description: "Code commits in the last 30 days",
      badgeLabel: commits30d.toString(),
      badgeVariant: commits30d >= 20 ? "green" : commits30d >= 5 ? "blue" : commits30d >= 1 ? "orange" : "gray"
    },
    { 
      icon: Activity, 
      title: "Last Commit", 
      description: "When the last code update was made",
      badgeLabel: daysSinceCommit !== null ? `${daysSinceCommit} days ago` : "Unknown",
      badgeVariant: daysSinceCommit !== null ? 
        (daysSinceCommit <= 7 ? "green" : daysSinceCommit <= 30 ? "blue" : daysSinceCommit <= 90 ? "orange" : "red") : "gray"
    },
    { 
      icon: Code, 
      title: "Roadmap Progress", 
      description: "Progress on the development roadmap",
      badgeLabel: roadmapProgress,
      badgeVariant: roadmapProgress === "Unknown" ? "gray" : roadmapProgress === "On Track" ? "green" : roadmapProgress === "Delayed" ? "orange" : roadmapProgress === "Stalled" ? "red" : "gray"
    }
  ];
};
