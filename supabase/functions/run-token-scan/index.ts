// Full token scan with all API integrations
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { fetchMoralisPriceData, fetchMoralisTokenStats, fetchMoralisTokenPairs, fetchMoralisTokenOwners, fetchMoralisMetadata } from '../_shared/moralisAPI.ts'
import { fetchGitHubRepoData } from '../_shared/githubAPI.ts'
import { fetchTwitterFollowers, fetchTelegramMembers } from '../_shared/apifyAPI.ts'
import { calculateSecurityScore, calculateLiquidityScore, calculateTokenomicsScore, calculateDevelopmentScore } from '../_shared/scoringUtils.ts'
import { isSolanaChain } from '../_shared/chainConfig.ts'
import { 
  fetchSPLMintInfo, 
  fetchSolanaLiquidity, 
  fetchSolanaMarketData,
  calculateSolanaSecurityScore,
  calculateSolanaTokenomicsScore,
  calculateSolanaLiquidityScore
} from '../_shared/solanaAPI.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Chain config for EVM chains
const CHAINS: Record<string, { goplus: string; name: string; moralis: string }> = {
  '0x1': { goplus: '1', name: 'Ethereum', moralis: '0x1' },
  '0x89': { goplus: '137', name: 'Polygon', moralis: '0x89' },
  '0x38': { goplus: '56', name: 'BSC', moralis: '0x38' },
  '0xa4b1': { goplus: '42161', name: 'Arbitrum', moralis: '0xa4b1' },
  '0x2105': { goplus: '8453', name: 'Base', moralis: '0x2105' },
}

function normalizeChainId(chainId: string): string {
  if (!chainId) return '0x1'
  const clean = chainId.toLowerCase().trim()
  
  // Handle Solana explicitly
  if (clean === 'solana' || clean === 'sol') return 'solana'
  
  if (clean.startsWith('0x')) return clean
  const num = parseInt(clean)
  if (!isNaN(num)) return '0x' + num.toString(16)
  const nameMap: Record<string, string> = { ethereum: '0x1', eth: '0x1', polygon: '0x89', bsc: '0x38', base: '0x2105', arbitrum: '0xa4b1' }
  return nameMap[clean] || '0x1'
}

// Simple fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(timeout)
    return res
  } catch {
    clearTimeout(timeout)
    return null
  }
}

