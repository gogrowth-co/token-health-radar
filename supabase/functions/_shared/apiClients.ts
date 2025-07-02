
import { CHAIN_MAP, getChainConfigByMoralisId } from './chainConfig.ts';

// GoPlus Security API client
export async function fetchGoPlusSecurity(tokenAddress: string, chainId: string) {
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.log(`[GOPLUS] Unsupported chain: ${chainId}`);
      return null;
    }

    const url = `https://api.gopluslabs.io/api/v1/token_security/${chainConfig.goplus}?contract_addresses=${tokenAddress.toLowerCase()}`;
    console.log(`[GOPLUS] Fetching security data: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GoPlus API error: ${response.status}`);
    }
    
    const data = await response.json();
    const tokenData = data.result?.[tokenAddress.toLowerCase()];
    
    if (!tokenData) {
      console.log(`[GOPLUS] No security data found for token: ${tokenAddress}`);
      return null;
    }
    
    return {
      ownership_renounced: tokenData.owner_address === '0x0000000000000000000000000000000000000000',
      can_mint: tokenData.can_take_back_ownership === '1' || tokenData.cannot_buy === '1',
      honeypot_detected: tokenData.is_honeypot === '1',
      freeze_authority: tokenData.can_take_back_ownership === '1',
      audit_status: tokenData.trust_list ? 'verified' : 'unverified'
    };
  } catch (error) {
    console.error(`[GOPLUS] Error fetching security data:`, error);
    return null;
  }
}

// GeckoTerminal API client for price and liquidity data
export async function fetchGeckoTerminalData(tokenAddress: string, chainId: string) {
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.log(`[GECKO] Unsupported chain: ${chainId}`);
      return null;
    }

    const url = `https://api.geckoterminal.com/api/v2/networks/${chainConfig.gecko}/tokens/${tokenAddress.toLowerCase()}`;
    console.log(`[GECKO] Fetching market data: ${url}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`GeckoTerminal API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Add comprehensive logging to debug the API response structure
    console.log(`[GECKO] Raw API response structure:`, JSON.stringify(data, null, 2));
    
    const tokenData = data.data?.attributes;
    
    if (!tokenData) {
      console.log(`[GECKO] No market data found for token: ${tokenAddress}`);
      console.log(`[GECKO] Response structure:`, JSON.stringify(data, null, 2));
      return null;
    }

    // Log the specific price change data for debugging
    console.log(`[GECKO] Price change data path check:`, {
      'tokenData.price_change_percentage': tokenData.price_change_percentage,
      'tokenData.price_change_percentage?.h24': tokenData.price_change_percentage?.h24,
      'Full price_change_percentage object': JSON.stringify(tokenData.price_change_percentage, null, 2)
    });

    // Extract price change with proper error handling
    const priceChange24h = tokenData.price_change_percentage?.h24;
    const parsedPriceChange = priceChange24h !== null && priceChange24h !== undefined 
      ? parseFloat(priceChange24h) 
      : null;

    // Extract other market data
    const currentPriceUsd = parseFloat(tokenData.price_usd) ?? 0;
    const marketCapUsd = parseFloat(tokenData.market_cap_usd) ?? 0;
    const tradingVolume24hUsd = parseFloat(tokenData.volume_usd?.h24) ?? 0;

    // Data validation - warn about potential issues
    if (parsedPriceChange === 0 && tradingVolume24hUsd > 0) {
      console.warn(`[GECKO] Potential data anomaly: 24h price change is exactly 0% but trading volume is ${tradingVolume24hUsd} USD`);
    }

    if (parsedPriceChange === null) {
      console.warn(`[GECKO] No valid 24h price change data found for token: ${tokenAddress}`);
    }

    const result = {
      current_price_usd: currentPriceUsd,
      price_change_24h: parsedPriceChange ?? 0, // Use 0 as fallback only when data is truly missing
      market_cap_usd: marketCapUsd,
      trading_volume_24h_usd: tradingVolume24hUsd,
      name: tokenData.name || '',
      symbol: tokenData.symbol || ''
    };

    console.log(`[GECKO] Processed market data:`, {
      token: `${result.name} (${result.symbol})`,
      price_usd: result.current_price_usd,
      price_change_24h: result.price_change_24h,
      volume_24h_usd: result.trading_volume_24h_usd,
      market_cap_usd: result.market_cap_usd
    });
    
    return result;
  } catch (error) {
    console.error(`[GECKO] Error fetching market data:`, error);
    return null;
  }
}

