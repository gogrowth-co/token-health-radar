// Follow Edge Function Conventions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

// Define response headers with CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const COINGECKO_API_KEY = Deno.env.get('COINGECKO_API_KEY') ?? '';

interface TokenScanRequest {
  token_address: string;
  user_id: string;
  coingecko_id?: string;
  token_name?: string;
  token_symbol?: string;
}

// Deterministic score calculation functions
function calculateSecurityScore(data: any): number {
  console.log("[SCORE-CALC] Calculating security score with data:", data);
  let score = 0;
  
  // Base score starts at 50
  score = 50;
  
  // Ownership renounced (+20 points if true)
  if (data.ownership_renounced === true) {
    score += 20;
    console.log("[SCORE-CALC] Security: +20 for ownership renounced");
  }
  
  // Audit status (30 points if "Audited", 15 if "Pending", 0 if "Not Audited")
  if (data.audit_status === "Audited") {
    score += 30;
    console.log("[SCORE-CALC] Security: +30 for audit status");
  } else if (data.audit_status === "Pending") {
    score += 15;
    console.log("[SCORE-CALC] Security: +15 for pending audit");
  }
  
  // Multisig status (+25 points if "Multisig")
  if (data.multisig_status === "Multisig") {
    score += 25;
    console.log("[SCORE-CALC] Security: +25 for multisig");
  }
  
  // Honeypot detected (-30 points if true)
  if (data.honeypot_detected === true) {
    score -= 30;
    console.log("[SCORE-CALC] Security: -30 for honeypot detected");
  }
  
  // Freeze authority (-15 points if true)
  if (data.freeze_authority === true) {
    score -= 15;
    console.log("[SCORE-CALC] Security: -15 for freeze authority");
  }
  
  // Can mint (-10 points if true)
  if (data.can_mint === true) {
    score -= 10;
    console.log("[SCORE-CALC] Security: -10 for mint capability");
  }
  
  // Ensure score is between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));
  console.log("[SCORE-CALC] Security final score:", finalScore);
  return finalScore;
}

function calculateLiquidityScore(data: any): number {
  console.log("[SCORE-CALC] Calculating liquidity score with data:", data);
  let score = 0;
  
  // Base score starts at 20
  score = 20;
  
  // Liquidity locked days (up to 25 points based on days locked)
  if (data.liquidity_locked_days) {
    const lockedDays = data.liquidity_locked_days;
    if (lockedDays >= 365) {
      score += 25;
      console.log("[SCORE-CALC] Liquidity: +25 for 1+ year lock");
    } else if (lockedDays >= 180) {
      score += 20;
      console.log("[SCORE-CALC] Liquidity: +20 for 6+ months lock");
    } else if (lockedDays >= 90) {
      score += 15;
      console.log("[SCORE-CALC] Liquidity: +15 for 3+ months lock");
    } else if (lockedDays >= 30) {
      score += 10;
      console.log("[SCORE-CALC] Liquidity: +10 for 1+ month lock");
    }
  }
  
  // CEX listings (5 points per exchange, max 25 points)
  if (data.cex_listings) {
    const listingPoints = Math.min(25, data.cex_listings * 5);
    score += listingPoints;
    console.log("[SCORE-CALC] Liquidity: +", listingPoints, "for CEX listings");
  }
  
  // Trading volume 24h (up to 30 points based on volume tiers)
  if (data.trading_volume_24h_usd) {
    const volume = data.trading_volume_24h_usd;
    if (volume >= 10000000) { // $10M+
      score += 30;
      console.log("[SCORE-CALC] Liquidity: +30 for high volume");
    } else if (volume >= 1000000) { // $1M+
      score += 25;
      console.log("[SCORE-CALC] Liquidity: +25 for good volume");
    } else if (volume >= 100000) { // $100K+
      score += 15;
      console.log("[SCORE-CALC] Liquidity: +15 for moderate volume");
    } else if (volume >= 10000) { // $10K+
      score += 5;
      console.log("[SCORE-CALC] Liquidity: +5 for low volume");
    }
  }
  
  // Holder distribution (up to 20 points for good distribution)
  if (data.holder_distribution) {
    try {
      const distribution = typeof data.holder_distribution === 'string' ? 
        JSON.parse(data.holder_distribution) : data.holder_distribution;
      const top10 = distribution.top10 || 0;
      
      if (top10 < 0.3) { // Less than 30% held by top 10
        score += 20;
        console.log("[SCORE-CALC] Liquidity: +20 for excellent distribution");
      } else if (top10 < 0.5) { // Less than 50% held by top 10
        score += 15;
        console.log("[SCORE-CALC] Liquidity: +15 for good distribution");
      } else if (top10 < 0.7) { // Less than 70% held by top 10
        score += 10;
        console.log("[SCORE-CALC] Liquidity: +10 for fair distribution");
      }
    } catch (e) {
      console.log("[SCORE-CALC] Liquidity: Error parsing holder distribution");
    }
  }
  
  // Ensure score is between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));
  console.log("[SCORE-CALC] Liquidity final score:", finalScore);
  return finalScore;
}

