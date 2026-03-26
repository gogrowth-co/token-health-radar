// LunarCrush integration via the free lunarcrush.ai markdown endpoint
// Parses the LLM-optimized markdown response to extract social metrics

export interface LunarCrushData {
  galaxy_score: number | null;
  alt_rank: number | null;
  sentiment: number | null;
  interactions_24h: number | null;
  posts_active: number | null;
  contributors_active: number | null;
}

/**
 * Parse a numeric value from markdown text, handling redacted values like [---]
 */
function parseMetricValue(text: string, pattern: RegExp): number | null {
  const match = text.match(pattern);
  if (!match) return null;
  const val = match[1].replace(/,/g, '').replace(/\$/g, '').replace(/%/g, '');
  // Check if value is redacted (contains only dashes/brackets)
  if (/^\[[-]+\]$/.test(match[1].trim()) || /^[-]+$/.test(val.trim())) return null;
  const num = parseFloat(val);
  return isNaN(num) ? null : num;
}

/**
 * Fetch social metrics from the free lunarcrush.ai/topic endpoint.
 * This returns markdown which we parse for key metrics.
 * No paid subscription required.
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

    // Parse Sentiment: "### Sentiment: 87%"
    const sentiment = parseMetricValue(markdown, /### Sentiment:\s*([\d.]+)%/);

    // Parse AltRank: "AltRank #511"
    const altRankMatch = markdown.match(/AltRank\s*#(\d+)/);
    const altRank = altRankMatch ? parseInt(altRankMatch[1], 10) : null;

    // Parse Galaxy Score: "### Galaxy Score: [-----]" or "### Galaxy Score: 65"
    const galaxyScoreMatch = markdown.match(/### Galaxy Score:\s*(.+)/);
    let galaxyScore: number | null = null;
    if (galaxyScoreMatch) {
      const val = galaxyScoreMatch[1].trim();
      if (!/^\[[-]+\]$/.test(val)) {
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) galaxyScore = parsed;
      }
    }

    // Parse Engagements (interactions): "### Engagements: [------] (24h)" or "### Engagements: 123,456 (24h)"
    const engagementsMatch = markdown.match(/### Engagements:\s*(.+?)\s*\(24h\)/);
    let interactions24h: number | null = null;
    if (engagementsMatch) {
      const val = engagementsMatch[1].trim();
      if (!/^\[[-]+\]$/.test(val)) {
        const parsed = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(parsed)) interactions24h = parsed;
      }
    }

    // Parse Mentions as posts: "### Mentions: [---] (24h)" or "### Mentions: 456 (24h)"
    const mentionsMatch = markdown.match(/### Mentions:\s*(.+?)\s*\(24h\)/);
    let postsActive: number | null = null;
    if (mentionsMatch) {
      const val = mentionsMatch[1].trim();
      if (!/^\[[-]+\]$/.test(val)) {
        const parsed = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(parsed)) postsActive = parsed;
      }
    }

    // Parse Creators as contributors: "### Creators: [---] (24h)" or "### Creators: 234 (24h)"
    const creatorsMatch = markdown.match(/### Creators:\s*(.+?)\s*\(24h\)/);
    let contributorsActive: number | null = null;
    if (creatorsMatch) {
      const val = creatorsMatch[1].trim();
      if (!/^\[[-]+\]$/.test(val)) {
        const parsed = parseFloat(val.replace(/,/g, ''));
        if (!isNaN(parsed)) contributorsActive = parsed;
      }
    }

    console.log(`[LUNARCRUSH] Parsed: sentiment=${sentiment}, altRank=${altRank}, galaxyScore=${galaxyScore}, interactions=${interactions24h}, posts=${postsActive}, contributors=${contributorsActive}`);

    // If we got nothing at all, return null
    if (sentiment === null && altRank === null && galaxyScore === null && 
        interactions24h === null && postsActive === null && contributorsActive === null) {
      console.log(`[LUNARCRUSH] No parseable data for ${symbolLower}`);
      return null;
    }

    return {
      galaxy_score: galaxyScore,
      alt_rank: altRank,
      sentiment,
      interactions_24h: interactions24h,
      posts_active: postsActive,
      contributors_active: contributorsActive
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
      .select('galaxy_score, alt_rank, sentiment, interactions_24h, posts_active, contributors_active, lunarcrush_fetched_at')
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
          contributors_active: cached.contributors_active
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
