
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  token_address: string;
  user_id?: string;
  is_anonymous?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { token_address, user_id, is_anonymous = false }: ScanRequest = await req.json();
    
    console.log(`Starting scan for token: ${token_address}, user: ${user_id || 'anonymous'}, is_anonymous: ${is_anonymous}`);

    if (!token_address) {
      throw new Error('Token address is required');
    }

    // Validate token address format
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(token_address);
    const isSpecialAddress = token_address === '0x0000000000000000000000000000000000000000' || 
                             token_address === '0x0000000000000000000000000000000000001010';
    
    if (!isValidAddress && !isSpecialAddress) {
      throw new Error('Invalid token address format');
    }

    // Track scan attempt for both authenticated and anonymous users
    if (is_anonymous && !user_id) {
      console.log('Recording anonymous scan attempt');
      const { error: attemptError } = await supabase
        .from('anonymous_scan_attempts')
        .insert({
          token_address,
          attempted_at: new Date().toISOString(),
          success: false // Will update to true on success
        });
      
      if (attemptError) {
        console.error('Failed to record anonymous scan attempt:', attemptError);
      }
    }

    // Get or create token data cache entry
    const { data: existingToken, error: fetchError } = await supabase
      .from('token_data_cache')
      .select('*')
      .eq('token_address', token_address)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error fetching token data:', fetchError);
      throw new Error('Failed to fetch token data');
    }

    // Record the scan in token_scans table
    const scanData = {
      token_address,
      user_id: user_id || null,
      is_anonymous: is_anonymous || !user_id,
      pro_scan: true, // All scans are considered "pro" for now
      scanned_at: new Date().toISOString(),
      score_total: 0 // Will be calculated after analysis
    };

    const { data: scanRecord, error: scanError } = await supabase
      .from('token_scans')
      .insert(scanData)
      .select()
      .single();

    if (scanError) {
      console.error('Error recording scan:', scanError);
      throw new Error('Failed to record scan');
    }

    console.log('Scan recorded successfully:', scanRecord.id);

    // Mock analysis data for now - in production this would call external APIs
    const mockSecurityData = {
      token_address,
      ownership_renounced: Math.random() > 0.5,
      can_mint: Math.random() > 0.7,
      honeypot_detected: Math.random() > 0.9,
      freeze_authority: Math.random() > 0.8,
      audit_status: Math.random() > 0.6 ? 'audited' : 'unaudited',
      multisig_status: Math.random() > 0.5 ? 'active' : 'none',
      score: Math.floor(Math.random() * 100),
      updated_at: new Date().toISOString()
    };

    const mockLiquidityData = {
      token_address,
      trading_volume_24h_usd: Math.random() * 1000000,
      liquidity_locked_days: Math.floor(Math.random() * 365),
      holder_distribution: Math.random() > 0.5 ? 'fair' : 'concentrated',
      dex_depth_status: Math.random() > 0.5 ? 'good' : 'low',
      cex_listings: Math.floor(Math.random() * 10),
      score: Math.floor(Math.random() * 100),
      updated_at: new Date().toISOString()
    };

    const mockTokenomicsData = {
      token_address,
      circulating_supply: Math.random() * 1000000000,
      supply_cap: Math.random() * 10000000000,
      burn_mechanism: Math.random() > 0.5,
      vesting_schedule: Math.random() > 0.5 ? 'active' : 'none',
      distribution_score: Math.random() > 0.5 ? 'fair' : 'concerning',
      treasury_usd: Math.random() * 10000000,
      tvl_usd: Math.random() * 50000000,
      score: Math.floor(Math.random() * 100),
      updated_at: new Date().toISOString()
    };

    const mockCommunityData = {
      token_address,
      twitter_followers: Math.floor(Math.random() * 100000),
      twitter_verified: Math.random() > 0.7,
      twitter_growth_7d: Math.random() * 20 - 10,
      discord_members: Math.floor(Math.random() * 50000),
      telegram_members: Math.floor(Math.random() * 30000),
      team_visibility: Math.random() > 0.5 ? 'public' : 'anonymous',
      active_channels: ['twitter', 'discord'],
      score: Math.floor(Math.random() * 100),
      updated_at: new Date().toISOString()
    };

    const mockDevelopmentData = {
      token_address,
      github_repo: 'https://github.com/example/token',
      is_open_source: Math.random() > 0.5,
      commits_30d: Math.floor(Math.random() * 100),
      contributors_count: Math.floor(Math.random() * 20),
      last_commit: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      roadmap_progress: Math.random() > 0.5 ? 'on-track' : 'delayed',
      score: Math.floor(Math.random() * 100),
      updated_at: new Date().toISOString()
    };

    // Insert/update all analysis data
    const { error: securityError } = await supabase
      .from('token_security_cache')
      .upsert(mockSecurityData);

    const { error: liquidityError } = await supabase
      .from('token_liquidity_cache')
      .upsert(mockLiquidityData);

    const { error: tokenomicsError } = await supabase
      .from('token_tokenomics_cache')
      .upsert(mockTokenomicsData);

    const { error: communityError } = await supabase
      .from('token_community_cache')
      .upsert(mockCommunityData);

    const { error: developmentError } = await supabase
      .from('token_development_cache')
      .upsert(mockDevelopmentData);

    if (securityError || liquidityError || tokenomicsError || communityError || developmentError) {
      console.error('Error inserting analysis data:', {
        securityError,
        liquidityError,
        tokenomicsError,
        communityError,
        developmentError
      });
      throw new Error('Failed to save analysis data');
    }

    // Calculate overall score
    const overallScore = Math.round((
      mockSecurityData.score +
      mockLiquidityData.score +
      mockTokenomicsData.score +
      mockCommunityData.score +
      mockDevelopmentData.score
    ) / 5);

    // Update scan record with final score
    const { error: updateError } = await supabase
      .from('token_scans')
      .update({ score_total: overallScore })
      .eq('id', scanRecord.id);

    if (updateError) {
      console.error('Error updating scan score:', updateError);
    }

    // Update scan usage for authenticated users
    if (user_id && !is_anonymous) {
      console.log('Updating scan count for user:', user_id);
      const { error: updateUsageError } = await supabase
        .from('subscribers')
        .update({ 
          scans_used: supabase.sql`scans_used + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', user_id);

      if (updateUsageError) {
        console.error('Error updating scan usage:', updateUsageError);
      }
    }

    // Mark anonymous scan as successful
    if (is_anonymous && !user_id) {
      await supabase
        .from('anonymous_scan_attempts')
        .update({ success: true })
        .eq('token_address', token_address)
        .order('attempted_at', { ascending: false })
        .limit(1);
    }

    console.log('Scan completed successfully with overall score:', overallScore);

    return new Response(
      JSON.stringify({
        success: true,
        scan_id: scanRecord.id,
        overall_score: overallScore,
        message: 'Token scan completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Scan failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