// Moralis API client for comprehensive token metadata
export async function fetchMoralisMetadata(tokenAddress: string, chainId: string) {
  console.log(`[MORALIS] === STARTING MORALIS API CALL ===`);
  console.log(`[MORALIS] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[MORALIS] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    // Get API key from environment
    const apiKey = Deno.env.get('MORALIS_API_KEY');
    if (!apiKey) {
      console.error(`[MORALIS] FAILED - MORALIS_API_KEY not configured in environment`);
      return null;
    }

    console.log(`[MORALIS] API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
    console.log(`[MORALIS] Chain: ${chainConfig.name} (${chainConfig.id})`);
    console.log(`[MORALIS] Target token: ${tokenAddress.toLowerCase()}`);
    
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}?chain=${chainConfig.id}&include=percent_change`;
    console.log(`[MORALIS] Request URL: ${url}`);
    
    // Test API key with a simple request first
    console.log(`[MORALIS] Testing API authentication...`);
    const testResponse = await fetch(`https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainConfig.id}&addresses=${tokenAddress.toLowerCase()}`, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[MORALIS] Auth test response status: ${testResponse.status}`);
    if (testResponse.status === 401 || testResponse.status === 403) {
      console.error(`[MORALIS] FAILED - API authentication failed. Status: ${testResponse.status}`);
      const errorText = await testResponse.text();
      console.error(`[MORALIS] Auth error response:`, errorText);
      return null;
    }

    // Now make the actual request
    const metadataUrl = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainConfig.id}&addresses%5B0%5D=${tokenAddress.toLowerCase()}`;
    console.log(`[MORALIS] Making actual request: ${metadataUrl}`);
    
    const response = await fetch(metadataUrl, {
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[MORALIS] Response status: ${response.status}`);
    console.log(`[MORALIS] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MORALIS] FAILED - API error: ${response.status} ${response.statusText}`);
      console.error(`[MORALIS] Error response body:`, errorText);
      throw new Error(`Moralis API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`[MORALIS] Raw response text:`, responseText.substring(0, 500) + '...');
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[MORALIS] Parsed JSON response (first token):`, JSON.stringify(data[0], null, 2));
    } catch (jsonError) {
      console.error(`[MORALIS] FAILED - Invalid JSON response:`, jsonError);
      console.error(`[MORALIS] Response text was:`, responseText);
      return null;
    }
    
    const tokenData = data[0];
    
    if (!tokenData) {
      console.log(`[MORALIS] No metadata found for token: ${tokenAddress}`);
      return null;
    }

    console.log(`[MORALIS] Rich metadata extracted for: ${tokenData.name} (${tokenData.symbol})`);
    console.log(`[MORALIS] Description available: ${!!tokenData.description}`);
    console.log(`[MORALIS] Links available: ${Object.keys(tokenData.links || {}).length} social links`);
    console.log(`[MORALIS] Security score: ${tokenData.security_score || 'N/A'}`);
    
    return {
      name: tokenData.name || '',
      symbol: tokenData.symbol || '',
      decimals: parseInt(tokenData.decimals) || 18,
      logo: tokenData.logo || '',
      thumbnail: tokenData.thumbnail || '',
      total_supply: tokenData.total_supply || '0',
      verified_contract: tokenData.verified_contract || false,
      possible_spam: tokenData.possible_spam || false,
      description: tokenData.description || '',
      links: tokenData.links || {},
      security_score: tokenData.security_score || null,
      market_cap: tokenData.market_cap || null,
      circulating_supply: tokenData.circulating_supply || null,
      fully_diluted_valuation: tokenData.fully_diluted_valuation || null
    };
  } catch (error) {
    console.error(`[MORALIS] Error fetching metadata:`, error);
    return null;
  }
}

