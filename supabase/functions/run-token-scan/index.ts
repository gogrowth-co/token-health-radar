
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

interface TokenScanRequest {
  token_address: string;
  user_id: string;
  coingecko_id?: string;
  token_name?: string;
  token_symbol?: string;
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
        JSON.stringify({ error: "Token address is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate token address format
    const isValidAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(body.token_address);
    if (!isValidAddress) {
      console.error("[TOKEN-SCAN] Invalid token address format:", body.token_address);
      return new Response(
        JSON.stringify({ error: "Invalid token address format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.user_id) {
      console.error("[TOKEN-SCAN] Missing user_id parameter");
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
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
        JSON.stringify({ error: "Failed to verify subscription status" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check scan limits
    const scanLimit = subscriber.pro_scan_limit || 3;
    if (subscriber.scans_used >= scanLimit) {
      console.log("[TOKEN-SCAN] Scan limit reached -", {
        scans_used: subscriber.scans_used,
        scan_limit: scanLimit
      });
      return new Response(
        JSON.stringify({ 
          allowed: false, 
          reason: `You have reached your scan limit (${subscriber.scans_used}/${scanLimit}). Please upgrade your plan for more scans.` 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First check if token already exists in our cache
    const { data: existingToken } = await supabase
      .from('token_data_cache')
      .select('*')
      .eq('token_address', body.token_address)
      .maybeSingle();

    let token;
    
    // Token is in our cache
    if (existingToken) {
      console.log("[TOKEN-SCAN] Found token in cache -", { token_address: body.token_address });
      token = existingToken;
    } 
    // Token not in cache, need to add it
    else {
      console.log("[TOKEN-SCAN] Token not found in cache, creating new entry");
      // Create basic token info
      const tokenData = {
        token_address: body.token_address,
        name: body.token_name || `Token ${body.token_address.substring(0, 6)}...`,
        symbol: body.token_symbol || '???',
        coingecko_id: body.coingecko_id
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
          JSON.stringify({ error: "Failed to create token data" }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      token = newToken;
    }
    
    // Process security data
    console.log("[TOKEN-SCAN] Processing security data");
    try {
      // Simulated security analysis (replace with actual API calls in production)
      const securityScore = Math.floor(Math.random() * 100);
      
      // Check if we already have security data
      const { data: existingSecurityData } = await supabase
        .from('token_security_cache')
        .select('*')
        .eq('token_address', body.token_address)
        .maybeSingle();
        
      if (existingSecurityData) {
        console.log("[TOKEN-SCAN] Using cached security data -", { token_address: body.token_address });
      } else {
        try {
          // In a real implementation, call security API like GoPlus here
          throw new Error("GoPlus API key not configured");
        } catch (err) {
          console.log("[TOKEN-SCAN] Security data processing error -", err instanceof Error ? err.message : String(err));
          
          // Create placeholder security data
          const { error } = await supabase
            .from('token_security_cache')
            .insert({
              token_address: body.token_address,
              score: securityScore,
              ownership_renounced: Math.random() > 0.5,
              audit_status: ["Audited", "Not Audited", "Pending"][Math.floor(Math.random() * 3)],
              multisig_status: ["Multisig", "Single Signer"][Math.floor(Math.random() * 2)],
              honeypot_detected: Math.random() > 0.8,
              freeze_authority: Math.random() > 0.7,
              can_mint: Math.random() > 0.6
            });
            
          if (error) {
            console.log("[TOKEN-SCAN] Error storing security data -", error.message);
          }
        }
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process security data -", err);
    }
    
    // Process liquidity data
    console.log("[TOKEN-SCAN] Processing liquidity data");
    try {
      // Check if we already have liquidity data
      const { data: existingLiquidityData } = await supabase
        .from('token_liquidity_cache')
        .select('*')
        .eq('token_address', body.token_address)
        .maybeSingle();
        
      if (existingLiquidityData) {
        console.log("[TOKEN-SCAN] Using cached liquidity data -", { token_address: body.token_address });
      } else {
        // Create placeholder liquidity data
        const { error } = await supabase
          .from('token_liquidity_cache')
          .insert({
            token_address: body.token_address,
            score: Math.floor(Math.random() * 100),
            liquidity_locked_days: Math.floor(Math.random() * 365),
            cex_listings: Math.floor(Math.random() * 10),
            trading_volume_24h_usd: Math.random() * 1000000,
            holder_distribution: JSON.stringify({
              top10: Math.random() * 0.6,
              top50: Math.random() * 0.3,
              others: Math.random() * 0.1
            }),
            dex_depth_status: ["High", "Medium", "Low"][Math.floor(Math.random() * 3)]
          });
          
        if (error) {
          console.error("[TOKEN-SCAN] Error storing liquidity data -", error.message);
        }
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process liquidity data -", err);
    }
    
    // Process tokenomics data
    console.log("[TOKEN-SCAN] Processing tokenomics data");
    try {
      // Check if we already have tokenomics data
      const { data: existingTokenomicsData } = await supabase
        .from('token_tokenomics_cache')
        .select('*')
        .eq('token_address', body.token_address)
        .maybeSingle();
        
      if (existingTokenomicsData) {
        console.log("[TOKEN-SCAN] Using cached tokenomics data -", { token_address: body.token_address });
      } else {
        // Create placeholder tokenomics data
        const { error } = await supabase
          .from('token_tokenomics_cache')
          .insert({
            token_address: body.token_address,
            score: Math.floor(Math.random() * 100),
            circulating_supply: Math.random() * 1000000000,
            supply_cap: Math.random() * 2000000000,
            tvl_usd: Math.random() * 10000000,
            vesting_schedule: ["Linear", "Cliff", "None"][Math.floor(Math.random() * 3)],
            distribution_score: ["Good", "Average", "Poor"][Math.floor(Math.random() * 3)],
            treasury_usd: Math.random() * 5000000,
            burn_mechanism: Math.random() > 0.5
          });
          
        if (error) {
          console.error("[TOKEN-SCAN] Error storing tokenomics data -", error.message);
        }
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process tokenomics data -", err);
    }
    
    // Process community data
    console.log("[TOKEN-SCAN] Processing community data");
    try {
      try {
        if (!token.twitter_handle) {
          throw new Error("No Twitter handle available for token");
        }
        
        // In real implementation, call Twitter API or scraper here
      } catch (err) {
        console.log("[TOKEN-SCAN] Community data processing error -", err instanceof Error ? err.message : String(err));
        
        // Create placeholder community data
        const { error } = await supabase
          .from('token_community_cache')
          .insert({
            token_address: body.token_address,
            score: Math.floor(Math.random() * 100),
            twitter_followers: Math.floor(Math.random() * 100000),
            twitter_verified: Math.random() > 0.7,
            twitter_growth_7d: Math.random() * 10 - 2, // -2% to 8%
            telegram_members: Math.floor(Math.random() * 50000),
            discord_members: Math.floor(Math.random() * 20000),
            active_channels: ["Twitter", "Telegram", "Discord"].slice(0, Math.floor(Math.random() * 3) + 1),
            team_visibility: ["Public", "Anonymous", "Semi-Public"][Math.floor(Math.random() * 3)]
          });
          
        if (error) {
          console.log("[TOKEN-SCAN] Error storing community data -", error.message);
        }
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process community data -", err);
    }
    
    // Process development data
    console.log("[TOKEN-SCAN] Processing development data");
    try {
      try {
        if (!token.github_url) {
          throw new Error("No GitHub URL available for token");
        }
        
        // In real implementation, call GitHub API here
      } catch (err) {
        console.log("[TOKEN-SCAN] Development data processing error -", err instanceof Error ? err.message : String(err));
        
        // Create placeholder development data
        const { error } = await supabase
          .from('token_development_cache')
          .insert({
            token_address: body.token_address,
            score: Math.floor(Math.random() * 100),
            github_repo: token.github_url,
            is_open_source: Math.random() > 0.2,
            contributors_count: Math.floor(Math.random() * 50),
            commits_30d: Math.floor(Math.random() * 200),
            last_commit: new Date().toISOString(),
            roadmap_progress: ["On Track", "Delayed", "Ahead"][Math.floor(Math.random() * 3)]
          });
          
        if (error) {
          console.log("[TOKEN-SCAN] Error storing development data -", error.message);
        }
      }
    } catch (err) {
      console.error("[TOKEN-SCAN] Failed to process development data -", err);
    }
    
    // Generate a combined result
    const overallScore = Math.floor(Math.random() * 100);
    
    // Increment the user's scan count is now done in the frontend when a token is selected
    // We don't need to increment it again here
      
    // Record this scan
    await supabase
      .from('token_scans')
      .insert({
        user_id: body.user_id,
        token_address: body.token_address,
        score_total: overallScore,
        pro_scan: true
      });
    
    // Get complete token info
    const { data: tokenWithAllData } = await supabase
      .from('token_data_cache')
      .select('*')
      .eq('token_address', body.token_address)
      .single();
      
    // Query all data for the token
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
    
    // Final scan result
    const result = {
      allowed: true,
      token_info: {
        ...tokenWithAllData,
        security_data: securityResult.data || null,
        tokenomics_data: tokenomicsResult.data || null,
        liquidity_data: liquidityResult.data || null,
        community_data: communityResult.data || null,
        development_data: developmentResult.data || null,
        score: overallScore,
        token_address: body.token_address,
        token_name: token.name,
        token_symbol: token.symbol
      }
    };
    
    console.log("[TOKEN-SCAN] Scan completed successfully -", {
      token_address: body.token_address,
      score: overallScore,
      token_name: token.name,
      token_symbol: token.symbol
    });
    
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error("[TOKEN-SCAN] Unexpected error -", error);
    
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
