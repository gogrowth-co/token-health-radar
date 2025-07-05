import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  normalizeChainId, 
  getChainConfigByMoralisId 
} from '../_shared/chainConfig.ts'
import {
  fetchGoPlusSecurity,
  fetchWebacySecurity,
  fetchGeckoTerminalData,
  fetchMoralisMetadata,
  fetchGitHubRepoData,
  calculateSecurityScore,
  calculateLiquidityScore,
  calculateTokenomicsScore,
  calculateDevelopmentScore
} from '../_shared/apiClients.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Fetch comprehensive token data from multiple APIs using Moralis as primary metadata source
async function fetchTokenDataFromAPIs(tokenAddress: string, chainId: string) {
  console.log(`[SCAN] Fetching token data from multiple APIs for: ${tokenAddress} on chain: ${chainId}`);
  
  const chainConfig = getChainConfigByMoralisId(chainId);
  if (!chainConfig) {
    console.log(`[SCAN] Unsupported chain: ${chainId}`);
    return null;
  }

  try {
    // Fetch data from all APIs in parallel - prioritize Webacy for security
    console.log(`[SCAN] Calling external APIs for fresh data...`);
    const apiStartTime = Date.now();
    
    const [webacySecurityData, goplusSecurityData, marketData, metadataData] = await Promise.allSettled([
      fetchWebacySecurity(tokenAddress, chainId),
      fetchGoPlusSecurity(tokenAddress, chainId),
      fetchGeckoTerminalData(tokenAddress, chainId),
      fetchMoralisMetadata(tokenAddress, chainId)
    ]);

    const apiEndTime = Date.now();
    console.log(`[SCAN] API calls completed in ${apiEndTime - apiStartTime}ms`);

    // Log detailed API results for debugging
    const webacySecurity = webacySecurityData.status === 'fulfilled' ? webacySecurityData.value : null;
    const goplusSecurity = goplusSecurityData.status === 'fulfilled' ? goplusSecurityData.value : null;
    const market = marketData.status === 'fulfilled' ? marketData.value : null;
    const metadata = metadataData.status === 'fulfilled' ? metadataData.value : null;

    // Log API failures for debugging
    if (webacySecurityData.status === 'rejected') {
      console.error(`[SCAN] Webacy API failed:`, webacySecurityData.reason);
    }
    if (goplusSecurityData.status === 'rejected') {
      console.error(`[SCAN] GoPlus API failed:`, goplusSecurityData.reason);
    }
    if (marketData.status === 'rejected') {
      console.error(`[SCAN] GeckoTerminal API failed:`, marketData.reason);
    }
    if (metadataData.status === 'rejected') {
      console.error(`[SCAN] Moralis API failed:`, metadataData.reason);
    }

    // Merge security data with Webacy taking priority
    const security = webacySecurity || goplusSecurity;

    console.log(`[SCAN] API Data Summary:`, {
      webacySecurity: webacySecurity ? 'available' : 'unavailable',
      goplusSecurity: goplusSecurity ? 'available' : 'unavailable',
      security: security ? 'available' : 'unavailable',
      market: market ? 'available' : 'unavailable', 
      metadata: metadata ? 'available' : 'unavailable',
      totalApiTime: `${apiEndTime - apiStartTime}ms`
    });

    // Fetch GitHub data if GitHub URL is available in metadata
    let githubData = null;
    if (metadata?.links?.github) {
      console.log(`[SCAN] GitHub URL found: ${metadata.links.github}`);
      const githubResult = await Promise.allSettled([fetchGitHubRepoData(metadata.links.github)]);
      githubData = githubResult[0].status === 'fulfilled' ? githubResult[0].value : null;
      console.log(`[SCAN] GitHub data: ${githubData ? 'available' : 'unavailable'}`);
    } else {
      console.log(`[SCAN] No GitHub URL found in metadata`);
    }

    // Prioritize Moralis metadata, with market data as fallback
    const name = metadata?.name || market?.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
    const symbol = metadata?.symbol || market?.symbol || 'UNKNOWN';
    const logo_url = metadata?.logo || metadata?.thumbnail || '';
    
    // Use rich description from Moralis if available, otherwise create a basic one
    const description = metadata?.description && metadata.description.trim() 
      ? metadata.description
      : metadata?.name 
        ? `${metadata.name} (${metadata.symbol}) is a token on ${chainConfig.name}${metadata.verified_contract ? ' with a verified contract' : ''}.`
        : `${name} on ${chainConfig.name}`;

    // Extract social links from Moralis metadata
    const links = metadata?.links || {};
    const website_url = links.website || '';
    const twitter_handle = links.twitter ? links.twitter.replace('https://twitter.com/', '').replace('@', '') : '';
    const github_url = links.github || '';

    // Combine data from all sources, prioritizing Moralis for richer data
    const combinedData = {
      name: metadata?.name || market?.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
      symbol: metadata?.symbol || market?.symbol || 'UNKNOWN',
      description: metadata?.description && metadata.description.trim() 
        ? metadata.description
        : metadata?.name 
          ? `${metadata.name} (${metadata.symbol}) is a token on ${chainConfig.name}${metadata.verified_contract ? ' with a verified contract' : ''}.`
          : `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)} on ${chainConfig.name}`,
      logo_url: metadata?.logo || metadata?.thumbnail || '',
      website_url: metadata?.links?.website || '',
      twitter_handle: metadata?.links?.twitter ? metadata.links.twitter.replace('https://twitter.com/', '').replace('@', '') : '',
      github_url: metadata?.links?.github || '',
      current_price_usd: market?.current_price_usd || 0,
      price_change_24h: market?.price_change_24h, // Keep null if no data
      market_cap_usd: metadata?.market_cap ? parseFloat(metadata.market_cap) : (market?.market_cap_usd || 0),
      total_supply: metadata?.total_supply || '0',
      trading_volume_24h_usd: market?.trading_volume_24h_usd || 0
    };

    // Add detailed logging for data extraction
    console.log(`[SCAN] === DETAILED DATA EXTRACTION LOGGING ===`);
    console.log(`[SCAN] Raw Metadata from Moralis:`, {
      name: metadata?.name,
      symbol: metadata?.symbol,
      description: metadata?.description?.substring(0, 100) + '...',
      logo: metadata?.logo,
      market_cap: metadata?.market_cap,
      links: metadata?.links ? Object.keys(metadata.links) : []
    });
    console.log(`[SCAN] Raw Market/Price Data:`, {
      current_price_usd: market?.current_price_usd,
      price_change_24h: market?.price_change_24h,
      market_cap_usd: market?.market_cap_usd,
      trading_volume_24h_usd: market?.trading_volume_24h_usd
    });
    console.log(`[SCAN] Final Combined Data:`, {
      name: combinedData.name,
      symbol: combinedData.symbol,
      current_price_usd: combinedData.current_price_usd,
      price_change_24h: combinedData.price_change_24h,
      market_cap_usd: combinedData.market_cap_usd,
      logo_url: combinedData.logo_url,
      description_length: combinedData.description.length
    });

    console.log(`[SCAN] Combined token data:`, {
      name: combinedData.name,
      symbol: combinedData.symbol,
      logo_available: !!combinedData.logo_url,
      description_length: combinedData.description.length,
      social_links: {
        website: !!combinedData.website_url,
        twitter: !!combinedData.twitter_handle,
        github: !!combinedData.github_url
      }
    });

    return {
      tokenData: combinedData,
      securityData: security,
      webacyData: webacySecurity,
      goplusData: goplusSecurity,
      marketData: market,
      metadataData: metadata,
      githubData: githubData
    };
  } catch (error) {
    console.error(`[SCAN] Error fetching token data from APIs:`, error);
    return null;
  }
}

