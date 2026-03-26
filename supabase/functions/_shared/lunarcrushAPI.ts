// LunarCrush integration via the free lunarcrush.ai markdown endpoint
// Parses the LLM-optimized markdown response to extract social metrics

export interface LunarCrushData {
  galaxy_score: number | null;
  alt_rank: number | null;
  sentiment: number | null;
  interactions_24h: number | null;
  posts_active: number | null;
  contributors_active: number | null;
  social_dominance: number | null;
  trend: string | null;
}

/**
 * Fetch social metrics from the free lunarcrush.ai/topic endpoint.
 * Returns markdown which we parse for key metrics.
 */
export async function fetchLunarCrush(tokenSymbol: string): Promise<LunarCrushData | null> {
  if (!tokenSymbol || tokenSymbol === 'UNKNOWN' || tokenSymbol === 'SPL') {
    console.log(`[LUNARCRUSH] Invalid symbol "${tokenSymbol}" — skipping`);
    return null;
  }

  const symbolLower = tokenSymbol.toLowerCase();
  const url = `https://lunarcrush.ai/topic/${symbolLower}`;

  console.log(`[LUNARCRUSH] Fetching from: ${url}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'text/plain' }
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.log(`[LUNARCRUSH] Failed: ${res.status}`);
      return null;
    }

    const markdown = await res.text();

    if (!markdown || markdown.length < 100) {
      console.log(`[LUNARCRUSH] Empty or too-short response`);
      return null;
    }

    // Helper to parse a value, returning null for redacted [---] patterns
    const parseVal = (match: RegExpMatchArray | null): number | null => {
      if (!match) return null;
      const raw = match[1].trim();
      if (/^\[[-]+\]$/.test(raw)) return null;
      const cleaned = raw.replace(/,/g, '').replace(/%/g, '');
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    // Sentiment: "### Sentiment: 87%"
    const sentiment = parseVal(markdown.match(/### Sentiment:\s*([\d.,]+%|\[[-]+\])/));

    // AltRank: "AltRank #511"
    const altRankMatch = markdown.match(/AltRank\s*#(\d+)/);
    const altRank = altRankMatch ? parseInt(altRankMatch[1], 10) : null;

    // Galaxy Score: "### Galaxy Score: 65" or "### Galaxy Score: [-----]"
    const galaxyScoreMatch = markdown.match(/### Galaxy Score:\s*(.+)/);
    let galaxyScore: number | null = null;
    if (galaxyScoreMatch) {
      const val = galaxyScoreMatch[1].trim();
      if (!/^\[[-]+\]$/.test(val)) {
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) galaxyScore = parsed;
      }
    }

    // Engagements: "### Engagements: 123,456 (24h)"
    const engagementsMatch = markdown.match(/### Engagements:\s*(.+?)\s*\(24h\)/);
    let interactions24h: number | null = null;
    if (engagementsMatch) {
      const val = engagementsMatch[1].trim();
      if (!/^\[[-]+\]$/.test(val)) {
        const parsed = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(parsed)) interactions24h = parsed;
      }
    }

    // Mentions: "### Mentions: 456 (24h)"
    const mentionsMatch = markdown.match(/### Mentions:\s*(.+?)\s*\(24h\)/);
    let postsActive: number | null = null;
    if (mentionsMatch) {
      const val = mentionsMatch[1].trim();
      if (!/^\[[-]+\]$/.test(val)) {
        const parsed = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(parsed)) postsActive = parsed;
      }
    }

    // Creators: "### Creators: 234 (24h)"
    const creatorsMatch = markdown.match(/### Creators:\s*(.+?)\s*\(24h\)/);
    let contributorsActive: number | null = null;
    if (creatorsMatch) {
      const val = creatorsMatch[1].trim();
      if (!/^\[[-]+\]$/.test(val)) {
        const parsed = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(parsed)) contributorsActive = parsed;
      }
    }

    // Social Dominance: "### Social Dominance: 0.534%"
    const socialDomMatch = markdown.match(/### Social Dominance:\s*([\d.,]+%|\[[-]+\])/);
    const socialDominance = parseVal(socialDomMatch);

    // Trend: look for "Trend: up" or "trending up/down" patterns
    let trend: string | null = null;
    const trendMatch = markdown.match(/(?:###\s*)?Trend[:\s]+(\w+)/i);
    if (trendMatch) {
      const t = trendMatch[1].toLowerCase();
      if (t === 'up' || t === 'bullish' || t === 'rising') trend = 'up';
      else if (t === 'down' || t === 'bearish' || t === 'falling') trend = 'down';
      else if (t === 'flat' || t === 'neutral' || t === 'stable') trend = 'flat';
    }
    // Fallback: infer from sentiment themes or summary text
    if (!trend) {
      const lower = markdown.toLowerCase();
      if (lower.includes('trending up') || lower.includes('trend is up') || lower.includes('bullish trend')) trend = 'up';
      else if (lower.includes('trending down') || lower.includes('trend is down') || lower.includes('bearish trend')) trend = 'down';
    }

    console.log(`[LUNARCRUSH] Parsed: sentiment=${sentiment}, altRank=${altRank}, galaxyScore=${galaxyScore}, interactions=${interactions24h}, posts=${postsActive}, contributors=${contributorsActive}, socialDominance=${socialDominance}, trend=${trend}`);

    // If we got nothing at all, return null
    if (sentiment === null && altRank === null && galaxyScore === null && 
        interactions24h === null && postsActive === null && contributorsActive === null &&
        socialDominance === null) {
      console.log(`[LUNARCRUSH] No parseable data for ${symbolLower}`);
      return null;
    }

    return {
      galaxy_score: galaxyScore,
      alt_rank: altRank,
      sentiment,
      interactions_24h: interactions24h,
      posts_active: postsActive,
      contributors_active: contributorsActive,
      social_dominance: socialDominance,
      trend
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[LUNARCRUSH] Error: ${msg}`);
    return null;
  }
}

/**
 * Fetch LunarCrush data with 6-hour cache check.
 */
export async function fetchLunarCrushWithCache(
  tokenSymbol: string,
  tokenAddress: string,
  chainId: string,
  supabase: any
): Promise<LunarCrushData | null> {
  try {
    const { data: cached } = await supabase
      .from('token_community_cache')
      .select('galaxy_score, alt_rank, sentiment, interactions_24h, posts_active, contributors_active, social_dominance, trend, lunarcrush_fetched_at')
      .eq('token_address', tokenAddress)
      .eq('chain_id', chainId)
      .single();

    if (cached?.lunarcrush_fetched_at) {
      const fetchedAt = new Date(cached.lunarcrush_fetched_at);
      const ageHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
      
      if (ageHours < 6) {
        console.log(`[LUNARCRUSH] Using cached data (${ageHours.toFixed(1)}h old) for ${tokenSymbol}`);
        return {
          galaxy_score: cached.galaxy_score,
          alt_rank: cached.alt_rank,
          sentiment: cached.sentiment,
          interactions_24h: cached.interactions_24h,
          posts_active: cached.posts_active,
          contributors_active: cached.contributors_active,
          social_dominance: cached.social_dominance,
          trend: cached.trend
        };
      }
    }

    console.log(`[LUNARCRUSH] Cache miss for ${tokenSymbol} — fetching fresh data`);
    return await fetchLunarCrush(tokenSymbol);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[LUNARCRUSH] Cache check error: ${msg} — fetching fresh`);
    return await fetchLunarCrush(tokenSymbol);
  }
}
