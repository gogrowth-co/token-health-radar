
import { 
  Shield, Lock, AlertTriangle, CheckCircle, Code, 
  Fingerprint, CheckCircle2, XCircle, CircleDot, 
  LucideIcon 
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

// Transform tokenomics data to CategoryFeature format
export const transformTokenomicsData = (data: TokenomicsData | null): CategoryFeature[] => {
  if (!data) return [];
  
  // Will be implemented as needed
  return [];
};

// Transform liquidity data to CategoryFeature format
export const transformLiquidityData = (data: LiquidityData | null): CategoryFeature[] => {
  if (!data) return [];
  
  // Will be implemented as needed
  return [];
};

// Transform community data to CategoryFeature format
export const transformCommunityData = (data: CommunityData | null): CategoryFeature[] => {
  if (!data) return [];
  
  // Will be implemented as needed
  return [];
};

// Transform development data to CategoryFeature format
export const transformDevelopmentData = (data: DevelopmentData | null): CategoryFeature[] => {
  if (!data) return [];
  
  // Will be implemented as needed
  return [];
};