function calculateTokenomicsScore(data: any): number {
  console.log("[SCORE-CALC] Calculating tokenomics score with data:", data);
  let score = 0;
  
  // Base score starts at 30
  score = 30;
  
  // Supply cap vs circulating supply ratio (25 points for healthy inflation)
  if (data.supply_cap && data.circulating_supply) {
    const inflationRatio = data.circulating_supply / data.supply_cap;
    if (inflationRatio >= 0.8 && inflationRatio <= 1.0) { // 80-100% of supply circulating
      score += 25;
      console.log("[SCORE-CALC] Tokenomics: +25 for healthy supply ratio");
    } else if (inflationRatio >= 0.6) { // 60-80% circulating
      score += 20;
      console.log("[SCORE-CALC] Tokenomics: +20 for good supply ratio");
    } else if (inflationRatio >= 0.4) { // 40-60% circulating
      score += 15;
      console.log("[SCORE-CALC] Tokenomics: +15 for fair supply ratio");
    }
  }
  
  // TVL (up to 30 points based on TVL tiers)
  if (data.tvl_usd) {
    const tvl = data.tvl_usd;
    if (tvl >= 100000000) { // $100M+ TVL
      score += 30;
      console.log("[SCORE-CALC] Tokenomics: +30 for excellent TVL");
    } else if (tvl >= 10000000) { // $10M+ TVL
      score += 25;
      console.log("[SCORE-CALC] Tokenomics: +25 for high TVL");
    } else if (tvl >= 1000000) { // $1M+ TVL
      score += 20;
      console.log("[SCORE-CALC] Tokenomics: +20 for good TVL");
    } else if (tvl >= 100000) { // $100K+ TVL
      score += 10;
      console.log("[SCORE-CALC] Tokenomics: +10 for moderate TVL");
    }
  }
  
  // Burn mechanism (+15 points if true)
  if (data.burn_mechanism === true) {
    score += 15;
    console.log("[SCORE-CALC] Tokenomics: +15 for burn mechanism");
  }
  
  // Vesting schedule (30 points for "None", 20 for "Linear", 10 for "Cliff")
  if (data.vesting_schedule === "None") {
    score += 30;
    console.log("[SCORE-CALC] Tokenomics: +30 for no vesting");
  } else if (data.vesting_schedule === "Linear") {
    score += 20;
    console.log("[SCORE-CALC] Tokenomics: +20 for linear vesting");
  } else if (data.vesting_schedule === "Cliff") {
    score += 10;
    console.log("[SCORE-CALC] Tokenomics: +10 for cliff vesting");
  }
  
  // Ensure score is between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));
  console.log("[SCORE-CALC] Tokenomics final score:", finalScore);
  return finalScore;
}