// Generate category data with real API integration
function generateCategoryData(apiData: any) {
  const securityScore = calculateSecurityScore(apiData.securityData, apiData.webacyData);
  const liquidityScore = calculateLiquidityScore(apiData.marketData);
  const tokenomicsScore = calculateTokenomicsScore(apiData.metadataData, apiData.marketData);
  const developmentScore = calculateDevelopmentScore(apiData.githubData);
  
  // Community score - this would need additional APIs (Twitter, Discord, etc.)
  const communityScore = 30; // Conservative score

  return {
    security: {
      ownership_renounced: apiData.securityData?.ownership_renounced || null,
      can_mint: apiData.securityData?.can_mint || null,
      honeypot_detected: apiData.securityData?.honeypot_detected || null,
      freeze_authority: apiData.securityData?.freeze_authority || null,
      audit_status: apiData.securityData?.audit_status || 'unverified',
      multisig_status: 'unknown',
      score: securityScore,
      // Webacy-specific fields for enhanced security analysis
      webacy_risk_score: apiData.webacyData?.riskScore || null,
      webacy_severity: apiData.webacyData?.severity || null,
      webacy_flags: apiData.webacyData?.flags || [],
      is_proxy: apiData.securityData?.is_proxy || null,
      is_blacklisted: apiData.securityData?.is_blacklisted || null,
      access_control: apiData.securityData?.access_control || null,
      contract_verified: apiData.securityData?.contract_verified || null
    },
    tokenomics: {
      supply_cap: apiData.metadataData?.total_supply || null,
      circulating_supply: apiData.metadataData?.total_supply || null,
      burn_mechanism: null,
      vesting_schedule: 'unknown',
      distribution_score: 'unknown',
      tvl_usd: 0,
      treasury_usd: 0,
      score: tokenomicsScore
    },
    liquidity: {
      trading_volume_24h_usd: apiData.marketData?.trading_volume_24h_usd || 0,
      liquidity_locked_days: 0,
      dex_depth_status: apiData.marketData?.trading_volume_24h_usd > 10000 ? 'good' : 'limited',
      holder_distribution: 'unknown',
      cex_listings: 0,
      score: liquidityScore
    },
    community: {
      twitter_followers: 0,
      twitter_verified: false,
      twitter_growth_7d: 0,
      discord_members: 0,
      telegram_members: 0,
      active_channels: [],
      team_visibility: 'unknown',
      score: communityScore
    },
    development: {
      github_repo: apiData.githubData ? `${apiData.githubData.owner}/${apiData.githubData.repo}` : '',
      contributors_count: 0, // Could be enhanced later
      commits_30d: apiData.githubData?.commits_30d || 0,
      last_commit: apiData.githubData?.last_push || null,
      is_open_source: !!apiData.githubData,
      roadmap_progress: 'unknown',
      score: developmentScore
    }
  };
}

