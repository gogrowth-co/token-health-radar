import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  normalizeChainId, 
  getChainConfigByMoralisId 
} from '../_shared/chainConfig.ts'
import {
  fetchGoPlusSecurity,
  fetchWebacySecurity,
  fetchMoralisMetadata,
  fetchMoralisPriceData,
  fetchMoralisTokenStats,
  fetchMoralisTokenPairs,
  fetchMoralisTokenOwners,
  fetchGitHubRepoData,
  calculateSecurityScore,
  calculateLiquidityScore,
  calculateTokenomicsScore,
  calculateDevelopmentScore
} from '../_shared/apiClients.ts'
import { fetchDeFiLlamaTVL } from '../_shared/defillama.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Fetch CEX count from CoinGecko API
async function fetchCoinGeckoCexCount(tokenAddress: string, chainId: string): Promise<number> {
  console.log(`[CEX] Fetching CEX count for ${tokenAddress} on chain ${chainId}`);
  
  const chainConfig = getChainConfigByMoralisId(chainId);
  if (!chainConfig || !chainConfig.gecko) {
    console.log(`[CEX] No CoinGecko platform mapping for chain: ${chainId}`);
    return 0;
  }

  // Map chain to CoinGecko platform
  const platformMap: Record<string, string> = {
    'eth': 'ethereum',
    'bsc': 'binance-smart-chain', 
    'polygon_pos': 'polygon-pos',
    'arbitrum': 'arbitrum-one',
    'optimism': 'optimistic-ethereum',
    'base': 'base'
  };
  
  const coinGeckoPlatform = platformMap[chainConfig.gecko] || chainConfig.gecko;
  console.log(`[CEX] Using CoinGecko platform: ${coinGeckoPlatform}`);

  const cexAllowlist = [
    "Binance", "Coinbase", "OKX", "KuCoin", "Gate.io", "Kraken", 
    "Bitfinex", "MEXC", "Bitget", "Huobi", "Bybit", "Crypto.com"
  ];

  try {
    // Step 1: Get CoinGecko ID for the token
    console.log(`[CEX] Step 1: Getting CoinGecko ID...`);
    const idResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoPlatform}/contract/${tokenAddress.toLowerCase()}`,
      {
        headers: {
          'accept': 'application/json',
          ...(Deno.env.get('COINGECKO_API_KEY') && {
            'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY')
          })
        }
      }
    );

    if (!idResponse.ok) {
      if (idResponse.status === 404) {
        console.log(`[CEX] Token not found on CoinGecko`);
        return 0;
      }
      throw new Error(`CoinGecko API error: ${idResponse.status}`);
    }

    const tokenData = await idResponse.json();
    const coinGeckoId = tokenData.id;
    console.log(`[CEX] Found CoinGecko ID: ${coinGeckoId}`);

    // Step 2: Get token tickers/exchanges
    console.log(`[CEX] Step 2: Getting exchange listings...`);
    const tickersResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/tickers`,
      {
        headers: {
          'accept': 'application/json',
          ...(Deno.env.get('COINGECKO_API_KEY') && {
            'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY')
          })
        }
      }
    );

    if (!tickersResponse.ok) {
      throw new Error(`CoinGecko tickers API error: ${tickersResponse.status}`);
    }

    const tickersData = await tickersResponse.json();
    const tickers = tickersData.tickers || [];
    
    console.log(`[CEX] Found ${tickers.length} total tickers`);

    // Step 3: Count unique CEX exchanges
    const cexExchanges = new Set<string>();
    
    for (const ticker of tickers) {
      const marketName = ticker.market?.name;
      if (marketName && cexAllowlist.includes(marketName)) {
        cexExchanges.add(marketName);
        console.log(`[CEX] Found CEX: ${marketName}`);
      }
    }

    const cexCount = cexExchanges.size;
    console.log(`[CEX] Total unique CEX exchanges: ${cexCount}`);
    
    return cexCount;

  } catch (error) {
    console.error(`[CEX] Error fetching CEX count:`, error);
    return 0; // Default to 0 on error
  }
}

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
    
    // Add detailed API key debugging BEFORE making calls
    console.log(`[SCAN] === API KEY STATUS CHECK ===`);
    console.log(`[SCAN] WEBACY_API_KEY configured: ${!!Deno.env.get('WEBACY_API_KEY')}`);
    console.log(`[SCAN] GOPLUS_API_KEY configured: ${!!Deno.env.get('GOPLUS_API_KEY')}`);
    console.log(`[SCAN] MORALIS_API_KEY configured: ${!!Deno.env.get('MORALIS_API_KEY')}`);
    console.log(`[SCAN] COINGECKO_API_KEY configured: ${!!Deno.env.get('COINGECKO_API_KEY')}`);
    if (Deno.env.get('WEBACY_API_KEY')) {
      const key = Deno.env.get('WEBACY_API_KEY')!;
      console.log(`[SCAN] WEBACY_API_KEY length: ${key.length}, starts with: ${key.substring(0, 8)}...`);
    }
    if (Deno.env.get('GOPLUS_API_KEY')) {
      const key = Deno.env.get('GOPLUS_API_KEY')!;
      console.log(`[SCAN] GOPLUS_API_KEY length: ${key.length}, starts with: ${key.substring(0, 8)}...`);
    }
    
    // Phase 1: Core data APIs (always needed)
    const [webacySecurityData, goplusSecurityData, priceData, metadataData] = await Promise.allSettled([
      fetchWebacySecurity(tokenAddress, chainId),
      fetchGoPlusSecurity(tokenAddress, chainId),
      fetchMoralisPriceData(tokenAddress, chainId),
      fetchMoralisMetadata(tokenAddress, chainId)
    ]);

    // Phase 2: Enhanced tokenomics APIs (new features)
    console.log(`[SCAN] Fetching enhanced tokenomics data...`);
    const [statsData, pairsData, ownersData, tvlData] = await Promise.allSettled([
      fetchMoralisTokenStats(tokenAddress, chainId),
      fetchMoralisTokenPairs(tokenAddress, chainId),
      fetchMoralisTokenOwners(tokenAddress, chainId),
      fetchDeFiLlamaTVL(tokenAddress)
    ]);

    // Phase 3: CEX listings data
    console.log(`[SCAN] Fetching CEX listings data...`);
    const [cexData] = await Promise.allSettled([
      fetchCoinGeckoCexCount(tokenAddress, chainId)
    ]);

    const apiEndTime = Date.now();
    console.log(`[SCAN] API calls completed in ${apiEndTime - apiStartTime}ms`);

    // Log detailed API results for debugging
    const webacySecurity = webacySecurityData.status === 'fulfilled' ? webacySecurityData.value : null;
    const goplusSecurity = goplusSecurityData.status === 'fulfilled' ? goplusSecurityData.value : null;
    const priceDataResult = priceData.status === 'fulfilled' ? priceData.value : null;
    const metadata = metadataData.status === 'fulfilled' ? metadataData.value : null;
    
    // Enhanced tokenomics data
    const stats = statsData.status === 'fulfilled' ? statsData.value : null;
    const pairs = pairsData.status === 'fulfilled' ? pairsData.value : null;
    const owners = ownersData.status === 'fulfilled' ? ownersData.value : null;
    const tvl = tvlData.status === 'fulfilled' ? tvlData.value : null;
    
    // CEX listings data
    const cexCount = cexData.status === 'fulfilled' ? cexData.value : 0;

    // Log API failures for debugging
    if (webacySecurityData.status === 'rejected') {
      console.error(`[SCAN] Webacy API failed:`, webacySecurityData.reason);
    }
    if (goplusSecurityData.status === 'rejected') {
      console.error(`[SCAN] GoPlus API failed:`, goplusSecurityData.reason);
    }
    if (priceData.status === 'rejected') {
      console.error(`[SCAN] Moralis Price API failed:`, priceData.reason);
    }
    if (metadataData.status === 'rejected') {
      console.error(`[SCAN] Moralis Metadata API failed:`, metadataData.reason);
    }
    if (statsData.status === 'rejected') {
      console.error(`[SCAN] Moralis Stats API failed:`, statsData.reason);
    }
    if (pairsData.status === 'rejected') {
      console.error(`[SCAN] Moralis Pairs API failed:`, pairsData.reason);
    }
    if (ownersData.status === 'rejected') {
      console.error(`[SCAN] Moralis Owners API failed:`, ownersData.reason);
    }
    if (tvlData.status === 'rejected') {
      console.error(`[SCAN] DeFiLlama TVL API failed:`, tvlData.reason);
    }

    // Merge security data from both sources instead of fallback logic
    const security = {};
    if (webacySecurity) {
      Object.assign(security, webacySecurity);
    }
    if (goplusSecurity) {
      Object.assign(security, goplusSecurity);
    }

    console.log(`[SCAN] API Data Summary:`, {
      webacySecurity: webacySecurity ? 'available' : 'unavailable',
      goplusSecurity: goplusSecurity ? 'available' : 'unavailable',
      mergedSecurity: Object.keys(security).length > 0 ? 'available' : 'unavailable',
      priceData: priceDataResult ? 'available' : 'unavailable', 
      metadata: metadata ? 'available' : 'unavailable',
      enhancedTokenomics: {
        stats: stats ? 'available' : 'unavailable',
        pairs: pairs ? 'available' : 'unavailable',
        owners: owners ? 'available' : 'unavailable',
        tvl: tvl ? 'available' : 'unavailable'
      },
      totalApiTime: `${apiEndTime - apiStartTime}ms`
    });

    // Enhanced logging for debugging
    console.log(`[SCAN] === SECURITY DATA MERGE ANALYSIS ===`);
    console.log(`[SCAN] Webacy data:`, webacySecurity ? JSON.stringify(webacySecurity, null, 2) : 'null');
    console.log(`[SCAN] GoPlus data:`, goplusSecurity ? JSON.stringify(goplusSecurity, null, 2) : 'null');
    console.log(`[SCAN] Merged security data:`, JSON.stringify(security, null, 2));

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

    // Prioritize Moralis metadata and price data
    const name = metadata?.name || priceDataResult?.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
    const symbol = metadata?.symbol || priceDataResult?.symbol || 'UNKNOWN';
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
      name: metadata?.name || priceDataResult?.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
      symbol: metadata?.symbol || priceDataResult?.symbol || 'UNKNOWN',
      description: metadata?.description && metadata.description.trim() 
        ? metadata.description
        : metadata?.name 
          ? `${metadata.name} (${metadata.symbol}) is a token on ${chainConfig.name}${metadata.verified_contract ? ' with a verified contract' : ''}.`
          : `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)} on ${chainConfig.name}`,
      logo_url: metadata?.logo || metadata?.thumbnail || '',
      website_url: metadata?.links?.website || '',
      twitter_handle: metadata?.links?.twitter ? metadata.links.twitter.replace('https://twitter.com/', '').replace('@', '') : '',
      github_url: metadata?.links?.github || '',
      current_price_usd: priceDataResult?.current_price_usd || 0,
      price_change_24h: priceDataResult?.price_change_24h, // Keep null if no data
      market_cap_usd: metadata?.market_cap ? parseFloat(metadata.market_cap) : 0,
      total_supply: metadata?.total_supply || '0',
      trading_volume_24h_usd: priceDataResult?.trading_volume_24h_usd || 0
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
    console.log(`[SCAN] Raw Price Data from Moralis:`, {
      current_price_usd: priceDataResult?.current_price_usd,
      price_change_24h: priceDataResult?.price_change_24h,
      trading_volume_24h_usd: priceDataResult?.trading_volume_24h_usd,
      name: priceDataResult?.name,
      symbol: priceDataResult?.symbol
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
      priceData: priceDataResult,
      metadataData: metadata,
      statsData: stats,
      pairsData: pairs,
      ownersData: owners,
      githubData: githubData,
      tvlData: tvl,
      cexData: cexCount
    };
  } catch (error) {
    console.error(`[SCAN] Error fetching token data from APIs:`, error);
    return null;
  }
}