// Webacy Security API client for contract risk analysis
export async function fetchWebacySecurity(tokenAddress: string, chainId: string) {
  console.log(`[WEBACY] === STARTING WEBACY API CALL ===`);
  console.log(`[WEBACY] Token: ${tokenAddress}, Chain: ${chainId}`);
  
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig) {
      console.error(`[WEBACY] FAILED - Unsupported chain: ${chainId}`);
      return null;
    }

    // Map Moralis chain IDs to Webacy chain names
    const webacyChainMap: { [key: string]: string } = {
      '0x1': 'ethereum',
      '0x38': 'bsc', 
      '0xa4b1': 'arbitrum',
      '0xa': 'optimism',
      '0x2105': 'base',
      '0x89': 'polygon'
    };

    const webacyChain = webacyChainMap[chainId];
    if (!webacyChain) {
      console.error(`[WEBACY] FAILED - Chain ${chainId} not supported by Webacy. Supported chains:`, Object.keys(webacyChainMap));
      return null;
    }

    // Get API key from environment
    const apiKey = Deno.env.get('WEBACY_API_KEY');
    if (!apiKey) {
      console.error(`[WEBACY] FAILED - WEBACY_API_KEY not configured in environment`);
      return null;
    }

    console.log(`[WEBACY] API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)} (${apiKey.length} chars)`);
    console.log(`[WEBACY] Chain mapping: ${chainId} -> ${webacyChain}`);
    console.log(`[WEBACY] Target token: ${tokenAddress.toLowerCase()}`);
    
    const url = `https://api.webacy.com/risk/${webacyChain}/${tokenAddress.toLowerCase()}`;
    console.log(`[WEBACY] Request URL: ${url}`);
    
    // Test API key first with a simple validation request
    console.log(`[WEBACY] Testing API authentication...`);
    const testResponse = await fetch(`https://api.webacy.com/risk/ethereum/0x0000000000000000000000000000000000000000`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`[WEBACY] Auth test response status: ${testResponse.status}`);
    if (testResponse.status === 401 || testResponse.status === 403) {
      console.error(`[WEBACY] FAILED - API authentication failed. Status: ${testResponse.status}`);
      const errorText = await testResponse.text();
      console.error(`[WEBACY] Auth error response:`, errorText);
      return null;
    }

    // Now make the actual request  
    console.log(`[WEBACY] Making actual request for token data...`);
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`[WEBACY] Response status: ${response.status}`);
    console.log(`[WEBACY] Response headers:`, Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[WEBACY] No risk data found for token: ${tokenAddress} (404 - token not indexed)`);
        return null;
      }
      const errorText = await response.text();
      console.error(`[WEBACY] FAILED - API error: ${response.status} ${response.statusText}`);
      console.error(`[WEBACY] Error response body:`, errorText);
      throw new Error(`Webacy API error: ${response.status} ${response.statusText} - ${errorText}`);
    }
    
    const responseText = await response.text();
    console.log(`[WEBACY] Raw response text:`, responseText);
    
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[WEBACY] Parsed JSON response:`, JSON.stringify(data, null, 2));
    } catch (jsonError) {
      console.error(`[WEBACY] FAILED - Invalid JSON response:`, jsonError);
      console.error(`[WEBACY] Response text was:`, responseText);
      return null;
    }
    
    if (!data) {
      console.error(`[WEBACY] FAILED - Empty response data for token: ${tokenAddress}`);
      return null;
    }

    console.log(`[WEBACY] SUCCESS - Received valid response for token: ${tokenAddress}`);
    console.log(`[WEBACY] Response structure keys:`, Object.keys(data));

    // Extract risk flags and categorize by severity
    const riskFlags = data.flags || [];
    const riskScore = data.riskScore || 0;
    const severity = data.severity || 'unknown';

    // Categorize flags by severity
    const criticalFlags = riskFlags.filter((flag: any) => flag.severity === 'critical');
    const warningFlags = riskFlags.filter((flag: any) => flag.severity === 'warning');
    const infoFlags = riskFlags.filter((flag: any) => flag.severity === 'info');

    console.log(`[WEBACY] Contract risk analysis for ${tokenAddress}:`, {
      riskScore,
      severity,
      totalFlags: riskFlags.length,
      criticalFlags: criticalFlags.length,
      warningFlags: warningFlags.length,
      infoFlags: infoFlags.length
    });
    
    return {
      address: data.address,
      riskScore,
      severity,
      flags: riskFlags,
      criticalFlags,
      warningFlags,
      infoFlags,
      // Map to existing security data structure for compatibility
      ownership_renounced: !riskFlags.some((flag: any) => flag.flag === 'not-renounced'),
      can_mint: riskFlags.some((flag: any) => flag.flag === 'mintable'),
      honeypot_detected: riskFlags.some((flag: any) => ['is_honeypot', 'honeypot_with_same_creator'].includes(flag.flag)),
      freeze_authority: riskFlags.some((flag: any) => flag.flag === 'freezeable'),
      audit_status: riskFlags.some((flag: any) => flag.flag === 'is_closed_source') ? 'unverified' : 'unknown',
      is_proxy: riskFlags.some((flag: any) => flag.flag === 'is_proxy'),
      is_blacklisted: riskFlags.some((flag: any) => flag.flag === 'is_blacklisted'),
      access_control: riskFlags.some((flag: any) => flag.flag === 'access_control'),
      contract_verified: !riskFlags.some((flag: any) => flag.flag === 'is_closed_source')
    };
  } catch (error) {
    console.error(`[WEBACY] Error fetching contract risk data:`, error);
    return null;
  }
}

