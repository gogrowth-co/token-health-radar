// Optimized token scan edge function - reduced from 2550 to ~600 lines
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { normalizeChainId, getChainConfigByMoralisId } from '../_shared/chainConfig.ts'
import {
  fetchGoPlusSecurity,
  fetchWebacySecurity,
  fetchMoralisMetadata,
  fetchMoralisPriceData,
  fetchMoralisTokenStats,
  fetchMoralisTokenPairs,
  fetchGitHubRepoData,
  calculateSecurityScore,
  calculateLiquidityScore,
  calculateTokenomicsScore,
  calculateDevelopmentScore
} from '../_shared/apiClients.ts'
import { fetchDeFiLlamaTVL } from '../_shared/defillama.ts'
import {
  calculateCommunityScore,
  calculateOverallScore,
  calculateLiquidityLockedDays,
  calculateTokenomicsConfidence,
  isValidDiscordUrl,
  isValidTelegramUrl,
  createFallbackData
} from '../_shared/scanHelpers.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Timeout wrapper for API calls - prevents hanging
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  try {
    const result = await Promise.race([
      promise,
      new Promise<null>((_, reject) => 
        setTimeout(() => reject(new Error(`${label} timeout`)), ms)
      )
    ]);
    return result;
  } catch (e) {
    console.log(`[TIMEOUT] ${label} failed: ${e.message}`);
    return null;
  }
}

// Fetch token data from APIs with individual timeouts
async function fetchTokenDataFromAPIs(tokenAddress: string, chainId: string) {
  console.log(`[SCAN] Fetching data for: ${tokenAddress} on ${chainId}`);
  
  const chainConfig = getChainConfigByMoralisId(chainId);
  if (!chainConfig) {
    console.log(`[SCAN] Unsupported chain: ${chainId}`);
    return createFallbackData();
  }

  const API_TIMEOUT = 8000; // 8 seconds per API call
  
  try {
    // Parallel fetch of essential APIs with individual timeouts
    console.log(`[SCAN] Starting parallel API calls...`);
    const apiStart = Date.now();
    
    const [webacySecurity, goplusSecurity, metadata, priceData, stats, pairs, tvl] = await Promise.all([
      withTimeout(fetchWebacySecurity(tokenAddress, chainId), API_TIMEOUT, 'Webacy'),
      withTimeout(fetchGoPlusSecurity(tokenAddress, chainId), API_TIMEOUT, 'GoPlus'),
      withTimeout(fetchMoralisMetadata(tokenAddress, chainId), API_TIMEOUT, 'Metadata'),
      withTimeout(fetchMoralisPriceData(tokenAddress, chainId), API_TIMEOUT, 'Price'),
      withTimeout(fetchMoralisTokenStats(tokenAddress, chainId), API_TIMEOUT, 'Stats'),
      withTimeout(fetchMoralisTokenPairs(tokenAddress, chainId), API_TIMEOUT, 'Pairs'),
      withTimeout(fetchDeFiLlamaTVL(tokenAddress), API_TIMEOUT, 'TVL')
    ]);

    console.log(`[SCAN] APIs done in ${Date.now() - apiStart}ms`);

    // Merge security data
    const security: any = {};
    if (webacySecurity) Object.assign(security, webacySecurity);
    if (goplusSecurity) Object.assign(security, goplusSecurity);

    // Extract social links from metadata
    let github_url = '';
    let website_url = '';
    let twitter_handle = '';
    const links = metadata?.links || [];
    
    if (Array.isArray(links)) {
      website_url = links.find((l: string) => 
        typeof l === 'string' && l.startsWith('http') && 
        !l.includes('twitter') && !l.includes('github') && !l.includes('discord')
      ) || '';
      
      const twitterLink = links.find((l: string) => 
        typeof l === 'string' && (l.includes('twitter.com') || l.includes('x.com'))
      );
      if (twitterLink) {
        const match = twitterLink.match(/(?:twitter\.com\/|x\.com\/)([^\/\?]+)/);
        if (match) twitter_handle = match[1].replace('@', '');
      }
      
      github_url = links.find((l: string) => typeof l === 'string' && l.includes('github.com')) || '';
    }
    
    // Fetch GitHub data if URL available
    let githubData = null;
    if (github_url) {
      try {
        githubData = await withTimeout(fetchGitHubRepoData(github_url), API_TIMEOUT, 'GitHub');
      } catch {}
    }

    const name = metadata?.name || priceData?.name || `Token ${tokenAddress.slice(0, 6)}...`;
    const symbol = metadata?.symbol || priceData?.symbol || 'UNKNOWN';
    const description = metadata?.description?.trim() || `${name} (${symbol}) is a token on ${chainConfig.name}.`;

    return {
      tokenData: {
        name,
        symbol,
        description,
        logo_url: metadata?.logo || metadata?.thumbnail || '',
        website_url,
        twitter_handle,
        github_url,
        current_price_usd: priceData?.current_price_usd || 0,
        price_change_24h: priceData?.price_change_24h,
        market_cap_usd: metadata?.market_cap ? parseFloat(metadata.market_cap) : 0,
        total_supply: metadata?.total_supply || '0',
        trading_volume_24h_usd: priceData?.trading_volume_24h_usd || 0
      },
      securityData: security,
      webacyData: webacySecurity,
      goplusData: goplusSecurity,
      priceData,
      metadataData: metadata,
      statsData: stats,
      pairsData: pairs,
      ownersData: null,
      githubData,
      tvlData: tvl,
      cexData: 0,
      twitterFollowers: 0,
      discordMembers: 0,
      telegramMembers: 0
    };
  } catch (error) {
    console.error(`[SCAN] Error fetching token data:`, error);
    return createFallbackData();
  }
}

