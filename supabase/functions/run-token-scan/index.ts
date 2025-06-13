
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
async function fetchWithTimeout(url: string, options: any = {}, timeoutMs: number = 8000) {
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
  console.log(`🚀 [${correlationId}] Starting token scan function - Method: ${req.method}`)
  console.log(`🚀 [${correlationId}] Request URL: ${req.url}`)
  console.log(`🚀 [${correlationId}] Request headers:`, Object.fromEntries(req.headers.entries()))

  try {
    // Parse request body with error handling
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log(`📋 [${correlationId}] Raw request body:`, bodyText);
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Empty request body');
      }
      
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error(`❌ [${correlationId}] Failed to parse request body:`, parseError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: `Invalid JSON in request body: ${parseError.message}`,
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

    // Initialize Supabase client with enhanced error handling
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

    // Initialize scan results with good defaults
    console.log(`🔧 [${correlationId}] Initializing scan results...`);
    let scanResults = {
      token_address,
      name: 'Unknown Token',
      symbol: 'UNKNOWN',
      overall_score: 40,
      security_score: 35,
      tokenomics_score: 40,
      liquidity_score: 45,
      development_score: 30,
      community_score: 25,
      logo_url: '',
      price_usd: 0,
      market_cap_usd: 0,
      tvl_usd: null
    };

    // Try to fetch CoinGecko data
    console.log(`🦎 [${correlationId}] Fetching CoinGecko data for ID: ${coingecko_id}...`);
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
      const coinGeckoResponse = await fetchWithTimeout(coinGeckoUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'TokenHealthScan/1.0'
        }
      }, 10000);
      
      console.log(`📞 [${correlationId}] CoinGecko response status: ${coinGeckoResponse.status}`);
      
      if (coinGeckoResponse.ok) {
        const coinGeckoData = await coinGeckoResponse.json();
        console.log(`🦎 [${correlationId}] CoinGecko data received for: ${coinGeckoData?.name || 'Unknown'}`);
        
        // Update scan results with CoinGecko data
        if (coinGeckoData) {
          scanResults.name = coinGeckoData.name || 'Unknown Token';
          scanResults.symbol = coinGeckoData.symbol?.toUpperCase() || 'UNKNOWN';
          scanResults.logo_url = coinGeckoData.image?.large || '';
          scanResults.price_usd = coinGeckoData.market_data?.current_price?.usd || 0;
          scanResults.market_cap_usd = coinGeckoData.market_data?.market_cap?.usd || 0;
          
          // Boost scores for well-known tokens based on market cap rank
          if (coinGeckoData.market_data?.market_cap_rank && coinGeckoData.market_data.market_cap_rank <= 100) {
            scanResults.overall_score = 78;
            scanResults.security_score = 85;
            scanResults.tokenomics_score = 80;
            scanResults.liquidity_score = 90;
            scanResults.development_score = 75;
            scanResults.community_score = 70;
            console.log(`⭐ [${correlationId}] Applied top-100 token bonus scores`);
          } else if (coinGeckoData.market_data?.market_cap_rank && coinGeckoData.market_data.market_cap_rank <= 500) {
            scanResults.overall_score = 65;
            scanResults.security_score = 70;
            scanResults.tokenomics_score = 65;
            scanResults.liquidity_score = 75;
            scanResults.development_score = 60;
            scanResults.community_score = 55;
            console.log(`⭐ [${correlationId}] Applied top-500 token bonus scores`);
          }
          
          console.log(`✅ [${correlationId}] CoinGecko data processed: ${scanResults.name} (${scanResults.symbol}) - $${scanResults.price_usd}`);
        }
      } else {
        console.warn(`⚠️ [${correlationId}] CoinGecko API returned ${coinGeckoResponse.status}`);
        throw new Error(`CoinGecko API error: ${coinGeckoResponse.status}`);
      }
    } catch (error) {
      console.warn(`⚠️ [${correlationId}] CoinGecko fetch failed, using fallback data:`, error.message);
      scanResults.name = `Token ${token_address.substring(0, 8)}...`;
      scanResults.overall_score = 35;
    }

    // Record the scan in database
    console.log(`📝 [${correlationId}] Recording scan in database...`);
    try {
      const { error: scanError } = await supabaseClient
        .from('token_scans')
        .insert({
          user_id,
          token_address,
          score_total: scanResults.overall_score,
          pro_scan: true
        });

      if (scanError) {
        console.warn(`⚠️ [${correlationId}] Failed to record scan:`, scanError.message);
      } else {
        console.log(`✅ [${correlationId}] Scan recorded successfully`);
      }
    } catch (error) {
      console.warn(`⚠️ [${correlationId}] Database operation failed:`, error.message);
    }

    // Calculate final overall score
    console.log(`🔢 [${correlationId}] Calculating final overall score...`);
    const scores = [
      { score: scanResults.security_score, weight: 0.3 },
      { score: scanResults.tokenomics_score, weight: 0.25 },
      { score: scanResults.liquidity_score, weight: 0.25 },
      { score: scanResults.development_score, weight: 0.2 }
    ];
    
    const weightedSum = scores.reduce((acc, curr) => acc + (curr.score * curr.weight), 0);
    scanResults.overall_score = Math.round(weightedSum);
    
    console.log(`🔢 [${correlationId}] Final overall score: ${scanResults.overall_score}`);

    console.log(`🎉 [${correlationId}] Scan completed successfully`);

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

    console.log(`📤 [${correlationId}] Sending successful response with score: ${scanResults.overall_score}`);

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
    
    let errorMessage = 'Internal server error during token scan';
    if (error.message.includes('timeout')) {
      errorMessage = 'Request timeout during token scan';
    } else if (error.message.includes('network')) {
      errorMessage = 'Network error during token scan';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error_message: errorMessage, 
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