// GoPlus security data
async function fetchGoPlus(tokenAddress: string, chainId: string) {
  const chain = CHAINS[chainId]
  if (!chain) return null
  
  const APP_KEY = Deno.env.get('GOPLUS_APP_KEY')
  const APP_SECRET = Deno.env.get('GOPLUS_APP_SECRET')
  if (!APP_KEY || !APP_SECRET) {
    console.log(`[GOPLUS] Missing API keys`)
    return null
  }

  try {
    console.log(`[GOPLUS] Fetching security data for ${tokenAddress} on chain ${chain.goplus}`)
    
    const time = Math.floor(Date.now() / 1000)
    const input = `${APP_KEY}${time}${APP_SECRET}`
    const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input))
    const sign = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    
    const authRes = await fetchWithTimeout('https://api.gopluslabs.io/api/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key: APP_KEY, time, sign })
    }, 8000)
    
    if (!authRes?.ok) {
      console.log(`[GOPLUS] Auth failed: ${authRes?.status}`)
      return null
    }
    const authData = await authRes.json()
    if (authData.code !== 1 || !authData.result?.access_token) {
      console.log(`[GOPLUS] Invalid auth response`)
      return null
    }
    
    const token = authData.result.access_token
    const url = `https://api.gopluslabs.io/api/v1/token_security/${chain.goplus}?contract_addresses=${tokenAddress.toLowerCase()}`
    
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}` }
    }, 8000)
    
    if (!res?.ok) {
      console.log(`[GOPLUS] Security fetch failed: ${res?.status}`)
      return null
    }
    const data = await res.json()
    if (data.code !== 1 || !data.result) return null
    
    const tokenData = data.result[tokenAddress.toLowerCase()]
    if (!tokenData) return null
    
    console.log(`[GOPLUS] Success - Got security data`)
    
    // Calculate liquidity lock days from LP holders
    let liquidityLockedDays = 0
    if (tokenData.lp_holders && Array.isArray(tokenData.lp_holders)) {
      for (const holder of tokenData.lp_holders) {
        if (holder.is_locked === 1 && holder.locked_detail) {
          for (const lock of holder.locked_detail) {
            if (lock.end_time) {
              const endDate = new Date(lock.end_time * 1000)
              const daysUntilUnlock = Math.max(0, Math.floor((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
              liquidityLockedDays = Math.max(liquidityLockedDays, daysUntilUnlock)
            }
          }
        }
      }
    }
    
    return {
      ownership_renounced: tokenData.is_open_source === '1',
      can_mint: tokenData.is_mintable === '1',
      honeypot_detected: tokenData.is_honeypot === '1',
      is_proxy: tokenData.is_proxy === '1',
      contract_verified: tokenData.is_open_source === '1',
      is_liquidity_locked: tokenData.lp_holders?.some((h: any) => h.is_locked === 1) || false,
      liquidity_locked_days: liquidityLockedDays,
      is_blacklisted: tokenData.is_blacklisted === '1',
      freeze_authority: tokenData.can_take_back_ownership === '1'
    }
  } catch (error) {
    console.error(`[GOPLUS] Error:`, error)
    return null
  }
}

// Extract social links from Moralis metadata
function extractSocialLinks(metadata: any): { twitter?: string; telegram?: string; discord?: string; github?: string; website?: string } {
  const links: any = {}
  
  if (!metadata?.links) return links
  
  const metaLinks = metadata.links
  
  // Handle different link formats from Moralis
  if (typeof metaLinks === 'object') {
    // Check for twitter
    if (metaLinks.twitter) links.twitter = metaLinks.twitter
    else if (metaLinks.twitter_url) links.twitter = metaLinks.twitter_url
    
    // Check for telegram
    if (metaLinks.telegram) links.telegram = metaLinks.telegram
    else if (metaLinks.telegram_channel_identifier) links.telegram = `https://t.me/${metaLinks.telegram_channel_identifier}`
    
    // Check for discord
    if (metaLinks.discord) links.discord = metaLinks.discord
    
    // Check for github
    if (metaLinks.github) links.github = metaLinks.github
    else if (metaLinks.repos_url?.github && metaLinks.repos_url.github.length > 0) {
      links.github = metaLinks.repos_url.github[0]
    }
    
    // Check for website
    if (metaLinks.website) links.website = metaLinks.website
    else if (metaLinks.homepage && metaLinks.homepage.length > 0) links.website = metaLinks.homepage[0]
  }
  
  console.log(`[LINKS] Extracted social links:`, links)
  return links
}

// Extract Twitter handle from URL
function extractTwitterHandle(twitterUrl: string): string | null {
  if (!twitterUrl) return null
  const match = twitterUrl.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/)
  return match ? match[1] : null
}

// Calculate community score
function calculateCommunityScore(data: { twitterFollowers: number; discordMembers: number; telegramMembers: number }): number {
  let score = 20 // Base score
  
  // Twitter scoring (max 35 points)
  const twitter = data.twitterFollowers || 0
  if (twitter > 100000) score += 35
  else if (twitter > 50000) score += 30
  else if (twitter > 10000) score += 25
  else if (twitter > 5000) score += 20
  else if (twitter > 1000) score += 15
  else if (twitter > 100) score += 10
  else if (twitter > 0) score += 5
  
  // Discord scoring (max 25 points)
  const discord = data.discordMembers || 0
  if (discord > 50000) score += 25
  else if (discord > 10000) score += 20
  else if (discord > 5000) score += 15
  else if (discord > 1000) score += 10
  else if (discord > 0) score += 5
  
  // Telegram scoring (max 20 points)
  const telegram = data.telegramMembers || 0
  if (telegram > 50000) score += 20
  else if (telegram > 10000) score += 15
  else if (telegram > 5000) score += 10
  else if (telegram > 1000) score += 5
  else if (telegram > 0) score += 2
  
  return Math.min(100, score)
}

