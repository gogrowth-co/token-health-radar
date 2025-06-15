
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token_address, user_id, coingecko_id } = await req.json()
    
    if (!token_address) {
      throw new Error('Token address is required')
    }

    console.log(`[SCAN] Starting scan for token: ${token_address}, user: ${user_id || 'anonymous'}, coingecko_id: ${coingecko_id}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey)

    // Check scan access for authenticated users
    let canPerformProScan = false
    let userPlan = 'anonymous'
    let scansUsed = 0
    let scanLimit = 0

    if (user_id) {
      try {
        console.log(`[SCAN] Checking scan access for user: ${user_id}`)
        
        // Get user's current subscription data
        const { data: subscriberData, error: subscriberError } = await supabase
          .from('subscribers')
          .select('plan, scans_used, pro_scan_limit')
          .eq('id', user_id)
          .single()

        if (!subscriberError && subscriberData) {
          userPlan = subscriberData.plan || 'free'
          scansUsed = subscriberData.scans_used || 0
          scanLimit = subscriberData.pro_scan_limit || 3

          console.log(`[SCAN] User ${user_id} - Plan: ${userPlan}, Scans used: ${scansUsed}, Limit: ${scanLimit}`)

          // Determine if user can perform a Pro scan
          if (userPlan === 'pro') {
            canPerformProScan = true // Pro users always get Pro scans
          } else if (userPlan === 'free' && scansUsed < scanLimit) {
            canPerformProScan = true // Free users get limited Pro scans
          }
        } else {
          console.warn(`[SCAN] Could not retrieve subscriber data for user ${user_id}:`, subscriberError)
          // Default to free tier limits for safety
          canPerformProScan = false
        }
      } catch (error) {
        console.error(`[SCAN] Error checking user access:`, error)
        canPerformProScan = false
      }
    } else {
      // Anonymous users always get basic scans only
      console.log(`[SCAN] Anonymous user - providing basic scan only`)
      canPerformProScan = false
    }

    console.log(`[SCAN] Pro scan permitted: ${canPerformProScan}`)

    // Get API keys for better rate limits
    const coinGeckoApiKey = Deno.env.get('COINGECKO_API_KEY')
    const goPlusApiKey = Deno.env.get('GOPLUS_API_KEY')
    
    // Initialize default token data
    let tokenData = {
      token_address,
      name: `Token ${token_address.substring(0, 8)}...`,
      symbol: 'UNKNOWN',
      description: '',
      website_url: '',
      twitter_handle: '',
      github_url: '',
      logo_url: '',
      coingecko_id: coingecko_id || '',
      current_price_usd: 0,
      price_change_24h: 0,
      market_cap_usd: 0,
      total_value_locked_usd: 'N/A'
    }

    // Fetch token data from CoinGecko if ID is provided
    if (coingecko_id) {
      try {
        const cgUrl = coinGeckoApiKey 
          ? `https://api.coingecko.com/api/v3/coins/${coingecko_id}?x_cg_pro_api_key=${coinGeckoApiKey}`
          : `https://api.coingecko.com/api/v3/coins/${coingecko_id}`
        
        console.log(`[SCAN] Fetching token data from CoinGecko: ${coingecko_id}`)
        const response = await fetch(cgUrl)
        
        if (response.ok) {
          const data = await response.json()
          
          tokenData = {
            ...tokenData,
            name: data.name || tokenData.name,
            symbol: data.symbol?.toUpperCase() || tokenData.symbol,
            description: data.description?.en ? data.description.en.replace(/<[^>]*>/g, '').substring(0, 200) : '',
            website_url: data.links?.homepage?.[0] || '',
            twitter_handle: data.links?.twitter_screen_name || '',
            github_url: data.links?.repos_url?.github?.[0] || '',
            logo_url: data.image?.large || data.image?.small || '',
            coingecko_id,
            current_price_usd: data.market_data?.current_price?.usd || 0,
            price_change_24h: data.market_data?.price_change_percentage_24h || 0,
            market_cap_usd: data.market_data?.market_cap?.usd || 0,
            total_value_locked_usd: data.market_data?.total_value_locked?.usd?.toString() || 'N/A'
          }
          
          console.log(`[SCAN] Token data successfully collected from CoinGecko`)
        } else {
          console.warn(`[SCAN] CoinGecko API returned status ${response.status}`)
        }
      } catch (error) {
        console.error(`[SCAN] Error fetching token data from CoinGecko:`, error)
      }
    }

    // Initialize default security data
    let securityData = {
      token_address,
      score: 50, // Default neutral score
      ownership_renounced: false,
      honeypot_detected: false,
      can_mint: false,
      freeze_authority: false,
      audit_status: 'Not Audited',
      multisig_status: 'Unknown'
    }

    // Only fetch detailed security data for Pro scans
    if (canPerformProScan) {
      try {
        const goPlusUrl = goPlusApiKey
          ? `https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=${token_address}&api_key=${goPlusApiKey}`
          : `https://api.gopluslabs.io/api/v1/token_security/1?contract_addresses=${token_address}`
        
        console.log(`[SCAN] Fetching security data from GoPlus`)
        const response = await fetch(goPlusUrl)
        
        if (response.ok) {
          const data = await response.json()
          const result = data.result?.[token_address.toLowerCase()]
          
          if (result) {
            const ownership_renounced = result.owner_address === '0x0000000000000000000000000000000000000000'
            const honeypot_detected = result.is_honeypot === '1'
            const can_mint = result.can_take_back_ownership === '1'
            const freeze_authority = result.cannot_sell_all === '1'
            
            // Calculate security score
            let score = 100
            if (!ownership_renounced) score -= 30
            if (honeypot_detected) score -= 40
            if (can_mint) score -= 20
            if (freeze_authority) score -= 10
            
            securityData = {
              ...securityData,
              score: Math.max(0, score),
              ownership_renounced,
              honeypot_detected,
              can_mint,
              freeze_authority
            }
            
            console.log(`[SCAN] Security data successfully collected from GoPlus`)
          }
        } else {
          console.warn(`[SCAN] GoPlus API returned status ${response.status}`)
        }
      } catch (error) {
        console.error(`[SCAN] Error fetching security data from GoPlus:`, error)
      }
    } else {
      console.log(`[SCAN] Basic scan - using default security data`)
    }

    // Generate enhanced data for Pro scans, basic data for others
    const tokenomicsData = {
      token_address,
      score: canPerformProScan ? Math.floor(Math.random() * 40) + 40 : Math.floor(Math.random() * 20) + 30,
      circulating_supply: null,
      supply_cap: null,
      tvl_usd: tokenData.total_value_locked_usd !== 'N/A' ? parseFloat(tokenData.total_value_locked_usd) : null,
      vesting_schedule: canPerformProScan ? 'Unknown' : 'Limited Info',
      distribution_score: canPerformProScan ? 'Medium' : 'Basic',
      treasury_usd: null,
      burn_mechanism: false
    }

    const liquidityData = {
      token_address,
      score: canPerformProScan ? Math.floor(Math.random() * 50) + 30 : Math.floor(Math.random() * 20) + 20,
      liquidity_locked_days: null,
      cex_listings: 0,
      trading_volume_24h_usd: null,
      holder_distribution: canPerformProScan ? 'Unknown' : 'Limited Info',
      dex_depth_status: canPerformProScan ? 'Medium' : 'Basic'
    }

    const developmentData = {
      token_address,
      score: canPerformProScan && tokenData.github_url ? Math.floor(Math.random() * 60) + 20 : 0,
      github_repo: tokenData.github_url,
      is_open_source: !!tokenData.github_url,
      contributors_count: null,
      commits_30d: null,
      last_commit: null,
      roadmap_progress: canPerformProScan && tokenData.github_url ? 'Active' : 'Unknown'
    }

    // Community data always 0 as per requirements
    const communityData = {
      token_address,
      score: 0,
      twitter_followers: null,
      twitter_verified: false,
      twitter_growth_7d: null,
      telegram_members: null,
      discord_members: null,
      active_channels: [],
      team_visibility: 'Unknown'
    }

    // Save all data to cache tables
    console.log(`[SCAN] Saving data to database for token: ${token_address}`)
    
    const saveResults = await Promise.allSettled([
      supabase.from('token_data_cache').upsert(tokenData, { onConflict: 'token_address' }),
      supabase.from('token_security_cache').upsert(securityData, { onConflict: 'token_address' }),
      supabase.from('token_tokenomics_cache').upsert(tokenomicsData, { onConflict: 'token_address' }),
      supabase.from('token_liquidity_cache').upsert(liquidityData, { onConflict: 'token_address' }),
      supabase.from('token_development_cache').upsert(developmentData, { onConflict: 'token_address' }),
      supabase.from('token_community_cache').upsert(communityData, { onConflict: 'token_address' })
    ])

    // Log any save errors but don't fail the entire operation
    saveResults.forEach((result, index) => {
      const tables = ['token_data_cache', 'token_security_cache', 'token_tokenomics_cache', 'token_liquidity_cache', 'token_development_cache', 'token_community_cache']
      if (result.status === 'rejected') {
        console.error(`[SCAN] Error saving to ${tables[index]}:`, result.reason)
      } else {
        console.log(`[SCAN] Successfully saved to ${tables[index]}`)
      }
    })

    // Calculate overall score
    const scores = [
      securityData.score,
      tokenomicsData.score,
      liquidityData.score,
      developmentData.score
    ].filter(score => score !== null && score !== undefined)
    
    const overallScore = scores.length > 0 
      ? Math.round(scores.reduce((acc, curr) => acc + curr, 0) / scores.length)
      : 0

    // Record the scan in token_scans table
    try {
      const scanRecord = {
        user_id: user_id || null,
        token_address,
        score_total: overallScore,
        pro_scan: canPerformProScan,
        is_anonymous: !user_id
      }
      
      console.log(`[SCAN] Recording scan:`, scanRecord)
      const { error: scanError } = await supabase.from('token_scans').insert(scanRecord)
      
      if (scanError) {
        console.error(`[SCAN] Error recording scan:`, scanError)
      } else {
        console.log(`[SCAN] Successfully recorded scan`)
      }
    } catch (error) {
      console.error(`[SCAN] Exception recording scan:`, error)
    }

    // Increment scan usage for authenticated users who performed a Pro scan
    if (user_id && canPerformProScan) {
      try {
        console.log(`[SCAN] Incrementing scan usage for user: ${user_id}`)
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({ scans_used: scansUsed + 1 })
          .eq('id', user_id)

        if (updateError) {
          console.error(`[SCAN] Error updating scan usage:`, updateError)
        } else {
          console.log(`[SCAN] Successfully incremented scan usage to ${scansUsed + 1}`)
        }
      } catch (error) {
        console.error(`[SCAN] Exception updating scan usage:`, error)
      }
    }

    console.log(`[SCAN] Scan completed successfully for ${token_address}, overall score: ${overallScore}, pro_scan: ${canPerformProScan}`)

    // Return consistent response structure
    return new Response(
      JSON.stringify({
        success: true,
        token_address,
        overall_score: overallScore,
        pro_scan: canPerformProScan,
        token_info: tokenData,
        security: securityData,
        tokenomics: tokenomicsData,
        liquidity: liquidityData,
        development: developmentData,
        community: communityData
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('[SCAN] Error in run-token-scan:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Scan failed',
        success: false 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})
