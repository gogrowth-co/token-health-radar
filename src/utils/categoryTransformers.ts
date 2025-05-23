
import { 
  Shield, Lock, AlertTriangle, CheckCircle, Code, 
  Fingerprint, CheckCircle2, XCircle, CircleDot, 
  LucideIcon, Wallet, Coins, BarChart4, Activity,
  TrendingUp, PieChart, Users, Twitter, MessageSquare,
  Globe, Github, Calendar, GitCommit, GitPullRequest
} from "lucide-react";
import { CategoryFeature } from "@/components/CategoryFeatureGrid";

// Define interfaces locally instead of importing from ScanResult
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

// Helper function to determine badge variant based on boolean values
export const getBadgeVariantForBoolean = (
  value: boolean | null | undefined, 
  isPositive: boolean = true
): "green" | "red" | "gray" => {
  if (value === null || value === undefined) return "gray";
  return (value === isPositive) ? "green" : "red";
};

// Helper function to get badge label for boolean values
export const getBadgeLabelForBoolean = (
  value: boolean | null | undefined,
  positiveLabel: string = "Yes",
  negativeLabel: string = "No",
  nullLabel: string = "N/A"
): string => {
  if (value === null || value === undefined) return nullLabel;
  return value ? positiveLabel : negativeLabel;
};

// Transform security data to CategoryFeature format
export const transformSecurityData = (data: SecurityData | null): CategoryFeature[] => {
  if (!data) return [];
  
  return [
    {
      icon: Shield,
      title: "Ownership Renounced",
      description: "Contract ownership status (renounced = more secure)",
      badgeLabel: getBadgeLabelForBoolean(data.ownership_renounced),
      badgeVariant: getBadgeVariantForBoolean(data.ownership_renounced, true)
    },
    {
      icon: CheckCircle,
      title: "Audit Status",
      description: "Security audit verification by third-party firm",
      badgeLabel: data.audit_status || "Not Verified",
      badgeVariant: data.audit_status ? 
        (data.audit_status.toLowerCase().includes("verified") ? "green" : "blue") : 
        "red"
    },
    {
      icon: AlertTriangle,
      title: "Honeypot Detection",
      description: "Checks if token can be sold after purchase",
      badgeLabel: getBadgeLabelForBoolean(data.honeypot_detected, false, "Not Detected", "Detected"),
      badgeVariant: getBadgeVariantForBoolean(data.honeypot_detected, false)
    },
    {
      icon: Fingerprint,
      title: "Multisig Status",
      description: "Multiple signatures required for critical actions",
      badgeLabel: data.multisig_status || "Unknown",
      badgeVariant: data.multisig_status ? 
        (data.multisig_status.toLowerCase().includes("enabled") ? "green" : "orange") : 
        "gray"
    },
    {
      icon: Lock,
      title: "Freeze Authority",
      description: "Ability to freeze token transfers (security risk)",
      badgeLabel: getBadgeLabelForBoolean(data.freeze_authority, false),
      badgeVariant: getBadgeVariantForBoolean(data.freeze_authority, false)
    },
    {
      icon: Code,
      title: "Mintable",
      description: "Ability to create new tokens beyond supply cap",
      badgeLabel: getBadgeLabelForBoolean(data.can_mint, false),
      badgeVariant: getBadgeVariantForBoolean(data.can_mint, false)
    }
  ];
};

// Helper function to determine badge variant based on distribution score
const getDistributionBadgeVariant = (score: string | null | undefined): "green" | "orange" | "red" | "gray" => {
  if (!score) return "gray";
  
  const lowerScore = score.toLowerCase();
  if (lowerScore.includes("good") || lowerScore.includes("high")) return "green";
  if (lowerScore.includes("moderate") || lowerScore.includes("medium")) return "orange";
  if (lowerScore.includes("poor") || lowerScore.includes("low")) return "red";
  return "gray";
};