// Calculate overall score from category scores
function calculateOverallScore(categoryData: any) {
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

// Delete cached data to force fresh scan
async function invalidateTokenCache(tokenAddress: string, chainId: string) {
  console.log(`[CACHE-INVALIDATION] Clearing cached data for: ${tokenAddress} on chain: ${chainId}`);
  
  const deleteOperations = [
    supabase.from('token_data_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_security_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_tokenomics_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_liquidity_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_community_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_development_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId)
  ];

  const results = await Promise.allSettled(deleteOperations);
  
  let deletedCount = 0;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && !result.value.error) {
      deletedCount++;
    } else if (result.status === 'rejected' || result.value.error) {
      console.warn(`[CACHE-INVALIDATION] Failed to delete from cache table ${index}:`, result.status === 'rejected' ? result.reason : result.value.error);
    }
  });

  console.log(`[CACHE-INVALIDATION] Successfully cleared ${deletedCount}/6 cache tables for ${tokenAddress}`);
  return deletedCount;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token_address, chain_id, user_id, force_refresh = true } = await req.json();
    
    // ALWAYS force fresh scans - ignore any cached data
    const alwaysRefresh = true;

    console.log(`[SCAN] === STARTING COMPREHENSIVE TOKEN SCAN ===`);
    console.log(`[SCAN] Token: ${token_address}, Chain: ${chain_id}, User: ${user_id}, Force Refresh: ${force_refresh}`);
    console.log(`[SCAN] Timestamp: ${new Date().toISOString()}`);

    if (!token_address || !chain_id) {
      console.error(`[SCAN] Missing required parameters - token_address: ${token_address}, chain_id: ${chain_id}`);
      throw new Error('Token address and chain ID are required');
    }

    // PHASE 1: Validate API Keys
    console.log(`[SCAN] === PHASE 1: API KEY VALIDATION ===`);
    const apiKeys = {
      webacy: Deno.env.get('WEBACY_API_KEY'),
      moralis: Deno.env.get('MORALIS_API_KEY'), 
      github: Deno.env.get('GITHUB_API_KEY')
    };
    
    console.log(`[SCAN] API Key Status:`, {
      webacy: apiKeys.webacy ? 'CONFIGURED' : 'MISSING',
      moralis: apiKeys.moralis ? 'CONFIGURED' : 'MISSING',
      github: apiKeys.github ? 'CONFIGURED' : 'MISSING'
    });

    if (!apiKeys.webacy) {
      console.error(`[SCAN] CRITICAL: WEBACY_API_KEY not configured`);
    }
    if (!apiKeys.moralis) {
      console.error(`[SCAN] CRITICAL: MORALIS_API_KEY not configured`);
    }
    if (!apiKeys.github) {
      console.warn(`[SCAN] WARNING: GITHUB_API_KEY not configured - development scores will be limited`);
    }

    // Normalize chain ID and validate
    const normalizedChainId = normalizeChainId(chain_id);
    const chainConfig = getChainConfigByMoralisId(normalizedChainId);
    
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chain_id}`);
    }

    console.log(`[SCAN] Scanning on ${chainConfig.name} (${normalizedChainId})`);

    // FORCE FRESH SCAN: Delete all cached data before scanning (ALWAYS)
    await invalidateTokenCache(token_address.toLowerCase(), normalizedChainId);

    // Check if user has pro access (simplified for now)
    const proScan = false; // Will be enhanced later with proper pro check
    console.log(`[SCAN] Pro scan permitted: ${proScan}`);

    // Fetch comprehensive token data from multiple APIs using Moralis as primary metadata source
    console.log(`[SCAN] Fetching FRESH data from APIs...`);
    const apiData = await fetchTokenDataFromAPIs(token_address, normalizedChainId);
    
    if (!apiData) {
      throw new Error('Failed to fetch token data from APIs');
    }

    console.log(`[SCAN] Token data collected for: ${apiData.tokenData.name} (${apiData.tokenData.symbol})`);

    // Generate category data with real API integration including GitHub
    const categoryData = generateCategoryData(apiData);
    const overallScore = calculateOverallScore(categoryData);

    console.log(`[SCAN] Calculated overall score: ${overallScore}`);

    // Use database transaction for data consistency
    const { error: transactionError } = await supabase.rpc('begin');
    if (transactionError) {
      console.error(`[SCAN] Failed to start transaction:`, transactionError);
    }

    try {
      // UPSERT token data to main cache table
      console.log(`[SCAN] === UPSERTING TOKEN DATA TO DATABASE ===`);
      console.log(`[SCAN] Token: ${token_address}, Chain: ${normalizedChainId}`);
      console.log(`[SCAN] Data to save:`, {
        name: apiData.tokenData.name,
        symbol: apiData.tokenData.symbol,
        current_price_usd: apiData.tokenData.current_price_usd,
        price_change_24h: apiData.tokenData.price_change_24h,
        market_cap_usd: apiData.tokenData.market_cap_usd,
        logo_url: apiData.tokenData.logo_url ? 'present' : 'missing',
        description_length: apiData.tokenData.description?.length || 0
      });
      
      const { error: upsertError } = await supabase
        .from('token_data_cache')
        .upsert({
          token_address: token_address.toLowerCase(),
          chain_id: normalizedChainId,
          name: apiData.tokenData.name,
          symbol: apiData.tokenData.symbol,
          description: apiData.tokenData.description,
          logo_url: apiData.tokenData.logo_url,
          website_url: apiData.tokenData.website_url,
          twitter_handle: apiData.tokenData.twitter_handle,
          github_url: apiData.tokenData.github_url,
          current_price_usd: apiData.tokenData.current_price_usd,
          price_change_24h: apiData.tokenData.price_change_24h,
          market_cap_usd: apiData.tokenData.market_cap_usd
        }, {
          onConflict: 'token_address,chain_id'
        });

      if (upsertError) {
        console.error(`[SCAN] Error upserting token data:`, upsertError);
        throw new Error(`Failed to save token data: ${upsertError.message}`);
      }

      console.log(`[SCAN] Successfully upserted token data for: ${token_address} on ${chainConfig.name}`);
      
      // Verify the data was saved correctly
      const { data: verifyData, error: verifyError } = await supabase
        .from('token_data_cache')
        .select('name, symbol, current_price_usd, price_change_24h, market_cap_usd')
        .eq('token_address', token_address.toLowerCase())
        .eq('chain_id', normalizedChainId)
        .single();
      
      if (verifyError) {
        console.error(`[SCAN] Error verifying saved data:`, verifyError);
      } else {
        console.log(`[SCAN] Verified saved data:`, verifyData);
      }

      // UPSERT category data to cache tables using individual operations
      const cacheOperations = [
        {
          table: 'token_security_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.security.score,
            ownership_renounced: categoryData.security.ownership_renounced,
            can_mint: categoryData.security.can_mint,
            honeypot_detected: categoryData.security.honeypot_detected,
            freeze_authority: categoryData.security.freeze_authority,
            audit_status: categoryData.security.audit_status,
            multisig_status: categoryData.security.multisig_status,
            // Webacy-specific fields
            webacy_risk_score: categoryData.security.webacy_risk_score,
            webacy_severity: categoryData.security.webacy_severity,
            webacy_flags: categoryData.security.webacy_flags,
            is_proxy: categoryData.security.is_proxy,
            is_blacklisted: categoryData.security.is_blacklisted,
            access_control: categoryData.security.access_control,
            contract_verified: categoryData.security.contract_verified
          }
        },
        {
          table: 'token_tokenomics_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.tokenomics.score,
            supply_cap: categoryData.tokenomics.supply_cap,
            circulating_supply: categoryData.tokenomics.circulating_supply,
            burn_mechanism: categoryData.tokenomics.burn_mechanism,
            vesting_schedule: categoryData.tokenomics.vesting_schedule,
            distribution_score: categoryData.tokenomics.distribution_score,
            tvl_usd: categoryData.tokenomics.tvl_usd,
            treasury_usd: categoryData.tokenomics.treasury_usd
          }
        },
        {
          table: 'token_liquidity_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.liquidity.score,
            trading_volume_24h_usd: categoryData.liquidity.trading_volume_24h_usd,
            liquidity_locked_days: categoryData.liquidity.liquidity_locked_days,
            dex_depth_status: categoryData.liquidity.dex_depth_status,
            holder_distribution: categoryData.liquidity.holder_distribution,
            cex_listings: categoryData.liquidity.cex_listings
          }
        },
        {
          table: 'token_community_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.community.score,
            twitter_followers: categoryData.community.twitter_followers,
            twitter_verified: categoryData.community.twitter_verified,
            twitter_growth_7d: categoryData.community.twitter_growth_7d,
            discord_members: categoryData.community.discord_members,
            telegram_members: categoryData.community.telegram_members,
            active_channels: categoryData.community.active_channels,
            team_visibility: categoryData.community.team_visibility
          }
        },
        {
          table: 'token_development_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.development.score,
            github_repo: categoryData.development.github_repo,
            contributors_count: categoryData.development.contributors_count,
            commits_30d: categoryData.development.commits_30d,
            last_commit: categoryData.development.last_commit,
            is_open_source: categoryData.development.is_open_source,
            roadmap_progress: categoryData.development.roadmap_progress
          }
        }
      ];

      // Execute all cache operations using UPSERT
      for (const operation of cacheOperations) {
        try {
          const { error } = await supabase
            .from(operation.table)
            .upsert(operation.data, {
              onConflict: 'token_address,chain_id'
            });

          if (error) {
            console.error(`[SCAN] Error upserting ${operation.table}:`, error);
          } else {
            const categoryName = operation.table.replace('token_', '').replace('_cache', '');
            console.log(`[SCAN] Successfully upserted ${categoryName} data with score: ${operation.data.score}`);
          }
        } catch (error) {
          console.error(`[SCAN] Exception upserting ${operation.table}:`, error);
        }
      }

    // Record the scan with proper chain_id validation
    if (user_id) {
      try {
        console.log(`[SCAN] Recording scan for user ${user_id} with chain_id: ${normalizedChainId}`);
        const { error: scanError } = await supabase
          .from('token_scans')
          .insert({
            user_id,
            token_address: token_address.toLowerCase(),
            chain_id: normalizedChainId,
            score_total: overallScore,
            pro_scan: proScan,
            is_anonymous: false
          });
        
        if (scanError) {
          console.error(`[SCAN] Error recording scan:`, scanError);
        } else {
          console.log(`[SCAN] Successfully recorded scan for user ${user_id}`);
        }
      } catch (error) {
        console.error(`[SCAN] Exception recording scan:`, error);
      }
    } else {
      // Also record anonymous scans for tracking
      try {
        console.log(`[SCAN] Recording anonymous scan with chain_id: ${normalizedChainId}`);
        const { error: scanError } = await supabase
          .from('token_scans')
          .insert({
            user_id: null,
            token_address: token_address.toLowerCase(),
            chain_id: normalizedChainId,
            score_total: overallScore,
            pro_scan: false,
            is_anonymous: true
          });
        
        if (scanError) {
          console.error(`[SCAN] Error recording anonymous scan:`, scanError);
        } else {
          console.log(`[SCAN] Successfully recorded anonymous scan`);
        }
      } catch (error) {
        console.error(`[SCAN] Exception recording anonymous scan:`, error);
      }
    }

      // Commit transaction
      const { error: commitError } = await supabase.rpc('commit');
      if (commitError) {
        console.error(`[SCAN] Failed to commit transaction:`, commitError);
      }

    } catch (error) {
      // Rollback transaction on error
      const { error: rollbackError } = await supabase.rpc('rollback');
      if (rollbackError) {
        console.error(`[SCAN] Failed to rollback transaction:`, rollbackError);
      }
      throw error;
    }

    console.log(`[SCAN] Comprehensive scan completed for ${token_address} on ${chainConfig.name}, overall score: ${overallScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        token_address,
        chain_id: normalizedChainId,
        overall_score: overallScore,
        data_sources: {
          security: apiData.webacyData ? 'Webacy API (primary)' : (apiData.goplusData ? 'GoPlus API (fallback)' : 'unavailable'),
          market: apiData.marketData ? 'GeckoTerminal API' : 'unavailable',
          metadata: apiData.metadataData ? 'Moralis API' : 'unavailable',
          development: apiData.githubData ? 'GitHub API' : 'unavailable'
        },
        category_scores: {
          security: categoryData.security.score,
          tokenomics: categoryData.tokenomics.score,
          liquidity: categoryData.liquidity.score,
          community: categoryData.community.score,
          development: categoryData.development.score
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[SCAN] Error during comprehensive token scan:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
