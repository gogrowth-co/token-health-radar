
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to detect generic/low-quality descriptions
const isGenericDescription = (description: string): boolean => {
  if (!description || description.trim().length === 0) return true;
  
  const genericPatterns = [
    /is a cryptocurrency token\.?$/i,
    /is a digital currency\.?$/i,
    /is a crypto token\.?$/i,
    /cryptocurrency token$/i,
    /digital asset$/i
  ];
  
  return genericPatterns.some(pattern => pattern.test(description.trim()));
};

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
  if (!githubUrl) return null

  try {
    const url = new URL(githubUrl)
    const pathParts = url.pathname.split('/').filter(Boolean)
    if (url.hostname === 'github.com' && pathParts.length === 2) {
      const [owner, repo] = pathParts
      return { owner, repo }
    }
  } catch (error) {
    console.error(`[SCAN] Invalid GitHub URL: ${githubUrl}`, error)
  }
  return null
}

// Helper function to find CMC ID by token name/symbol
const findCMCIdByName = async (tokenName: string, tokenSymbol: string, supabase: any) => {
  try {
    console.log(`[SCAN] Searching for CMC ID using name: "${tokenName}" symbol: "${tokenSymbol}"`);
    
    const { data: cmcSearchData, error: cmcSearchError } = await supabase.functions.invoke('coinmarketcap-search', {
      body: {
        action: 'search',
        searchTerm: tokenSymbol || tokenName,
        limit: 5
      }
    });

    if (!cmcSearchError && cmcSearchData?.data && cmcSearchData.data.length > 0) {
      // Try to find exact match by symbol first, then by name
      const exactSymbolMatch = cmcSearchData.data.find((token: any) => 
        token.symbol?.toLowerCase() === tokenSymbol?.toLowerCase()
      );
      
      const exactNameMatch = cmcSearchData.data.find((token: any) => 
        token.name?.toLowerCase() === tokenName?.toLowerCase()
      );
      
      const foundToken = exactSymbolMatch || exactNameMatch || cmcSearchData.data[0];
      
      if (foundToken) {
        console.log(`[SCAN] Found CMC ID ${foundToken.id} for ${tokenName}`);
        return foundToken.id;
      }
    }
    
    console.log(`[SCAN] No CMC ID found for ${tokenName}`);
    return null;
  } catch (error) {
    console.error(`[SCAN] Error searching for CMC ID:`, error);
    return null;
  }
};

