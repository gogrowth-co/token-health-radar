// Enhanced security score calculation with comprehensive debugging and fallback scoring
export function calculateSecurityScore(securityData: any, webacyData: any = null, goplusData: any = null): number {
  console.log(`[SECURITY-SCORE] === CALCULATING ENHANCED SECURITY SCORE ===`);
  console.log(`[SECURITY-SCORE] Input data availability and content:`);
  console.log(`[SECURITY-SCORE] - securityData:`, securityData ? 'available' : 'null');
  if (securityData) console.log(`[SECURITY-SCORE] - securityData keys:`, Object.keys(securityData));
  console.log(`[SECURITY-SCORE] - webacyData:`, webacyData ? 'available' : 'null');
  if (webacyData) console.log(`[SECURITY-SCORE] - webacyData keys:`, Object.keys(webacyData));
  console.log(`[SECURITY-SCORE] - goplusData:`, goplusData ? 'available' : 'null');
  if (goplusData) console.log(`[SECURITY-SCORE] - goplusData keys:`, Object.keys(goplusData));

  // Check if we have any data at all
  const hasAnyData = securityData || webacyData || goplusData;
  if (!hasAnyData) {
    console.log(`[SECURITY-SCORE] No security data available - returning conservative score of 30`);
    return 30;
  }

  // If we have an empty securityData object but no other data, also return conservative score
  const hasActualData = (securityData && Object.keys(securityData).length > 0) || 
                       (webacyData && Object.keys(webacyData).length > 0) || 
                       (goplusData && Object.keys(goplusData).length > 0);
  
  if (!hasActualData) {
    console.log(`[SECURITY-SCORE] Only empty data objects - returning conservative score of 30`);
    return 30;
  }
  
  let score = 20; // Base score for having some data
  let dataPoints = 0; // Track how many data points we have
  let totalPossiblePoints = 0;
  
  // Use combined data from all sources
  const combinedData = { ...securityData, ...webacyData, ...goplusData };
  console.log(`[SECURITY-SCORE] Combined data:`, combinedData);
  
  // Core security indicators with fallback scoring
  totalPossiblePoints += 25;
  if (combinedData?.ownership_renounced === true) {
    score += 25;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +25 for ownership renounced (confirmed)`);
  } else if (combinedData?.ownership_renounced === false) {
    score += 0;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +0 for ownership NOT renounced (confirmed)`);
  } else {
    score += 8; // Conservative fallback
    console.log(`[SECURITY-SCORE] +8 for ownership status unknown (fallback)`);
  }
  
  totalPossiblePoints += 20;
  if (combinedData?.can_mint === false) {
    score += 20;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +20 for cannot mint (confirmed)`);
  } else if (combinedData?.can_mint === true) {
    score += 0;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +0 for CAN mint (confirmed risk)`);
  } else {
    score += 6; // Conservative fallback
    console.log(`[SECURITY-SCORE] +6 for mint capability unknown (fallback)`);
  }
  
  totalPossiblePoints += 20;
  if (combinedData?.honeypot_detected === false) {
    score += 20;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +20 for no honeypot detected (confirmed)`);
  } else if (combinedData?.honeypot_detected === true) {
    score += 0;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +0 for honeypot detected (confirmed risk)`);
  } else {
    score += 6; // Conservative fallback
    console.log(`[SECURITY-SCORE] +6 for honeypot status unknown (fallback)`);
  }
  
  totalPossiblePoints += 15;
  if (combinedData?.freeze_authority === false) {
    score += 15;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +15 for no freeze authority (confirmed)`);
  } else if (combinedData?.freeze_authority === true) {
    score += 0;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +0 for freeze authority present (confirmed risk)`);
  } else {
    score += 5; // Conservative fallback
    console.log(`[SECURITY-SCORE] +5 for freeze authority unknown (fallback)`);
  }
  
  totalPossiblePoints += 10;
  if (combinedData?.audit_status === 'verified') {
    score += 10;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +10 for verified audit`);
  } else if (combinedData?.audit_status === 'unverified') {
    score += 0;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +0 for unverified audit`);
  } else {
    score += 3; // Conservative fallback
    console.log(`[SECURITY-SCORE] +3 for audit status unknown (fallback)`);
  }
  
  // Webacy severity bonus
  totalPossiblePoints += 10;
  if (combinedData?.webacy_severity === 'Low' || combinedData?.severity === 'low') {
    score += 10;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +10 for Webacy Low severity`);
  } else if (combinedData?.webacy_severity === 'Medium' || combinedData?.severity === 'medium') {
    score += 5;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +5 for Webacy Medium severity`);
  } else if (combinedData?.webacy_severity === 'High' || combinedData?.severity === 'high') {
    score += 0;
    dataPoints++;
    console.log(`[SECURITY-SCORE] +0 for Webacy High severity`);
  } else {
    score += 3; // Conservative fallback
    console.log(`[SECURITY-SCORE] +3 for Webacy severity unknown (fallback)`);
  }
  
  // Calculate data confidence and adjust score if needed
  const dataConfidence = dataPoints / 6; // We check 6 main indicators
  console.log(`[SECURITY-SCORE] Data confidence: ${(dataConfidence * 100).toFixed(1)}% (${dataPoints}/6 indicators available)`);
  
  // Final score calculation
  const finalScore = Math.max(0, Math.min(100, score));
  
  console.log(`[SECURITY-SCORE] === SCORING SUMMARY ===`);
  console.log(`[SECURITY-SCORE] Base score: 20`);
  console.log(`[SECURITY-SCORE] Total added: ${score - 20}`);
  console.log(`[SECURITY-SCORE] Data confidence: ${(dataConfidence * 100).toFixed(1)}%`);
  console.log(`[SECURITY-SCORE] Final score: ${finalScore}/100`);
  
  return finalScore;
}