// Helper function to format number or show fallback
const formatNumberWithFallback = (value: number | null | undefined, suffix: string = ""): string => {
  if (value === null || value === undefined) return "N/A";
  
  // Format large numbers with abbreviations
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B${suffix}`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M${suffix}`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K${suffix}`;
  }
  
  return `${value}${suffix}`;
};

// Transform tokenomics data to CategoryFeature format
export const transformTokenomicsData = (data: TokenomicsData | null): CategoryFeature[] => {
  if (!data) return [];
  
  return [
    {
      icon: Coins,
      title: "Circulating Supply",
      description: "Number of tokens currently in circulation",
      badgeLabel: formatNumberWithFallback(data.circulating_supply),
      badgeVariant: "blue"
    },
    {
      icon: BarChart4, 
      title: "Supply Cap",
      description: "Maximum total supply of tokens",
      badgeLabel: formatNumberWithFallback(data.supply_cap),
      badgeVariant: "blue"
    },
    {
      icon: Wallet,
      title: "Total Value Locked",
      description: "Value locked in DeFi protocols",
      badgeLabel: data.tvl_usd ? `$${formatNumberWithFallback(data.tvl_usd)}` : "N/A",
      badgeVariant: "blue"
    },
    {
      icon: Activity,
      title: "Vesting Schedule",
      description: "Token release schedule for initial allocations",
      badgeLabel: data.vesting_schedule || "Unknown",
      badgeVariant: data.vesting_schedule ? "blue" : "gray"
    },
    {
      icon: PieChart,
      title: "Distribution Score",
      description: "How well token supply is distributed among holders",
      badgeLabel: data.distribution_score || "Unknown",
      badgeVariant: getDistributionBadgeVariant(data.distribution_score)
    },
    {
      icon: TrendingUp,
      title: "Burn Mechanism",
      description: "Permanent token removal from supply",
      badgeLabel: getBadgeLabelForBoolean(data.burn_mechanism),
      badgeVariant: data.burn_mechanism !== null && data.burn_mechanism !== undefined 
        ? getBadgeVariantForBoolean(data.burn_mechanism, true)
        : "gray"
    }
  ];
};

// Transform liquidity data to CategoryFeature format
export const transformLiquidityData = (data: LiquidityData | null): CategoryFeature[] => {
  if (!data) return [];
  
  return [
    {
      icon: Lock,
      title: "Liquidity Locked Days",
      description: "Duration of locked liquidity in DEX pools",
      badgeLabel: data.liquidity_locked_days !== null ? `${data.liquidity_locked_days} days` : "N/A",
      badgeVariant: data.liquidity_locked_days ? (data.liquidity_locked_days > 90 ? "green" : "orange") : "gray"
    },
    {
      icon: Globe,
      title: "CEX Listings",
      description: "Number of centralized exchanges listing the token",
      badgeLabel: data.cex_listings !== null ? data.cex_listings.toString() : "N/A",
      badgeVariant: data.cex_listings ? (data.cex_listings > 2 ? "green" : "blue") : "gray"
    },
    {
      icon: Activity,
      title: "24h Trading Volume",
      description: "USD volume of token traded in last 24 hours",
      badgeLabel: data.trading_volume_24h_usd !== null ? `$${formatNumberWithFallback(data.trading_volume_24h_usd)}` : "N/A",
      badgeVariant: "blue"
    },
    {
      icon: PieChart,
      title: "Holder Distribution",
      description: "Concentration of token ownership",
      badgeLabel: data.holder_distribution || "Unknown",
      badgeVariant: data.holder_distribution 
        ? getDistributionBadgeVariant(data.holder_distribution) 
        : "gray"
    },
    {
      icon: BarChart4,
      title: "DEX Depth Status",
      description: "Liquidity depth in decentralized exchanges",
      badgeLabel: data.dex_depth_status || "Unknown",
      badgeVariant: data.dex_depth_status
        ? (data.dex_depth_status.toLowerCase().includes("high") ? "green" : 
           data.dex_depth_status.toLowerCase().includes("medium") ? "blue" : "orange")
        : "gray"
    }
  ];
};

// Transform community data to CategoryFeature format
export const transformCommunityData = (data: CommunityData | null): CategoryFeature[] => {
  if (!data) return [];
  
  return [
    {
      icon: Twitter,
      title: "Twitter Followers",
      description: "Number of followers on Twitter/X",
      badgeLabel: formatNumberWithFallback(data.twitter_followers),
      badgeVariant: data.twitter_followers ? (data.twitter_followers > 50000 ? "green" : "blue") : "gray"
    },
    {
      icon: CheckCircle,
      title: "Twitter Verified",
      description: "Official verification status on Twitter/X",
      badgeLabel: getBadgeLabelForBoolean(data.twitter_verified),
      badgeVariant: getBadgeVariantForBoolean(data.twitter_verified, true)
    },
    {
      icon: TrendingUp,
      title: "7-Day Growth",
      description: "Twitter follower growth in past week",
      badgeLabel: data.twitter_growth_7d !== null ? `${data.twitter_growth_7d >= 0 ? '+' : ''}${data.twitter_growth_7d.toFixed(2)}%` : "N/A",
      badgeVariant: data.twitter_growth_7d ? (data.twitter_growth_7d > 0 ? "green" : "red") : "gray"
    },
    {
      icon: MessageSquare,
      title: "Telegram Members",
      description: "Number of members in Telegram group",
      badgeLabel: formatNumberWithFallback(data.telegram_members),
      badgeVariant: "blue"
    },
    {
      icon: Users,
      title: "Discord Members",
      description: "Number of members in Discord server",
      badgeLabel: formatNumberWithFallback(data.discord_members),
      badgeVariant: "blue"
    },
    {
      icon: Shield,
      title: "Team Visibility",
      description: "Transparency of project team identity",
      badgeLabel: data.team_visibility || "Unknown",
      badgeVariant: data.team_visibility 
        ? (data.team_visibility.toLowerCase().includes("high") ? "green" : 
           data.team_visibility.toLowerCase().includes("medium") ? "blue" : "orange")
        : "gray"
    }
  ];
};

// Transform development data to CategoryFeature format
export const transformDevelopmentData = (data: DevelopmentData | null): CategoryFeature[] => {
  if (!data) return [];
  
  return [
    {
      icon: Github,
      title: "GitHub Repository",
      description: "Link to project's source code",
      badgeLabel: data.github_repo ? "Available" : "Not Found",
      badgeVariant: data.github_repo ? "green" : "gray"
    },
    {
      icon: Code,
      title: "Open Source",
      description: "Public availability of project code",
      badgeLabel: getBadgeLabelForBoolean(data.is_open_source),
      badgeVariant: getBadgeVariantForBoolean(data.is_open_source, true)
    },
    {
      icon: Users,
      title: "Contributors",
      description: "Number of code contributors",
      badgeLabel: data.contributors_count !== null ? data.contributors_count.toString() : "N/A",
      badgeVariant: data.contributors_count ? (data.contributors_count > 5 ? "green" : "blue") : "gray"
    },
    {
      icon: GitCommit,
      title: "Recent Commits",
      description: "Code commits in past 30 days",
      badgeLabel: data.commits_30d !== null ? data.commits_30d.toString() : "N/A",
      badgeVariant: data.commits_30d ? (data.commits_30d > 10 ? "green" : "blue") : "gray"
    },
    {
      icon: Calendar,
      title: "Last Commit",
      description: "Date of most recent code update",
      badgeLabel: data.last_commit ? new Date(data.last_commit).toLocaleDateString() : "N/A",
      badgeVariant: data.last_commit ? "blue" : "gray"
    },
    {
      icon: GitPullRequest,
      title: "Roadmap Progress",
      description: "Status of development roadmap completion",
      badgeLabel: data.roadmap_progress || "Unknown",
      badgeVariant: data.roadmap_progress
        ? (data.roadmap_progress.toLowerCase().includes("high") ? "green" : 
           data.roadmap_progress.toLowerCase().includes("medium") ? "blue" : "orange")
        : "gray"
    }
  ];
};
