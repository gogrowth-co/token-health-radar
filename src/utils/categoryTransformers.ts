
import { formatCurrency, formatNumber, formatTokensCompact } from "./formattingUtils";
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

// Helper function for safe boolean access - returns null when unavailable
const safeBooleanAccess = (data: any, key: string): boolean | null => {
  if (!data || data[key] === null || data[key] === undefined) {
    return null;
  }
  return Boolean(data[key]);
};

// Helper function for safe number access
const safeNumberAccess = (data: any, key: string, fallback: number = 0): number => {
  return data && data[key] != null ? Number(data[key]) : fallback;
};

// Helper to get badge variant for boolean security values (handles null)
const getSecurityBadgeVariant = (value: boolean | null, positiveIsSafe: boolean): "green" | "red" | "gray" => {
  if (value === null) return "gray"; // Unknown = gray
  if (positiveIsSafe) {
    return value ? "green" : "red"; // true is safe, false is risky
  } else {
    return value ? "red" : "green"; // true is risky, false is safe
  }
};

// Helper to get badge label for boolean values (handles null)
const getSecurityBadgeLabel = (value: boolean | null): string => {
  if (value === null) return "Unknown";
  return value ? "Yes" : "No";
};

// Transform security data into feature format
export const transformSecurityData = (data: SecurityData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { icon: Shield, title: "Contract Verified", description: "Source code is public and verified on block explorer", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: AlertCircle, title: "Honeypot Detection", description: "Checks if token can be sold after purchase", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Shield, title: "Ownership Renounced", description: "Contract ownership has been renounced (more secure)", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Lock, title: "Mint Function", description: "Ability to create new tokens", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Activity, title: "Freeze Authority", description: "Ability to freeze token transfers", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Shield, title: "Security Audit", description: "Third-party security audit status", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  // Priority order: Most important security checks first
  const features: CategoryFeature[] = [];

  // 1. CONTRACT VERIFICATION (Most important - can't audit unverified code)
  const contractVerified = safeBooleanAccess(data, 'contract_verified');
  features.push({
    icon: Shield,
    title: "Contract Verified",
    description: contractVerified === null
      ? "Verification status unknown - source code availability not confirmed"
      : contractVerified
        ? "Source code is publicly verified on block explorer"
        : "Source code NOT verified - higher risk, cannot audit",
    badgeLabel: getSecurityBadgeLabel(contractVerified),
    badgeVariant: getSecurityBadgeVariant(contractVerified, true)
  });

  // 2. HONEYPOT DETECTION (Critical - can you sell the token?)
  const honeypotDetected = safeBooleanAccess(data, 'honeypot_detected');
  features.push({
    icon: AlertCircle,
    title: "Honeypot Detection",
    description: honeypotDetected === null
      ? "Honeypot check unavailable - sell functionality not tested"
      : honeypotDetected
        ? "WARNING: Honeypot detected - tokens may not be sellable"
        : "No honeypot detected - token can be sold normally",
    badgeLabel: honeypotDetected === null ? "Unknown" : honeypotDetected ? "Detected ⚠️" : "Clean ✓",
    badgeVariant: getSecurityBadgeVariant(honeypotDetected, false)
  });

  // 3. OWNERSHIP STATUS
  const ownershipRenounced = safeBooleanAccess(data, 'ownership_renounced');
  features.push({
    icon: Shield,
    title: "Ownership Renounced",
    description: ownershipRenounced === null
      ? "Ownership status unknown - control level unclear"
      : ownershipRenounced
        ? "Ownership renounced - contract cannot be modified (more secure)"
        : "Owner can still modify contract - requires trust in team",
    badgeLabel: getSecurityBadgeLabel(ownershipRenounced),
    badgeVariant: getSecurityBadgeVariant(ownershipRenounced, true)
  });

  // 4. MINT FUNCTION
  const canMint = safeBooleanAccess(data, 'can_mint');
  features.push({
    icon: Lock,
    title: "Mint Function",
    description: canMint === null
      ? "Mint capability unknown - supply inflation risk unclear"
      : canMint
        ? "Contract can mint new tokens - supply may increase (inflation risk)"
        : "No mint function - fixed supply (better for value preservation)",
    badgeLabel: getSecurityBadgeLabel(canMint),
    badgeVariant: getSecurityBadgeVariant(canMint, false)
  });

  // 5. FREEZE AUTHORITY
  const freezeAuthority = safeBooleanAccess(data, 'freeze_authority');
  features.push({
    icon: Activity,
    title: "Freeze Authority",
    description: freezeAuthority === null
      ? "Freeze authority status unknown - transfer control unclear"
      : freezeAuthority
        ? "Contract can freeze transfers - owner has significant control"
        : "No freeze authority - transfers cannot be blocked",
    badgeLabel: getSecurityBadgeLabel(freezeAuthority),
    badgeVariant: getSecurityBadgeVariant(freezeAuthority, false)
  });

  // 6. WEBACY RISK ASSESSMENT (if available)
  if (data.webacy_risk_score !== null && data.webacy_risk_score !== undefined) {
    const riskScore = data.webacy_risk_score;
    const flagCount = data.webacy_flags?.length || 0;
    const severity = data.webacy_severity || 'unknown';

    features.push({
      icon: AlertCircle,
      title: "Webacy Risk Assessment",
      description: flagCount > 0
        ? `${flagCount} risk flag${flagCount > 1 ? 's' : ''} detected - ${severity} severity`
        : `Risk score: ${riskScore}/100 - ${severity} risk level`,
      badgeLabel: riskScore >= 70 ? `High Risk (${riskScore})` :
                  riskScore >= 40 ? `Medium Risk (${riskScore})` :
                  riskScore >= 20 ? `Low Risk (${riskScore})` :
                  `Minimal Risk (${riskScore})`,
      badgeVariant: riskScore >= 70 ? 'red' : riskScore >= 40 ? 'orange' : riskScore >= 20 ? 'yellow' : 'green'
    });
  }

  // 7. SECURITY AUDIT
  const auditStatus = safeAccess(data, 'audit_status', null);
  if (auditStatus && auditStatus !== 'unknown') {
    features.push({
      icon: Shield,
      title: "Security Audit",
      description: auditStatus === 'verified'
        ? "Contract has been audited by a third-party security firm"
        : "No verified security audit found",
      badgeLabel: auditStatus === 'verified' ? 'Audited ✓' : 'Not Audited',
      badgeVariant: auditStatus === 'verified' ? 'green' : 'yellow'
    });
  }

  // 8. PROXY CONTRACT (Upgradeability risk)
  const isProxy = safeBooleanAccess(data, 'is_proxy');
  if (isProxy !== null) {
    features.push({
      icon: Shield,
      title: "Proxy Contract",
      description: isProxy
        ? "Contract is upgradeable via proxy - code can be changed by owner"
        : "Not a proxy contract - code is immutable",
      badgeLabel: getSecurityBadgeLabel(isProxy),
      badgeVariant: isProxy ? "yellow" : "green"
    });
  }

  // 9. BLACKLIST FUNCTION
  const hasBlacklist = safeBooleanAccess(data, 'is_blacklisted');
  if (hasBlacklist !== null) {
    features.push({
      icon: AlertCircle,
      title: "Blacklist Function",
      description: hasBlacklist
        ? "Contract can blacklist addresses - owner can block specific wallets"
        : "No blacklist function - all addresses treated equally",
      badgeLabel: hasBlacklist ? "Present ⚠️" : "None ✓",
      badgeVariant: hasBlacklist ? "red" : "green"
    });
  }

  // 10. ACCESS CONTROL
  const hasAccessControl = safeBooleanAccess(data, 'access_control');
  if (hasAccessControl !== null) {
    features.push({
      icon: Lock,
      title: "Access Control",
      description: hasAccessControl
        ? "Special privileges exist for certain addresses - unequal access"
        : "No special access controls - equal treatment for all users",
      badgeLabel: hasAccessControl ? "Present" : "None ✓",
      badgeVariant: hasAccessControl ? "yellow" : "green"
    });
  }

  // 11. TRANSACTION TAXES - Buy Tax
  if (data.buy_tax !== null && data.buy_tax !== undefined) {
    const buyTaxPercent = data.buy_tax * 100;
    features.push({
      icon: DollarSign,
      title: "Buy Tax",
      description: buyTaxPercent === 0
        ? "No buy tax - full amount goes to purchase"
        : buyTaxPercent > 10
          ? `HIGH buy tax of ${buyTaxPercent.toFixed(1)}% - significant cost to purchase`
          : `${buyTaxPercent.toFixed(1)}% buy tax - moderate transaction cost`,
      badgeLabel: `${buyTaxPercent.toFixed(1)}%`,
      badgeVariant: buyTaxPercent === 0 ? "green" : buyTaxPercent > 10 ? "red" : buyTaxPercent > 5 ? "yellow" : "blue"
    });
  }

  // 12. TRANSACTION TAXES - Sell Tax
  if (data.sell_tax !== null && data.sell_tax !== undefined) {
    const sellTaxPercent = data.sell_tax * 100;
    features.push({
      icon: DollarSign,
      title: "Sell Tax",
      description: sellTaxPercent === 0
        ? "No sell tax - full proceeds from sale"
        : sellTaxPercent > 10
          ? `HIGH sell tax of ${sellTaxPercent.toFixed(1)}% - difficult to exit position`
          : `${sellTaxPercent.toFixed(1)}% sell tax - moderate transaction cost`,
      badgeLabel: `${sellTaxPercent.toFixed(1)}%`,
      badgeVariant: sellTaxPercent === 0 ? "green" : sellTaxPercent > 10 ? "red" : sellTaxPercent > 5 ? "yellow" : "blue"
    });
  }

  // 13. TRANSFER TAX (if different from buy/sell)
  if (data.transfer_tax !== null && data.transfer_tax !== undefined &&
      data.transfer_tax > 0 && data.transfer_tax !== data.buy_tax && data.transfer_tax !== data.sell_tax) {
    const transferTaxPercent = data.transfer_tax * 100;
    features.push({
      icon: DollarSign,
      title: "Transfer Tax",
      description: `${transferTaxPercent.toFixed(1)}% tax on wallet-to-wallet transfers`,
      badgeLabel: `${transferTaxPercent.toFixed(1)}%`,
      badgeVariant: transferTaxPercent > 5 ? "red" : transferTaxPercent > 2 ? "yellow" : "blue"
    });
  }

  return features;
};

// Transform tokenomics data into feature format
export const transformTokenomicsData = (data: TokenomicsData | null, tokenDataCache?: any): CategoryFeature[] => {
  if (!data) {
    return [
      { icon: Coins, title: "Circulating Supply", description: "Number of tokens currently in circulation", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: DollarSign, title: "TVL (USD)", description: "Total Value Locked from DeFiLlama", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: TrendingUp, title: "Treasury (USD)", description: "Value held in project treasury", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Distribution Quality", description: "How well distributed the token supply is among holders", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  // Enhanced supply analysis with real vs total supply - prioritize token_data_cache
  const totalSupply = safeNumberAccess(data, 'total_supply');
  const circulatingSupply = safeNumberAccess(tokenDataCache, 'circulating_supply') ||
                          safeNumberAccess(data, 'actual_circulating_supply') ||
                          safeNumberAccess(data, 'circulating_supply');
  const supplyCap = safeNumberAccess(data, 'supply_cap');

  console.log('[TRANSFORM-TOKENOMICS] Circulating supply sources:', {
    fromTokenDataCache: safeNumberAccess(tokenDataCache, 'circulating_supply'),
    fromActualCirculating: safeNumberAccess(data, 'actual_circulating_supply'),
    fromRegularCirculating: safeNumberAccess(data, 'circulating_supply'),
    finalValue: circulatingSupply
  });

  // Enhanced liquidity from DEX pairs
  const dexLiquidityUsd = safeNumberAccess(data, 'dex_liquidity_usd');
  const treasuryUsd = safeNumberAccess(data, 'treasury_usd');
  const burnMechanism = safeBooleanAccess(data, 'burn_mechanism');
  const burnEventsDetected = safeBooleanAccess(data, 'burn_events_detected');
  const inflationRate = safeNumberAccess(data, 'inflation_rate');

  // Enhanced distribution metrics
  const distributionScore = safeAccess(data, 'distribution_score', 'Unknown');
  const concentrationRisk = safeAccess(data, 'holder_concentration_risk', 'Unknown');
  const giniCoefficient = safeNumberAccess(data, 'distribution_gini_coefficient');
  const topHoldersCount = safeNumberAccess(data, 'top_holders_count');

  // Data quality indicators
  const confidenceScore = safeNumberAccess(data, 'data_confidence_score');

  // Build comprehensive metrics list
  const metrics: CategoryFeature[] = [];

  // 1. Total Supply (if available)
  if (totalSupply > 0 || supplyCap > 0) {
    const supply = totalSupply > 0 ? totalSupply : supplyCap;
    const isCapped = supplyCap > 0;
    metrics.push({
      icon: Coins,
      title: "Total Supply",
      description: isCapped
        ? "Maximum supply is capped at " + formatTokensCompact(supply) + " tokens"
        : "Current total supply - may increase if minting is enabled",
      badgeLabel: formatTokensCompact(supply) + " Tokens",
      badgeVariant: isCapped ? "green" : "yellow"
    });
  }

  // 2. Circulating Supply (with context of total)
  if (circulatingSupply > 0) {
    const ratio = totalSupply > 0 ? (circulatingSupply / totalSupply) * 100 : null;
    const description = ratio
      ? `${ratio.toFixed(1)}% of total supply in circulation (${formatTokensCompact(circulatingSupply)} / ${formatTokensCompact(totalSupply)})`
      : "Tokens currently in circulation";

    metrics.push({
      icon: Coins,
      title: "Circulating Supply",
      description,
      badgeLabel: formatTokensCompact(circulatingSupply) + " Tokens",
      badgeVariant: ratio && ratio > 90 ? "green" : ratio && ratio > 50 ? "blue" : "orange"
    });
  }

  // 3. Inflation Rate (if available and meaningful)
  if (inflationRate !== 0 && inflationRate !== null) {
    const isInflationary = inflationRate > 0;
    const absRate = Math.abs(inflationRate);
    const description = isInflationary
      ? `Token supply is increasing at ${absRate.toFixed(2)}% per year - dilution risk`
      : `Deflationary: supply decreasing at ${absRate.toFixed(2)}% per year - scarcity increases`;

    metrics.push({
      icon: TrendingUp,
      title: "Inflation Rate",
      description,
      badgeLabel: (isInflationary ? "+" : "-") + absRate.toFixed(2) + "%/year",
      badgeVariant: isInflationary ? (absRate > 5 ? "orange" : "yellow") : "blue"
    });
  }

  // 4. Burn Mechanism (if available)
  if (burnMechanism !== null) {
    const hasActiveBurns = burnEventsDetected === true;
    const description = hasActiveBurns
      ? "Active burn mechanism detected - tokens are being permanently removed from supply"
      : burnMechanism
        ? "Burn mechanism exists - tokens can be removed from supply over time"
        : "No burn mechanism - token supply will not decrease through burns";

    metrics.push({
      icon: TrendingUp,
      title: "Burn Mechanism",
      description,
      badgeLabel: hasActiveBurns ? "Active ✓" : burnMechanism ? "Exists" : "None",
      badgeVariant: hasActiveBurns ? "green" : burnMechanism ? "green" : "yellow"
    });
  }

  // 5. Holder Distribution
  if (giniCoefficient > 0 || distributionScore !== "Unknown" || concentrationRisk !== "Unknown") {
    let distributionText = "";
    if (giniCoefficient > 0) {
      if (giniCoefficient < 0.4) distributionText = "very well distributed";
      else if (giniCoefficient < 0.6) distributionText = "moderately distributed";
      else if (giniCoefficient < 0.8) distributionText = "concentrated";
      else distributionText = "highly concentrated";
    }

    const description = giniCoefficient > 0
      ? `Distribution among ${topHoldersCount || 'N/A'} holders: ${distributionText} (Gini: ${giniCoefficient.toFixed(3)})`
      : "Token distribution among holders";

    metrics.push({
      icon: Users,
      title: "Holder Distribution",
      description,
      badgeLabel: distributionScore !== "Unknown"
        ? distributionScore
        : concentrationRisk !== "Unknown"
          ? `${concentrationRisk} Risk`
          : "Unknown",
      badgeVariant: getDistributionVariant(distributionScore, concentrationRisk)
    });
  }

  // 6. Total Value Locked
  if (data.tvl_usd && data.tvl_usd > 0) {
    const tvl = data.tvl_usd;
    const description = tvl > 100000000
      ? `Strong TVL of ${formatCurrency(tvl)} indicates significant DeFi integration`
      : tvl > 10000000
        ? `Moderate TVL of ${formatCurrency(tvl)} from DeFiLlama`
        : `Low TVL of ${formatCurrency(tvl)} - limited DeFi usage`;

    metrics.push({
      icon: DollarSign,
      title: "Total Value Locked",
      description,
      badgeLabel: formatCurrency(tvl),
      badgeVariant: tvl > 100000000 ? "green" : tvl > 10000000 ? "blue" : "orange"
    });
  }

  // 7. DEX Liquidity (if available)
  if (dexLiquidityUsd > 0) {
    const description = dexLiquidityUsd > 1000000
      ? `High liquidity of ${formatCurrency(dexLiquidityUsd)} - easy to trade large amounts without slippage`
      : dexLiquidityUsd > 100000
        ? `Moderate liquidity of ${formatCurrency(dexLiquidityUsd)} - reasonable for trading`
        : `Low liquidity of ${formatCurrency(dexLiquidityUsd)} - higher slippage risk on large trades`;

    metrics.push({
      icon: Activity,
      title: "DEX Liquidity",
      description,
      badgeLabel: formatCurrency(dexLiquidityUsd),
      badgeVariant: dexLiquidityUsd > 1000000 ? "green" : dexLiquidityUsd > 100000 ? "blue" : "orange"
    });
  }

  // 8. Treasury Holdings
  if (treasuryUsd > 0) {
    const description = treasuryUsd > 1000000
      ? `Strong treasury of ${formatCurrency(treasuryUsd)} - project is well-funded`
      : treasuryUsd > 100000
        ? `Moderate treasury of ${formatCurrency(treasuryUsd)} - some runway available`
        : `Small treasury of ${formatCurrency(treasuryUsd)} - limited resources`;

    metrics.push({
      icon: TrendingUp,
      title: "Treasury Holdings",
      description,
      badgeLabel: formatCurrency(treasuryUsd),
      badgeVariant: treasuryUsd > 1000000 ? "green" : treasuryUsd > 100000 ? "blue" : "orange"
    });
  }

  // If we have comprehensive data, return it; otherwise fall back to basic 4 metrics
  if (metrics.length >= 4) {
    return metrics;
  }

  // Fallback to basic metrics if insufficient data
  return [
    {
      icon: Coins,
      title: "Circulating Supply",
      description: circulatingSupply > 0 ? "Tokens currently in circulation" : "Number of tokens currently in circulation",
      badgeLabel: circulatingSupply > 0 ? formatTokensCompact(circulatingSupply) + " Tokens" : "Not Available",
      badgeVariant: circulatingSupply > 0 ? "blue" : "gray"
    },
    {
      icon: DollarSign,
      title: "TVL (USD)",
      description: "Total Value Locked from DeFiLlama",
      badgeLabel: data.tvl_usd && data.tvl_usd > 0 ? formatCurrency(data.tvl_usd) : "Not Available",
      badgeVariant: data.tvl_usd && data.tvl_usd > 10000000 ? "green" : data.tvl_usd && data.tvl_usd > 1000000 ? "blue" : data.tvl_usd && data.tvl_usd > 100000 ? "orange" : "gray"
    },
    {
      icon: TrendingUp,
      title: "Treasury (USD)",
      description: "Value held in project treasury",
      badgeLabel: treasuryUsd > 0 ? formatCurrency(treasuryUsd) : "Not Available",
      badgeVariant: treasuryUsd > 500000 ? "green" : treasuryUsd > 50000 ? "blue" : treasuryUsd > 0 ? "orange" : "gray"
    },
    {
      icon: Users,
      title: "Distribution Quality",
      description: giniCoefficient > 0
        ? `Token distribution among ${topHoldersCount || 'N/A'} holders (Gini: ${giniCoefficient.toFixed(3)})`
        : "How well distributed the token supply is among holders",
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
      { icon: TrendingUp, title: "Trading Volume (24h)", description: "Total trading volume in the last 24 hours - indicates liquidity and ease of buying/selling", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Lock, title: "Liquidity Lock", description: "How long liquidity is locked for - prevents sudden removal of trading liquidity", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Activity, title: "DEX Depth", description: "Liquidity depth on decentralized exchanges - affects slippage and price impact on trades", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: BarChart3, title: "CEX Listings", description: "Number of centralized exchange listings - indicates accessibility and institutional adoption", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Holder Distribution", description: "How tokens are distributed among holders - concentrated holdings increase manipulation risk", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  const tradingVolume = safeNumberAccess(data, 'trading_volume_24h_usd');
  const cexListings = safeNumberAccess(data, 'cex_listings');
  const liquidityLocked = safeNumberAccess(data, 'liquidity_locked_days');
  const dexDepth = safeAccess(data, 'dex_depth_status', 'Unknown');
  const holderDistribution = safeAccess(data, 'holder_distribution', 'Unknown');

  // Build comprehensive liquidity metrics
  const metrics: CategoryFeature[] = [];

  // 1. Trading Volume (24h) - Critical for understanding liquidity
  let volumeVariant: "gray" | "blue" | "green" | "red" | "orange" | "yellow" = "gray";

  if (tradingVolume === 0) {
    volumeVariant = "red";
  } else if (tradingVolume < 1000) {
    volumeVariant = "red";
  } else if (tradingVolume < 10000) {
    volumeVariant = "orange";
  } else if (tradingVolume < 100000) {
    volumeVariant = "yellow";
  } else if (tradingVolume < 1000000) {
    volumeVariant = "blue";
  } else {
    volumeVariant = "green";
  }

  metrics.push({
    icon: TrendingUp,
    title: "Trading Volume (24h)",
    description: "Total trading volume in the last 24 hours - indicates liquidity and ease of buying/selling",
    badgeLabel: tradingVolume > 0 ? formatCurrency(tradingVolume) : "No Volume",
    badgeVariant: volumeVariant
  });

  // 2. Liquidity Lock - Important security measure
  let lockVariant: "gray" | "blue" | "green" | "red" | "orange" | "yellow" = "gray";

  if (liquidityLocked === 0) {
    lockVariant = "red";
  } else if (liquidityLocked < 30) {
    lockVariant = "orange";
  } else if (liquidityLocked < 90) {
    lockVariant = "yellow";
  } else if (liquidityLocked < 365) {
    lockVariant = "blue";
  } else if (liquidityLocked < 730) {
    lockVariant = "green";
  } else {
    lockVariant = "green";
  }

  metrics.push({
    icon: Lock,
    title: "Liquidity Lock",
    description: "How long liquidity is locked for - prevents sudden removal of trading liquidity",
    badgeLabel: liquidityLocked > 0 ? `${liquidityLocked} days` : "Not Locked",
    badgeVariant: lockVariant
  });

  // 3. DEX Depth - Liquidity depth assessment
  let depthVariant: "gray" | "blue" | "green" | "red" | "orange" | "yellow" = "gray";
  const normalizedDepth = dexDepth.toLowerCase();

  if (normalizedDepth === "unknown" || !dexDepth) {
    depthVariant = "gray";
  } else if (normalizedDepth === "good" || normalizedDepth === "high") {
    depthVariant = "green";
  } else if (normalizedDepth === "medium" || normalizedDepth === "moderate") {
    depthVariant = "blue";
  } else if (normalizedDepth === "limited" || normalizedDepth === "low") {
    depthVariant = "orange";
  } else if (normalizedDepth === "very low" || normalizedDepth === "poor") {
    depthVariant = "red";
  } else {
    depthVariant = "gray";
  }

  metrics.push({
    icon: Activity,
    title: "DEX Depth",
    description: "Liquidity depth on decentralized exchanges - affects slippage and price impact on trades",
    badgeLabel: dexDepth.charAt(0).toUpperCase() + dexDepth.slice(1),
    badgeVariant: depthVariant
  });

  // 4. CEX Listings - Exchange availability
  let cexVariant: "gray" | "blue" | "green" | "red" | "orange" | "yellow" = "gray";

  if (cexListings === 0) {
    cexVariant = "orange";
  } else if (cexListings === 1) {
    cexVariant = "yellow";
  } else if (cexListings < 5) {
    cexVariant = "blue";
  } else if (cexListings < 10) {
    cexVariant = "green";
  } else {
    cexVariant = "green";
  }

  metrics.push({
    icon: BarChart3,
    title: "CEX Listings",
    description: "Number of centralized exchange listings - indicates accessibility and institutional adoption",
    badgeLabel: cexListings === 0 ? "None" : cexListings.toString(),
    badgeVariant: cexVariant
  });

  // 5. Holder Distribution - Concentration risk
  let distributionVariant: "gray" | "blue" | "green" | "red" | "orange" | "yellow" = "gray";
  const normalizedDistribution = holderDistribution.toLowerCase();

  if (normalizedDistribution === "unknown") {
    distributionVariant = "gray";
  } else if (normalizedDistribution === "low" || normalizedDistribution === "good") {
    distributionVariant = "green";
  } else if (normalizedDistribution === "medium" || normalizedDistribution === "fair" || normalizedDistribution === "moderate") {
    distributionVariant = "blue";
  } else if (normalizedDistribution === "high" || normalizedDistribution === "poor") {
    distributionVariant = "orange";
  } else if (normalizedDistribution === "very high" || normalizedDistribution === "critical") {
    distributionVariant = "red";
  } else {
    distributionVariant = "gray";
  }

  metrics.push({
    icon: Users,
    title: "Holder Distribution",
    description: "How tokens are distributed among holders - concentrated holdings increase manipulation risk",
    badgeLabel: holderDistribution.charAt(0).toUpperCase() + holderDistribution.slice(1) + " Risk",
    badgeVariant: distributionVariant
  });

  return metrics;
};

// Transform community data into feature format
export const transformCommunityData = (data: CommunityData | null): CategoryFeature[] => {
  if (!data) {
    return [
      { icon: Users, title: "Twitter Followers", description: "Number of followers on Twitter/X", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Shield, title: "Twitter Verified", description: "Twitter/X account verification status", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: TrendingUp, title: "Twitter Growth (7d)", description: "Follower growth in the last 7 days", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Discord Members", description: "Number of Discord community members", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Telegram Members", description: "Number of Telegram community members", badgeLabel: "Unknown", badgeVariant: "gray" },
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
      badgeLabel: getSecurityBadgeLabel(twitterVerified),
      badgeVariant: getSecurityBadgeVariant(twitterVerified, true)
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
      icon: Users, 
      title: "Telegram Members", 
      description: "Number of Telegram community members",
      badgeLabel: formatNumber(safeNumberAccess(data, 'telegram_members')),
      badgeVariant: safeNumberAccess(data, 'telegram_members') >= 50000 ? "green" : 
                   safeNumberAccess(data, 'telegram_members') >= 5000 ? "blue" : 
                   safeNumberAccess(data, 'telegram_members') >= 500 ? "orange" : 
                   safeNumberAccess(data, 'telegram_members') > 0 ? "yellow" : "gray"
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
      badgeLabel: getSecurityBadgeLabel(isOpenSource),
      badgeVariant: getSecurityBadgeVariant(isOpenSource, true)
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
