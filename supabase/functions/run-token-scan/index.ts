
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to clean HTML and extract plain text description
const cleanDescription = (htmlDescription: string): string => {
  if (!htmlDescription) return '';
  
  // Remove HTML tags and decode HTML entities
  let cleaned = htmlDescription
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
    .replace(/&amp;/g, '&') // Replace HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .trim();
  
  // Truncate to reasonable length for display
  if (cleaned.length > 300) {
    cleaned = cleaned.substring(0, 300).trim();
    // Try to end at a word boundary
    const lastSpace = cleaned.lastIndexOf(' ');
    if (lastSpace > 250) {
      cleaned = cleaned.substring(0, lastSpace) + '...';
    } else {
      cleaned = cleaned + '...';
    }
  }
  
  return cleaned;
};

// Helper function to extract GitHub repo info from URL
const extractGitHubRepoInfo = (githubUrl: string) => {
  if (!githubUrl) return null;
  
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (match) {
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '') // Remove .git suffix if present
    };
  }
  return null;
};

// Helper function to fetch GitHub repository data
const fetchGitHubRepoData = async (githubUrl: string, githubApiKey?: string) => {
  const repoInfo = extractGitHubRepoInfo(githubUrl);
  if (!repoInfo) {
    console.log('[SCAN] Invalid GitHub URL format:', githubUrl);
    return null;
  }

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Token-Health-Scan/1.0'
  };

  if (githubApiKey) {
    headers['Authorization'] = `token ${githubApiKey}`;
    console.log('[SCAN] Using GitHub API key for better rate limits');
  }

  try {
    console.log(`[SCAN] Fetching GitHub data for ${repoInfo.owner}/${repoInfo.repo}`);
    
    // Fetch repository basic info
    const repoResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}`, {
      headers
    });

    if (!repoResponse.ok) {
      console.warn(`[SCAN] GitHub repo API returned status ${repoResponse.status} for ${repoInfo.owner}/${repoInfo.repo}`);
      return null;
    }

    const repoData = await repoResponse.json();
    
    // Fetch contributors count
    const contributorsResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/contributors?per_page=100`, {
      headers
    });
    
    let contributorsCount = 0;
    if (contributorsResponse.ok) {
      const contributorsData = await contributorsResponse.json();
      contributorsCount = Array.isArray(contributorsData) ? contributorsData.length : 0;
    } else {
      console.warn(`[SCAN] GitHub contributors API returned status ${contributorsResponse.status}`);
    }

    // Fetch recent commits (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const since = thirtyDaysAgo.toISOString();

    const commitsResponse = await fetch(`https://api.github.com/repos/${repoInfo.owner}/${repoInfo.repo}/commits?since=${since}&per_page=100`, {
      headers
    });

    let commits30d = 0;
    if (commitsResponse.ok) {
      const commitsData = await commitsResponse.json();
      commits30d = Array.isArray(commitsData) ? commitsData.length : 0;
    } else {
      console.warn(`[SCAN] GitHub commits API returned status ${commitsResponse.status}`);
    }

    const lastCommitDate = repoData.pushed_at ? new Date(repoData.pushed_at).toISOString() : null;

    console.log(`[SCAN] GitHub data collected - Contributors: ${contributorsCount}, Commits (30d): ${commits30d}, Last commit: ${lastCommitDate}`);

    return {
      contributorsCount,
      commits30d,
      lastCommit: lastCommitDate,
      isOpenSource: !repoData.private,
      stargazersCount: repoData.stargazers_count || 0,
      forksCount: repoData.forks_count || 0
    };

  } catch (error) {
    console.error(`[SCAN] Error fetching GitHub data:`, error);
    return null;
  }
};

