import { Shield, Lock, AlertCircle, Activity, Users, Twitter, BadgeCheck, TrendingUp, MessageSquare, MessageCircle, Code, ListChecks, Building2, BarChart2, Hash } from "lucide-react";
import { CategoryFeature } from "@/components/CategoryFeatureGrid";
import { formatCurrencyValue, formatNumberValue, formatDateToHuman } from "@/utils/tokenFormatters";

// Types for each category data
export interface SecurityData {
  token_address: string;
  score: number | null;
  ownership_renounced: boolean | null;
  audit_status: string | null;
  multisig_status: string | null;
  honeypot_detected: boolean | null;
  freeze_authority: boolean | null;
  can_mint: boolean | null;
}

export interface TokenomicsData {
  token_address: string;
  score: number | null;
  circulating_supply: number | null;
  supply_cap: number | null;
  tvl_usd: number | null;
  vesting_schedule: string | null;
  distribution_score: string | null;
  treasury_usd: number | null;
  burn_mechanism: boolean | null;
}

export interface LiquidityData {
  token_address: string;
  score: number | null;
  liquidity_locked_days: number | null;
  cex_listings: number | null;
  trading_volume_24h_usd: number | null;
  holder_distribution: string | null;
  dex_depth_status: string | null;
}

export interface CommunityData {
  token_address: string;
  score: number | null;
  twitter_followers: number | null;
  twitter_verified: boolean | null;
  twitter_growth_7d: number | null;
  telegram_members: number | null;
  discord_members: number | null;
  active_channels: string[] | null;
  team_visibility: string | null;
}

export interface DevelopmentData {
  token_address: string;
  score: number | null;
  github_repo: string | null;
  is_open_source: boolean | null;
  contributors_count: number | null;
  commits_30d: number | null;
  last_commit: string | null;
  roadmap_progress: string | null;
}

// Helper function to determine badge variant based on value
export const getBadgeVariant = (
  value: number,
  lowThreshold: number,
  highThreshold: number
): CategoryFeature["badgeVariant"] => {
  if (value >= highThreshold) {
    return "green";
  } else if (value >= lowThreshold) {
    return "orange";
  } else {
    return "red";
  }
};

// Helper function to format badge label for boolean values
export const getBadgeLabelForBoolean = (
  value: boolean | null | undefined
): string => {
  if (value === null || value === undefined) {
    return "Unknown";
  }
  return value ? "Yes" : "No";
};

// Transform security data
export const transformSecurityData = (data: SecurityData | null): CategoryFeature[] => {
  if (!data) return [];

  return [
    {
      icon: Shield,
      title: "Ownership Renounced",
      description: "Contract ownership status (renounced = more secure)",
      badgeLabel: getBadgeLabelForBoolean(data.ownership_renounced),
      badgeVariant: data.ownership_renounced ? "green" : "red"
    },
    {
      icon: Lock,
      title: "Audit Status",
      description: "Security audit verification by third-party firm",
      // TEMPORARY: Displaying placeholder until audit/multisig data integration is complete
      badgeLabel: "Coming Soon",
      badgeVariant: "blue"
    },
    {
      icon: AlertCircle,
      title: "Honeypot Detection",
      description: "Checks if token can be sold after purchase",
      badgeLabel: getBadgeLabelForBoolean(data.honeypot_detected),
      badgeVariant: data.honeypot_detected ? "red" : "green"
    },
    {
      icon: Activity,
      title: "Multisig Status",
      description: "Multiple signatures required for critical actions",
      // TEMPORARY: Displaying placeholder until audit/multisig data integration is complete
      badgeLabel: "Coming Soon",
      badgeVariant: "blue"
    },
    {
      icon: Code,
      title: "Mintable",
      description: "Checks if the token contract allows minting new tokens",
      badgeLabel: getBadgeLabelForBoolean(data.can_mint),
      badgeVariant: data.can_mint ? "red" : "green"
    },
    {
      icon: ListChecks,
      title: "Freeze Authority",
      description: "Checks if the token contract has freeze authority",
      badgeLabel: getBadgeLabelForBoolean(data.freeze_authority),
      badgeVariant: data.freeze_authority ? "red" : "green"
    }
  ];
};

// Transform tokenomics data with improved number formatting
export const transformTokenomicsData = (data: TokenomicsData | null): CategoryFeature[] => {
  if (!data) return [];

  return [
    {
      icon: Users,
      title: "Circulating Supply",
      description: "Amount of tokens currently in circulation",
      badgeLabel: data.circulating_supply ? formatNumberValue(data.circulating_supply) : "Unknown",
      badgeVariant: getBadgeVariant(data.circulating_supply || 0, 100000, 1000000)
    },
    {
      icon: Lock,
      title: "Supply Cap",
      description: "Maximum total supply of tokens",
      badgeLabel: data.supply_cap ? formatNumberValue(data.supply_cap) : "Unlimited",
      badgeVariant: data.supply_cap ? "green" : "red"
    },
    {
      icon: Activity,
      title: "TVL",
      description: "Total Value Locked in USD",
      badgeLabel: data.tvl_usd ? formatCurrencyValue(data.tvl_usd) : "Unknown",
      badgeVariant: getBadgeVariant(data.tvl_usd || 0, 10000, 100000)
    },
    {
      icon: MessageCircle,
      title: "Burn Mechanism",
      description: "Token burning to reduce supply",
      badgeLabel: getBadgeLabelForBoolean(data.burn_mechanism),
      badgeVariant: data.burn_mechanism ? "green" : "red"
    }
  ];
};