export function calculateLiquidityScore(marketData: any, liquidityData?: any): number {
  if (!marketData) return 0;
  
  let score = 30; // Base score
  
  console.log(`[LIQUIDITY-SCORE] === CALCULATING ENHANCED LIQUIDITY SCORE ===`);
  console.log(`[LIQUIDITY-SCORE] Input data:`, {
    volume24h: marketData.trading_volume_24h_usd,
    marketCap: marketData.market_cap_usd,
    liquidityLockedDays: liquidityData?.liquidity_locked_days,
    isLocked: liquidityData?.is_liquidity_locked
  });
  
  // Volume-based scoring
  const volume24h = marketData.trading_volume_24h_usd || 0;
  if (volume24h > 1000000) score += 25; // > $1M
  else if (volume24h > 100000) score += 15; // > $100K
  else if (volume24h > 10000) score += 5; // > $10K
  
  console.log(`[LIQUIDITY-SCORE] Volume bonus (${volume24h.toLocaleString()}): +${score - 30} points`);
  
  // Market cap based scoring
  const marketCap = marketData.market_cap_usd || 0;
  const marketCapBonus = score;
  if (marketCap > 100000000) score += 20; // > $100M
  else if (marketCap > 10000000) score += 10; // > $10M
  else if (marketCap > 1000000) score += 5; // > $1M
  
  console.log(`[LIQUIDITY-SCORE] Market cap bonus (${marketCap.toLocaleString()}): +${score - marketCapBonus} points`);
  
  // Liquidity lock bonus (security factor) - check both liquidity and security data
  const lockBonus = score;
  const isLocked = liquidityData?.is_liquidity_locked || (liquidityData?.liquidity_locked_days && liquidityData.liquidity_locked_days > 0);
  
  if (isLocked) {
    const lockDays = liquidityData.liquidity_locked_days || 0;
    if (lockDays > 365) score += 15; // > 1 year
    else if (lockDays > 180) score += 10; // > 6 months  
    else if (lockDays > 30) score += 5; // > 1 month
    else if (lockDays > 0) score += 2; // Any lock
    
    console.log(`[LIQUIDITY-SCORE] Liquidity lock bonus (${lockDays} days): +${score - lockBonus} points`);
  } else {
    console.log(`[LIQUIDITY-SCORE] No liquidity lock detected: +0 bonus`);
  }
  
  const finalScore = Math.max(0, Math.min(100, score));
  console.log(`[LIQUIDITY-SCORE] Final score: ${finalScore}/100`);
  
  return finalScore;
}

