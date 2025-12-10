// Ultra-minimal token scan - all code inlined to reduce module loading overhead
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Chain config - minimal inline
const CHAINS: Record<string, { goplus: string; name: string }> = {
  '0x1': { goplus: '1', name: 'Ethereum' },
  '0x89': { goplus: '137', name: 'Polygon' },
  '0x38': { goplus: '56', name: 'BSC' },
  '0xa4b1': { goplus: '42161', name: 'Arbitrum' },
  '0x2105': { goplus: '8453', name: 'Base' },
}

function normalizeChainId(chainId: string): string {
  if (!chainId) return '0x1'
  const clean = chainId.toLowerCase().trim()
  if (clean.startsWith('0x')) return clean
  const num = parseInt(clean)
  if (!isNaN(num)) return '0x' + num.toString(16)
  const nameMap: Record<string, string> = { ethereum: '0x1', eth: '0x1', polygon: '0x89', bsc: '0x38' }
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

// GoPlus - minimal implementation
async function fetchGoPlus(tokenAddress: string, chainId: string) {
  const chain = CHAINS[chainId]
  if (!chain) return null
  
  const APP_KEY = Deno.env.get('GOPLUS_APP_KEY')
  const APP_SECRET = Deno.env.get('GOPLUS_APP_SECRET')
  if (!APP_KEY || !APP_SECRET) return null

  try {
    // Get token
    const time = Math.floor(Date.now() / 1000)
    const input = `${APP_KEY}${time}${APP_SECRET}`
    const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(input))
    const sign = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
    
    const authRes = await fetchWithTimeout('https://api.gopluslabs.io/api/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_key: APP_KEY, time, sign })
    }, 5000)
    
    if (!authRes?.ok) return null
    const authData = await authRes.json()
    if (authData.code !== 1 || !authData.result?.access_token) return null
    
    const token = authData.result.access_token
    const url = `https://api.gopluslabs.io/api/v1/token_security/${chain.goplus}?contract_addresses=${tokenAddress.toLowerCase()}`
    
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'Authorization': token.startsWith('Bearer ') ? token : `Bearer ${token}` }
    }, 6000)
    
    if (!res?.ok) return null
    const data = await res.json()
    if (data.code !== 1 || !data.result) return null
    
    const tokenData = data.result[tokenAddress.toLowerCase()]
    if (!tokenData) return null
    
    return {
      ownership_renounced: tokenData.is_open_source === '1',
      can_mint: tokenData.is_mintable === '1',
      honeypot_detected: tokenData.is_honeypot === '1',
      is_proxy: tokenData.is_proxy === '1',
      contract_verified: tokenData.is_open_source === '1',
      is_liquidity_locked: tokenData.lp_holders?.some((h: any) => h.is_locked === 1) || false
    }
  } catch {
    return null
  }
}