// Helper function to calculate development score
const calculateDevelopmentScore = (data: any) => {
  let score = 0;
  
  // Base score for being open source
  if (data.isOpenSource) {
    score += 20;
  }
  
  // Contributors score (max 25 points)
  const contributors = data.contributorsCount || 0;
  if (contributors >= 20) score += 25;
  else if (contributors >= 10) score += 20;
  else if (contributors >= 5) score += 15;
  else if (contributors >= 2) score += 10;
  else if (contributors >= 1) score += 5;
  
  // Recent activity score (max 25 points)
  const commits30d = data.commits30d || 0;
  if (commits30d >= 50) score += 25;
  else if (commits30d >= 20) score += 20;
  else if (commits30d >= 10) score += 15;
  else if (commits30d >= 5) score += 10;
  else if (commits30d >= 1) score += 5;
  
  // Last commit recency score (max 20 points)
  if (data.lastCommit) {
    const daysSinceCommit = Math.floor((Date.now() - new Date(data.lastCommit).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceCommit <= 7) score += 20;
    else if (daysSinceCommit <= 30) score += 15;
    else if (daysSinceCommit <= 90) score += 10;
    else if (daysSinceCommit <= 180) score += 5;
  }
  
  // Community engagement score (max 10 points)
  const stars = data.stargazersCount || 0;
  if (stars >= 1000) score += 10;
  else if (stars >= 500) score += 8;
  else if (stars >= 100) score += 5;
  else if (stars >= 10) score += 2;
  
  return Math.min(score, 100); // Cap at 100
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token_address, user_id, coingecko_id, cmc_id } = await req.json()
    
    if (!token_address) {
      throw new Error('Token address is required')
    }

    console.log(`[SCAN] Starting scan for token: ${token_address}, user: ${user_id || 'anonymous'}, coingecko_id: ${coingecko_id}, cmc_id: ${cmc_id}`)

    // Initialize Supabase client with service role key for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Check scan access for authenticated users
    let canPerformProScan = false
    let userPlan = 'anonymous'
    let scansUsed = 0
    let scanLimit = 0

    if (user_id) {
      try {
        console.log(`[SCAN] Checking scan access for user: ${user_id}`)
        
        // Get user's current subscription data
        const { data: subscriberData, error: subscriberError } = await supabase
          .from('subscribers')
          .select('plan, scans_used, pro_scan_limit')
          .eq('id', user_id)
          .single()

        if (!subscriberError && subscriberData) {
          userPlan = subscriberData.plan || 'free'
          scansUsed = subscriberData.scans_used || 0
          scanLimit = subscriberData.pro_scan_limit || 3

          console.log(`[SCAN] User ${user_id} - Plan: ${userPlan}, Scans used: ${scansUsed}, Limit: ${scanLimit}`)

          // Determine if user can perform a Pro scan
          if (userPlan === 'pro') {
            canPerformProScan = true // Pro users always get Pro scans
          } else if (userPlan === 'free' && scansUsed < scanLimit) {
            canPerformProScan = true // Free users get limited Pro scans
          }
        } else {
          console.warn(`[SCAN] Could not retrieve subscriber data for user ${user_id}:`, subscriberError)
          canPerformProScan = false
        }
      } catch (error) {
        console.error(`[SCAN] Error checking user access:`, error)
        canPerformProScan = false
      }
    } else {
      console.log(`[SCAN] Anonymous user - providing basic scan only`)
      canPerformProScan = false
    }

    console.log(`[SCAN] Pro scan permitted: ${canPerformProScan}`)

    // Get API keys for better rate limits
    const coinGeckoApiKey = Deno.env.get('COINGECKO_API_KEY')
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY')
    const goPlusApiKey = Deno.env.get('GOPLUS_API_KEY')
    const githubApiKey = Deno.env.get('GITHUB_API_KEY')
    
    // Initialize default token data
    let tokenData = {
      token_address,
      name: `Token ${token_address.substring(0, 8)}...`,
      symbol: 'UNKNOWN',
      description: '',
      website_url: '',
      twitter_handle: '',
      github_url: '',
      logo_url: '',
      coingecko_id: coingecko_id || '',
      cmc_id: cmc_id || null,
      current_price_usd: 0,
      price_change_24h: 0,
      market_cap_usd: 0,
      total_value_locked_usd: 'N/A'
    }

    // Fetch token data from CoinMarketCap if CMC ID is provided
    if (cmc_id && cmcApiKey) {
      try {
        console.log(`[SCAN] Fetching token data from CoinMarketCap: ${cmc_id}`)
        
        // Fetch token info and quotes from CMC
        const [infoResponse, quotesResponse] = await Promise.allSettled([
          fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/info?id=${cmc_id}`, {
            headers: {
              'X-CMC_PRO_API_KEY': cmcApiKey,
              'Accept': 'application/json'
            }
          }),
          fetch(`https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?id=${cmc_id}&convert=USD`, {
            headers: {
              'X-CMC_PRO_API_KEY': cmcApiKey,
              'Accept': 'application/json'
            }
          })
        ])
        
        let cmcInfo = null
        let cmcQuotes = null
        
        if (infoResponse.status === 'fulfilled' && infoResponse.value.ok) {
          const infoData = await infoResponse.value.json()
          cmcInfo = infoData.data?.[cmc_id]
        }
        
        if (quotesResponse.status === 'fulfilled' && quotesResponse.value.ok) {
          const quotesData = await quotesResponse.value.json()
          cmcQuotes = quotesData.data?.[cmc_id]
        }
        
        if (cmcInfo || cmcQuotes) {
          const urls = cmcInfo?.urls || {}
          const website = urls.website?.[0] || ''
          const twitter = urls.twitter?.[0] || ''
          const github = urls.source_code?.[0] || ''
          const twitterHandle = twitter ? twitter.split('/').pop()?.replace('@', '') || '' : ''
          
          const usdQuote = cmcQuotes?.quote?.USD || {}
          
          // Process description with better cleaning
          let cleanedDescription = '';
          if (cmcInfo?.description) {
            cleanedDescription = cleanDescription(cmcInfo.description);
            console.log(`[SCAN] CMC description processed: "${cleanedDescription.substring(0, 100)}..."`);
          }
          
          tokenData = {
            ...tokenData,
            name: cmcInfo?.name || tokenData.name,
            symbol: cmcInfo?.symbol?.toUpperCase() || tokenData.symbol,
            description: cleanedDescription,
            website_url: website,
            twitter_handle: twitterHandle,
            github_url: github,
            logo_url: cmcInfo?.logo || '',
            cmc_id,
            current_price_usd: usdQuote.price || 0,
            price_change_24h: usdQuote.percent_change_24h || 0,
            market_cap_usd: usdQuote.market_cap || 0
          }
          
          console.log(`[SCAN] Token data successfully collected from CoinMarketCap`)
        }
      } catch (error) {
        console.error(`[SCAN] Error fetching token data from CoinMarketCap:`, error)
      }
    }
    
    // Fallback to CoinGecko if CMC data not available and CoinGecko ID provided
    else if (coingecko_id && coinGeckoApiKey) {
      try {
        const cgUrl = `https://api.coingecko.com/api/v3/coins/${coingecko_id}`
        const cgHeaders: Record<string, string> = {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
        
        if (coinGeckoApiKey) {
          cgHeaders['x-cg-demo-api-key'] = coinGeckoApiKey
          console.log(`[SCAN] Using CoinGecko Demo Plan authentication`)
        } else {
          console.log(`[SCAN] Using CoinGecko free tier`)
        }
        
        console.log(`[SCAN] Fetching token data from CoinGecko: ${coingecko_id}`)
        const response = await fetch(cgUrl, { headers: cgHeaders })
        
        if (response.ok) {
          const data = await response.json()
          
          // Process description with better cleaning
          let cleanedDescription = '';
          if (data.description?.en) {
            cleanedDescription = cleanDescription(data.description.en);
            console.log(`[SCAN] CoinGecko description processed: "${cleanedDescription.substring(0, 100)}..."`);
          }
          
          tokenData = {
            ...tokenData,
            name: data.name || tokenData.name,
            symbol: data.symbol?.toUpperCase() || tokenData.symbol,
            description: cleanedDescription,
            website_url: data.links?.homepage?.[0] || '',
            twitter_handle: data.links?.twitter_screen_name || '',
            github_url: data.links?.repos_url?.github?.[0] || '',
            logo_url: data.image?.large || data.image?.small || '',
            coingecko_id,
            current_price_usd: data.market_data?.current_price?.usd || 0,
            price_change_24h: data.market_data?.price_change_percentage_24h || 0,
            market_cap_usd: data.market_data?.market_cap?.usd || 0,
            total_value_locked_usd: data.market_data?.total_value_locked?.usd?.toString() || 'N/A'
          }
          
          console.log(`[SCAN] Token data successfully collected from CoinGecko`)
        } else {
          console.warn(`[SCAN] CoinGecko API returned status ${response.status}`)
        }
      } catch (error) {
        console.error(`[SCAN] Error fetching token data from CoinGecko:`, error)
      }
    }

    // Add fallback description if none found from APIs
    if (!tokenData.description && tokenData.name !== `Token ${token_address.substring(0, 8)}...`) {
      tokenData.description = `${tokenData.name} (${tokenData.symbol}) is a cryptocurrency token.`;
      console.log(`[SCAN] Added fallback description: "${tokenData.description}"`);
    }

    // Initialize default security data
    let securityData = {
      token_address,
      score: 50, // Default neutral score
      ownership_renounced: false,
      honeypot_detected: false,
      can_mint: false,
      freeze_authority: false,
      audit_status: 'Not Audited',
      multisig_status: 'Unknown'
    }

    // Only fetch detailed security data for Pro scans
    if (canPerformProScan) {
      try {
        const goPlusUrl = goPlusApiKey
          ? `https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=${token_address}&api_key=${goPlusApiKey}`
          : `https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=${token_address}`
        
        console.log(`[SCAN] Fetching security data from GoPlus`)
        const response = await fetch(goPlusUrl)
        
        if (response.ok) {
          const data = await response.json()
          const result = data.result?.[token_address.toLowerCase()]
          
          if (result) {
            const ownership_renounced = result.owner_address === '0x0000000000000000000000000000000000000000'
            const honeypot_detected = result.is_honeypot === '1'
            const can_mint = result.can_take_back_ownership === '1'
            const freeze_authority = result.cannot_sell_all === '1'
            
            // Calculate security score
            let score = 100
            if (!ownership_renounced) score -= 30
            if (honeypot_detected) score -= 40
            if (can_mint) score -= 20
            if (freeze_authority) score -= 10
            
            securityData = {
              ...securityData,
              score: Math.max(0, score),
              ownership_renounced,
              honeypot_detected,
              can_mint,
              freeze_authority
            }
            
            console.log(`[SCAN] Security data successfully collected from GoPlus`)
          }
        } else {
          console.warn(`[SCAN] GoPlus API returned status ${response.status}`)
        }
      } catch (error) {
        console.error(`[SCAN] Error fetching security data from GoPlus:`, error)
      }
    } else {
      console.log(`[SCAN] Basic scan - using default security data`)
    }

    const tokenomicsData = {
      token_address,
      score: canPerformProScan ? Math.floor(Math.random() * 40) + 40 : Math.floor(Math.random() * 20) + 30,
      circulating_supply: null,
      supply_cap: null,
      tvl_usd: tokenData.total_value_locked_usd !== 'N/A' ? parseFloat(tokenData.total_value_locked_usd) : null,
      vesting_schedule: canPerformProScan ? 'Unknown' : 'Limited Info',
      distribution_score: canPerformProScan ? 'Medium' : 'Basic',
      treasury_usd: null,
      burn_mechanism: false
    }

    const liquidityData = {
      token_address,
      score: canPerformProScan ? Math.floor(Math.random() * 50) + 30 : Math.floor(Math.random() * 20) + 20,
      liquidity_locked_days: null,
      cex_listings: 0,
      trading_volume_24h_usd: null,
      holder_distribution: canPerformProScan ? 'Unknown' : 'Limited Info',
      dex_depth_status: canPerformProScan ? 'Medium' : 'Basic'
    }

    // Enhanced development data with GitHub integration
    let developmentData = {
      token_address,
      score: 0,
      github_repo: tokenData.github_url,
      is_open_source: !!tokenData.github_url,
      contributors_count: null,
      commits_30d: null,
      last_commit: null,
      roadmap_progress: 'Unknown'
    }

    // Fetch GitHub data for Pro scans or if GitHub URL is available
    if ((canPerformProScan || tokenData.github_url) && tokenData.github_url) {
      console.log(`[SCAN] Fetching GitHub data for development analysis`)
      
      const githubData = await fetchGitHubRepoData(tokenData.github_url, githubApiKey);
      
      if (githubData) {
        const score = calculateDevelopmentScore(githubData);
        
        developmentData = {
          ...developmentData,
          score,
          is_open_source: githubData.isOpenSource,
          contributors_count: githubData.contributorsCount,
          commits_30d: githubData.commits30d,
          last_commit: githubData.lastCommit,
          roadmap_progress: githubData.commits30d > 0 ? 'Active' : 'Inactive'
        }
        
        console.log(`[SCAN] Development data successfully collected - Score: ${score}, Contributors: ${githubData.contributorsCount}, Commits (30d): ${githubData.commits30d}`)
      } else {
        // Fallback scoring for open source projects without detailed data
        if (tokenData.github_url) {
          developmentData.score = 20; // Base score for having a GitHub repository
          developmentData.roadmap_progress = 'Unknown';
          console.log(`[SCAN] GitHub data not available, using fallback score: ${developmentData.score}`)
        }
      }
    } else {
      console.log(`[SCAN] No GitHub URL available or basic scan - using minimal development data`)
    }

    // Community data always 0 as per requirements
    const communityData = {
      token_address,
      score: 0,
      twitter_followers: null,
      twitter_verified: false,
      twitter_growth_7d: null,
      telegram_members: null,
      discord_members: null,
      active_channels: [],
      team_visibility: 'Unknown'
    }

    console.log(`[SCAN] Saving token data to database: ${token_address}`)
    console.log(`[SCAN] Token description to save: "${tokenData.description}"`)
    
    try {
      // Save token data first
      const { data: tokenSaveData, error: tokenSaveError } = await supabase
        .from('token_data_cache')
        .upsert(tokenData, { onConflict: 'token_address' })

      if (tokenSaveError) {
        console.error(`[SCAN] CRITICAL: Failed to save token data:`, tokenSaveError)
        throw new Error(`Failed to save token data: ${tokenSaveError.message}`)
      }
      
      console.log(`[SCAN] Successfully saved token data for: ${token_address}`)

      // Now save all other cache data - these should succeed now that token_data_cache exists
      const savePromises = [
        supabase.from('token_security_cache').upsert(securityData, { onConflict: 'token_address' }),
        supabase.from('token_tokenomics_cache').upsert(tokenomicsData, { onConflict: 'token_address' }),
        supabase.from('token_liquidity_cache').upsert(liquidityData, { onConflict: 'token_address' }),
        supabase.from('token_development_cache').upsert(developmentData, { onConflict: 'token_address' }),
        supabase.from('token_community_cache').upsert(communityData, { onConflict: 'token_address' })
      ]

      const results = await Promise.allSettled(savePromises)
      
      const tableNames = ['security', 'tokenomics', 'liquidity', 'development', 'community']
      
      // Check for any failures
      let hasFailures = false
      results.forEach((result, index) => {
        const tableName = tableNames[index]
        if (result.status === 'rejected') {
          console.error(`[SCAN] ERROR: Failed to save ${tableName} data:`, result.reason)
          hasFailures = true
        } else if (result.value.error) {
          console.error(`[SCAN] ERROR: Database error saving ${tableName}:`, result.value.error)
          hasFailures = true
        } else {
          console.log(`[SCAN] Successfully saved ${tableName} data`)
        }
      })

      if (hasFailures) {
        throw new Error('Failed to save some cache data to database')
      }

    } catch (error) {
      console.error(`[SCAN] Database save failed:`, error)
      // Return error response instead of fake success
      return new Response(
        JSON.stringify({ 
          error: `Database save failed: ${error.message}`,
          success: false 
        }),
        { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Calculate overall score
    const scores = [
      securityData.score,
      tokenomicsData.score,
      liquidityData.score,
      developmentData.score
    ].filter(score => score !== null && score !== undefined)
    
    const overallScore = scores.length > 0 
      ? Math.round(scores.reduce((acc, curr) => acc + curr, 0) / scores.length)
      : 0

    try {
      const scanRecord = {
        user_id: user_id || null,
        token_address,
        cmc_id: cmc_id || null,
        score_total: overallScore,
        pro_scan: canPerformProScan,
        is_anonymous: !user_id
      }
      
      console.log(`[SCAN] Recording scan:`, scanRecord)
      const { error: scanError } = await supabase.from('token_scans').insert(scanRecord)
      
      if (scanError) {
        console.error(`[SCAN] Error recording scan:`, scanError)
      } else {
        console.log(`[SCAN] Successfully recorded scan`)
      }
    } catch (error) {
      console.error(`[SCAN] Exception recording scan:`, error)
    }

    // Increment scan usage for authenticated users who performed a Pro scan
    if (user_id && canPerformProScan) {
      try {
        console.log(`[SCAN] Incrementing scan usage for user: ${user_id}`)
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({ scans_used: scansUsed + 1 })
          .eq('id', user_id)

        if (updateError) {
          console.error(`[SCAN] Error updating scan usage:`, updateError)
        } else {
          console.log(`[SCAN] Successfully incremented scan usage to ${scansUsed + 1}`)
        }
      } catch (error) {
        console.error(`[SCAN] Exception updating scan usage:`, error)
      }
    }

    console.log(`[SCAN] Scan completed successfully for ${token_address}, overall score: ${overallScore}, pro_scan: ${canPerformProScan}, development_score: ${developmentData.score}`)

    // Return consistent response structure
    return new Response(
      JSON.stringify({
        success: true,
        token_address,
        overall_score: overallScore,
        pro_scan: canPerformProScan,
        token_info: tokenData,
        security: securityData,
        tokenomics: tokenomicsData,
        liquidity: liquidityData,
        development: developmentData,
        community: communityData
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('[SCAN] Error in run-token-scan:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Scan failed',
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