export function calculateTokenomicsScore(
  moralisData: any, 
  marketData: any, 
  statsData: any = null, 
  ownersData: any = null, 
  pairsData: any = null
): number {
  if (!moralisData && !marketData && !statsData) return 0;
  
  let score = 20; // Lower base score, build up with real metrics
  let totalWeight = 0;
  
  console.log(`[TOKENOMICS-SCORE] === CALCULATING ENHANCED TOKENOMICS SCORE ===`);
  
  // 1. Supply Health Analysis (25% weight)
  if (moralisData?.total_supply || statsData?.total_supply) {
    const supply = parseFloat(moralisData?.total_supply || statsData?.total_supply || '0');
    let supplyScore = 0;
    
    if (supply > 0) {
      // Reasonable supply ranges get better scores
      if (supply < 1000000) supplyScore = 25; // Very low supply (scarce)
      else if (supply < 100000000) supplyScore = 20; // Low supply (good)
      else if (supply < 10000000000) supplyScore = 15; // Moderate supply (ok)
      else if (supply < 1000000000000) supplyScore = 10; // High supply (concerning)
      else supplyScore = 0; // Extremely high supply (bad)
      
      score += supplyScore;
      totalWeight += 25;
      console.log(`[TOKENOMICS-SCORE] Supply analysis: ${supply.toExponential(2)} tokens = +${supplyScore} points`);
    }
  }
  
  // 2. Holder Distribution Quality (25% weight)
  if (ownersData?.gini_coefficient !== undefined) {
    let distributionScore = 0;
    const gini = ownersData.gini_coefficient;
    
    // Gini coefficient: 0 = perfect equality, 1 = perfect inequality
    if (gini < 0.4) distributionScore = 25; // Excellent distribution
    else if (gini < 0.6) distributionScore = 20; // Good distribution
    else if (gini < 0.75) distributionScore = 15; // Fair distribution
    else if (gini < 0.9) distributionScore = 10; // Poor distribution
    else distributionScore = 0; // Terrible distribution
    
    score += distributionScore;
    totalWeight += 25;
    console.log(`[TOKENOMICS-SCORE] Distribution (Gini: ${gini.toFixed(3)}): +${distributionScore} points`);
  }
  
  // 3. Liquidity Strength (20% weight)
  if (pairsData?.total_liquidity_usd !== undefined) {
    let liquidityScore = 0;
    const liquidityUsd = pairsData.total_liquidity_usd;
    
    if (liquidityUsd > 10000000) liquidityScore = 20; // Excellent liquidity
    else if (liquidityUsd > 1000000) liquidityScore = 16; // Good liquidity
    else if (liquidityUsd > 100000) liquidityScore = 12; // Fair liquidity
    else if (liquidityUsd > 10000) liquidityScore = 8; // Limited liquidity
    else liquidityScore = 4; // Very limited liquidity
    
    score += liquidityScore;
    totalWeight += 20;
    console.log(`[TOKENOMICS-SCORE] DEX liquidity $${liquidityUsd.toLocaleString()}: +${liquidityScore} points`);
  }
  
  // 4. Contract Quality (15% weight)
  if (moralisData?.verified_contract !== undefined) {
    const verificationScore = moralisData.verified_contract ? 15 : 0;
    score += verificationScore;
    totalWeight += 15;
    console.log(`[TOKENOMICS-SCORE] Contract verified: +${verificationScore} points`);
  }
  
  // 5. Price Stability (10% weight)
  if (marketData?.price_change_24h !== undefined) {
    let stabilityScore = 0;
    const change = Math.abs(marketData.price_change_24h);
    
    if (change < 5) stabilityScore = 10; // Very stable
    else if (change < 15) stabilityScore = 7; // Stable
    else if (change < 30) stabilityScore = 4; // Moderate volatility
    else stabilityScore = 0; // High volatility
    
    score += stabilityScore;
    totalWeight += 10;
    console.log(`[TOKENOMICS-SCORE] Price stability (${change.toFixed(1)}% change): +${stabilityScore} points`);
  }
  
  // 6. Spam/Security Penalties (5% weight)
  if (moralisData?.possible_spam) {
    score -= 10;
    console.log(`[TOKENOMICS-SCORE] Spam detected: -10 points`);
  }
  
  // Normalize score if we have less than full data
  if (totalWeight > 0 && totalWeight < 95) {
    const normalizedScore = (score / totalWeight) * 95;
    console.log(`[TOKENOMICS-SCORE] Normalizing score: ${score}/${totalWeight} -> ${normalizedScore.toFixed(1)}`);
    score = normalizedScore;
  }
  
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  console.log(`[TOKENOMICS-SCORE] Final enhanced tokenomics score: ${finalScore}`);
  
  return finalScore;
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