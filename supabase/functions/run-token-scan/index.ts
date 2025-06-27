
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Chain-specific API configurations
const CHAIN_CONFIGS = {
  '0x1': { 
    name: 'Ethereum',
    geckoId: 'ethereum',
    rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/'
  },
  '0xa4b1': { 
    name: 'Arbitrum',
    geckoId: 'arbitrum-one',
    rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/'
  },
  '0x89': { 
    name: 'Polygon',
    geckoId: 'polygon-pos',
    rpcUrl: 'https://polygon-mainnet.g.alchemy.com/v2/'
  },
  '0x38': { 
    name: 'BSC',
    geckoId: 'binance-smart-chain',
    rpcUrl: 'https://bsc-dataseed.binance.org/'
  },
  '0x2105': { 
    name: 'Base',
    geckoId: 'base',
    rpcUrl: 'https://mainnet.base.org'
  }
};

// Fetch token data from CoinGecko using contract address and chain
async function fetchTokenDataByAddress(tokenAddress: string, chainId: string) {
  try {
    console.log(`[SCAN] Fetching token data for address: ${tokenAddress} on chain: ${chainId}`);
    
    const chainConfig = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS];
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chainId}`);
    }

    // For Ethereum, use direct contract lookup
    if (chainId === '0x1') {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/ethereum/contract/${tokenAddress.toLowerCase()}`,
        {
          headers: {
            'Accept': 'application/json',
            'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY') || ''
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`[SCAN] CoinGecko data found for ${tokenAddress} on Ethereum`);
        return {
          source: 'coingecko',
          data: {
            name: data.name,
            symbol: data.symbol?.toUpperCase(),
            description: data.description?.en || '',
            logo_url: data.image?.large || data.image?.small || '',
            website_url: data.links?.homepage?.[0] || '',
            twitter_handle: data.links?.twitter_screen_name || '',
            github_url: data.links?.repos_url?.github?.[0] || '',
            current_price_usd: data.market_data?.current_price?.usd || 0,
            price_change_24h: data.market_data?.price_change_percentage_24h || 0,
            market_cap_usd: data.market_data?.market_cap?.usd || 0
          }
        };
      }
    }

    // For other chains, try to find token by platforms
    const searchResponse = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${tokenAddress}`,
      {
        headers: {
          'Accept': 'application/json',
          'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY') || ''
        }
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      console.log(`[SCAN] Search results for ${tokenAddress}:`, searchData.coins?.length || 0);
      
      // Find token that matches the address on this chain
      const matchingToken = searchData.coins?.find((coin: any) => {
        if (!coin.platforms) return false;
        
        // Check if any platform address matches our token address
        return Object.values(coin.platforms).some((addr: any) => 
          typeof addr === 'string' && addr.toLowerCase() === tokenAddress.toLowerCase()
        );
      });

      if (matchingToken) {
        console.log(`[SCAN] Found matching token: ${matchingToken.name}`);
        
        // Get detailed data
        const detailResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/${matchingToken.id}`,
          {
            headers: {
              'Accept': 'application/json',
              'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY') || ''
            }
          }
        );

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          return {
            source: 'coingecko',
            data: {
              name: detailData.name,
              symbol: detailData.symbol?.toUpperCase(),
              description: detailData.description?.en || '',
              logo_url: detailData.image?.large || detailData.image?.small || '',
              website_url: detailData.links?.homepage?.[0] || '',
              twitter_handle: detailData.links?.twitter_screen_name || '',
              github_url: detailData.links?.repos_url?.github?.[0] || '',
              current_price_usd: detailData.market_data?.current_price?.usd || 0,
              price_change_24h: detailData.market_data?.price_change_percentage_24h || 0,
              market_cap_usd: detailData.market_data?.market_cap?.usd || 0,
              coingecko_id: matchingToken.id
            }
          };
        }
      }
    }

    console.log(`[SCAN] No CoinGecko data found for ${tokenAddress} on ${chainConfig.name}`);
    return null;
  } catch (error) {
    console.error(`[SCAN] Error fetching token data:`, error);
    return null;
  }
}