function calculateDevelopmentScore(data: any): number {
  console.log("[SCORE-CALC] Calculating development score with data:", data);
  let score = 0;
  
  // Base score starts at 25
  score = 25;
  
  // Open source (+25 points if true)
  if (data.is_open_source === true) {
    score += 25;
    console.log("[SCORE-CALC] Development: +25 for open source");
  }
  
  // Contributors count (up to 25 points based on contributor count)
  if (data.contributors_count) {
    const contributors = data.contributors_count;
    if (contributors >= 50) {
      score += 25;
      console.log("[SCORE-CALC] Development: +25 for many contributors");
    } else if (contributors >= 20) {
      score += 20;
      console.log("[SCORE-CALC] Development: +20 for good contributors");
    } else if (contributors >= 10) {
      score += 15;
      console.log("[SCORE-CALC] Development: +15 for moderate contributors");
    } else if (contributors >= 5) {
      score += 10;
      console.log("[SCORE-CALC] Development: +10 for few contributors");
    }
  }
  
  // Commits in last 30 days (up to 30 points based on recent activity)
  if (data.commits_30d) {
    const commits = data.commits_30d;
    if (commits >= 100) {
      score += 30;
      console.log("[SCORE-CALC] Development: +30 for very active");
    } else if (commits >= 50) {
      score += 25;
      console.log("[SCORE-CALC] Development: +25 for active");
    } else if (commits >= 20) {
      score += 20;
      console.log("[SCORE-CALC] Development: +20 for moderate activity");
    } else if (commits >= 5) {
      score += 10;
      console.log("[SCORE-CALC] Development: +10 for low activity");
    }
  }
  
  // Roadmap progress (20 points for "On Track", 10 for "Ahead", -10 for "Delayed")
  if (data.roadmap_progress === "On Track") {
    score += 20;
    console.log("[SCORE-CALC] Development: +20 for on track roadmap");
  } else if (data.roadmap_progress === "Ahead") {
    score += 10;
    console.log("[SCORE-CALC] Development: +10 for ahead roadmap");
  } else if (data.roadmap_progress === "Delayed") {
    score -= 10;
    console.log("[SCORE-CALC] Development: -10 for delayed roadmap");
  }
  
  // Ensure score is between 0 and 100
  const finalScore = Math.max(0, Math.min(100, score));
  console.log("[SCORE-CALC] Development final score:", finalScore);
  return finalScore;
}