Deno.serve(async (req) => {
  const startTime = Date.now()
  const requestId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`[${requestId}] ========== FULL TOKEN SCAN STARTED ==========`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ success: true, message: 'Full token scan edge function running' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const bodyText = await req.text()
    if (!bodyText.trim()) {
      return new Response(JSON.stringify({ success: false, error: 'Empty body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { token_address: rawAddress, chain_id, user_id, force_refresh } = JSON.parse(bodyText)
    const chainId = normalizeChainId(chain_id || '0x1')
    
    console.log(`[${requestId}] Token: ${rawAddress}, Chain: ${chainId}, Force: ${force_refresh}`)

    // Route to Solana scan if chain is Solana
    if (isSolanaChain(chainId)) {
      console.log(`[${requestId}] Routing to Solana scan path`)
      return await scanSolanaToken(rawAddress, user_id, requestId, startTime)
    }

    // EVM scan path - normalize address to lowercase
    const token_address = rawAddress?.toLowerCase().trim()
    
    if (!token_address || !/^0x[a-fA-F0-9]{40}$/.test(token_address)) {
      return new Response(JSON.stringify({ success: false, error: 'Invalid token address' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const chain = CHAINS[chainId]
    if (!chain) {
      return new Response(JSON.stringify({ success: false, error: 'Unsupported chain' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ========== PHASE 1: Core API Calls (parallel) ==========
    console.log(`[${requestId}] Phase 1: Core API calls...`)
    
    const [goplus, metadata, priceData, tokenStats, tokenPairs, tokenOwners] = await Promise.all([
      fetchGoPlus(token_address, chainId),
      fetchMoralisMetadata(token_address, chainId),
      fetchMoralisPriceData(token_address, chainId),
      fetchMoralisTokenStats(token_address, chainId),
      fetchMoralisTokenPairs(token_address, chainId),
      fetchMoralisTokenOwners(token_address, chainId)
    ])
    
    console.log(`[${requestId}] Phase 1 results: goplus=${!!goplus}, metadata=${!!metadata}, price=${!!priceData}, stats=${!!tokenStats}, pairs=${!!tokenPairs}, owners=${!!tokenOwners}`)

    // Extract social links for Phase 2
    const socialLinks = extractSocialLinks(metadata)
    
    // ========== PHASE 2: Social & GitHub API Calls (parallel) ==========
    console.log(`[${requestId}] Phase 2: Social & GitHub API calls...`)
    
    const twitterHandle = extractTwitterHandle(socialLinks.twitter || '')
    
    const [twitterFollowers, telegramData, githubData] = await Promise.all([
      twitterHandle ? fetchTwitterFollowers(twitterHandle) : Promise.resolve(null),
      socialLinks.telegram ? fetchTelegramMembers(socialLinks.telegram) : Promise.resolve({ members: null }),
      socialLinks.github ? fetchGitHubRepoData(socialLinks.github) : Promise.resolve(null)
    ])
    
    console.log(`[${requestId}] Phase 2 results: twitter=${twitterFollowers || 0}, telegram=${telegramData?.members || 0}, github=${!!githubData}`)

    // ========== PHASE 3: Calculate Scores ==========
    console.log(`[${requestId}] Phase 3: Calculating scores...`)
    
    // Security Score
    const securityScore = calculateSecurityScore(goplus, null, goplus)
    console.log(`[${requestId}] Security score: ${securityScore}`)
    
    // Liquidity Score
    const liquidityData = {
      trading_volume_24h_usd: priceData?.trading_volume_24h_usd || 0,
      market_cap_usd: metadata?.market_cap || 0,
      is_liquidity_locked: goplus?.is_liquidity_locked || false,
      liquidity_locked_days: goplus?.liquidity_locked_days || 0
    }
    const liquidityScore = calculateLiquidityScore(liquidityData, liquidityData)
    console.log(`[${requestId}] Liquidity score: ${liquidityScore}`)
    
    // Tokenomics Score
    const tokenomicsScore = calculateTokenomicsScore(
      metadata,
      priceData,
      tokenStats,
      tokenOwners,
      tokenPairs
    )
    console.log(`[${requestId}] Tokenomics score: ${tokenomicsScore}`)
    
    // Community Score
    const communityData = {
      twitterFollowers: twitterFollowers || 0,
      discordMembers: 0, // Discord requires different API
      telegramMembers: telegramData?.members || 0
    }
    const communityScore = calculateCommunityScore(communityData)
    console.log(`[${requestId}] Community score: ${communityScore}`)
    
    // Development Score
    const developmentScore = calculateDevelopmentScore(githubData)
    console.log(`[${requestId}] Development score: ${developmentScore}`)
    
    // Overall Score
    const scores = [securityScore, liquidityScore, tokenomicsScore, communityScore, developmentScore]
    const overallScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    console.log(`[${requestId}] Overall score: ${overallScore}`)

    // ========== PHASE 4: Save to Database ==========
    console.log(`[${requestId}] Phase 4: Saving to database...`)
    
    const name = metadata?.name || priceData?.name || `Token ${token_address.slice(0, 8)}`
    const symbol = metadata?.symbol || priceData?.symbol || 'UNKNOWN'
    const description = metadata?.description || `${name} (${symbol}) on ${chain.name}`

    await Promise.all([
      // Token data cache
      supabase.from('token_data_cache').upsert({
        token_address,
        chain_id: chainId,
        name,
        symbol,
        description,
        logo_url: metadata?.logo || metadata?.thumbnail || '',
        current_price_usd: priceData?.current_price_usd || 0,
        price_change_24h: priceData?.price_change_24h,
        market_cap_usd: metadata?.market_cap || null,
        circulating_supply: metadata?.circulating_supply ? parseFloat(metadata.circulating_supply) : null,
        website_url: socialLinks.website || null,
        twitter_handle: twitterHandle || null,
        github_url: socialLinks.github || null
      }, { onConflict: 'token_address,chain_id' }),
      
      // Security cache
      supabase.from('token_security_cache').upsert({
        token_address,
        chain_id: chainId,
        ownership_renounced: goplus?.ownership_renounced ?? null,
        can_mint: goplus?.can_mint ?? null,
        honeypot_detected: goplus?.honeypot_detected ?? null,
        contract_verified: goplus?.contract_verified ?? null,
        is_proxy: goplus?.is_proxy ?? null,
        is_liquidity_locked: goplus?.is_liquidity_locked ?? false,
        is_blacklisted: goplus?.is_blacklisted ?? null,
        freeze_authority: goplus?.freeze_authority ?? null,
        liquidity_lock_info: goplus?.liquidity_locked_days ? `${goplus.liquidity_locked_days} days` : null,
        score: securityScore
      }, { onConflict: 'token_address,chain_id' }),
      
      // Tokenomics cache
      supabase.from('token_tokenomics_cache').upsert({
        token_address,
        chain_id: chainId,
        total_supply: metadata?.total_supply ? parseFloat(metadata.total_supply) : null,
        circulating_supply: metadata?.circulating_supply ? parseFloat(metadata.circulating_supply) : null,
        dex_liquidity_usd: tokenPairs?.total_liquidity_usd || null,
        major_dex_pairs: tokenPairs?.major_pairs || null,
        distribution_gini_coefficient: tokenOwners?.gini_coefficient || null,
        holder_concentration_risk: tokenOwners?.concentration_risk || null,
        top_holders_count: tokenOwners?.total_holders || null,
        data_confidence_score: (tokenStats && tokenOwners && tokenPairs) ? 80 : (tokenStats || tokenOwners) ? 50 : 20,
        score: tokenomicsScore
      }, { onConflict: 'token_address,chain_id' }),
      
      // Liquidity cache
      supabase.from('token_liquidity_cache').upsert({
        token_address,
        chain_id: chainId,
        trading_volume_24h_usd: priceData?.trading_volume_24h_usd || 0,
        liquidity_locked_days: goplus?.liquidity_locked_days || null,
        holder_distribution: tokenOwners?.concentration_risk || null,
        dex_depth_status: tokenPairs?.total_liquidity_usd > 1000000 ? 'Deep' : 
                         tokenPairs?.total_liquidity_usd > 100000 ? 'Moderate' : 
                         tokenPairs?.total_liquidity_usd > 10000 ? 'Shallow' : 'Very Low',
        score: liquidityScore
      }, { onConflict: 'token_address,chain_id' }),
      
      // Community cache
      supabase.from('token_community_cache').upsert({
        token_address,
        chain_id: chainId,
        twitter_followers: twitterFollowers || 0,
        discord_members: 0,
        telegram_members: telegramData?.members || 0,
        twitter_verified: null,
        twitter_growth_7d: null,
        active_channels: [
          twitterHandle ? 'twitter' : null,
          telegramData?.members ? 'telegram' : null
        ].filter(Boolean),
        score: communityScore
      }, { onConflict: 'token_address,chain_id' }),
      
      // Development cache
      supabase.from('token_development_cache').upsert({
        token_address,
        chain_id: chainId,
        github_repo: githubData ? `${githubData.owner}/${githubData.repo}` : null,
        is_open_source: !!githubData,
        stars: githubData?.stars || 0,
        forks: githubData?.forks || 0,
        commits_30d: githubData?.commits_30d || 0,
        contributors_count: githubData?.contributors_count || 0,
        open_issues: githubData?.open_issues || 0,
        last_commit: githubData?.last_push || null,
        language: githubData?.language || null,
        is_archived: githubData?.is_archived || false,
        repo_created_at: githubData?.created_at || null,
        score: developmentScore
      }, { onConflict: 'token_address,chain_id' }),
      
      // Token scan record
      supabase.from('token_scans').insert({
        token_address,
        chain_id: chainId,
        user_id: user_id || null,
        score_total: overallScore,
        is_anonymous: !user_id,
        pro_scan: false
      })
    ])

    const processingTime = Date.now() - startTime
    console.log(`[${requestId}] ========== SCAN COMPLETE in ${processingTime}ms ==========`)
    console.log(`[${requestId}] Scores: Security=${securityScore}, Liquidity=${liquidityScore}, Tokenomics=${tokenomicsScore}, Community=${communityScore}, Development=${developmentScore}, Overall=${overallScore}`)

    return new Response(JSON.stringify({
      success: true,
      token_address,
      chain_id: chainId,
      overall_score: overallScore,
      token_name: name,
      token_symbol: symbol,
      scores: {
        security: securityScore,
        liquidity: liquidityScore,
        tokenomics: tokenomicsScore,
        community: communityScore,
        development: developmentScore
      },
      processing_time_ms: processingTime
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error(`[${requestId}] Error:`, error)
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Scan failed',
      request_id: requestId,
      processing_time_ms: Date.now() - startTime
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

/**
 * Dedicated Solana (SPL) token scan function
 * Uses Solana RPC, GeckoTerminal, CoinGecko, and social/GitHub APIs
 */
async function scanSolanaToken(
  mintAddress: string, 
  userId: string | null, 
  requestId: string,
  startTime: number
): Promise<Response> {
  try {
    console.log(`[${requestId}] ========== SOLANA TOKEN SCAN ==========`)
    console.log(`[${requestId}] Mint address: ${mintAddress}`)

    // Validate Solana address format (Base58, 32-44 chars)
    const solanaAddressPattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
    if (!mintAddress || !solanaAddressPattern.test(mintAddress.trim())) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid Solana mint address',
        chain: 'solana'
      }), {
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Keep original case for Solana addresses (Base58 is case-sensitive)
    const normalizedMint = mintAddress.trim()

    // Phase 1: Fetch core Solana data in parallel
    console.log(`[${requestId}] Phase 1: Fetching Solana data...`)
    const [mintInfo, liquidityData, marketData] = await Promise.all([
      fetchSPLMintInfo(normalizedMint),
      fetchSolanaLiquidity(normalizedMint),
      fetchSolanaMarketData(normalizedMint)
    ])

    console.log(`[${requestId}] Phase 1 results: mintInfo=${!!mintInfo.isInitialized}, liquidity=$${liquidityData.totalLiquidity}, marketData=${!!marketData}`)

    // Phase 2: Fetch social and GitHub data from CoinGecko links
    console.log(`[${requestId}] Phase 2: Fetching social & GitHub data...`)
    
    // Extract Twitter handle from CoinGecko twitter_url
    let twitterHandle: string | null = null
    if (marketData?.twitter_url) {
      const match = marketData.twitter_url.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)/)
      twitterHandle = match ? match[1] : null
    }
    
    console.log(`[${requestId}] Social links from CoinGecko:`, {
      twitter: marketData?.twitter_url || 'none',
      telegram: marketData?.telegram_url || 'none',
      github: marketData?.github_url || 'none',
      website: marketData?.website_url || 'none'
    })
    
    // Fetch social metrics and GitHub data in parallel
    const [twitterFollowers, telegramData, githubData] = await Promise.all([
      twitterHandle ? fetchTwitterFollowers(twitterHandle) : Promise.resolve(null),
      marketData?.telegram_url ? fetchTelegramMembers(marketData.telegram_url) : Promise.resolve({ members: null }),
      marketData?.github_url ? fetchGitHubRepoData(marketData.github_url) : Promise.resolve(null)
    ])
    
    console.log(`[${requestId}] Phase 2 results: twitter=${twitterFollowers || 0} followers, telegram=${telegramData?.members || 0} members, github=${githubData ? `${githubData.repo} (${githubData.stars} stars)` : 'none'}`)

    // Phase 3: Calculate scores
    console.log(`[${requestId}] Phase 3: Calculating scores...`)
    
    const securityScore = calculateSolanaSecurityScore(mintInfo)
    const tokenomicsScore = calculateSolanaTokenomicsScore(mintInfo, marketData)
    const liquidityScore = calculateSolanaLiquidityScore(liquidityData)
    
    // Calculate REAL community score based on fetched data
    const communityData = {
      twitterFollowers: twitterFollowers || 0,
      discordMembers: 0, // Discord API requires bot, not supported yet
      telegramMembers: telegramData?.members || 0
    }
    const communityScore = calculateCommunityScore(communityData)
    
    // Calculate REAL development score based on GitHub data
    const developmentScore = calculateDevelopmentScore(githubData)
    
    const overallScore = Math.round(
      (securityScore + tokenomicsScore + liquidityScore + communityScore + developmentScore) / 5
    )

    console.log(`[${requestId}] Scores: Security=${securityScore}, Tokenomics=${tokenomicsScore}, Liquidity=${liquidityScore}, Community=${communityScore}, Development=${developmentScore}, Overall=${overallScore}`)

    // Phase 4: Prepare data for database
    const name = marketData?.name || `SPL Token ${normalizedMint.slice(0, 8)}`
    const symbol = marketData?.symbol || 'SPL'
    const description = marketData?.description || `${name} is an SPL token on Solana.`

    // Phase 5: Save to database with chain='solana'
    console.log(`[${requestId}] Phase 4: Saving to database...`)

    await Promise.all([
      // Token data cache with social links
      supabase.from('token_data_cache').upsert({
        token_address: normalizedMint,
        chain_id: 'solana',
        name,
        symbol,
        description,
        logo_url: marketData?.image || '',
        current_price_usd: marketData?.current_price || 0,
        price_change_24h: marketData?.price_change_24h || null,
        market_cap_usd: marketData?.market_cap || null,
        circulating_supply: mintInfo.supply ? parseFloat(mintInfo.supply) / Math.pow(10, mintInfo.decimals || 0) : null,
        website_url: marketData?.website_url || null,
        twitter_handle: twitterHandle || null,
        github_url: marketData?.github_url || null
      }, { onConflict: 'token_address,chain_id' }),

      // Security cache with Solana-specific fields
      supabase.from('token_security_cache').upsert({
        token_address: normalizedMint,
        chain_id: 'solana',
        ownership_renounced: mintInfo.mintAuthority === null,
        freeze_authority: mintInfo.freezeAuthority !== null,
        can_mint: mintInfo.mintAuthority !== null,
        contract_verified: true, // SPL tokens are always "verified" as standard
        honeypot_detected: false, // Not applicable for SPL
        is_proxy: false, // Not applicable for SPL
        score: securityScore
      }, { onConflict: 'token_address,chain_id' }),

      // Tokenomics cache
      supabase.from('token_tokenomics_cache').upsert({
        token_address: normalizedMint,
        chain_id: 'solana',
        total_supply: mintInfo.supply ? parseFloat(mintInfo.supply) : null,
        dex_liquidity_usd: liquidityData.totalLiquidity || null,
        major_dex_pairs: liquidityData.majorPools?.length > 0 ? liquidityData.majorPools : null,
        score: tokenomicsScore
      }, { onConflict: 'token_address,chain_id' }),

      // Liquidity cache
      supabase.from('token_liquidity_cache').upsert({
        token_address: normalizedMint,
        chain_id: 'solana',
        dex_depth_status: liquidityData.totalLiquidity > 1000000 ? 'Deep' : 
                         liquidityData.totalLiquidity > 100000 ? 'Moderate' : 
                         liquidityData.totalLiquidity > 10000 ? 'Shallow' : 'Very Low',
        score: liquidityScore
      }, { onConflict: 'token_address,chain_id' }),

      // Community cache with REAL data
      supabase.from('token_community_cache').upsert({
        token_address: normalizedMint,
        chain_id: 'solana',
        twitter_followers: twitterFollowers || 0,
        telegram_members: telegramData?.members || 0,
        discord_members: 0,
        active_channels: [
          twitterHandle ? 'twitter' : null,
          telegramData?.members ? 'telegram' : null
        ].filter(Boolean),
        score: communityScore
      }, { onConflict: 'token_address,chain_id' }),

      // Development cache with REAL GitHub data
      supabase.from('token_development_cache').upsert({
        token_address: normalizedMint,
        chain_id: 'solana',
        github_repo: githubData ? `${githubData.owner}/${githubData.repo}` : null,
        is_open_source: !!githubData,
        stars: githubData?.stars || null,
        forks: githubData?.forks || null,
        commits_30d: githubData?.commits_30d || null,
        contributors_count: githubData?.contributors_count || null,
        last_commit: githubData?.last_push || null,
        language: githubData?.language || null,
        is_archived: githubData?.is_archived || null,
        score: developmentScore
      }, { onConflict: 'token_address,chain_id' }),

      // Token scan record
      supabase.from('token_scans').insert({
        token_address: normalizedMint,
        chain_id: 'solana',
        user_id: userId || null,
        score_total: overallScore,
        is_anonymous: !userId,
        pro_scan: false
      })
    ])

    const processingTime = Date.now() - startTime
    console.log(`[${requestId}] ========== SOLANA SCAN COMPLETE in ${processingTime}ms ==========`)

    return new Response(JSON.stringify({
      success: true,
      chain: 'solana',
      token_address: normalizedMint,
      overall_score: overallScore,
      token_name: name,
      token_symbol: symbol,
      scores: {
        security: securityScore,
        liquidity: liquidityScore,
        tokenomics: tokenomicsScore,
        community: communityScore,
        development: developmentScore
      },
      social_data: {
        twitter_handle: twitterHandle,
        twitter_followers: twitterFollowers,
        telegram_members: telegramData?.members || null,
        github_repo: githubData ? `${githubData.owner}/${githubData.repo}` : null
      },
      solana_specific: {
        mint_authority_renounced: mintInfo.mintAuthority === null,
        freeze_authority_disabled: mintInfo.freezeAuthority === null,
        decimals: mintInfo.decimals,
        total_supply: mintInfo.supply
      },
      processing_time_ms: processingTime
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error(`[${requestId}] Solana scan error:`, error)
    
    // Defensive: Never throw, return graceful error
    return new Response(JSON.stringify({
      success: false,
      chain: 'solana',
      error: 'Solana scan failed',
      details: error.message || 'Unknown error',
      request_id: requestId,
      processing_time_ms: Date.now() - startTime
    }), {
      status: 200, // Return 200 to avoid runtime errors on client
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}
