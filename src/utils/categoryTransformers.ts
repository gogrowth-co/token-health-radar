
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
      { icon: Coins, title: "Total Supply", description: "Maximum number of tokens that can exist", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: TrendingUp, title: "Circulating Supply", description: "Number of tokens currently in circulation", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: DollarSign, title: "Market Cap", description: "Total value of all circulating tokens", badgeLabel: "Unknown", badgeVariant: "gray" },
      { icon: Users, title: "Distribution Quality", description: "How well distributed the token supply is among holders", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  const features: CategoryFeature[] = [];

  // Enhanced supply analysis with real vs total supply - prioritize token_data_cache
  const totalSupply = safeNumberAccess(data, 'total_supply');
  const circulatingSupply = safeNumberAccess(tokenDataCache, 'circulating_supply') ||
                          safeNumberAccess(data, 'actual_circulating_supply') ||
                          safeNumberAccess(data, 'circulating_supply');
  const supplyCap = safeNumberAccess(data, 'supply_cap');
  const inflationRate = safeNumberAccess(data, 'inflation_rate');

  console.log('[TRANSFORM-TOKENOMICS] Circulating supply sources:', {
    fromTokenDataCache: safeNumberAccess(tokenDataCache, 'circulating_supply'),
    fromActualCirculating: safeNumberAccess(data, 'actual_circulating_supply'),
    fromRegularCirculating: safeNumberAccess(data, 'circulating_supply'),
    finalValue: circulatingSupply
  });

  // Enhanced liquidity from DEX pairs
  const dexLiquidityUsd = safeNumberAccess(data, 'dex_liquidity_usd');
  const treasuryUsd = safeNumberAccess(data, 'treasury_usd');
  const tvlUsd = safeNumberAccess(data, 'tvl_usd');
  const burnMechanism = safeBooleanAccess(data, 'burn_mechanism');
  const burnEventsDetected = safeBooleanAccess(data, 'burn_events_detected');

  // Enhanced distribution metrics
  const distributionScore = safeAccess(data, 'distribution_score', 'Unknown');
  const concentrationRisk = safeAccess(data, 'holder_concentration_risk', 'Unknown');
  const giniCoefficient = safeNumberAccess(data, 'distribution_gini_coefficient');
  const topHoldersCount = safeNumberAccess(data, 'top_holders_count');

  // Calculate useful ratios
  const circulatingRatio = totalSupply > 0 && circulatingSupply > 0
    ? (circulatingSupply / totalSupply) * 100
    : null;

  // 1. TOTAL SUPPLY (Foundation metric)
  if (totalSupply > 0 || supplyCap > 0) {
    const displaySupply = totalSupply > 0 ? totalSupply : supplyCap;
    const isCapped = supplyCap > 0;

    features.push({
      icon: Coins,
      title: "Total Supply",
      description: isCapped
        ? `Maximum supply is capped at ${formatTokensCompact(supplyCap)} tokens`
        : totalSupply > 0
          ? "Current total supply - may increase if minting is enabled"
          : "Total supply information unavailable",
      badgeLabel: formatTokensCompact(displaySupply),
      badgeVariant: isCapped ? "green" : "yellow"
    });
  }

  // 2. CIRCULATING SUPPLY (with context)
  if (circulatingSupply > 0) {
    features.push({
      icon: TrendingUp,
      title: "Circulating Supply",
      description: circulatingRatio !== null
        ? `${circulatingRatio.toFixed(1)}% of total supply is in circulation (${formatTokensCompact(circulatingSupply)} / ${formatTokensCompact(totalSupply)})`
        : `${formatTokensCompact(circulatingSupply)} tokens currently in active circulation`,
      badgeLabel: formatTokensCompact(circulatingSupply),
      badgeVariant: circulatingRatio !== null
        ? circulatingRatio > 90 ? "green" : circulatingRatio > 50 ? "blue" : "orange"
        : "blue"
    });
  }

  // 3. INFLATION RATE (if available)
  if (inflationRate !== 0 && inflationRate !== null) {
    const inflationPercent = inflationRate * 100;
    features.push({
      icon: TrendingUp,
      title: "Inflation Rate",
      description: inflationPercent > 0
        ? `Token supply is increasing at ${inflationPercent.toFixed(2)}% per year - dilution risk`
        : inflationPercent < 0
          ? `Deflationary: supply decreasing at ${Math.abs(inflationPercent).toFixed(2)}% per year`
          : "Stable supply - no inflation or deflation",
      badgeLabel: `${inflationPercent > 0 ? '+' : ''}${inflationPercent.toFixed(2)}%/year`,
      badgeVariant: inflationPercent === 0 ? "green" :
                    inflationPercent < 0 ? "blue" :
                    inflationPercent < 5 ? "yellow" : "orange"
    });
  }

  // 4. BURN MECHANISM
  if (burnMechanism !== null || burnEventsDetected !== null) {
    const hasBurn = burnMechanism || burnEventsDetected;
    features.push({
      icon: Activity,
      title: "Burn Mechanism",
      description: hasBurn === true
        ? burnEventsDetected === true
          ? "Active burn mechanism detected - tokens are being permanently removed from supply"
          : "Burn mechanism exists - can reduce supply over time"
        : hasBurn === false
          ? "No burn mechanism - supply will not decrease through burns"
          : "Burn mechanism status unknown",
      badgeLabel: hasBurn === null ? "Unknown" : hasBurn ? "Active ✓" : "None",
      badgeVariant: hasBurn === null ? "gray" : hasBurn ? "green" : "yellow"
    });
  }

  // 5. HOLDER DISTRIBUTION (with interpretation)
  if (distributionScore !== "Unknown" || concentrationRisk !== "Unknown" || giniCoefficient > 0) {
    let description = "How well distributed the token supply is among holders";

    if (giniCoefficient > 0) {
      // Gini coefficient: 0 = perfect equality, 1 = perfect inequality
      const interpretation = giniCoefficient < 0.4 ? "very well distributed" :
                            giniCoefficient < 0.6 ? "moderately distributed" :
                            giniCoefficient < 0.8 ? "concentrated" : "highly concentrated";
      description = `Distribution among ${topHoldersCount || 'N/A'} holders: ${interpretation} (Gini: ${giniCoefficient.toFixed(3)})`;
    } else if (concentrationRisk !== "Unknown") {
      description = `${concentrationRisk} concentration risk - ${
        concentrationRisk === "Low" ? "tokens well distributed" :
        concentrationRisk === "Medium" ? "moderate concentration" :
        concentrationRisk === "High" ? "significant whale holdings" :
        "extreme concentration in few wallets"
      }`;
    }

    features.push({
      icon: Users,
      title: "Holder Distribution",
      description,
      badgeLabel: distributionScore !== "Unknown" ? distributionScore :
                  concentrationRisk !== "Unknown" ? `${concentrationRisk} Risk` :
                  giniCoefficient > 0 ? `Gini: ${giniCoefficient.toFixed(2)}` : "Unknown",
      badgeVariant: getDistributionVariant(distributionScore, concentrationRisk)
    });
  }

  // 6. TVL - TOTAL VALUE LOCKED (with context)
  if (tvlUsd > 0) {
    features.push({
      icon: DollarSign,
      title: "Total Value Locked",
      description: tvlUsd > 100000000
        ? `Strong TVL of ${formatCurrency(tvlUsd)} indicates significant DeFi integration`
        : tvlUsd > 10000000
          ? `Moderate TVL of ${formatCurrency(tvlUsd)} from DeFiLlama`
          : `Low TVL of ${formatCurrency(tvlUsd)} - limited DeFi usage`,
      badgeLabel: formatCurrency(tvlUsd),
      badgeVariant: tvlUsd > 10000000 ? "green" : tvlUsd > 1000000 ? "blue" : "orange"
    });
  }

  // 7. DEX LIQUIDITY (if available)
  if (dexLiquidityUsd > 0) {
    features.push({
      icon: BarChart3,
      title: "DEX Liquidity",
      description: dexLiquidityUsd > 1000000
        ? `High liquidity of ${formatCurrency(dexLiquidityUsd)} - easy to trade large amounts`
        : dexLiquidityUsd > 100000
          ? `Moderate liquidity of ${formatCurrency(dexLiquidityUsd)} - reasonable for trading`
          : `Low liquidity of ${formatCurrency(dexLiquidityUsd)} - higher slippage risk`,
      badgeLabel: formatCurrency(dexLiquidityUsd),
      badgeVariant: dexLiquidityUsd > 1000000 ? "green" : dexLiquidityUsd > 100000 ? "blue" : "orange"
    });
  }

  // 8. TREASURY (if available)
  if (treasuryUsd > 0) {
    features.push({
      icon: Lock,
      title: "Treasury Holdings",
      description: treasuryUsd > 1000000
        ? `Strong treasury of ${formatCurrency(treasuryUsd)} - well-funded project`
        : treasuryUsd > 100000
          ? `Moderate treasury of ${formatCurrency(treasuryUsd)} - some runway`
          : `Small treasury of ${formatCurrency(treasuryUsd)} - limited resources`,
      badgeLabel: formatCurrency(treasuryUsd),
      badgeVariant: treasuryUsd > 500000 ? "green" : treasuryUsd > 50000 ? "blue" : "orange"
    });
  }

  // Fallback if no features were added
  if (features.length === 0) {
    return [
      { icon: Coins, title: "Circulating Supply", description: "Number of tokens currently in circulation", badgeLabel: "Not Available", badgeVariant: "gray" },
      { icon: DollarSign, title: "TVL (USD)", description: "Total Value Locked from DeFiLlama", badgeLabel: "Not Available", badgeVariant: "gray" },
      { icon: TrendingUp, title: "Treasury (USD)", description: "Value held in project treasury", badgeLabel: "Not Available", badgeVariant: "gray" },
      { icon: Users, title: "Distribution Quality", description: "How well distributed the token supply is among holders", badgeLabel: "Unknown", badgeVariant: "gray" }
    ];
  }

  return features;
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
