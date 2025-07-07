// Enhanced security score calculation combining both Webacy and GoPlus data
export function calculateSecurityScore(securityData: any, webacyData: any = null, goplusData: any = null): number {
  if (!securityData && !webacyData && !goplusData) return 0;
  
  let score = 50; // Base score
  let webacyScore = 0;
  let goplusScore = 0;
  
  console.log(`[SECURITY-SCORE] === CALCULATING COMBINED SECURITY SCORE ===`);
  console.log(`[SECURITY-SCORE] Input data - securityData:`, !!securityData, 'webacyData:', !!webacyData, 'goplusData:', !!goplusData);
  
  // Calculate Webacy score component (0-100)
  if (webacyData && webacyData.riskScore !== undefined) {
    // Start with inverse of Webacy risk score (0-100, where 0 is safest)
    webacyScore = Math.max(0, 100 - (webacyData.riskScore || 100));
    
    // Apply severity-based adjustments
    const criticalCount = webacyData.criticalFlags?.length || 0;
    const warningCount = webacyData.warningFlags?.length || 0;
    
    // Severe penalties for critical flags
    webacyScore -= criticalCount * 15;
    // Moderate penalties for warning flags  
    webacyScore -= warningCount * 5;
    
    // Bonus for clean contracts
    if (criticalCount === 0 && warningCount === 0) {
      webacyScore += 10;
    }
    
    webacyScore = Math.max(0, Math.min(100, webacyScore));
    console.log(`[SECURITY-SCORE] Webacy component: ${webacyScore} (base: ${100 - (webacyData.riskScore || 100)}, critical: ${criticalCount}, warnings: ${warningCount})`);
  }
  
  // Calculate GoPlus score component (0-100) with enhanced scoring
  if (goplusData || securityData) {
    const dataToUse = goplusData || securityData;
    goplusScore = 40; // Base GoPlus score (lowered to account for more factors)
    
    // Major positive factors (higher security)
    if (dataToUse.ownership_renounced === true) goplusScore += 25; // Very important
    if (dataToUse.contract_verified === true) goplusScore += 15; // Open source verification
    if (dataToUse.audit_status === 'verified') goplusScore += 20; // Professional audit
    
    // Minor positive factors
    if (dataToUse.can_mint === false) goplusScore += 10; // No minting capability
    if (dataToUse.multisig_status === 'enabled') goplusScore += 5; // Multi-signature security
    
    // Major negative factors (security risks)
    if (dataToUse.honeypot_detected === true) goplusScore -= 40; // Critical risk
    if (dataToUse.is_blacklisted === true) goplusScore -= 30; // High risk
    if (dataToUse.freeze_authority === true) goplusScore -= 20; // Significant risk
    
    // Minor negative factors
    if (dataToUse.is_proxy === true) goplusScore -= 8; // Upgradeable contracts have risks
    if (dataToUse.access_control === true) goplusScore -= 5; // Special privileges
    
    // Tax-related penalties (from GoPlus data)
    if (dataToUse.buy_tax && dataToUse.buy_tax > 0) goplusScore -= Math.min(dataToUse.buy_tax * 10, 15);
    if (dataToUse.sell_tax && dataToUse.sell_tax > 0) goplusScore -= Math.min(dataToUse.sell_tax * 10, 15);
    if (dataToUse.transfer_tax && dataToUse.transfer_tax > 0) goplusScore -= Math.min(dataToUse.transfer_tax * 10, 10);
    
    goplusScore = Math.max(0, Math.min(100, goplusScore));
    console.log(`[SECURITY-SCORE] GoPlus component: ${goplusScore} (ownership: ${dataToUse.ownership_renounced}, honeypot: ${dataToUse.honeypot_detected}, verified: ${dataToUse.contract_verified}, proxy: ${dataToUse.is_proxy})`);
  }
  
  // Combine scores with weighted average
  if (webacyScore > 0 && goplusScore > 0) {
    // Both sources available - weight Webacy 60%, GoPlus 40%
    score = Math.round(webacyScore * 0.6 + goplusScore * 0.4);
    console.log(`[SECURITY-SCORE] Combined score: ${score} (Webacy 60%: ${webacyScore * 0.6}, GoPlus 40%: ${goplusScore * 0.4})`);
  } else if (webacyScore > 0) {
    // Only Webacy available
    score = webacyScore;
    console.log(`[SECURITY-SCORE] Webacy-only score: ${score}`);
  } else if (goplusScore > 0) {
    // Only GoPlus available
    score = goplusScore;
    console.log(`[SECURITY-SCORE] GoPlus-only score: ${score}`);
  }
  
  const finalScore = Math.max(0, Math.min(100, score));
  console.log(`[SECURITY-SCORE] Final security score: ${finalScore}`);
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