// Generate default token data when API data is not available
function generateDefaultTokenData(tokenAddress: string, chainId: string) {
  const chainConfig = CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS];
  return {
    name: `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
    symbol: 'UNKNOWN',
    description: `Token on ${chainConfig?.name || 'Unknown Chain'}`,
    logo_url: '',
    website_url: '',
    twitter_handle: '',
    github_url: '',
    current_price_usd: 0,
    price_change_24h: 0,
    market_cap_usd: 0
  };
}

// Generate default category scores for basic scans
function generateDefaultScores() {
  return {
    security: { score: 50 },
    tokenomics: { score: 50 },
    liquidity: { score: 50 },
    community: { score: 50 },
    development: { score: 50 }
  };
}

// Calculate overall score from category scores
function calculateOverallScore(scores: any) {
  const validScores = Object.values(scores)
    .map((category: any) => category.score)
    .filter(score => typeof score === 'number' && score > 0);
  
  return validScores.length > 0 
    ? Math.round(validScores.reduce((acc: number, curr: number) => acc + curr, 0) / validScores.length)
    : 50;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token_address, chain_id, user_id } = await req.json();

    console.log(`[SCAN] Starting scan for token: ${token_address}, chain: ${chain_id} (${CHAIN_CONFIGS[chain_id as keyof typeof CHAIN_CONFIGS]?.name}), user: ${user_id}`);

    if (!token_address || !chain_id) {
      throw new Error('Token address and chain ID are required');
    }

    // Normalize chain ID
    const normalizedChainId = chain_id.toLowerCase().startsWith('0x') ? chain_id : `0x${parseInt(chain_id).toString(16)}`;
    
    // Check if user has pro access (simplified for now)
    const proScan = false; // Will be enhanced later with proper pro check
    console.log(`[SCAN] Pro scan permitted: ${proScan}`);

    // Fetch token data from APIs
    const tokenApiData = await fetchTokenDataByAddress(token_address, normalizedChainId);
    
    // Use API data or generate defaults
    const tokenData = tokenApiData?.data || generateDefaultTokenData(token_address, normalizedChainId);
    
    console.log(`[SCAN] Token data source: ${tokenApiData?.source || 'default'}`);
    console.log(`[SCAN] Token data collected for: ${tokenData.name} (${tokenData.symbol})`);

    // Generate category scores (basic scan for now)
    const categoryScores = generateDefaultScores();
    const overallScore = calculateOverallScore(categoryScores);

    console.log(`[SCAN] Calculated overall score: ${overallScore}`);

    // Save token data to database
    console.log(`[SCAN] Saving token data to database: ${token_address}, chain: ${normalizedChainId}`);
    
    // Check if token already exists
    const { data: existingToken } = await supabase
      .from('token_data_cache')
      .select('token_address')
      .eq('token_address', token_address)
      .eq('chain_id', normalizedChainId)
      .maybeSingle();

    if (existingToken) {
      // Update existing token
      await supabase
        .from('token_data_cache')
        .update({
          name: tokenData.name,
          symbol: tokenData.symbol,
          description: tokenData.description,
          logo_url: tokenData.logo_url,
          website_url: tokenData.website_url,
          twitter_handle: tokenData.twitter_handle,
          github_url: tokenData.github_url,
          current_price_usd: tokenData.current_price_usd,
          price_change_24h: tokenData.price_change_24h,
          market_cap_usd: tokenData.market_cap_usd,
          coingecko_id: tokenData.coingecko_id || null
        })
        .eq('token_address', token_address)
        .eq('chain_id', normalizedChainId);
      
      console.log(`[SCAN] Updated existing token data for: ${token_address} on ${CHAIN_CONFIGS[normalizedChainId as keyof typeof CHAIN_CONFIGS]?.name}`);
    } else {
      // Insert new token
      await supabase
        .from('token_data_cache')
        .insert({
          token_address,
          chain_id: normalizedChainId,
          name: tokenData.name,
          symbol: tokenData.symbol,
          description: tokenData.description,
          logo_url: tokenData.logo_url,
          website_url: tokenData.website_url,
          twitter_handle: tokenData.twitter_handle,
          github_url: tokenData.github_url,
          current_price_usd: tokenData.current_price_usd,
          price_change_24h: tokenData.price_change_24h,
          market_cap_usd: tokenData.market_cap_usd,
          coingecko_id: tokenData.coingecko_id || null
        });
      
      console.log(`[SCAN] Inserted new token data for: ${token_address} on ${CHAIN_CONFIGS[normalizedChainId as keyof typeof CHAIN_CONFIGS]?.name}`);
    }

    // Save category data to cache tables
    const cacheOperations = [
      {
        table: 'token_security_cache',
        data: {
          token_address,
          chain_id: normalizedChainId,
          score: categoryScores.security.score,
          ownership_renounced: null,
          can_mint: null,
          honeypot_detected: null,
          freeze_authority: null,
          audit_status: null,
          multisig_status: null
        }
      },
      {
        table: 'token_tokenomics_cache',
        data: {
          token_address,
          chain_id: normalizedChainId,
          score: categoryScores.tokenomics.score,
          supply_cap: null,
          circulating_supply: null,
          burn_mechanism: null,
          vesting_schedule: null,
          distribution_score: null,
          tvl_usd: null,
          treasury_usd: null
        }
      },
      {
        table: 'token_liquidity_cache',
        data: {
          token_address,
          chain_id: normalizedChainId,
          score: categoryScores.liquidity.score,
          trading_volume_24h_usd: null,
          liquidity_locked_days: null,
          dex_depth_status: null,
          holder_distribution: null,
          cex_listings: null
        }
      },
      {
        table: 'token_community_cache',
        data: {
          token_address,
          chain_id: normalizedChainId,
          score: categoryScores.community.score,
          twitter_followers: null,
          twitter_verified: null,
          twitter_growth_7d: null,
          discord_members: null,
          telegram_members: null,
          active_channels: null,
          team_visibility: null
        }
      },
      {
        table: 'token_development_cache',
        data: {
          token_address,
          chain_id: normalizedChainId,
          score: categoryScores.development.score,
          github_repo: tokenData.github_url,
          contributors_count: null,
          commits_30d: null,
          last_commit: null,
          is_open_source: !!tokenData.github_url,
          roadmap_progress: null
        }
      }
    ];

    // Execute all cache operations
    for (const operation of cacheOperations) {
      try {
        // Check if record exists
        const { data: existing } = await supabase
          .from(operation.table)
          .select('token_address')
          .eq('token_address', token_address)
          .eq('chain_id', normalizedChainId)
          .maybeSingle();

        if (existing) {
          // Update existing record
          await supabase
            .from(operation.table)
            .update(operation.data)
            .eq('token_address', token_address)
            .eq('chain_id', normalizedChainId);
        } else {
          // Insert new record
          await supabase
            .from(operation.table)
            .insert(operation.data);
        }
        
        console.log(`[SCAN] Successfully saved ${operation.table.replace('token_', '').replace('_cache', '')} data`);
      } catch (error) {
        console.error(`[SCAN] Error saving ${operation.table}:`, error);
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

    console.log(`[SCAN] Scan completed successfully for ${token_address} on ${CHAIN_CONFIGS[normalizedChainId as keyof typeof CHAIN_CONFIGS]?.name}, overall score: ${overallScore}, pro_scan: ${proScan}`);

    return new Response(
      JSON.stringify({
        success: true,
        token_address,
        chain_id: normalizedChainId,
        overall_score: overallScore,
        data_source: tokenApiData?.source || 'default'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[SCAN] Error during token scan:', error);
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