// Rate limiting for API calls
let lastCoinGeckoCall = 0
let lastCMCCall = 0
const MIN_API_INTERVAL = 2000 // 2 seconds

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper function to enforce rate limiting
const enforceRateLimit = async (lastCallTime: number, minInterval: number) => {
  const now = Date.now()
  const timeSinceLastCall = now - lastCallTime
  if (timeSinceLastCall < minInterval) {
    const waitTime = minInterval - timeSinceLastCall
    console.log(`[SCAN] Rate limiting: waiting ${waitTime}ms`)
    await delay(waitTime)
  }
  return Date.now()
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token_address, coingecko_id, cmc_id, user_id } = await req.json()
    
    console.log(`[SCAN] Starting scan for token: ${token_address}, user: ${user_id}, coingecko_id: ${coingecko_id}, cmc_id: ${cmc_id}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Check user's scan access and permissions
    let proScanPermitted = false;
    if (user_id) {
      const { data: accessData } = await supabase.functions.invoke('check-scan-access', {
        body: { user_id }
      });
      
      console.log(`[SCAN] User ${user_id} - Plan: ${accessData?.plan}, Scans used: ${accessData?.scansUsed}, Limit: ${accessData?.scanLimit}`)
      proScanPermitted = accessData?.proScanAvailable || false;
    }
    
    console.log(`[SCAN] Pro scan permitted: ${proScanPermitted}`)

    // Initialize token data with defaults
    let tokenData = {
      name: `Token ${token_address.substring(0, 8)}...`,
      symbol: 'UNKNOWN',
      description: '',
      website_url: '',
      twitter_handle: '',
      github_url: '',
      logo_url: '',
      coingecko_id: coingecko_id || '',
      current_price_usd: 0,
      price_change_24h: 0,
      market_cap_usd: 0,
      total_value_locked_usd: 'N/A'
    }

    let descriptionSource = 'none';
    let foundMeaningfulDescription = false;
    let finalCmcId = cmc_id;

    // Check if we have cached data and if CMC ID is missing, try to find it
    try {
      const { data: existingToken } = await supabase
        .from('token_data_cache')
        .select('*')
        .eq('token_address', token_address)
        .single()

      if (existingToken) {
        console.log(`[SCAN] Found cached token data`);
        
        // If we don't have a CMC ID but have token name/symbol, try to find it
        if (!finalCmcId && existingToken.name && existingToken.symbol) {
          finalCmcId = await findCMCIdByName(existingToken.name, existingToken.symbol, supabase);
          
          // Save the found CMC ID back to the database
          if (finalCmcId) {
            console.log(`[SCAN] Updating database with found CMC ID: ${finalCmcId}`);
            await supabase
              .from('token_data_cache')
              .update({ cmc_id: finalCmcId })
              .eq('token_address', token_address);
          }
        } else if (existingToken.cmc_id) {
          finalCmcId = existingToken.cmc_id;
        }
        
        // Check description quality
        if (existingToken.description && !isGenericDescription(existingToken.description)) {
          console.log(`[SCAN] Using quality cached description`)
          tokenData = {
            ...tokenData,
            name: existingToken.name || tokenData.name,
            symbol: existingToken.symbol || tokenData.symbol,
            description: existingToken.description,
            website_url: existingToken.website_url || '',
            twitter_handle: existingToken.twitter_handle || '',
            github_url: existingToken.github_url || '',
            logo_url: existingToken.logo_url || '',
            current_price_usd: Number(existingToken.current_price_usd) || 0,
            price_change_24h: Number(existingToken.price_change_24h) || 0,
            market_cap_usd: Number(existingToken.market_cap_usd) || 0,
            total_value_locked_usd: existingToken.total_value_locked_usd || 'N/A'
          }
          foundMeaningfulDescription = true;
          descriptionSource = 'cached';
        } else {
          console.log(`[SCAN] Cached description is generic or missing, will fetch fresh description`)
          // Use other cached data but fetch fresh description
          tokenData = {
            ...tokenData,
            name: existingToken.name || tokenData.name,
            symbol: existingToken.symbol || tokenData.symbol,
            website_url: existingToken.website_url || '',
            twitter_handle: existingToken.twitter_handle || '',
            github_url: existingToken.github_url || '',
            logo_url: existingToken.logo_url || '',
            current_price_usd: Number(existingToken.current_price_usd) || 0,
            price_change_24h: Number(existingToken.price_change_24h) || 0,
            market_cap_usd: Number(existingToken.market_cap_usd) || 0,
            total_value_locked_usd: existingToken.total_value_locked_usd || 'N/A'
          }
        }
      }
    } catch (error) {
      console.log(`[SCAN] No cached data found or error fetching: ${error}`)
    }

    console.log(`[SCAN] Final CMC ID to use: ${finalCmcId}`);

    // Fetch token data - prioritize CMC if cmc_id is available and we need description
    if (finalCmcId && !foundMeaningfulDescription) {
      console.log(`[SCAN] Fetching fresh token data from CMC API: ${finalCmcId}`)
      
      try {
        lastCMCCall = await enforceRateLimit(lastCMCCall, MIN_API_INTERVAL)
        
        const { data: cmcData, error: cmcError } = await supabase.functions.invoke('coinmarketcap-search', {
          body: {
            action: 'details',
            cmcIds: [parseInt(finalCmcId)]
          }
        });

        console.log(`[SCAN] CMC Data Response:`, JSON.stringify(cmcData, null, 2))

        if (!cmcError && cmcData?.data && Object.keys(cmcData.data).length > 0) {
          const cmcInfo = cmcData.data[finalCmcId]
          console.log(`[SCAN] CMC Info for token ${finalCmcId}:`, JSON.stringify(cmcInfo, null, 2))
          
          // Check if description exists and is meaningful
          if (cmcInfo?.description) {
            console.log(`[SCAN] CMC Raw Description Found: "${cmcInfo.description.substring(0, 200)}..."`)
            const cleanedCMCDescription = cleanDescription(cmcInfo.description);
            console.log(`[SCAN] CMC Cleaned Description: "${cleanedCMCDescription}"`)
            
            if (cleanedCMCDescription && !isGenericDescription(cleanedCMCDescription)) {
              tokenData.description = cleanedCMCDescription;
              descriptionSource = 'CMC';
              foundMeaningfulDescription = true;
              console.log(`[SCAN] Using meaningful CMC description`)
            } else {
              console.log(`[SCAN] CMC description is generic, will try other sources`)
            }
          } else {
            console.log(`[SCAN] CMC description field is missing or empty`)
          }
          
          // Get quotes for pricing data
          const { data: quotesData } = await supabase.functions.invoke('coinmarketcap-search', {
            body: {
              action: 'quotes',
              cmcIds: [parseInt(finalCmcId)],
              convert: 'USD'
            }
          });
          
          const cmcQuotes = quotesData?.data?.[finalCmcId]
          
          // Extract social links
          const website = cmcInfo?.urls?.website?.[0] || tokenData.website_url
          const twitterHandle = cmcInfo?.urls?.twitter?.[0]?.replace('https://twitter.com/', '') || tokenData.twitter_handle
          const github = cmcInfo?.urls?.source_code?.[0] || tokenData.github_url
          
          const usdQuote = cmcQuotes?.quote?.USD || {}
          
          tokenData = {
            ...tokenData,
            name: cmcInfo?.name || tokenData.name,
            symbol: cmcInfo?.symbol?.toUpperCase() || tokenData.symbol,
            website_url: website,
            twitter_handle: twitterHandle,
            github_url: github,
            logo_url: cmcInfo?.logo || tokenData.logo_url,
            current_price_usd: usdQuote?.price || tokenData.current_price_usd,
            price_change_24h: usdQuote?.percent_change_24h || tokenData.price_change_24h,
            market_cap_usd: usdQuote?.market_cap || tokenData.market_cap_usd,
            total_value_locked_usd: tokenData.total_value_locked_usd
          }
          
          console.log(`[SCAN] Token data successfully collected from CMC API`)
        } else {
          console.log(`[SCAN] No data found in CMC API response or error occurred`)
        }
      } catch (error) {
        console.error(`[SCAN] Error fetching token data from CMC:`, error)
      }
    }
    
    // Fallback to CoinGecko for description if not found yet
    if (!foundMeaningfulDescription && token_address) {
      console.log(`[SCAN] Trying CoinGecko for description using contract address: ${token_address}`)
      
      const cgApiKey = Deno.env.get('COINGECKO_API_KEY')
      console.log(`[SCAN] Using CoinGecko Demo Plan authentication`)
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
      
      if (cgApiKey) {
        headers['x-cg-demo-api-key'] = cgApiKey
      }
      
      try {
        lastCoinGeckoCall = await enforceRateLimit(lastCoinGeckoCall, MIN_API_INTERVAL)
        
        // Try contract address endpoint first
        const contractUrl = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token_address.toLowerCase()}`
        console.log(`[SCAN] Calling CoinGecko contract endpoint: ${contractUrl}`)
        
        let response = await fetch(contractUrl, { headers })
        let data = null;
        
        if (response.ok) {
          data = await response.json()
          console.log(`[SCAN] CoinGecko contract response success`)
          
          if (data.description?.en) {
            console.log(`[SCAN] CoinGecko Contract Raw Description: "${data.description.en.substring(0, 200)}..."`)
            const cleanedCGDescription = cleanDescription(data.description.en);
            console.log(`[SCAN] CoinGecko Contract Cleaned Description: "${cleanedCGDescription}"`)
            
            if (cleanedCGDescription && !isGenericDescription(cleanedCGDescription)) {
              tokenData.description = cleanedCGDescription;
              descriptionSource = 'CoinGecko-Contract';
              foundMeaningfulDescription = true;
              console.log(`[SCAN] Using meaningful CoinGecko contract description`)
            }
          }
        } else {
          console.log(`[SCAN] CoinGecko contract endpoint failed: ${response.status}`)
        }
        
        // If contract endpoint failed or gave generic description, try coins/{id} endpoint
        if (!foundMeaningfulDescription && coingecko_id) {
          console.log(`[SCAN] Trying CoinGecko coins endpoint with ID: ${coingecko_id}`)
          
          await delay(1000); // Additional delay between requests
          const idResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${coingecko_id}`,
            { headers }
          )
          
          if (idResponse.ok) {
            const idData = await idResponse.json()
            
            if (idData.description?.en) {
              console.log(`[SCAN] CoinGecko ID Raw Description: "${idData.description.en.substring(0, 200)}..."`)
              const cleanedDescription = cleanDescription(idData.description.en);
              console.log(`[SCAN] CoinGecko ID Cleaned Description: "${cleanedDescription}"`)
              
              if (cleanedDescription && !isGenericDescription(cleanedDescription)) {
                tokenData.description = cleanedDescription;
                descriptionSource = 'CoinGecko-ID';
                foundMeaningfulDescription = true;
                console.log(`[SCAN] Using meaningful CoinGecko ID description`)
              }
            }
          }
        }
        
        // Update other fields if we got data from any CoinGecko endpoint
        if (data) {
          tokenData = {
            name: tokenData.name !== `Token ${token_address.substring(0, 8)}...` ? tokenData.name : (data.name || tokenData.name),
            symbol: tokenData.symbol !== 'UNKNOWN' ? tokenData.symbol : (data.symbol?.toUpperCase() || tokenData.symbol),
            description: tokenData.description, // Keep the description we set above
            website_url: tokenData.website_url || data.links?.homepage?.[0] || '',
            twitter_handle: tokenData.twitter_handle || data.links?.twitter_screen_name || '',
            github_url: tokenData.github_url || data.links?.repos_url?.github?.[0] || '',
            logo_url: tokenData.logo_url || data.image?.large || '',
            coingecko_id: tokenData.coingecko_id || data.id || '',
            current_price_usd: tokenData.current_price_usd || data.market_data?.current_price?.usd || 0,
            price_change_24h: tokenData.price_change_24h || data.market_data?.price_change_percentage_24h || 0,
            market_cap_usd: tokenData.market_cap_usd || data.market_data?.market_cap?.usd || 0,
            total_value_locked_usd: tokenData.total_value_locked_usd !== 'N/A' ? tokenData.total_value_locked_usd : (data.market_data?.total_value_locked?.usd?.toString() || 'N/A')
          }
          
          console.log(`[SCAN] Token data successfully collected from CoinGecko`)
        }
      } catch (error) {
        console.error(`[SCAN] Error fetching token data from CoinGecko:`, error)
      }
    }

    // Only add fallback description if no meaningful description was found
    if (!foundMeaningfulDescription && tokenData.name !== `Token ${token_address.substring(0, 8)}...`) {
      tokenData.description = `${tokenData.name} (${tokenData.symbol}) is a cryptocurrency token.`;
      descriptionSource = 'fallback';
      console.log(`[SCAN] Added fallback description: "${tokenData.description}"`);
    }

    console.log(`[SCAN] Final description source: ${descriptionSource}`)
    console.log(`[SCAN] Final description: "${tokenData.description}"`)
    console.log(`[SCAN] Found meaningful description: ${foundMeaningfulDescription}`)

    // Initialize default security data
    let securityData = {
      ownership_renounced: false,
      can_mint: true,
      honeypot_detected: false,
      freeze_authority: false,
      multisig_status: 'Unknown',
      audit_status: 'Not audited'
    }

    // For basic scans, use default security data
    if (!proScanPermitted) {
      console.log(`[SCAN] Basic scan - using default security data`)
    } else {
      console.log(`[SCAN] Pro scan - fetching security data`)
      
      try {
        // Fetch security data from external API
        const apiUrl = `https://api.gopluslabs.io/api/v1/token_security/56/${token_address}`
        console.log(`[SCAN] Calling GoPlus API: ${apiUrl}`)
        
        const response = await fetch(apiUrl)
        if (response.ok) {
          const data = await response.json()
          if (data.result) {
            securityData = {
              ownership_renounced: data.result.is_proxy === '1' ? data.result.proxy_is_renounced === '1' : data.result.owner_is_renounced === '1',
              can_mint: data.result.is_mintable === '1',
              honeypot_detected: data.result.honeypot_related === '1',
              freeze_authority: data.result.can_take_back_ownership === '1',
              multisig_status: data.result.is_proxy === '1' ? (data.result.proxy_is_multi_sig === '1' ? 'MultiSig' : 'Not MultiSig') : 'Not Proxy',
              audit_status: data.result.audit_status || 'Not audited'
            }
            console.log(`[SCAN] Security data successfully collected from GoPlus API`)
          } else {
            console.warn(`[SCAN] No security data found in GoPlus API response`)
          }
        } else {
          console.error(`[SCAN] GoPlus API error: ${response.status} ${response.statusText}`)
        }
      } catch (error) {
        console.error(`[SCAN] Error fetching security data:`, error)
      }
    }
    
    // Calculate security score
    let securityScore = 50 // Base score
    if (securityData.ownership_renounced) securityScore += 20
    if (!securityData.can_mint) securityScore += 15
    if (!securityData.honeypot_detected) securityScore += 15
    securityScore = Math.min(securityScore, 100)

    // Initialize default development data
    let developmentData = {
      github_repo: tokenData.github_url,
      is_open_source: !!tokenData.github_url,
      contributors_count: 0,
      commits_30d: 0,
      last_commit: null,
      roadmap_progress: 'Unknown'
    }
    
    // Fetch GitHub data for development analysis
    console.log(`[SCAN] Fetching GitHub data for development analysis`)

    if (tokenData.github_url) {
      const repoInfo = extractGitHubRepoInfo(tokenData.github_url)
      if (repoInfo) {
        const { owner, repo } = repoInfo
        console.log(`[SCAN] Fetching GitHub data for ${owner}/${repo}`)
        
        const githubApiKey = Deno.env.get('GITHUB_API_KEY')
        const githubHeaders: Record<string, string> = {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'TokenHealthScan/1.0'
        }
        
        if (githubApiKey) {
          githubHeaders['Authorization'] = `token ${githubApiKey}`
          console.log(`[SCAN] Using GitHub API key for better rate limits`)
        }

        try {
          // Fetch contributors
          const contributorsUrl = `https://api.github.com/repos/${owner}/${repo}/contributors`
          console.log(`[SCAN] Calling GitHub API: ${contributorsUrl}`)
          
          const contributorsResponse = await fetch(contributorsUrl, { headers: githubHeaders })
          if (contributorsResponse.ok) {
            const contributorsData = await contributorsResponse.json()
            developmentData.contributors_count = contributorsData.length
          } else {
            console.error(`[SCAN] GitHub API error (contributors): ${contributorsResponse.status} ${contributorsResponse.statusText}`)
          }

          // Fetch commits in the last 30 days
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?since=${thirtyDaysAgo}`
          console.log(`[SCAN] Calling GitHub API: ${commitsUrl}`)
          
          const commitsResponse = await fetch(commitsUrl, { headers: githubHeaders })
          if (commitsResponse.ok) {
            const commitsData = await commitsResponse.json()
            developmentData.commits_30d = commitsData.length
            
            if (commitsData.length > 0) {
              developmentData.last_commit = commitsData[0].commit.author.date
            }
          } else {
            console.error(`[SCAN] GitHub API error (commits): ${commitsResponse.status} ${commitsResponse.statusText}`)
          }
          
          console.log(`[SCAN] GitHub data collected - Contributors: ${developmentData.contributors_count}, Commits (30d): ${developmentData.commits_30d}, Last commit: ${developmentData.last_commit}`)
        } catch (error) {
          console.error(`[SCAN] Error fetching GitHub data:`, error)
        }
      }
    }

    // Calculate development score
    let developmentScore = 50 // Base score
    if (developmentData.is_open_source) developmentScore += 20
    if (developmentData.contributors_count > 5) developmentScore += 15
    if (developmentData.commits_30d > 10) developmentScore += 15
    developmentScore = Math.min(developmentScore, 100)
    
    console.log(`[SCAN] Development data successfully collected - Score: ${developmentScore}, Contributors: ${developmentData.contributors_count}, Commits (30d): ${developmentData.commits_30d}`)

    // Initialize default community data
    let communityData = {
      telegram_members: 0,
      discord_members: 0,
      twitter_followers: 0
    }

    // Calculate community score
    let communityScore = 50 // Base score
    if (communityData.telegram_members > 1000) communityScore += 15
    if (communityData.discord_members > 1000) communityScore += 15
    if (communityData.twitter_followers > 10000) communityScore += 20
    communityScore = Math.min(communityScore, 100)

    // Initialize default liquidity data
    let liquidityData = {
      dex_pairs: 0,
      total_liquidity_usd: 0
    }

    // Calculate liquidity score
    let liquidityScore = 50 // Base score
    if (liquidityData.dex_pairs > 1) liquidityScore += 20
    if (liquidityData.total_liquidity_usd > 100000) liquidityScore += 30
    liquidityScore = Math.min(liquidityScore, 100)

    // Initialize default tokenomics data
    let tokenomicsData = {
      total_supply: 0,
      circulating_supply: 0,
      holder_count: 0
    }

    // Calculate tokenomics score
    let tokenomicsScore = 50 // Base score
    if (tokenomicsData.holder_count > 100) tokenomicsScore += 20
    if (tokenomicsData.circulating_supply > 0 && tokenomicsData.total_supply > 0) {
      const circulatingSupplyRatio = tokenomicsData.circulating_supply / tokenomicsData.total_supply
      if (circulatingSupplyRatio > 0.5) tokenomicsScore += 30
    }
    tokenomicsScore = Math.min(tokenomicsScore, 100)

    // Calculate overall score
    const scores = {
      security: securityScore,
      liquidity: liquidityScore,
      tokenomics: tokenomicsScore,
      community: communityScore,
      development: developmentScore
    }
    
    const overallScore = Math.round((scores.security + scores.liquidity + scores.tokenomics + scores.community + scores.development) / 5)

    console.log(`[SCAN] Saving token data to database: ${token_address}`)
    console.log(`[SCAN] Token description to save: "${tokenData.description}"`)
    console.log(`[SCAN] Description source: ${descriptionSource}`)
    console.log(`[SCAN] CMC ID to save: ${finalCmcId}`)
    
    try {
      // Force update to database with the new/improved description and CMC ID
      const { data: existingToken } = await supabase
        .from('token_data_cache')
        .select('token_address')
        .eq('token_address', token_address)
        .single()

      if (existingToken) {
        // Token exists - update with new description and CMC ID
        console.log(`[SCAN] Updating existing token with fresh description and CMC ID`)
        const { error: updateError } = await supabase
          .from('token_data_cache')
          .update({
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description,
            website_url: tokenData.website_url,
            twitter_handle: tokenData.twitter_handle,
            github_url: tokenData.github_url,
            logo_url: tokenData.logo_url,
            coingecko_id: tokenData.coingecko_id,
            cmc_id: finalCmcId ? parseInt(finalCmcId) : null,
            current_price_usd: tokenData.current_price_usd,
            price_change_24h: tokenData.price_change_24h,
            market_cap_usd: tokenData.market_cap_usd,
            total_value_locked_usd: tokenData.total_value_locked_usd
          })
          .eq('token_address', token_address)

        if (updateError) throw updateError
        console.log(`[SCAN] Successfully updated existing token data for: ${token_address}`)
      } else {
        // Token doesn't exist - insert new record
        console.log(`[SCAN] Token doesn't exist, inserting new record`)
        const { error: insertError } = await supabase
          .from('token_data_cache')
          .insert({
            token_address,
            name: tokenData.name,
            symbol: tokenData.symbol,
            description: tokenData.description,
            website_url: tokenData.website_url,
            twitter_handle: tokenData.twitter_handle,
            github_url: tokenData.github_url,
            logo_url: tokenData.logo_url,
            coingecko_id: tokenData.coingecko_id,
            cmc_id: finalCmcId ? parseInt(finalCmcId) : null,
            current_price_usd: tokenData.current_price_usd,
            price_change_24h: tokenData.price_change_24h,
            market_cap_usd: tokenData.market_cap_usd,
            total_value_locked_usd: tokenData.total_value_locked_usd
          })

        if (insertError) throw insertError
        console.log(`[SCAN] Successfully inserted new token data for: ${token_address}`)
      }

      // Save category data
      const savePromises = [
        supabase.from('token_security_cache').upsert({
          token_address,
          ...securityData,
          score: scores.security
        }, { onConflict: 'token_address' }),
        
        supabase.from('token_tokenomics_cache').upsert({
          token_address,
          score: scores.tokenomics
        }, { onConflict: 'token_address' }),
        
        supabase.from('token_liquidity_cache').upsert({
          token_address,
          score: scores.liquidity
        }, { onConflict: 'token_address' }),
        
        supabase.from('token_development_cache').upsert({
          token_address,
          ...developmentData,
          score: scores.development
        }, { onConflict: 'token_address' }),
        
        supabase.from('token_community_cache').upsert({
          token_address,
          score: scores.community
        }, { onConflict: 'token_address' })
      ]

      const results = await Promise.allSettled(savePromises)
      results.forEach((result, index) => {
        const categories = ['security', 'tokenomics', 'liquidity', 'development', 'community']
        if (result.status === 'fulfilled') {
          console.log(`[SCAN] Successfully saved ${categories[index]} data`)
        } else {
          console.error(`[SCAN] Error saving ${categories[index]} data:`, result.reason)
        }
      })

      // Record the scan
      console.log(`[SCAN] Recording scan: {
  user_id: "${user_id}",
  token_address: "${token_address}",
  cmc_id: ${finalCmcId ? parseInt(finalCmcId) : null},
  score_total: ${overallScore},
  pro_scan: ${proScanPermitted},
  is_anonymous: ${!user_id}
}`)
      
      const { error: scanError } = await supabase
        .from('token_scans')
        .insert({
          user_id: user_id || null,
          token_address,
          cmc_id: finalCmcId ? parseInt(finalCmcId) : null,
          score_total: overallScore,
          pro_scan: proScanPermitted,
          is_anonymous: !user_id
        })

      if (scanError) {
        console.error(`[SCAN] Error recording scan:`, scanError)
      } else {
        console.log(`[SCAN] Successfully recorded scan`)
      }

    } catch (error) {
      console.error(`[SCAN] Error saving data to database:`, error)
    }

    console.log(`[SCAN] Scan completed successfully for ${token_address}, overall score: ${overallScore}, pro_scan: ${proScanPermitted}, development_score: ${developmentScore}`)

    // Return the scan results
    return new Response(JSON.stringify({
      success: true,
      token_info: tokenData,
      scores,
      overall_score: overallScore,
      pro_scan: proScanPermitted,
      security_data: securityData,
      development_data: developmentData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[SCAN] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