// Helper function to extract and format top 10 holders data from JSON
export const extractTop10HoldersData = (distributionJson: string | null | undefined): CategoryFeature | null => {
  if (!distributionJson) {
    return null;
  }

  try {
    const distribution = JSON.parse(distributionJson);
    
    // Format top 10 holders if available
    if (distribution.top10 !== undefined) {
      return {
        icon: Users,
        title: "Top 10 Holders",
        description: "Percentage held by largest 10 wallets",
        badgeLabel: `${(distribution.top10 * 100).toFixed(1)}%`,
        badgeVariant: getBadgeVariant(100 - distribution.top10 * 100, 50, 80)
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing holder distribution:", error);
    return null;
  }
};

// Transform liquidity data - show only Top 10 Holders
export const transformLiquidityData = (data: LiquidityData | null): CategoryFeature[] => {
  if (!data) return [];

  const features: CategoryFeature[] = [
    {
      icon: Lock,
      title: "Liquidity Locked",
      description: "Number of days liquidity is locked",
      badgeLabel: data.liquidity_locked_days ? `${data.liquidity_locked_days} days` : "Unknown",
      badgeVariant: getBadgeVariant(data.liquidity_locked_days || 0, 30, 90)
    },
    {
      icon: Building2,
      title: "CEX Listings",
      description: "Number of centralized exchanges listing the token",
      badgeLabel: data.cex_listings !== null ? data.cex_listings.toString() : "Unknown",
      badgeVariant: getBadgeVariant(data.cex_listings || 0, 1, 3)
    },
    {
      icon: BarChart2,
      title: "24h Trading Volume",
      description: "Total traded value in the last 24 hours",
      badgeLabel: data.trading_volume_24h_usd ? formatCurrencyValue(data.trading_volume_24h_usd) : "Unknown",
      badgeVariant: getBadgeVariant(data.trading_volume_24h_usd || 0, 10000, 100000)
    },
    {
      icon: Hash,
      title: "DEX Depth",
      description: "Liquidity depth assessment on decentralized exchanges",
      badgeLabel: data.dex_depth_status || "Unknown",
      badgeVariant: data.dex_depth_status === "High" ? "green" : data.dex_depth_status === "Medium" ? "orange" : "red"
    },
  ];
  
  // Add only top 10 holders if available (not top50 or others)
  const top10Feature = extractTop10HoldersData(data.holder_distribution);
  if (top10Feature) {
    features.push(top10Feature);
  }

  return features;
};

// Transform community data - showing "Coming Soon" placeholders
export const transformCommunityData = (data: CommunityData | null): CategoryFeature[] => {
  // We'll create the same structure but with "Coming Soon" badges
  return [
    {
      icon: Twitter,
      title: "Twitter Followers",
      description: "Number of followers on Twitter/X",
      badgeLabel: "Coming Soon",
      badgeVariant: "gray"
    },
    {
      icon: BadgeCheck,
      title: "Twitter Verified",
      description: "Verification status on Twitter/X",
      badgeLabel: "Coming Soon",
      badgeVariant: "gray"
    },
    {
      icon: TrendingUp,
      title: "7-Day Growth",
      description: "Follower growth percentage over 7 days",
      badgeLabel: "Coming Soon",
      badgeVariant: "gray"
    },
    {
      icon: MessageSquare,
      title: "Telegram Members",
      description: "Number of members in Telegram group",
      badgeLabel: "Coming Soon",
      badgeVariant: "gray"
    },
    {
      icon: MessageCircle,
      title: "Discord Members",
      description: "Number of members in Discord server",
      badgeLabel: "Coming Soon",
      badgeVariant: "gray"
    },
    {
      icon: Users,
      title: "Team Visibility",
      description: "Public visibility of project team members",
      badgeLabel: "Coming Soon",
      badgeVariant: "gray"
    }
  ];
};

// Transform development data with improved date formatting
export const transformDevelopmentData = (data: DevelopmentData | null): CategoryFeature[] => {
  if (!data) return [];

  return [
    {
      icon: Code,
      title: "Open Source",
      description: "Whether the project's code is open source",
      badgeLabel: getBadgeLabelForBoolean(data.is_open_source),
      badgeVariant: data.is_open_source ? "green" : "red"
    },
    {
      icon: Users,
      title: "Contributors",
      description: "Number of developers contributing to the project",
      badgeLabel: data.contributors_count ? data.contributors_count.toString() : "Unknown",
      badgeVariant: getBadgeVariant(data.contributors_count || 0, 5, 10)
    },
    {
      icon: Activity,
      title: "Commits (30D)",
      description: "Number of code commits in the last 30 days",
      badgeLabel: data.commits_30d ? data.commits_30d.toString() : "Unknown",
      badgeVariant: getBadgeVariant(data.commits_30d || 0, 10, 30)
    },
    {
      icon: Lock,
      title: "Last Commit",
      description: "Date of the most recent code commit",
      badgeLabel: data.last_commit ? formatDateToHuman(data.last_commit) : "Unknown",
      badgeVariant: data.last_commit ? "green" : "red"
    },
    {
      icon: ListChecks,
      title: "Roadmap Progress",
      description: "Milestones achieved vs. planned",
      badgeLabel: data.roadmap_progress || "Unknown",
      badgeVariant: data.roadmap_progress === "Completed" ? "green" : "orange"
    }
  ];
};