// Generate category data with real API integration and enhanced tokenomics
function generateCategoryData(apiData: any) {
  console.log(`[TOKENOMICS] === STARTING CATEGORY DATA GENERATION ===`);
  console.log(`[TOKENOMICS] Input API data available:`, {
    securityData: !!apiData.securityData,
    webacyData: !!apiData.webacyData,
    goplusData: !!apiData.goplusData,
    priceData: !!apiData.priceData,
    metadataData: !!apiData.metadataData,
    statsData: !!apiData.statsData,
    pairsData: !!apiData.pairsData,
    ownersData: !!apiData.ownersData,
    githubData: !!apiData.githubData,
    tvlData: !!apiData.tvlData
  });

  const securityScore = calculateSecurityScore(apiData.securityData, apiData.webacyData, apiData.goplusData);
  const liquidityScore = calculateLiquidityScore(apiData.priceData);
  
  // Enhanced tokenomics scoring with new data sources
  console.log(`[TOKENOMICS] Preparing tokenomics score calculation...`);
  console.log(`[TOKENOMICS] metadataData:`, apiData.metadataData ? {
    total_supply: apiData.metadataData.total_supply,
    verified_contract: apiData.metadataData.verified_contract,
    possible_spam: apiData.metadataData.possible_spam
  } : 'null');
  console.log(`[TOKENOMICS] priceData:`, apiData.priceData ? {
    current_price_usd: apiData.priceData.current_price_usd,
    price_change_24h: apiData.priceData.price_change_24h,
    trading_volume_24h_usd: apiData.priceData.trading_volume_24h_usd
  } : 'null');
  console.log(`[TOKENOMICS] statsData:`, apiData.statsData ? {
    total_supply: apiData.statsData.total_supply,
    holders: apiData.statsData.holders,
    transfers: apiData.statsData.transfers
  } : 'null');
  console.log(`[TOKENOMICS] ownersData:`, apiData.ownersData ? {
    gini_coefficient: apiData.ownersData.gini_coefficient,
    concentration_risk: apiData.ownersData.concentration_risk,
    total_holders: apiData.ownersData.total_holders
  } : 'null');
  console.log(`[TOKENOMICS] pairsData:`, apiData.pairsData ? {
    total_liquidity_usd: apiData.pairsData.total_liquidity_usd,
    total_pairs: apiData.pairsData.total_pairs,
    major_pairs_count: apiData.pairsData.major_pairs?.length
  } : 'null');
  
  const tokenomicsScore = calculateTokenomicsScore(
    apiData.metadataData, 
    apiData.priceData,
    apiData.statsData,
    apiData.ownersData,
    apiData.pairsData
  );
  
  console.log(`[TOKENOMICS] Calculated scores:`, {
    tokenomicsScore,
    securityScore,
    liquidityScore
  });
  
  const developmentScore = calculateDevelopmentScore(apiData.githubData);
  
  // Community score - this would need additional APIs (Twitter, Discord, etc.)
  const communityScore = 30; // Conservative score

  console.log(`[TOKENOMICS] === FINAL TOKENOMICS DATA EXTRACTION ===`);
  
  // Log raw data before processing
  const rawTokenomicsData = {
    supply_cap: apiData.statsData?.total_supply || apiData.metadataData?.total_supply || null,
    circulating_supply: apiData.statsData?.total_supply || apiData.metadataData?.total_supply || null,
    actual_circulating_supply: apiData.statsData?.total_supply || null,
    total_supply: apiData.statsData?.total_supply || apiData.metadataData?.total_supply || null,
    dex_liquidity_usd: apiData.pairsData?.total_liquidity_usd || 0,
    major_dex_pairs: apiData.pairsData?.major_pairs || [],
    distribution_score: getDistributionScoreText(apiData.ownersData?.concentration_risk),
    distribution_gini_coefficient: apiData.ownersData?.gini_coefficient || null,
    holder_concentration_risk: apiData.ownersData?.concentration_risk || 'Unknown',
    top_holders_count: apiData.ownersData?.total_holders || null,
    burn_mechanism: null,
    vesting_schedule: 'unknown',
    tvl_usd: apiData.pairsData?.total_liquidity_usd || 0,
    treasury_usd: 0,
    data_confidence_score: calculateTokenomicsConfidence(apiData),
    last_holder_analysis: apiData.ownersData ? new Date().toISOString() : null,
    score: tokenomicsScore
  };
  
  console.log(`[TOKENOMICS] Final processed tokenomics data:`, rawTokenomicsData);
  console.log(`[TOKENOMICS] Data availability summary:`, {
    hasSupplyData: !!(apiData.statsData?.total_supply || apiData.metadataData?.total_supply),
    hasLiquidityData: !!apiData.pairsData?.total_liquidity_usd,
    hasDistributionData: !!apiData.ownersData?.gini_coefficient,
    hasPairsData: !!apiData.pairsData?.major_pairs?.length,
    confidenceScore: rawTokenomicsData.data_confidence_score,
    tvlData: apiData.tvlData
  });

  console.log(`[TOKENOMICS] === DETAILED SUPPLY DATA ANALYSIS ===`);
  console.log(`[TOKENOMICS] Moralis Stats API response:`, apiData.statsData);
  console.log(`[TOKENOMICS] Moralis Metadata API response supply:`, apiData.metadataData?.total_supply);
  console.log(`[TOKENOMICS] DeFiLlama TVL response:`, apiData.tvlData);
  console.log(`[TOKENOMICS] Pairs liquidity response:`, apiData.pairsData?.total_liquidity_usd);

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
      // Enhanced supply data with better zero handling
      supply_cap: getValidSupplyValue(apiData.statsData?.total_supply) || getValidSupplyValue(apiData.metadataData?.total_supply) || null,
      circulating_supply: getValidSupplyValue(apiData.statsData?.total_supply) || getValidSupplyValue(apiData.metadataData?.total_supply) || null,
      actual_circulating_supply: getValidSupplyValue(apiData.statsData?.total_supply) || null,
      total_supply: getValidSupplyValue(apiData.statsData?.total_supply) || getValidSupplyValue(apiData.metadataData?.total_supply) || null,
      
      // Enhanced liquidity data using pairs API
      dex_liquidity_usd: apiData.pairsData?.total_liquidity_usd || 0,
      major_dex_pairs: apiData.pairsData?.major_pairs || [],
      
      // Enhanced distribution data using owners API
      distribution_score: getDistributionScoreText(apiData.ownersData?.concentration_risk),
      distribution_gini_coefficient: apiData.ownersData?.gini_coefficient || null,
      holder_concentration_risk: apiData.ownersData?.concentration_risk || 'Unknown',
      top_holders_count: apiData.ownersData?.total_holders || null,
      
      // Traditional fields (enhanced with better detection)
      burn_mechanism: null, // TODO: Add burn detection
      vesting_schedule: 'unknown',
      tvl_usd: apiData.tvlData, // Use DeFiLlama TVL data (null if not available)
      treasury_usd: null, // TODO: Add treasury detection
      
      // Data quality indicators
      data_confidence_score: calculateTokenomicsConfidence(apiData),
      last_holder_analysis: apiData.ownersData ? new Date().toISOString() : null,
      
      score: tokenomicsScore
    },
    liquidity: {
      trading_volume_24h_usd: apiData.priceData?.trading_volume_24h_usd || 0,
      liquidity_locked_days: 0,
      dex_depth_status: apiData.priceData?.trading_volume_24h_usd > 10000 ? 'good' : 'limited',
      holder_distribution: apiData.ownersData?.concentration_risk || 'unknown',
      cex_listings: apiData.cexData || 0,
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

// Helper function to convert concentration risk to distribution score text
function getDistributionScoreText(concentrationRisk: string | undefined): string {
  if (!concentrationRisk) return 'Unknown';
  
  switch (concentrationRisk) {
    case 'Low': return 'Excellent';
    case 'Medium': return 'Good';
    case 'High': return 'Fair';
    case 'Very High': return 'Poor';
    default: return 'Unknown';
  }
}

// Helper function to validate supply values and distinguish actual zero from missing data
function getValidSupplyValue(value: any): number | null {
  if (value === null || value === undefined) return null;
  
  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Return null for invalid numbers or actual zeros (which may indicate missing data)
  if (isNaN(numValue) || numValue === 0) return null;
  
  return numValue;
}

// Calculate confidence score for tokenomics data quality
function calculateTokenomicsConfidence(apiData: any): number {
  let confidence = 0;
  let totalChecks = 0;
  
  // Check data availability and quality
  if (apiData.statsData?.total_supply) {
    confidence += 20;
    totalChecks += 20;
  }
  
  if (apiData.pairsData?.total_liquidity_usd !== undefined) {
    confidence += 25;
    totalChecks += 25;
  }
  
  if (apiData.ownersData?.gini_coefficient !== undefined) {
    confidence += 30;
    totalChecks += 30;
  }
  
  if (apiData.metadataData?.verified_contract !== undefined) {
    confidence += 15;
    totalChecks += 15;
  }
  
  if (apiData.priceData?.current_price_usd !== undefined) {
    confidence += 10;
    totalChecks += 10;
  }
  
  return totalChecks > 0 ? Math.round((confidence / totalChecks) * 100) : 0;
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
  // IMMEDIATE STARTUP LOGGING
  console.log(`[SCAN-STARTUP] === EDGE FUNCTION STARTED ===`);
  console.log(`[SCAN-STARTUP] Method: ${req.method}`);
  console.log(`[SCAN-STARTUP] URL: ${req.url}`);
  console.log(`[SCAN-STARTUP] Timestamp: ${new Date().toISOString()}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[SCAN-STARTUP] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  // HEALTH CHECK ENDPOINT - Add this for testing deployment
  if (req.method === 'GET') {
    console.log(`[SCAN-STARTUP] Health check requested`);
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Edge function is deployed and running',
      timestamp: new Date().toISOString(),
      deployment_status: 'active'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Test deployment by checking environment variables immediately
  console.log(`[SCAN-STARTUP] === ENVIRONMENT CHECK ===`);
  const envCheck = {
    SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    WEBACY_API_KEY: !!Deno.env.get('WEBACY_API_KEY'),
    MORALIS_API_KEY: !!Deno.env.get('MORALIS_API_KEY'),
    GITHUB_API_KEY: !!Deno.env.get('GITHUB_API_KEY')
  };
  
  console.log(`[SCAN-STARTUP] Environment variables:`, envCheck);

  // Critical environment variables check
  if (!envCheck.SUPABASE_URL || !envCheck.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`[SCAN-STARTUP] CRITICAL: Missing Supabase configuration`);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Function misconfigured - missing Supabase credentials',
      envCheck 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`[SCAN-STARTUP] Function deployment successful - processing request`);

  try {
    // Parse request body with error handling
    console.log(`[SCAN-STARTUP] Parsing request body...`);
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error(`[SCAN-STARTUP] Failed to parse request body:`, parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { token_address, chain_id, user_id, force_refresh = true } = requestBody;
    console.log(`[SCAN-STARTUP] Request parameters:`, { token_address, chain_id, user_id, force_refresh });
    
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
          market_cap_usd: apiData.tokenData.market_cap_usd,
          circulating_supply: (() => {
            const circulatingFromMetadata = apiData.metadataData?.circulating_supply;
            const totalFromStats = apiData.statsData?.total_supply;
            const finalValue = circulatingFromMetadata || totalFromStats || null;
            console.log(`[SCAN] Circulating supply extraction:`, {
              fromMetadata: circulatingFromMetadata,
              fromStats: totalFromStats,
              finalStored: finalValue
            });
            return finalValue;
          })()
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
            treasury_usd: categoryData.tokenomics.treasury_usd,
            // Enhanced tokenomics fields
            actual_circulating_supply: categoryData.tokenomics.actual_circulating_supply,
            total_supply: categoryData.tokenomics.total_supply,
            dex_liquidity_usd: categoryData.tokenomics.dex_liquidity_usd,
            major_dex_pairs: categoryData.tokenomics.major_dex_pairs,
            distribution_gini_coefficient: categoryData.tokenomics.distribution_gini_coefficient,
            holder_concentration_risk: categoryData.tokenomics.holder_concentration_risk,
            top_holders_count: categoryData.tokenomics.top_holders_count,
            data_confidence_score: categoryData.tokenomics.data_confidence_score,
            last_holder_analysis: categoryData.tokenomics.last_holder_analysis
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

    } catch (error) {
      console.error(`[SCAN] Error during database operations:`, error);
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
          price: apiData.priceData ? 'Moralis Price API' : 'unavailable',
          metadata: apiData.metadataData ? 'Moralis Metadata API' : 'unavailable',
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
