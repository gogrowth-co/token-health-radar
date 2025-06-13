
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Validate token address format
function isValidTokenAddress(address: string): boolean {
  if (!address) return false;
  const isStandardAddress = /^0x[a-fA-F0-9]{40}$/.test(address)
  const isNativeAddress = address === '0x0000000000000000000000000000000000000000' || 
                          address === '0x0000000000000000000000000000000000001010'
  return isStandardAddress || isNativeAddress
}

// Enhanced timeout with better error handling
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 5000) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`)
    }
    throw error
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    console.log('🔄 Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  const correlationId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  console.log(`🚀 [${correlationId}] Starting token scan function`)

  try {
    // Parse request body with error handling
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log(`📋 [${correlationId}] Raw request body:`, bodyText);
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error(`❌ [${correlationId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: 'Invalid JSON in request body',
          correlation_id: correlationId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`📋 [${correlationId}] Parsed request body:`, JSON.stringify(requestBody));

    const { token_address, user_id, coingecko_id } = requestBody;
    
    // Enhanced validation
    if (!token_address) {
      console.error(`❌ [${correlationId}] Missing token_address`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: 'Missing token address parameter',
          correlation_id: correlationId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!coingecko_id) {
      console.error(`❌ [${correlationId}] Missing coingecko_id`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: 'Missing CoinGecko ID parameter',
          correlation_id: correlationId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!user_id) {
      console.error(`❌ [${correlationId}] Missing user_id`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: 'Missing user ID parameter',
          correlation_id: correlationId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!isValidTokenAddress(token_address)) {
      console.error(`❌ [${correlationId}] Invalid token address format: ${token_address}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: 'Invalid token address format',
          correlation_id: correlationId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`✅ [${correlationId}] All parameters validated successfully`);

    // Initialize Supabase client with error handling
    console.log(`🔍 [${correlationId}] Initializing Supabase client...`);
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error(`❌ [${correlationId}] Missing Supabase environment variables`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: 'Server configuration error',
          correlation_id: correlationId
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey);
    console.log(`✅ [${correlationId}] Supabase client initialized`);

    // Check user's scan status
    console.log(`👤 [${correlationId}] Fetching user scan data...`);
    let userData = { plan: 'free', scans_used: 0, pro_scan_limit: 3 };
    
    try {
      const { data, error } = await supabaseClient
        .from('subscribers')
        .select('plan, scans_used, pro_scan_limit')
        .eq('id', user_id)
        .maybeSingle();
      
      if (error) {
        console.warn(`⚠️ [${correlationId}] Supabase query error:`, error);
      } else if (data) {
        userData = data;
      }
      
      console.log(`👤 [${correlationId}] User data:`, JSON.stringify(userData));
    } catch (error) {
      console.warn(`⚠️ [${correlationId}] Failed to fetch user data, using defaults:`, error.message);
    }

    const isWithinProLimit = (userData?.scans_used || 0) < (userData?.pro_scan_limit || 3);
    const isProScan = userData?.plan === 'pro' || isWithinProLimit;
    
    console.log(`📊 [${correlationId}] User scan status: scans_used=${userData?.scans_used}, limit=${userData?.pro_scan_limit}, is_pro=${isProScan}`);

    // Initialize scan results
    console.log(`🔧 [${correlationId}] Initializing scan results...`);
    let scanResults = {
      token_address,
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      overall_score: 30,
      security_score: 30,
      tokenomics_score: 35,
      liquidity_score: 30,
      development_score: 25,
      community_score: 15,
      logo_url: '',
      price_usd: 0,
      market_cap_usd: 0,
      tvl_usd: null
    };

    // Fetch CoinGecko data
    console.log(`🦎 [${correlationId}] Fetching CoinGecko data for ID: ${coingecko_id}...`);
    let coinGeckoData = null;
    
    try {
      const coinGeckoApiKey = Deno.env.get('COINGECKO_API_KEY');
      let coinGeckoUrl = `https://api.coingecko.com/api/v3/coins/${coingecko_id}`;
      
      if (coinGeckoApiKey) {
        coinGeckoUrl += `?x_cg_demo_api_key=${coinGeckoApiKey}`;
        console.log(`🔑 [${correlationId}] Using authenticated CoinGecko request`);
      } else {
        console.log(`🔓 [${correlationId}] Using public CoinGecko API`);
      }

      console.log(`📞 [${correlationId}] Calling CoinGecko API: ${coinGeckoUrl}`);
      const coinGeckoResponse = await fetchWithTimeout(coinGeckoUrl, {}, 8000);
      
      console.log(`📞 [${correlationId}] CoinGecko response status: ${coinGeckoResponse.status}`);
      
      if (coinGeckoResponse.ok) {
        coinGeckoData = await coinGeckoResponse.json();
        console.log(`🦎 [${correlationId}] CoinGecko data received for: ${coinGeckoData?.name || 'Unknown'}`);
        
        // Update scan results with CoinGecko data
        if (coinGeckoData) {
          scanResults.name = coinGeckoData.name || 'Unknown Token';
          scanResults.symbol = coinGeckoData.symbol?.toUpperCase() || 'UNKNOWN';
          scanResults.logo_url = coinGeckoData.image?.large || '';
          scanResults.price_usd = coinGeckoData.market_data?.current_price?.usd || 0;
          scanResults.market_cap_usd = coinGeckoData.market_data?.market_cap?.usd || 0;
          
          // Boost scores for well-known tokens
          if (coinGeckoData.market_data?.market_cap_rank && coinGeckoData.market_data.market_cap_rank <= 100) {
            scanResults.overall_score = 75;
            scanResults.security_score = 80;
            scanResults.tokenomics_score = 75;
            scanResults.liquidity_score = 85;
            scanResults.development_score = 70;
            scanResults.community_score = 65;
          }
          
          console.log(`✅ [${correlationId}] CoinGecko data processed: ${scanResults.name} (${scanResults.symbol}) - $${scanResults.price_usd}`);
        }
      } else {
        throw new Error(`CoinGecko API error: ${coinGeckoResponse.status}`);
      }
    } catch (error) {
      console.error(`❌ [${correlationId}] CoinGecko fetch failed:`, error.message);
      scanResults.name = `Token ${token_address.substring(0, 8)}...`;
      scanResults.overall_score = 20;
      console.log(`🔄 [${correlationId}] Using fallback token data`);
    }

    // Try to get security data from GoPlus
    console.log(`🔒 [${correlationId}] Fetching security data...`);
    try {
      const goPlusUrl = `https://api.gopluslabs.io/api/v1/token_security/1/${token_address}`;
      console.log(`📞 [${correlationId}] Calling GoPlus API: ${goPlusUrl}`);
      
      const response = await fetchWithTimeout(goPlusUrl, {}, 5000);
      
      if (response.ok) {
        const data = await response.json();
        const tokenData = data.result?.[token_address.toLowerCase()];
        
        if (tokenData) {
          const securityScore = calculateSecurityScore(tokenData);
          scanResults.security_score = securityScore;
          console.log(`🔒 [${correlationId}] Security score calculated: ${securityScore}`);
        } else {
          console.log(`⚠️ [${correlationId}] No security data found in GoPlus response`);
        }
      } else {
        console.log(`⚠️ [${correlationId}] GoPlus API returned ${response.status}`);
      }
    } catch (error) {
      console.log(`⚠️ [${correlationId}] Security API failed, using fallback: ${error.message}`);
    }

    // Update/create token cache
    console.log(`💾 [${correlationId}] Updating token cache...`);
    try {
      const tokenCacheData = {
        token_address,
        name: scanResults.name,
        symbol: scanResults.symbol,
        description: coinGeckoData?.description?.en || '',
        website_url: coinGeckoData?.links?.homepage?.[0] || '',
        twitter_handle: coinGeckoData?.links?.twitter_screen_name || '',
        github_url: coinGeckoData?.links?.repos_url?.github?.[0] || '',
        logo_url: scanResults.logo_url,
        current_price_usd: scanResults.price_usd,
        price_change_24h: coinGeckoData?.market_data?.price_change_percentage_24h || 0,
        market_cap_usd: scanResults.market_cap_usd,
        total_value_locked_usd: coinGeckoData?.market_data?.total_value_locked?.usd?.toString() || null,
        coingecko_id: coinGeckoData?.id || coingecko_id,
      };

      const { error: cacheError } = await supabaseClient
        .from('token_data_cache')
        .upsert(tokenCacheData, { onConflict: 'token_address' });
      
      if (cacheError) {
        console.warn(`⚠️ [${correlationId}] Token cache update failed:`, cacheError.message);
      } else {
        console.log(`✅ [${correlationId}] Token cache updated successfully`);
      }
    } catch (error) {
      console.warn(`⚠️ [${correlationId}] Failed to update token cache:`, error.message);
    }

    // Calculate final overall score
    console.log(`🔢 [${correlationId}] Calculating overall score...`);
    const scores = [
      { score: scanResults.security_score, weight: 0.3 },
      { score: scanResults.tokenomics_score, weight: 0.25 },
      { score: scanResults.liquidity_score, weight: 0.25 },
      { score: scanResults.development_score, weight: 0.2 }
    ];
    
    const weightedSum = scores.reduce((acc, curr) => acc + (curr.score * curr.weight), 0);
    scanResults.overall_score = Math.round(weightedSum);
    
    console.log(`🔢 [${correlationId}] Overall score calculated: ${scanResults.overall_score}`);

    // Record the scan
    console.log(`📝 [${correlationId}] Recording scan in database...`);
    try {
      const { error: scanError } = await supabaseClient
        .from('token_scans')
        .insert({
          user_id,
          token_address,
          score_total: scanResults.overall_score,
          pro_scan: isProScan
        });

      if (scanError) {
        console.warn(`⚠️ [${correlationId}] Failed to record scan:`, scanError.message);
      } else {
        console.log(`✅ [${correlationId}] Scan recorded successfully`);
      }

      // Update scan count for free users
      if (userData?.plan !== 'pro' && isWithinProLimit) {
        const { error: updateError } = await supabaseClient
          .from('subscribers')
          .update({
            scans_used: (userData?.scans_used || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', user_id);
        
        if (updateError) {
          console.warn(`⚠️ [${correlationId}] Failed to update scan count:`, updateError.message);
        } else {
          console.log(`✅ [${correlationId}] Scan count updated for user: ${user_id}`);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [${correlationId}] Database operation failed:`, error.message);
    }

    console.log(`🎉 [${correlationId}] Scan completed successfully with overall score: ${scanResults.overall_score}`);

    const response = {
      success: true,
      token_address,
      overall_score: scanResults.overall_score,
      token_info: {
        token_address,
        name: scanResults.name,
        symbol: scanResults.symbol,
        logo_url: scanResults.logo_url,
        score: scanResults.overall_score,
        price_usd: scanResults.price_usd,
        market_cap_usd: scanResults.market_cap_usd,
        security_score: scanResults.security_score,
        tokenomics_score: scanResults.tokenomics_score,
        liquidity_score: scanResults.liquidity_score,
        development_score: scanResults.development_score,
        community_score: scanResults.community_score
      },
      correlation_id: correlationId
    };

    console.log(`📤 [${correlationId}] Sending successful response`);

    return new Response(
      JSON.stringify(response),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error(`💥 [${correlationId}] Fatal error:`, error);
    console.error(`💥 [${correlationId}] Error stack:`, error.stack);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error_message: 'Internal server error during token scan', 
        details: error.message,
        correlation_id: correlationId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

// Helper function to calculate security score
function calculateSecurityScore(tokenData: any): number {
  let score = 40; // Base score
  
  try {
    if (tokenData.owner_address === "0x0000000000000000000000000000000000000000") score += 25;
    if (tokenData.honeypot_with_same_creator !== "1" && tokenData.is_honeypot !== "1") score += 20;
    if (tokenData.can_take_back_ownership !== "1") score += 10;
    if (tokenData.is_mintable !== "1") score += 15;
    if (tokenData.trust_list) score += 20;
    
    return Math.min(score, 100);
  } catch (error) {
    console.warn('Error calculating security score:', error);
    return 30; // Fallback score
  }
}
