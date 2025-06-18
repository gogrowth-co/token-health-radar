import { formatCurrency, formatNumber } from "./formattingUtils";

export interface CategoryFeature {
  label: string;
  value: string | boolean | number | null | undefined;
  type: "text" | "boolean";
  positive?: boolean;
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

// Transform security data into feature format
export const transformSecurityData = (data: SecurityData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { label: "Ownership Renounced", value: "Unknown", type: "boolean" },
      { label: "Can Mint", value: "Unknown", type: "boolean" },
      { label: "Honeypot Detection", value: "Unknown", type: "boolean" },
      { label: "Freeze Authority", value: "Unknown", type: "boolean" },
      { label: "Audit Status", value: "Unknown", type: "text" },
      { label: "Multisig Status", value: "Unknown", type: "text" }
    ];
  }

  return [
    { 
      label: "Ownership Renounced", 
      value: safeBooleanAccess(data, 'ownership_renounced'), 
      type: "boolean",
      positive: true
    },
    { 
      label: "Can Mint", 
      value: safeBooleanAccess(data, 'can_mint'), 
      type: "boolean",
      positive: false
    },
    { 
      label: "Honeypot Detection", 
      value: safeBooleanAccess(data, 'honeypot_detected'), 
      type: "boolean",
      positive: false
    },
    { 
      label: "Freeze Authority", 
      value: safeBooleanAccess(data, 'freeze_authority'), 
      type: "boolean",
      positive: false
    },
    { 
      label: "Audit Status", 
      value: safeAccess(data, 'audit_status', 'Unknown'), 
      type: "text" 
    },
    { 
      label: "Multisig Status", 
      value: safeAccess(data, 'multisig_status', 'Unknown'), 
      type: "text" 
    }
  ];
};

// Transform tokenomics data into feature format
export const transformTokenomicsData = (data: TokenomicsData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { label: "Circulating Supply", value: "Unknown", type: "text" },
      { label: "Supply Cap", value: "Unknown", type: "text" },
      { label: "TVL (USD)", value: "Unknown", type: "text" },
      { label: "Treasury (USD)", value: "Unknown", type: "text" },
      { label: "Burn Mechanism", value: "Unknown", type: "boolean" },
      { label: "Distribution Score", value: "Unknown", type: "text" },
      { label: "Vesting Schedule", value: "Unknown", type: "text" }
    ];
  }

  return [
    { 
      label: "Circulating Supply", 
      value: formatNumber(safeNumberAccess(data, 'circulating_supply')), 
      type: "text" 
    },
    { 
      label: "Supply Cap", 
      value: formatNumber(safeNumberAccess(data, 'supply_cap')), 
      type: "text" 
    },
    { 
      label: "TVL (USD)", 
      value: formatCurrency(safeNumberAccess(data, 'tvl_usd')), 
      type: "text" 
    },
    { 
      label: "Treasury (USD)", 
      value: formatCurrency(safeNumberAccess(data, 'treasury_usd')), 
      type: "text" 
    },
    { 
      label: "Burn Mechanism", 
      value: safeBooleanAccess(data, 'burn_mechanism'), 
      type: "boolean",
      positive: true
    },
    { 
      label: "Distribution Score", 
      value: safeAccess(data, 'distribution_score', 'Unknown'), 
      type: "text" 
    },
    { 
      label: "Vesting Schedule", 
      value: safeAccess(data, 'vesting_schedule', 'Unknown'), 
      type: "text" 
    }
  ];
};

