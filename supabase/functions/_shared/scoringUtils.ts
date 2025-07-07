// Simplified security score calculation using additive scoring
export function calculateSecurityScore(securityData: any, webacyData: any = null, goplusData: any = null): number {
  if (!securityData && !webacyData && !goplusData) return 0;
  
  let score = 0; // Start from 0
  const dataToUse = goplusData || securityData;
  
  console.log(`[SECURITY-SCORE] === CALCULATING SIMPLIFIED SECURITY SCORE ===`);
  console.log(`[SECURITY-SCORE] Input data - securityData:`, !!securityData, 'webacyData:', !!webacyData, 'goplusData:', !!goplusData);
  
  // Core security indicators (additive scoring)
  if (dataToUse?.ownership_renounced === true) {
    score += 25;
    console.log(`[SECURITY-SCORE] +25 for ownership renounced`);
  }
  
  if (dataToUse?.can_mint === false) {
    score += 20;
    console.log(`[SECURITY-SCORE] +20 for cannot mint`);
  }
  
  if (dataToUse?.honeypot_detected === false) {
    score += 20;
    console.log(`[SECURITY-SCORE] +20 for no honeypot detected`);
  }
  
  if (dataToUse?.freeze_authority === false) {
    score += 15;
    console.log(`[SECURITY-SCORE] +15 for no freeze authority`);
  }
  
  if (dataToUse?.audit_status === 'verified') {
    score += 10;
    console.log(`[SECURITY-SCORE] +10 for verified audit`);
  }
  
  // Webacy severity bonus
  if (webacyData?.webacy_severity === 'Low') {
    score += 10;
    console.log(`[SECURITY-SCORE] +10 for Webacy Low severity`);
  } else if (webacyData?.webacy_severity === 'Medium') {
    score += 5;
    console.log(`[SECURITY-SCORE] +5 for Webacy Medium severity`);
  }
  
  // Clamp final score between 0-100
  const finalScore = Math.max(0, Math.min(100, score));
  console.log(`[SECURITY-SCORE] Final simplified security score: ${finalScore} (raw: ${score})`);
  return finalScore;
}

export function calculateLiquidityScore(marketData: any): number {
  if (!marketData) return 0;
  
  let score = 30; // Base score
  
  // Volume-based scoring
  const volume24h = marketData.trading_volume_24h_usd || 0;
  if (volume24h > 1000000) score += 25; // > $1M
  else if (volume24h > 100000) score += 15; // > $100K
  else if (volume24h > 10000) score += 5; // > $10K
  
  // Market cap based scoring
  const marketCap = marketData.market_cap_usd || 0;
  if (marketCap > 100000000) score += 20; // > $100M
  else if (marketCap > 10000000) score += 10; // > $10M
  else if (marketCap > 1000000) score += 5; // > $1M
  
  return Math.max(0, Math.min(100, score));
}

export function calculateTokenomicsScore(moralisData: any, marketData: any): number {
  if (!moralisData && !marketData) return 0;
  
  let score = 40; // Base score
  
  // Supply analysis
  if (moralisData?.total_supply) {
    const supply = parseFloat(moralisData.total_supply);
    if (supply < 1000000000) score += 15; // Low supply is good
    else if (supply > 1000000000000) score -= 10; // Very high supply is concerning
  }
  
  // Contract verification
  if (moralisData?.verified_contract) score += 10;
  
  // Spam detection (negative factor)
  if (moralisData?.possible_spam) score -= 20;
  
  // Price stability (less volatility is better for tokenomics)
  if (marketData?.price_change_24h !== undefined) {
    const change = Math.abs(marketData.price_change_24h);
    if (change < 5) score += 10; // Stable price
    else if (change > 20) score -= 5; // High volatility
  }
  
  return Math.max(0, Math.min(100, score));
}

export function calculateDevelopmentScore(githubData: any): number {
  if (!githubData) {
    console.log(`[GITHUB] No GitHub data available, using conservative score`);
    return 25; // Conservative score when no GitHub data is available
  }
  
  let score = 20; // Base score
  
  // 1. Commit Activity (40% weight) - Recent development activity
  const commits30d = githubData.commits_30d || 0;
  if (commits30d > 20) score += 40; // Very active
  else if (commits30d > 10) score += 30; // Active
  else if (commits30d > 5) score += 20; // Moderate
  else if (commits30d > 0) score += 10; // Some activity
  // No commits = no additional points
  
  // 2. Issue Management (25% weight) - How well issues are handled
  const totalIssues = githubData.total_issues || 0;
  const openIssues = githubData.open_issues || 0;
  const closedIssues = githubData.closed_issues || 0;
  
  if (totalIssues > 0) {
    const issueResolutionRatio = closedIssues / totalIssues;
    if (issueResolutionRatio > 0.8) score += 25; // Excellent issue management
    else if (issueResolutionRatio > 0.6) score += 20; // Good issue management
    else if (issueResolutionRatio > 0.4) score += 15; // Fair issue management
    else if (issueResolutionRatio > 0.2) score += 10; // Poor issue management
    // Very poor issue management = no additional points
  } else {
    score += 15; // Moderate score for no issues (could be good or bad)
  }
  
  // 3. Community Engagement (20% weight) - Stars and forks indicate community interest
  const stars = githubData.stars || 0;
  const forks = githubData.forks || 0;
  
  if (stars > 1000 || forks > 100) score += 20; // High community interest
  else if (stars > 100 || forks > 20) score += 15; // Moderate community interest
  else if (stars > 10 || forks > 5) score += 10; // Some community interest
  else if (stars > 0 || forks > 0) score += 5; // Minimal community interest
  
  // 4. Code Freshness (15% weight) - How recent the last push was
  if (githubData.last_push) {
    const lastPushDate = new Date(githubData.last_push);
    const daysSinceLastPush = (Date.now() - lastPushDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceLastPush < 7) score += 15; // Very fresh
    else if (daysSinceLastPush < 30) score += 12; // Fresh
    else if (daysSinceLastPush < 90) score += 8; // Moderately fresh
    else if (daysSinceLastPush < 180) score += 4; // Stale
    // Very stale = no additional points
  }
  
  // Penalties
  if (githubData.is_archived) score -= 20; // Archived repositories are not actively maintained
  if (githubData.is_fork && !commits30d) score -= 10; // Fork without recent commits might not be original development
  
  const finalScore = Math.max(0, Math.min(100, score));
  
  console.log(`[GITHUB] Development score calculated: ${finalScore}`);
  console.log(`[GITHUB] - Base: 20, Commits: ${commits30d}, Issues: ${openIssues}/${closedIssues}, Stars: ${stars}, Forks: ${forks}`);
  
  return finalScore;
}