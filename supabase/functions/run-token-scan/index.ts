
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  normalizeChainId, 
  getChainConfigByMoralisId 
} from '../_shared/chainConfig.ts'
import {
  fetchGoPlusSecurity,
  fetchGeckoTerminalData,
  fetchEtherscanMetadata,
  calculateSecurityScore,
  calculateLiquidityScore,
  calculateTokenomicsScore
} from '../_shared/apiClients.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Clear all existing cached data for a token before inserting fresh data
async function clearExistingCacheData(tokenAddress: string, chainId: string) {
  console.log(`[SCAN] Clearing all existing cache data for ${tokenAddress} on ${chainId}`);
  
  const clearOperations = [
    supabase.from('token_security_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_tokenomics_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_liquidity_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_community_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId),
    supabase.from('token_development_cache').delete().eq('token_address', tokenAddress).eq('chain_id', chainId)
  ];

  try {
    await Promise.all(clearOperations);
    console.log(`[SCAN] Successfully cleared all cache data for ${tokenAddress} on ${chainId}`);
  } catch (error) {
    console.error(`[SCAN] Error clearing cache data:`, error);
  }
}

// Fetch comprehensive token data from multiple APIs
async function fetchTokenDataFromAPIs(tokenAddress: string, chainId: string) {
  console.log(`[SCAN] Fetching token data from multiple APIs for: ${tokenAddress} on chain: ${chainId}`);
  
  const chainConfig = getChainConfigByMoralisId(chainId);
  if (!chainConfig) {
    console.log(`[SCAN] Unsupported chain: ${chainId}`);
    return null;
  }

  try {
    // Fetch data from all APIs in parallel
    const [securityData, marketData, metadataData] = await Promise.allSettled([
      fetchGoPlusSecurity(tokenAddress, chainId),
      fetchGeckoTerminalData(tokenAddress, chainId),
      fetchEtherscanMetadata(tokenAddress, chainId)
    ]);

    const security = securityData.status === 'fulfilled' ? securityData.value : null;
    const market = marketData.status === 'fulfilled' ? marketData.value : null;
    const metadata = metadataData.status === 'fulfilled' ? metadataData.value : null;

    console.log(`[SCAN] API Data Summary:`, {
      security: security ? 'available' : 'unavailable',
      market: market ? 'available' : 'unavailable', 
      metadata: metadata ? 'available' : 'unavailable'
    });

    // Combine data from all sources
    const combinedData = {
      name: market?.name || metadata?.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
      symbol: market?.symbol || metadata?.symbol || 'UNKNOWN',
      description: `${market?.name || metadata?.name || 'Token'} on ${chainConfig.name}`,
      logo_url: '',
      website_url: metadata?.website || '',
      twitter_handle: metadata?.twitter || '',
      github_url: metadata?.github || '',
      current_price_usd: market?.current_price_usd || 0,
      price_change_24h: market?.price_change_24h || 0,
      market_cap_usd: market?.market_cap_usd || 0,
      total_supply: metadata?.total_supply || 0,
      trading_volume_24h_usd: market?.trading_volume_24h_usd || 0
    };

    return {
      tokenData: combinedData,
      securityData: security,
      marketData: market,
      metadataData: metadata
    };
  } catch (error) {
    console.error(`[SCAN] Error fetching token data from APIs:`, error);
    return null;
  }
}

// Generate category data with real API integration
function generateCategoryData(apiData: any) {
  const securityScore = calculateSecurityScore(apiData.securityData);
  const liquidityScore = calculateLiquidityScore(apiData.marketData);
  const tokenomicsScore = calculateTokenomicsScore(apiData.metadataData, apiData.marketData);
  
  // Community and development scores - these would need additional APIs
  // For now, provide conservative scores indicating limited data
  const communityScore = 30; // Conservative score
  const developmentScore = 25; // Conservative score

  return {
    security: {
      ownership_renounced: apiData.securityData?.ownership_renounced || null,
      can_mint: apiData.securityData?.can_mint || null,
      honeypot_detected: apiData.securityData?.honeypot_detected || null,
      freeze_authority: apiData.securityData?.freeze_authority || null,
      audit_status: apiData.securityData?.audit_status || 'unverified',
      multisig_status: 'unknown',
      score: securityScore
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
      github_repo: apiData.metadataData?.github || '',
      contributors_count: 0,
      commits_30d: 0,
      last_commit: null,
      is_open_source: apiData.metadataData?.github ? true : null,
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token_address, chain_id, user_id } = await req.json();

    console.log(`[SCAN] Starting comprehensive scan for token: ${token_address}, chain: ${chain_id}, user: ${user_id}`);

    if (!token_address || !chain_id) {
      throw new Error('Token address and chain ID are required');
    }

    // Normalize chain ID
    const normalizedChainId = normalizeChainId(chain_id);
    const chainConfig = getChainConfigByMoralisId(normalizedChainId);
    
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chain_id}`);
    }

    console.log(`[SCAN] Scanning on ${chainConfig.name} (${normalizedChainId})`);

    // Check if user has pro access (simplified for now)
    const proScan = false; // Will be enhanced later with proper pro check
    console.log(`[SCAN] Pro scan permitted: ${proScan}`);

    // Clear existing cache data first to ensure fresh data
    await clearExistingCacheData(token_address, normalizedChainId);

    // Fetch comprehensive token data from multiple APIs
    const apiData = await fetchTokenDataFromAPIs(token_address, normalizedChainId);
    
    if (!apiData) {
      throw new Error('Failed to fetch token data from APIs');
    }

    console.log(`[SCAN] Token data collected for: ${apiData.tokenData.name} (${apiData.tokenData.symbol})`);

    // Generate category data with real API integration
    const categoryData = generateCategoryData(apiData);
    const overallScore = calculateOverallScore(categoryData);

    console.log(`[SCAN] Calculated overall score: ${overallScore}`);

    // Save token data to database
    console.log(`[SCAN] Saving token data to database: ${token_address}, chain: ${normalizedChainId}`);
    
    // Delete and recreate the main token record to ensure freshness
    await supabase
      .from('token_data_cache')
      .delete()
      .eq('token_address', token_address)
      .eq('chain_id', normalizedChainId);

    // Insert fresh token data
    const { error: insertError } = await supabase
      .from('token_data_cache')
      .insert({
        token_address,
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
      });

    if (insertError) {
      console.error(`[SCAN] Error inserting token data:`, insertError);
      throw new Error(`Failed to save token data: ${insertError.message}`);
    }

    console.log(`[SCAN] Inserted token data for: ${token_address} on ${chainConfig.name}`);

    // Save category data to cache tables
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
          multisig_status: categoryData.security.multisig_status
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

    // Execute all cache operations (insert fresh data)
    for (const operation of cacheOperations) {
      try {
        const { error } = await supabase
          .from(operation.table)
          .insert(operation.data);

        if (error) {
          console.error(`[SCAN] Error saving ${operation.table}:`, error);
        } else {
          const categoryName = operation.table.replace('token_', '').replace('_cache', '');
          console.log(`[SCAN] Successfully saved ${categoryName} data with score: ${operation.data.score}`);
        }
      } catch (error) {
        console.error(`[SCAN] Exception saving ${operation.table}:`, error);
      }
    }

    // Record the scan
    if (user_id) {
      try {
        await supabase
          .from('token_scans')
          .insert({
            user_id,
            token_address,
            chain_id: normalizedChainId,
            score_total: overallScore,
            pro_scan: proScan,
            is_anonymous: false
          });
        
        console.log(`[SCAN] Successfully recorded scan`);
      } catch (error) {
        console.error(`[SCAN] Error recording scan:`, error);
      }
    }

    console.log(`[SCAN] Comprehensive scan completed for ${token_address} on ${chainConfig.name}, overall score: ${overallScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        token_address,
        chain_id: normalizedChainId,
        overall_score: overallScore,
        data_sources: {
          security: apiData.securityData ? 'GoPlus API' : 'unavailable',
          market: apiData.marketData ? 'GeckoTerminal API' : 'unavailable',
          metadata: apiData.metadataData ? 'Etherscan API' : 'unavailable'
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
