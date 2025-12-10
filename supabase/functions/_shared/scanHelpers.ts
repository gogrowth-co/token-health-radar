// Helper functions extracted from run-token-scan to reduce main function size

// Calculate community score based on social media metrics
export function calculateCommunityScore(data: { twitterFollowers: number; discordMembers: number; telegramMembers: number }): number {
  let score = 20; // Base score
  
  // Twitter scoring (max 25 points)
  if (data.twitterFollowers >= 100000) score += 25;
  else if (data.twitterFollowers >= 50000) score += 20;
  else if (data.twitterFollowers >= 10000) score += 15;
  else if (data.twitterFollowers >= 1000) score += 10;
  else if (data.twitterFollowers > 0) score += 5;
  
  // Discord scoring (max 20 points)
  if (data.discordMembers >= 50000) score += 20;
  else if (data.discordMembers >= 10000) score += 15;
  else if (data.discordMembers >= 5000) score += 10;
  else if (data.discordMembers >= 1000) score += 8;
  else if (data.discordMembers > 0) score += 5;
  
  // Telegram scoring (max 15 points)
  if (data.telegramMembers >= 50000) score += 15;
  else if (data.telegramMembers >= 10000) score += 12;
  else if (data.telegramMembers >= 5000) score += 8;
  else if (data.telegramMembers >= 1000) score += 6;
  else if (data.telegramMembers > 0) score += 3;
  
  // Multi-platform bonus (max 20 points)
  const platforms = [
    data.twitterFollowers > 0,
    data.discordMembers > 0,
    data.telegramMembers > 0
  ].filter(Boolean).length;
  
  if (platforms === 3) score += 20;
  else if (platforms === 2) score += 10;
  else if (platforms === 1) score += 5;
  
  return Math.min(100, score);
}

// Calculate overall score from category scores
export function calculateOverallScore(categoryData: any): number {
  const scores = [
    categoryData.security.score,
    categoryData.tokenomics.score,
    categoryData.liquidity.score,
    categoryData.community.score,
    categoryData.development.score
  ].filter(score => typeof score === 'number' && score >= 0);
  
  return scores.length > 0 
    ? Math.round(scores.reduce((acc: number, curr: number) => acc + curr, 0) / scores.length)
    : 0;
}

// Calculate liquidity locked days from security data
export function calculateLiquidityLockedDays(securityData: any): number {
  if (!securityData?.is_liquidity_locked) return 0;
  
  const lockInfo = securityData.liquidity_lock_info;
  if (!lockInfo || lockInfo === 'Not Locked') return 0;
  
  const dayMatch = lockInfo.match(/(\d+)\s*days?/i);
  if (dayMatch) return parseInt(dayMatch[1]);
  
  const monthMatch = lockInfo.match(/(\d+)\s*months?/i);
  if (monthMatch) return parseInt(monthMatch[1]) * 30;
  
  const yearMatch = lockInfo.match(/(\d+)\s*years?/i);
  if (yearMatch) return parseInt(yearMatch[1]) * 365;
  
  return securityData.is_liquidity_locked ? 1 : 0;
}

// Calculate tokenomics data confidence score
export function calculateTokenomicsConfidence(apiData: any): number {
  let confidence = 0;
  let totalChecks = 0;
  
  if (apiData.statsData?.total_supply) { confidence += 20; totalChecks += 20; }
  if (apiData.pairsData?.total_liquidity_usd !== undefined) { confidence += 25; totalChecks += 25; }
  if (apiData.ownersData?.gini_coefficient !== undefined) { confidence += 30; totalChecks += 30; }
  if (apiData.metadataData?.verified_contract !== undefined) { confidence += 15; totalChecks += 15; }
  if (apiData.priceData?.current_price_usd !== undefined) { confidence += 10; totalChecks += 10; }
  
  return totalChecks > 0 ? Math.round((confidence / totalChecks) * 100) : 0;
}

// Discord URL validation helper
export function isValidDiscordUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const discordPattern = /(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9]+)/;
  return discordPattern.test(url);
}

// Telegram URL validation helper
export function isValidTelegramUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const telegramPattern = /(?:t\.me|telegram\.me|telegram\.dog)\/(?:s\/|joinchat\/|\+)?([a-zA-Z0-9_]+)/;
  return telegramPattern.test(url);
}

// Get distribution score text from concentration risk
export function getDistributionScoreText(concentrationRisk: string | undefined): string {
  if (!concentrationRisk) return 'Unknown';
  
  switch (concentrationRisk) {
    case 'Low': return 'Excellent';
    case 'Medium': return 'Good';
    case 'High': return 'Fair';
    case 'Very High': return 'Poor';
    default: return 'Unknown';
  }
}

// Get valid supply value
export function getValidSupplyValue(value: any): number | null {
  if (value === null || value === undefined) return null;
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue) || numValue === 0) return null;
  return numValue;
}

// Create fallback data structure for error cases
export function createFallbackData() {
  return {
    tokenData: {
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      decimals: 18,
      logo: '',
      description: '',
      total_supply: '0',
      verified_contract: false,
      possible_spam: false
    },
    securityData: {
      ownership_renounced: null,
      can_mint: false,
      honeypot_detected: false,
      freeze_authority: false,
      is_proxy: false,
      is_blacklisted: false,
      access_control: false,
      contract_verified: false,
      audit_status: 'unknown',
      is_liquidity_locked: false,
      liquidity_lock_info: null,
      liquidity_percentage: null,
      multisig_status: 'unknown'
    },
    webacyData: null,
    priceData: null,
    statsData: null,
    pairsData: null,
    ownersData: null,
    githubData: null,
    tvlData: null,
    cexData: 0,
    twitterFollowers: 0,
    discordMembers: 0,
    telegramMembers: 0
  };
}