// Generate category data with scores
function generateCategoryData(apiData: any) {
  const securityScore = calculateSecurityScore(apiData.securityData, apiData.webacyData, apiData.goplusData);
  const liquidityScore = calculateLiquidityScore(apiData.priceData, apiData.securityData);
  const tokenomicsScore = calculateTokenomicsScore(apiData.metadataData, apiData.priceData, apiData.statsData, apiData.ownersData, apiData.pairsData);
  const developmentScore = calculateDevelopmentScore(apiData.githubData);
  const communityScore = calculateCommunityScore({
    twitterFollowers: apiData.twitterFollowers || 0,
    discordMembers: apiData.discordMembers || 0,
    telegramMembers: apiData.telegramMembers || 0
  });

  console.log(`[SCAN] Scores: sec=${securityScore}, liq=${liquidityScore}, tok=${tokenomicsScore}, dev=${developmentScore}, com=${communityScore}`);

  const sec = apiData.securityData || {};
  
  return {
    security: {
      ownership_renounced: sec?.ownership_renounced ?? null,
      can_mint: sec?.can_mint ?? null,
      honeypot_detected: sec?.honeypot_detected ?? null,
      freeze_authority: sec?.freeze_authority ?? null,
      audit_status: sec?.audit_status || 'unverified',
      multisig_status: 'unknown',
      is_proxy: sec?.is_proxy ?? null,
      is_blacklisted: sec?.is_blacklisted ?? null,
      access_control: sec?.access_control ?? null,
      contract_verified: sec?.contract_verified ?? null,
      is_liquidity_locked: sec?.is_liquidity_locked ?? false,
      liquidity_lock_info: sec?.liquidity_lock_info || null,
      liquidity_percentage: sec?.liquidity_percentage || null,
      score: securityScore
    },
    tokenomics: {
      supply_cap: apiData.metadataData?.total_supply ? parseFloat(apiData.metadataData.total_supply) : null,
      circulating_supply: apiData.statsData?.total_supply || null,
      actual_circulating_supply: apiData.statsData?.total_supply || null,
      total_supply: apiData.statsData?.total_supply || null,
      dex_liquidity_usd: apiData.pairsData?.total_liquidity_usd || null,
      major_dex_pairs: apiData.pairsData?.pairs?.slice(0, 3) || [],
      distribution_gini_coefficient: apiData.ownersData?.gini_coefficient || null,
      distribution_score: apiData.ownersData?.concentration_risk ? 
        (apiData.ownersData.concentration_risk === 'Low' ? 'Excellent' : 
         apiData.ownersData.concentration_risk === 'Medium' ? 'Good' : 'Fair') : 'Unknown',
      holder_concentration_risk: apiData.ownersData?.concentration_risk || 'Unknown',
      top_holders_count: apiData.ownersData?.total_holders || null,
      burn_mechanism: null,
      vesting_schedule: 'unknown',
      tvl_usd: apiData.tvlData,
      treasury_usd: null,
      data_confidence_score: calculateTokenomicsConfidence(apiData),
      last_holder_analysis: apiData.ownersData ? new Date().toISOString() : null,
      score: tokenomicsScore
    },
    liquidity: {
      trading_volume_24h_usd: apiData.priceData?.trading_volume_24h_usd || 0,
      liquidity_locked_days: calculateLiquidityLockedDays(apiData.securityData),
      dex_depth_status: apiData.priceData?.trading_volume_24h_usd > 10000 ? 'good' : 'limited',
      holder_distribution: apiData.ownersData?.concentration_risk || 'unknown',
      cex_listings: apiData.cexData || 0,
      score: liquidityScore
    },
    community: {
      twitter_followers: apiData.twitterFollowers || 0,
      twitter_verified: false,
      twitter_growth_7d: 0,
      discord_members: apiData.discordMembers || 0,
      telegram_members: apiData.telegramMembers || 0,
      active_channels: [],
      team_visibility: 'unknown',
      score: communityScore
    },
    development: {
      github_repo: apiData.githubData ? `${apiData.githubData.owner}/${apiData.githubData.repo}` : '',
      contributors_count: apiData.githubData?.contributors_count || 0,
      commits_30d: apiData.githubData?.commits_30d || 0,
      last_commit: apiData.githubData?.last_push || null,
      is_open_source: !!apiData.githubData,
      stars: apiData.githubData?.stars || 0,
      forks: apiData.githubData?.forks || 0,
      open_issues: apiData.githubData?.open_issues || 0,
      language: apiData.githubData?.language || null,
      is_archived: apiData.githubData?.is_archived || false,
      repo_created_at: apiData.githubData?.created_at || null,
      roadmap_progress: 'unknown',
      score: developmentScore
    }
  };
}