// Moralis metadata - minimal
async function fetchMoralis(tokenAddress: string, chainId: string) {
  const apiKey = Deno.env.get('MORALIS_API_KEY')
  if (!apiKey) return null
  
  try {
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainId}&addresses%5B0%5D=${tokenAddress.toLowerCase()}`
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
    }, 5000)
    
    if (!res?.ok) return null
    const data = await res.json()
    const t = data[0]
    if (!t) return null
    
    return {
      name: t.name || '',
      symbol: t.symbol || '',
      decimals: parseInt(t.decimals) || 18,
      logo: t.logo || t.thumbnail || '',
      total_supply: t.total_supply || '0',
      description: t.description || '',
      links: t.links || []
    }
  } catch {
    return null
  }
}

// Moralis price - minimal
async function fetchPrice(tokenAddress: string, chainId: string) {
  const apiKey = Deno.env.get('MORALIS_API_KEY')
  if (!apiKey) return null
  
  try {
    const url = `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress.toLowerCase()}/price?chain=${chainId}&include=percent_change`
    const res = await fetchWithTimeout(url, {
      method: 'GET',
      headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' }
    }, 5000)
    
    if (!res?.ok) return null
    const data = await res.json()
    
    return {
      price_usd: parseFloat(data.usdPrice) || 0,
      price_change_24h: parseFloat(data['24hrPercentChange']) || null,
      name: data.tokenName || '',
      symbol: data.tokenSymbol || ''
    }
  } catch {
    return null
  }
}

// Calculate scores - minimal inline
function calcSecurityScore(sec: any): number {
  if (!sec) return 30
  let score = 50
  if (sec.contract_verified) score += 15
  if (sec.ownership_renounced) score += 15
  if (!sec.can_mint) score += 10
  if (!sec.honeypot_detected) score += 10
  if (sec.is_liquidity_locked) score += 10
  return Math.min(100, Math.max(0, score))
}

function calcOverall(scores: number[]): number {
  const valid = scores.filter(s => s > 0)
  return valid.length ? Math.round(valid.reduce((a, b) => a + b) / valid.length) : 30
}

Deno.serve(async (req) => {
  const startTime = Date.now()
  const requestId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`[${requestId}] === SCAN STARTED ===`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return new Response(JSON.stringify({ success: true, message: 'Edge function running' }), {
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

    const { token_address: rawAddress, chain_id, user_id } = JSON.parse(bodyText)
    const token_address = rawAddress?.toLowerCase().trim()
    const chainId = normalizeChainId(chain_id || '0x1')
    
    console.log(`[${requestId}] Token: ${token_address}, Chain: ${chainId}`)

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

    // Parallel API calls with tight timeouts
    console.log(`[${requestId}] Fetching APIs...`)
    const [goplus, metadata, price] = await Promise.all([
      fetchGoPlus(token_address, chainId),
      fetchMoralis(token_address, chainId),
      fetchPrice(token_address, chainId)
    ])
    
    console.log(`[${requestId}] APIs done: goplus=${!!goplus}, meta=${!!metadata}, price=${!!price}`)

    // Build token data
    const name = metadata?.name || price?.name || `Token ${token_address.slice(0, 8)}`
    const symbol = metadata?.symbol || price?.symbol || 'UNKNOWN'
    const description = metadata?.description || `${name} (${symbol}) on ${chain.name}`
    
    // Calculate scores
    const securityScore = calcSecurityScore(goplus)
    const overallScore = calcOverall([securityScore, 30, 30, 30, 30]) // Other scores default to 30

    console.log(`[${requestId}] Saving to DB...`)

    // Save to database - parallel upserts
    await Promise.all([
      supabase.from('token_data_cache').upsert({
        token_address,
        chain_id: chainId,
        name,
        symbol,
        description,
        logo_url: metadata?.logo || '',
        current_price_usd: price?.price_usd || 0,
        price_change_24h: price?.price_change_24h
      }, { onConflict: 'token_address,chain_id' }),
      
      supabase.from('token_security_cache').upsert({
        token_address,
        chain_id: chainId,
        ownership_renounced: goplus?.ownership_renounced ?? null,
        can_mint: goplus?.can_mint ?? null,
        honeypot_detected: goplus?.honeypot_detected ?? null,
        contract_verified: goplus?.contract_verified ?? null,
        is_proxy: goplus?.is_proxy ?? null,
        is_liquidity_locked: goplus?.is_liquidity_locked ?? false,
        score: securityScore
      }, { onConflict: 'token_address,chain_id' }),
      
      supabase.from('token_tokenomics_cache').upsert({
        token_address,
        chain_id: chainId,
        total_supply: metadata?.total_supply ? parseFloat(metadata.total_supply) : null,
        score: 30
      }, { onConflict: 'token_address,chain_id' }),
      
      supabase.from('token_liquidity_cache').upsert({
        token_address,
        chain_id: chainId,
        trading_volume_24h_usd: 0,
        score: 30
      }, { onConflict: 'token_address,chain_id' }),
      
      supabase.from('token_community_cache').upsert({
        token_address,
        chain_id: chainId,
        twitter_followers: 0,
        discord_members: 0,
        telegram_members: 0,
        score: 30
      }, { onConflict: 'token_address,chain_id' }),
      
      supabase.from('token_development_cache').upsert({
        token_address,
        chain_id: chainId,
        is_open_source: false,
        score: 30
      }, { onConflict: 'token_address,chain_id' }),
      
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
    console.log(`[${requestId}] Done in ${processingTime}ms`)

    return new Response(JSON.stringify({
      success: true,
      token_address,
      chain_id: chainId,
      overall_score: overallScore,
      token_name: name,
      token_symbol: symbol,
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
