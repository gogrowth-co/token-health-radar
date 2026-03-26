// LunarCrush API v4 integration for social metrics
// Uses only the FREE /public/topic/:topic/v1 endpoint

export interface LunarCrushData {
  galaxy_score: number | null;
  alt_rank: number | null;
  sentiment: number | null;
  interactions_24h: number | null;
  posts_active: number | null;
  contributors_active: number | null;
}

/**
 * Fetch social metrics from LunarCrush API v4 FREE tier.
 * Uses only the public topic endpoint (no paid subscription required):
 *  - /api4/public/topic/{symbol}/v1 → interactions, contributors, posts, sentiment
 * 
 * galaxy_score and alt_rank are NOT available on free endpoints,
 * so they will always be null. Scoring handles this gracefully.
 */
export async function fetchLunarCrush(tokenSymbol: string): Promise<LunarCrushData | null> {
  const apiKey = Deno.env.get('LUNARCRUSH_API_KEY')
  if (!apiKey) {
    console.log('[LUNARCRUSH] Missing LUNARCRUSH_API_KEY — skipping')
    return null
  }

  if (!tokenSymbol || tokenSymbol === 'UNKNOWN' || tokenSymbol === 'SPL') {
    console.log(`[LUNARCRUSH] Invalid symbol "${tokenSymbol}" — skipping`)
    return null
  }

  const headers = { 'Authorization': `Bearer ${apiKey}` }
  const symbolLower = tokenSymbol.toLowerCase()

  console.log(`[LUNARCRUSH] Fetching topic data for: ${symbolLower} (free tier)`)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const topicRes = await fetch(
      `https://lunarcrush.com/api4/public/topic/${symbolLower}/v1`,
      { headers, signal: controller.signal }
    )

    clearTimeout(timeout)

    if (!topicRes.ok) {
      console.log(`[LUNARCRUSH] Topic endpoint failed: ${topicRes.status}`)
      return null
    }

    let interactions24h: number | null = null
    let postsActive: number | null = null
    let contributorsActive: number | null = null
    let sentiment: number | null = null

    try {
      const topicData = await topicRes.json()
      const data = topicData?.data || topicData
      interactions24h = data?.interactions_24h ?? data?.interactions ?? null
      contributorsActive = data?.num_contributors ?? data?.contributors_active ?? null
      postsActive = data?.num_posts ?? data?.posts_active ?? null

      // Compute weighted average sentiment from types_sentiment
      if (data?.types_sentiment && typeof data.types_sentiment === 'object') {
        const entries = Object.values(data.types_sentiment) as number[]
        if (entries.length > 0) {
          const avg = entries.reduce((sum: number, v: number) => sum + (v || 0), 0) / entries.length
          sentiment = Math.round(avg * 100) / 100
        }
      } else if (data?.sentiment != null) {
        sentiment = data.sentiment
      }

      console.log(`[LUNARCRUSH] Topic data: interactions=${interactions24h}, contributors=${contributorsActive}, posts=${postsActive}, sentiment=${sentiment}`)
    } catch (e) {
      console.log(`[LUNARCRUSH] Failed to parse topic response: ${e}`)
      return null
    }

    // If we got nothing useful, return null
    if (interactions24h === null && sentiment === null && contributorsActive === null && postsActive === null) {
      console.log(`[LUNARCRUSH] No data from topic endpoint for ${symbolLower}`)
      return null
    }

    return {
      galaxy_score: null,  // Not available on free tier
      alt_rank: null,      // Not available on free tier
      sentiment,
      interactions_24h: interactions24h,
      posts_active: postsActive,
      contributors_active: contributorsActive
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[LUNARCRUSH] Error fetching data: ${msg}`)
    return null
  }
}

/**
 * Fetch LunarCrush data with 6-hour cache check.
 * If cached data exists and is < 6h old, returns it without API call.
 * Otherwise fetches fresh data (caller handles the DB upsert).
 */
export async function fetchLunarCrushWithCache(
  tokenSymbol: string,
  tokenAddress: string,
  chainId: string,
  supabase: any
): Promise<LunarCrushData | null> {
  try {
    // Check cache first
    const { data: cached } = await supabase
      .from('token_community_cache')
      .select('galaxy_score, alt_rank, sentiment, interactions_24h, posts_active, contributors_active, lunarcrush_fetched_at')
      .eq('token_address', tokenAddress)
      .eq('chain_id', chainId)
      .single()

    if (cached?.lunarcrush_fetched_at) {
      const fetchedAt = new Date(cached.lunarcrush_fetched_at)
      const ageHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60)
      
      if (ageHours < 6) {
        console.log(`[LUNARCRUSH] Using cached data (${ageHours.toFixed(1)}h old) for ${tokenSymbol}`)
        return {
          galaxy_score: cached.galaxy_score,
          alt_rank: cached.alt_rank,
          sentiment: cached.sentiment,
          interactions_24h: cached.interactions_24h,
          posts_active: cached.posts_active,
          contributors_active: cached.contributors_active
        }
      }
    }

    // Cache miss or stale — fetch fresh
    console.log(`[LUNARCRUSH] Cache miss for ${tokenSymbol} — fetching fresh data`)
    return await fetchLunarCrush(tokenSymbol)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error(`[LUNARCRUSH] Cache check error: ${msg} — fetching fresh`)
    return await fetchLunarCrush(tokenSymbol)
  }
}