// Transform liquidity data into feature format
export const transformLiquidityData = (data: LiquidityData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { label: "Trading Volume (24h)", value: "Unknown", type: "text" },
      { label: "CEX Listings", value: "Unknown", type: "text" },
      { label: "Liquidity Lock (Days)", value: "Unknown", type: "text" },
      { label: "DEX Depth Status", value: "Unknown", type: "text" },
      { label: "Holder Distribution", value: "Unknown", type: "text" }
    ];
  }

  return [
    { 
      label: "Trading Volume (24h)", 
      value: formatCurrency(safeNumberAccess(data, 'trading_volume_24h_usd')), 
      type: "text" 
    },
    { 
      label: "CEX Listings", 
      value: safeNumberAccess(data, 'cex_listings').toString(), 
      type: "text" 
    },
    { 
      label: "Liquidity Lock (Days)", 
      value: safeNumberAccess(data, 'liquidity_locked_days').toString(), 
      type: "text" 
    },
    { 
      label: "DEX Depth Status", 
      value: safeAccess(data, 'dex_depth_status', 'Unknown'), 
      type: "text" 
    },
    { 
      label: "Holder Distribution", 
      value: safeAccess(data, 'holder_distribution', 'Unknown'), 
      type: "text" 
    }
  ];
};

// Transform community data into feature format
export const transformCommunityData = (data: CommunityData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { label: "Twitter Followers", value: "Unknown", type: "text" },
      { label: "Twitter Verified", value: "Unknown", type: "boolean" },
      { label: "Twitter Growth (7d)", value: "Unknown", type: "text" },
      { label: "Discord Members", value: "Unknown", type: "text" },
      { label: "Telegram Members", value: "Unknown", type: "text" },
      { label: "Team Visibility", value: "Unknown", type: "text" },
      { label: "Active Channels", value: "Unknown", type: "text" }
    ];
  }

  return [
    { 
      label: "Twitter Followers", 
      value: formatNumber(safeNumberAccess(data, 'twitter_followers')), 
      type: "text" 
    },
    { 
      label: "Twitter Verified", 
      value: safeBooleanAccess(data, 'twitter_verified'), 
      type: "boolean",
      positive: true
    },
    { 
      label: "Twitter Growth (7d)", 
      value: `${safeNumberAccess(data, 'twitter_growth_7d')}%`, 
      type: "text" 
    },
    { 
      label: "Discord Members", 
      value: formatNumber(safeNumberAccess(data, 'discord_members')), 
      type: "text" 
    },
    { 
      label: "Telegram Members", 
      value: formatNumber(safeNumberAccess(data, 'telegram_members')), 
      type: "text" 
    },
    { 
      label: "Team Visibility", 
      value: safeAccess(data, 'team_visibility', 'Unknown'), 
      type: "text" 
    },
    { 
      label: "Active Channels", 
      value: safeAccess(data, 'active_channels', []).length.toString(), 
      type: "text" 
    }
  ];
};

// Transform development data into feature format
export const transformDevelopmentData = (data: DevelopmentData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { label: "GitHub Repository", value: "Unknown", type: "text" },
      { label: "Open Source", value: "Unknown", type: "boolean" },
      { label: "Contributors", value: "Unknown", type: "text" },
      { label: "Commits (30d)", value: "Unknown", type: "text" },
      { label: "Last Commit", value: "Unknown", type: "text" },
      { label: "Roadmap Progress", value: "Unknown", type: "text" }
    ];
  }

  return [
    { 
      label: "GitHub Repository", 
      value: safeAccess(data, 'github_repo', 'Unknown'), 
      type: "text" 
    },
    { 
      label: "Open Source", 
      value: safeBooleanAccess(data, 'is_open_source'), 
      type: "boolean",
      positive: true
    },
    { 
      label: "Contributors", 
      value: safeNumberAccess(data, 'contributors_count').toString(), 
      type: "text" 
    },
    { 
      label: "Commits (30d)", 
      value: safeNumberAccess(data, 'commits_30d').toString(), 
      type: "text" 
    },
    { 
      label: "Last Commit", 
      value: data?.last_commit ? new Date(data.last_commit).toLocaleDateString() : 'Unknown', 
      type: "text" 
    },
    { 
      label: "Roadmap Progress", 
      value: safeAccess(data, 'roadmap_progress', 'Unknown'), 
      type: "text" 
    }
  ];
};