// GitHub API client for development metrics
export async function fetchGitHubRepoData(githubUrl: string) {
  try {
    // Extract owner and repo from GitHub URL
    const urlPattern = /github\.com\/([^\/]+)\/([^\/]+)/;
    const match = githubUrl.match(urlPattern);
    
    if (!match) {
      console.log(`[GITHUB] Invalid GitHub URL format: ${githubUrl}`);
      return null;
    }
    
    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git suffix if present
    
    // Get API key from environment
    const apiKey = Deno.env.get('GITHUB_API_KEY');
    if (!apiKey) {
      console.log(`[GITHUB] No API key configured`);
      return null;
    }

    const headers = {
      'Authorization': `token ${apiKey}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'TokenHealthScan/1.0'
    };

    // Fetch repository data
    const repoUrl = `https://api.github.com/repos/${owner}/${cleanRepo}`;
    console.log(`[GITHUB] Fetching repo data: ${repoUrl}`);
    
    const repoResponse = await fetch(repoUrl, { headers });
    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status}`);
    }
    
    const repoData = await repoResponse.json();
    
    // Fetch recent commits (last 30 days)
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const commitsUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/commits?since=${since}&per_page=100`;
    
    const commitsResponse = await fetch(commitsUrl, { headers });
    const commitsData = commitsResponse.ok ? await commitsResponse.json() : [];
    
    // Fetch open and closed issues
    const issuesUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/issues?state=all&per_page=100`;
    const issuesResponse = await fetch(issuesUrl, { headers });
    const issuesData = issuesResponse.ok ? await issuesResponse.json() : [];
    
    // Calculate metrics
    const openIssues = issuesData.filter((issue: any) => issue.state === 'open' && !issue.pull_request).length;
    const closedIssues = issuesData.filter((issue: any) => issue.state === 'closed' && !issue.pull_request).length;
    const totalIssues = openIssues + closedIssues;
    
    console.log(`[GITHUB] Repository metrics for ${owner}/${cleanRepo}:`);
    console.log(`[GITHUB] - Stars: ${repoData.stargazers_count}`);
    console.log(`[GITHUB] - Forks: ${repoData.forks_count}`);
    console.log(`[GITHUB] - Commits (30d): ${commitsData.length}`);
    console.log(`[GITHUB] - Open Issues: ${openIssues}`);
    console.log(`[GITHUB] - Closed Issues: ${closedIssues}`);
    console.log(`[GITHUB] - Last Push: ${repoData.pushed_at}`);
    
    return {
      owner,
      repo: cleanRepo,
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      commits_30d: commitsData.length || 0,
      open_issues: openIssues,
      closed_issues: closedIssues,
      total_issues: totalIssues,
      last_push: repoData.pushed_at,
      is_archived: repoData.archived || false,
      is_fork: repoData.fork || false,
      language: repoData.language || null,
      created_at: repoData.created_at,
      updated_at: repoData.updated_at
    };
  } catch (error) {
    console.error(`[GITHUB] Error fetching repository data:`, error);
    return null;
  }
}

// Enhanced security score calculation with Webacy integration
export function calculateSecurityScore(securityData: any, webacyData: any = null): number {
  if (!securityData && !webacyData) return 0;
  
  let score = 50; // Base score
  
  // If we have Webacy data, use it for enhanced scoring
  if (webacyData) {
    // Start with inverse of Webacy risk score (0-100, where 0 is safest)
    const webacyBaseScore = Math.max(0, 100 - (webacyData.riskScore || 100));
    score = webacyBaseScore;
    
    // Apply severity-based adjustments
    const criticalCount = webacyData.criticalFlags?.length || 0;
    const warningCount = webacyData.warningFlags?.length || 0;
    
    // Severe penalties for critical flags
    score -= criticalCount * 15;
    // Moderate penalties for warning flags  
    score -= warningCount * 5;
    
    // Bonus for clean contracts
    if (criticalCount === 0 && warningCount === 0) {
      score += 10;
    }
    
    console.log(`[WEBACY] Security score calculated: ${score} (base: ${webacyBaseScore}, critical: ${criticalCount}, warnings: ${warningCount})`);
  } else {
    // Fallback to original GoPlus-based scoring
    // Positive factors
    if (securityData?.ownership_renounced) score += 20;
    if (securityData?.audit_status === 'verified') score += 15;
    if (!securityData?.can_mint) score += 10;
    
    // Negative factors
    if (securityData?.honeypot_detected) score -= 30;
    if (securityData?.freeze_authority) score -= 15;
  }
  
  return Math.max(0, Math.min(100, score));
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