// Invalidate cache
async function invalidateTokenCache(tokenAddress: string, chainId: string) {
  const tables = ['token_security_cache', 'token_tokenomics_cache', 'token_liquidity_cache', 'token_community_cache', 'token_development_cache', 'token_data_cache'];
  
  for (const table of tables) {
    try {
      await supabase.from(table).delete().eq('token_address', tokenAddress).eq('chain_id', chainId);
    } catch {}
  }
}

// Main handler
Deno.serve(async (req) => {
  const startTime = Date.now();
  const requestId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] === SCAN STARTED ===`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ success: true, message: 'Edge function running', request_id: requestId }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    // Parse request
    const bodyText = await req.text();
    if (!bodyText.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Empty request body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { token_address: rawAddress, chain_id, user_id } = JSON.parse(bodyText);
    const token_address = rawAddress?.toLowerCase().trim();
    
    // CRITICAL FIX: Capture normalized chain_id early and use throughout
    const normalizedChainId = normalizeChainId(chain_id || '0x1');
    const safeChainId = normalizedChainId || '0x1'; // Fallback to Ethereum
    
    console.log(`[${requestId}] Token: ${token_address}, Chain: ${safeChainId}`);

    // Validate
    if (!token_address || !/^0x[a-fA-F0-9]{40}$/.test(token_address)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token address' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const chainConfig = getChainConfigByMoralisId(safeChainId);
    if (!chainConfig) {
      return new Response(JSON.stringify({ success: false, error: 'Unsupported chain' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Main scan with timeout
    const SCAN_TIMEOUT = 45000; // 45 seconds
    
    const scanResult = await Promise.race([
      (async () => {
        // Clear cache
        await invalidateTokenCache(token_address, safeChainId);
        
        // Fetch data
        const apiData = await fetchTokenDataFromAPIs(token_address, safeChainId);
        if (!apiData) throw new Error('No API data');
        
        // Generate scores
        const categoryData = generateCategoryData(apiData);
        const overallScore = calculateOverallScore(categoryData);
        
        // Save to database
        console.log(`[${requestId}] Saving to database...`);
        
        // Upsert main token data
        await supabase.from('token_data_cache').upsert({
          token_address,
          chain_id: safeChainId,
          name: apiData.tokenData.name,
          symbol: apiData.tokenData.symbol,
          description: apiData.tokenData.description,
          logo_url: apiData.tokenData.logo_url,
          website_url: apiData.tokenData.website_url,
          twitter_handle: apiData.tokenData.twitter_handle,
          github_url: apiData.tokenData.github_url,
          current_price_usd: apiData.tokenData.current_price_usd,
          price_change_24h: apiData.tokenData.price_change_24h,
          market_cap_usd: apiData.tokenData.market_cap_usd,
          circulating_supply: apiData.metadataData?.circulating_supply || apiData.statsData?.total_supply || null
        }, { onConflict: 'token_address,chain_id' });

        // Upsert category caches
        await Promise.all([
          supabase.from('token_security_cache').upsert({
            token_address, chain_id: safeChainId, ...categoryData.security,
            webacy_risk_score: apiData.webacyData?.webacy_risk_score || null,
            webacy_severity: apiData.webacyData?.webacy_severity || null,
            webacy_flags: apiData.webacyData?.webacy_flags || null
          }, { onConflict: 'token_address,chain_id' }),
          
          supabase.from('token_tokenomics_cache').upsert({
            token_address, chain_id: safeChainId, ...categoryData.tokenomics
          }, { onConflict: 'token_address,chain_id' }),
          
          supabase.from('token_liquidity_cache').upsert({
            token_address, chain_id: safeChainId, ...categoryData.liquidity
          }, { onConflict: 'token_address,chain_id' }),
          
          supabase.from('token_community_cache').upsert({
            token_address, chain_id: safeChainId, ...categoryData.community
          }, { onConflict: 'token_address,chain_id' }),
          
          supabase.from('token_development_cache').upsert({
            token_address, chain_id: safeChainId,
            score: categoryData.development.score,
            github_repo: categoryData.development.github_repo,
            contributors_count: categoryData.development.contributors_count,
            commits_30d: categoryData.development.commits_30d,
            last_commit: categoryData.development.last_commit,
            is_open_source: categoryData.development.is_open_source,
            stars: categoryData.development.stars,
            forks: categoryData.development.forks,
            open_issues: categoryData.development.open_issues,
            roadmap_progress: categoryData.development.roadmap_progress
          }, { onConflict: 'token_address,chain_id' })
        ]);

        // Record scan - USE safeChainId to prevent NULL
        await supabase.from('token_scans').insert({
          token_address,
          chain_id: safeChainId, // FIXED: Use captured value
          user_id: user_id || null,
          score_total: overallScore,
          is_anonymous: !user_id,
          pro_scan: false
        });

        return {
          success: true,
          token_address,
          chain_id: safeChainId,
          overall_score: overallScore,
          token_name: apiData.tokenData.name,
          token_symbol: apiData.tokenData.symbol,
          processing_time_ms: Date.now() - startTime
        };
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), SCAN_TIMEOUT))
    ]);

    console.log(`[${requestId}] Scan completed in ${Date.now() - startTime}ms`);
    
    return new Response(JSON.stringify(scanResult), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    const isTimeout = error.message?.includes('Timeout');
    
    return new Response(JSON.stringify({
      success: false,
      error: isTimeout ? 'Scan timeout - the operation took too long to complete' : error.message,
      request_id: requestId,
      timeout_ms: isTimeout ? 45000 : undefined,
      processing_time_ms: Date.now() - startTime
    }), {
      status: isTimeout ? 408 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