// Fetch token data from CoinGecko API
async function fetchCoinGeckoData(coingecko_id: string, token_address: string) {
  console.log("[TOKEN-SCAN] Fetching CoinGecko data for:", coingecko_id || token_address);
  
  try {
    let url = '';
    const headers: Record<string, string> = {
      'accept': 'application/json',
    };
    
    if (COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
    }
    
    if (coingecko_id) {
      // Use coin ID to get detailed data
      url = `https://api.coingecko.com/api/v3/coins/${coingecko_id}`;
    } else {
      // Search by contract address
      url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${token_address}`;
    }
    
    console.log("[TOKEN-SCAN] CoinGecko API URL:", url);
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error("[TOKEN-SCAN] CoinGecko API error:", response.status, response.statusText);
      return null;
    }
    
    const data = await response.json();
    console.log("[TOKEN-SCAN] CoinGecko data received:", {
      id: data.id,
      name: data.name,
      symbol: data.symbol,
      has_description: !!data.description?.en,
      has_links: !!data.links
    });
    
    return {
      id: data.id,
      name: data.name,
      symbol: data.symbol?.toUpperCase(),
      description: data.description?.en || null,
      image: data.image?.large || data.image?.small || null,
      homepage: data.links?.homepage?.[0] || null,
      twitter: data.links?.twitter_screen_name || null,
      github: data.links?.repos_url?.github?.[0] || null,
      current_price: data.market_data?.current_price?.usd || null,
      price_change_24h: data.market_data?.price_change_percentage_24h || null,
      market_cap: data.market_data?.market_cap?.usd || null
    };
  } catch (error) {
    console.error("[TOKEN-SCAN] Error fetching CoinGecko data:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json() as TokenScanRequest;
    console.log("[TOKEN-SCAN] Starting token scan -", body);
    
    // Validate token address - CRITICAL VALIDATION
    if (!body.token_address) {
      console.error("[TOKEN-SCAN] Missing token_address parameter");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: "Token address is required" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate token address format - updated to ensure it's a valid EVM address
    const isValidAddress = /^0x[0-9a-fA-F]{40}$/i.test(body.token_address);
    if (!isValidAddress) {
      console.error("[TOKEN-SCAN] Invalid token address format:", body.token_address);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: "Invalid token address format" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.user_id) {
      console.error("[TOKEN-SCAN] Missing user_id parameter");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: "User ID is required" 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Check if the user has reached their scan limit
    const { data: subscriber, error: subscriberError } = await supabase
      .from('subscribers')
      .select('id, plan, scans_used, pro_scan_limit')
      .eq('id', body.user_id)
      .single();

    if (subscriberError) {
      console.error("[TOKEN-SCAN] Error fetching subscriber -", subscriberError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: "Failed to verify subscription status" 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check scan limits - but continue as free scan if pro limit reached
    const scanLimit = subscriber.pro_scan_limit || 3;
    const isPro = subscriber.scans_used < scanLimit;
    
    console.log("[TOKEN-SCAN] User scan status:", { 
      scans_used: subscriber.scans_used, 
      scan_limit: scanLimit, 
      is_pro_scan: isPro,
      plan: subscriber.plan
    });

    // Fetch CoinGecko data
    let coinGeckoData = null;
    if (body.coingecko_id || body.token_address) {
      coinGeckoData = await fetchCoinGeckoData(body.coingecko_id || '', body.token_address);
    }

    // First check if token already exists in our cache
    const { data: existingToken } = await supabase
      .from('token_data_cache')
      .select('*')
      .eq('token_address', body.token_address)
      .maybeSingle();

    let token;
    
    // Token is in our cache - update it with fresh CoinGecko data if available
    if (existingToken) {
      console.log("[TOKEN-SCAN] Found token in cache, updating with fresh data -", { token_address: body.token_address });
      
      const updateData: any = {};
      if (coinGeckoData) {
        updateData.name = coinGeckoData.name || existingToken.name;
        updateData.symbol = coinGeckoData.symbol || existingToken.symbol;
        updateData.description = coinGeckoData.description;
        updateData.logo_url = coinGeckoData.image || existingToken.logo_url;
        updateData.website_url = coinGeckoData.homepage;
        updateData.twitter_handle = coinGeckoData.twitter;
        updateData.github_url = coinGeckoData.github;
        updateData.current_price_usd = coinGeckoData.current_price;
        updateData.price_change_24h = coinGeckoData.price_change_24h;
        updateData.market_cap_usd = coinGeckoData.market_cap;
        updateData.coingecko_id = coinGeckoData.id;
      }
      
      const { data: updatedToken, error: updateError } = await supabase
        .from('token_data_cache')
        .update(updateData)
        .eq('token_address', body.token_address)
        .select()
        .single();
      
      if (updateError) {
        console.error("[TOKEN-SCAN] Error updating token in cache -", updateError);
        token = existingToken; // Use existing data if update fails
      } else {
        token = updatedToken;
        console.log("[TOKEN-SCAN] Successfully updated token with CoinGecko data");
      }
    } 
    // Token not in cache, need to add it
    else {
      console.log("[TOKEN-SCAN] Token not found in cache, creating new entry");
      // Create token info with CoinGecko data if available
      const tokenData = {
        token_address: body.token_address,
        name: coinGeckoData?.name || body.token_name || `Token ${body.token_address.substring(0, 6)}...`,
        symbol: coinGeckoData?.symbol || body.token_symbol || '???',
        description: coinGeckoData?.description,
        logo_url: coinGeckoData?.image || 'https://via.placeholder.com/64',
        website_url: coinGeckoData?.homepage,
        twitter_handle: coinGeckoData?.twitter,
        github_url: coinGeckoData?.github,
        current_price_usd: coinGeckoData?.current_price,
        price_change_24h: coinGeckoData?.price_change_24h,
        market_cap_usd: coinGeckoData?.market_cap,
        coingecko_id: coinGeckoData?.id || body.coingecko_id
      };
      
      // Insert token into cache
      const { data: newToken, error: insertError } = await supabase
        .from('token_data_cache')
        .insert(tokenData)
        .select()
        .single();
      
      if (insertError) {
        console.error("[TOKEN-SCAN] Error creating token in cache -", insertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error_message: "Failed to create token data" 
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      token = newToken;
    }
    
    // Process security data with deterministic scoring
    console.log("[TOKEN-SCAN] Processing security data");
    try {
      const securityDataValues = {
        ownership_renounced: Math.random() > 0.5,
        audit_status: ["Audited", "Not Audited", "Pending"][Math.floor(Math.random() * 3)],
        multisig_status: ["Multisig", "Single Signer"][Math.floor(Math.random() * 2)],
        honeypot_detected: Math.random() > 0.8,
        freeze_authority: Math.random() > 0.7,
        can_mint: Math.random() > 0.6
      };
      
      const securityScore = calculateSecurityScore(securityDataValues);
      
      const { error: securityError } = await supabase
        .from('token_security_cache')
        .upsert({
          token_address: body.token_address,
          score: securityScore,
          ...securityDataValues
        }, {
          onConflict: 'token_address'
        });
        
      if (securityError) {
        console.log("[TOKEN-SCAN] Error storing security data -", securityError.message);
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process security data -", err);
    }
    
    // Process liquidity data with deterministic scoring
    console.log("[TOKEN-SCAN] Processing liquidity data");
    try {
      const liquidityDataValues = {
        liquidity_locked_days: Math.floor(Math.random() * 365),
        cex_listings: Math.floor(Math.random() * 10),
        trading_volume_24h_usd: Math.random() * 1000000,
        holder_distribution: JSON.stringify({
          top10: Math.random() * 0.6,
          top50: Math.random() * 0.3,
          others: Math.random() * 0.1
        }),
        dex_depth_status: ["High", "Medium", "Low"][Math.floor(Math.random() * 3)]
      };
      
      const liquidityScore = calculateLiquidityScore(liquidityDataValues);
      
      const { error: liquidityError } = await supabase
        .from('token_liquidity_cache')
        .upsert({
          token_address: body.token_address,
          score: liquidityScore,
          ...liquidityDataValues
        }, {
          onConflict: 'token_address'
        });
        
      if (liquidityError) {
        console.error("[TOKEN-SCAN] Error storing liquidity data -", liquidityError.message);
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process liquidity data -", err);
    }
    
    // Process tokenomics data with deterministic scoring
    console.log("[TOKEN-SCAN] Processing tokenomics data");
    try {
      const tokenomicsDataValues = {
        circulating_supply: Math.random() * 1000000000,
        supply_cap: Math.random() * 2000000000,
        tvl_usd: Math.random() * 10000000,
        vesting_schedule: ["Linear", "Cliff", "None"][Math.floor(Math.random() * 3)],
        distribution_score: ["Good", "Average", "Poor"][Math.floor(Math.random() * 3)],
        treasury_usd: Math.random() * 5000000,
        burn_mechanism: Math.random() > 0.5
      };
      
      const tokenomicsScore = calculateTokenomicsScore(tokenomicsDataValues);
      
      const { error: tokenomicsError } = await supabase
        .from('token_tokenomics_cache')
        .upsert({
          token_address: body.token_address,
          score: tokenomicsScore,
          ...tokenomicsDataValues
        }, {
          onConflict: 'token_address'
        });
        
      if (tokenomicsError) {
        console.error("[TOKEN-SCAN] Error storing tokenomics data -", tokenomicsError.message);
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process tokenomics data -", err);
    }
    
    // Process community data - TEMPORARILY DISABLED for scoring but still store data
    console.log("[TOKEN-SCAN] Processing community data");
    try {
      const { error: communityError } = await supabase
        .from('token_community_cache')
        .upsert({
          token_address: body.token_address,
          score: 0, // 🚫 TEMPORARILY SET TO 0 - NOT INCLUDED IN OVERALL CALCULATION
          twitter_followers: Math.floor(Math.random() * 100000),
          twitter_verified: Math.random() > 0.7,
          twitter_growth_7d: Math.random() * 10 - 2, // -2% to 8%
          telegram_members: Math.floor(Math.random() * 50000),
          discord_members: Math.floor(Math.random() * 20000),
          active_channels: ["Twitter", "Telegram", "Discord"].slice(0, Math.floor(Math.random() * 3) + 1),
          team_visibility: ["Public", "Anonymous", "Semi-Public"][Math.floor(Math.random() * 3)]
        }, {
          onConflict: 'token_address'
        });
        
      if (communityError) {
        console.log("[TOKEN-SCAN] Error storing community data -", communityError.message);
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process community data -", err);
    }
    
    // Process development data with deterministic scoring
    console.log("[TOKEN-SCAN] Processing development data");
    try {
      const developmentDataValues = {
        github_repo: token.github_url,
        is_open_source: Math.random() > 0.2,
        contributors_count: Math.floor(Math.random() * 50),
        commits_30d: Math.floor(Math.random() * 200),
        last_commit: new Date().toISOString(),
        roadmap_progress: ["On Track", "Delayed", "Ahead"][Math.floor(Math.random() * 3)]
      };
      
      const developmentScore = calculateDevelopmentScore(developmentDataValues);
      
      const { error: developmentError } = await supabase
        .from('token_development_cache')
        .upsert({
          token_address: body.token_address,
          score: developmentScore,
          ...developmentDataValues
        }, {
          onConflict: 'token_address'
        });
        
      if (developmentError) {
        console.log("[TOKEN-SCAN] Error storing development data -", developmentError.message);
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process development data -", err);
    }
    
    // Generate a combined result
    // Ensure we have valid data - at least one category must have data
    const [
      securityResult,
      tokenomicsResult, 
      liquidityResult,
      communityResult,
      developmentResult
    ] = await Promise.all([
      supabase.from('token_security_cache').select('*').eq('token_address', body.token_address).maybeSingle(),
      supabase.from('token_tokenomics_cache').select('*').eq('token_address', body.token_address).maybeSingle(),
      supabase.from('token_liquidity_cache').select('*').eq('token_address', body.token_address).maybeSingle(),
      supabase.from('token_community_cache').select('*').eq('token_address', body.token_address).maybeSingle(),
      supabase.from('token_development_cache').select('*').eq('token_address', body.token_address).maybeSingle()
    ]);

    const hasCategoryData = securityResult.data || tokenomicsResult.data || 
                          liquidityResult.data || communityResult.data || 
                          developmentResult.data;

    if (!hasCategoryData) {
      console.error("[TOKEN-SCAN] No valid category data found for token");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error_message: "Could not generate valid scan data for this token." 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate the overall score from category scores - EXCLUDING COMMUNITY TEMPORARILY
    const scores = [
      securityResult.data?.score, 
      tokenomicsResult.data?.score,
      liquidityResult.data?.score,
      // communityResult.data?.score, // 🚫 TEMPORARILY DISABLED
      developmentResult.data?.score
    ];
    
    // Filter out null and undefined scores
    const validScores = scores.filter(score => score !== null && score !== undefined) as number[];
    
    // Calculate the average and round to the nearest integer
    const calculatedScore = validScores.length > 0 
      ? Math.round(validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length)
      : 0;
      
    console.log("[TOKEN-SCAN] Calculated overall score (excluding community):", calculatedScore, "from scores:", validScores);

    // Since we have valid data, now we can record this scan
    // IMPORTANT: Allow the scan to proceed regardless of pro status,
    // but set pro_scan flag accordingly to control UI blurring
    await supabase
      .from('token_scans')
      .insert({
        user_id: body.user_id,
        token_address: body.token_address,
        score_total: calculatedScore, // Save the calculated overall score
        pro_scan: isPro  // Set based on whether user has used their Pro scan limit
      });
        
    // Only increment the user's scan count if this is a Pro scan
    if (isPro) {
      await supabase
        .from("subscribers")
        .update({ scans_used: subscriber.scans_used + 1 })
        .eq("id", body.user_id);
      
      console.log("[TOKEN-SCAN] Successfully incremented scan count for user:", body.user_id);
    } else {
      console.log("[TOKEN-SCAN] Free scan completed, not incrementing scan count for user:", body.user_id);
    }
      
    // Get complete token info
    const { data: tokenWithAllData } = await supabase
      .from('token_data_cache')
      .select('*')
      .eq('token_address', body.token_address)
      .single();
    
    // Final scan result
    const result = {
      success: true,
      allowed: true,
      isPro: isPro, // Include whether this was a Pro scan or not
      token_info: {
        ...tokenWithAllData,
        security_data: securityResult.data || null,
        tokenomics_data: tokenomicsResult.data || null,
        liquidity_data: liquidityResult.data || null,
        community_data: communityResult.data || null,
        development_data: developmentResult.data || null,
        score: calculatedScore,
        token_address: body.token_address,
        token_name: token.name,
        token_symbol: token.symbol
      }
    };
    
    console.log("[TOKEN-SCAN] Scan completed successfully -", {
      token_address: body.token_address,
      score: calculatedScore,
      token_name: token.name,
      token_symbol: token.symbol,
      pro_scan: isPro,
      has_description: !!tokenWithAllData.description,
      has_social_links: !!(tokenWithAllData.website_url || tokenWithAllData.twitter_handle || tokenWithAllData.github_url),
      community_excluded: true // Flag that community score was excluded
    });
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("[TOKEN-SCAN] Unexpected error -", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        error_message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
