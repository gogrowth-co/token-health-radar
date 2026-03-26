// Apify API integration for Twitter follower data with CoinGecko fallback

// CoinGecko fallback for Twitter followers
async function fetchTwitterFromCoinGecko(twitterHandle: string): Promise<number | null> {
  try {
    console.log(`[COINGECKO-TWITTER] Attempting fallback for @${twitterHandle}`);
    
    const COINGECKO_API_KEY = Deno.env.get('COINGECKO_API_KEY');
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }
    
    // Search for token by Twitter handle
    const searchUrl = `https://pro-api.coingecko.com/api/v3/search?query=${encodeURIComponent(twitterHandle)}`;
    const searchRes = await fetch(searchUrl, { headers });
    
    if (!searchRes.ok) {
      console.log(`[COINGECKO-TWITTER] Search failed: ${searchRes.status}`);
      return null;
    }
    
    const searchData = await searchRes.json();
    const coins = searchData.coins || [];
    
    // Find a matching coin by checking if twitter_screen_name matches
    for (const coin of coins.slice(0, 5)) {
      const coinUrl = `https://pro-api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false`;
      const coinRes = await fetch(coinUrl, { headers });
      
      if (!coinRes.ok) continue;
      
      const coinData = await coinRes.json();
      const coinTwitter = coinData.links?.twitter_screen_name?.toLowerCase();
      
      if (coinTwitter === twitterHandle.toLowerCase()) {
        const followers = coinData.community_data?.twitter_followers;
        if (followers && followers > 0) {
          console.log(`[COINGECKO-TWITTER] Found Twitter followers for @${twitterHandle}: ${followers}`);
          return followers;
        }
      }
    }
    
    console.log(`[COINGECKO-TWITTER] No matching token found for @${twitterHandle}`);
    return null;
  } catch (error) {
    console.error(`[COINGECKO-TWITTER] Error:`, error);
    return null;
  }
}

// Fetch Twitter followers from CoinGecko using coingecko_id directly
export async function fetchTwitterFromCoinGeckoId(coingeckoId: string): Promise<number | null> {
  if (!coingeckoId) return null;
  
  try {
    console.log(`[COINGECKO-TWITTER] Fetching by ID: ${coingeckoId}`);
    
    const COINGECKO_API_KEY = Deno.env.get('COINGECKO_API_KEY');
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    if (COINGECKO_API_KEY) {
      headers['x-cg-pro-api-key'] = COINGECKO_API_KEY;
    }
    
    const url = `https://pro-api.coingecko.com/api/v3/coins/${coingeckoId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=false`;
    const res = await fetch(url, { headers });
    
    if (!res.ok) {
      console.log(`[COINGECKO-TWITTER] Fetch failed: ${res.status}`);
      return null;
    }
    
    const data = await res.json();
    const followers = data.community_data?.twitter_followers;
    
    if (followers && followers > 0) {
      console.log(`[COINGECKO-TWITTER] Found followers via ID ${coingeckoId}: ${followers}`);
      return followers;
    }
    
    return null;
  } catch (error) {
    console.error(`[COINGECKO-TWITTER] Error fetching by ID:`, error);
    return null;
  }
}

export async function fetchTwitterFollowers(twitterHandle: string, coingeckoId?: string): Promise<number | null> {
  if (!twitterHandle) {
    console.log('[APIFY] No Twitter handle provided');
    return null;
  }

  const apiKey = Deno.env.get('APIFY_API_KEY');
  
  // If no Apify key, go straight to CoinGecko fallback
  if (!apiKey) {
    console.log('[APIFY] APIFY_API_KEY not configured, using CoinGecko fallback');
    if (coingeckoId) {
      return await fetchTwitterFromCoinGeckoId(coingeckoId);
    }
    return await fetchTwitterFromCoinGecko(twitterHandle);
  }

  try {
    console.log(`[APIFY] Fetching Twitter followers for: @${twitterHandle}`);
    
    const apiUrl = `https://api.apify.com/v2/acts/practicaltools~cheap-simple-twitter-api/run-sync-get-dataset-items?token=${apiKey}`;
    
    const requestBody = {
      endpoint: 'user/info',
      parameters: {
        userName: twitterHandle
      }
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`[APIFY] HTTP error: ${response.status}, falling back to CoinGecko`);
      if (coingeckoId) {
        return await fetchTwitterFromCoinGeckoId(coingeckoId);
      }
      return await fetchTwitterFromCoinGecko(twitterHandle);
    }

    // Defensive JSON parsing to handle empty or malformed responses
    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      console.error(`[APIFY] Empty response body, falling back to CoinGecko`);
      if (coingeckoId) {
        return await fetchTwitterFromCoinGeckoId(coingeckoId);
      }
      return await fetchTwitterFromCoinGecko(twitterHandle);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[APIFY] Failed to parse JSON response, falling back to CoinGecko`);
      if (coingeckoId) {
        return await fetchTwitterFromCoinGeckoId(coingeckoId);
      }
      return await fetchTwitterFromCoinGecko(twitterHandle);
    }

    // For /run-sync-get-dataset-items endpoint, response is an array
    const followerCount = Array.isArray(data) ? data[0]?.followers || null : null;
    
    if (followerCount !== null && followerCount > 0) {
      console.log(`[APIFY] Successfully fetched Twitter followers for @${twitterHandle}: ${followerCount}`);
      return followerCount;
    }
    
    // No data from Apify, try CoinGecko fallback
    console.log(`[APIFY] No follower data found, falling back to CoinGecko`);
    if (coingeckoId) {
      return await fetchTwitterFromCoinGeckoId(coingeckoId);
    }
    return await fetchTwitterFromCoinGecko(twitterHandle);
    
  } catch (error) {
    console.error(`[APIFY] Error fetching Twitter followers, falling back to CoinGecko:`, error);
    if (coingeckoId) {
      return await fetchTwitterFromCoinGeckoId(coingeckoId);
    }
    return await fetchTwitterFromCoinGecko(twitterHandle);
  }
}

// Direct HTML fetch fallback for Telegram member count
async function fetchTelegramDirect(telegramUrl: string): Promise<{ members: number | null, name?: string }> {
  try {
    console.log(`[TELEGRAM-DIRECT] Fetching HTML from: ${telegramUrl}`);
    const res = await fetch(telegramUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot)' }
    });
    if (!res.ok) {
      console.error(`[TELEGRAM-DIRECT] HTTP error: ${res.status}`);
      return { members: null };
    }
    const html = await res.text();
    
    // Parse member count from HTML meta or page content
    // Pattern: <div class="tgme_page_extra">35 546 members, 1 138 online</div>
    const extraMatch = html.match(/tgme_page_extra[^>]*>([^<]+)</);
    if (extraMatch) {
      const statsText = extraMatch[1];
      const memberMatch = statsText.match(/([\d\s]+)\s*members/i);
      if (memberMatch) {
        const count = parseInt(memberMatch[1].replace(/\s/g, ''), 10);
        console.log(`[TELEGRAM-DIRECT] Extracted member count: ${count}`);
        
        const titleMatch = html.match(/tgme_page_title[^>]*><span[^>]*>([^<]+)/);
        return { members: count, name: titleMatch?.[1]?.trim() || '' };
      }
      // Also check for "subscribers" (channels use this)
      const subMatch = statsText.match(/([\d\s]+)\s*subscribers/i);
      if (subMatch) {
        const count = parseInt(subMatch[1].replace(/\s/g, ''), 10);
        console.log(`[TELEGRAM-DIRECT] Extracted subscriber count: ${count}`);
        return { members: count };
      }
    }
    
    // Fallback: check og:description meta tag which often has member counts
    const ogMatch = html.match(/og:description[^>]*content="([^"]+)"/);
    if (ogMatch) {
      const memberMatch = ogMatch[1].match(/([\d\s]+)\s*(?:members|subscribers)/i);
      if (memberMatch) {
        const count = parseInt(memberMatch[1].replace(/\s/g, ''), 10);
        console.log(`[TELEGRAM-DIRECT] Extracted from og:description: ${count}`);
        return { members: count };
      }
    }
    
    console.log(`[TELEGRAM-DIRECT] Could not find member count in HTML`);
    return { members: null };
  } catch (error) {
    console.error(`[TELEGRAM-DIRECT] Error:`, error);
    return { members: null };
  }
}

// Telegram member count fetching — Apify first, then direct HTML fallback
export async function fetchTelegramMembers(telegramUrl: string): Promise<{ members: number | null, name?: string, description?: string }> {
  if (!telegramUrl) {
    console.log('[TELEGRAM] No Telegram URL provided');
    return { members: null };
  }

  const apiKey = Deno.env.get('APIFY_API_KEY');
  
  // If no Apify key, go straight to direct fetch
  if (!apiKey) {
    console.log('[TELEGRAM] No APIFY_API_KEY, using direct HTML fallback');
    const result = await fetchTelegramDirect(telegramUrl);
    return { members: result.members, name: result.name };
  }

  try {
    console.log(`[TELEGRAM] Fetching member count for: ${telegramUrl}`);
    
    const apiUrl = `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${apiKey}`;
    
    const requestBody = {
      startUrls: [{ url: telegramUrl }],
      pageFunction: "async function pageFunction(context) {\n  const title = document.querySelector('.tgme_page_title span')?.innerText.trim();\n  const stats = document.querySelector('.tgme_page_extra')?.innerText.trim();\n  const description = document.querySelector('.tgme_page_description')?.innerText.trim();\n  return { title, stats, description };\n}"
    };
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`[TELEGRAM] Apify HTTP error: ${response.status}, falling back to direct fetch`);
      const result = await fetchTelegramDirect(telegramUrl);
      return { members: result.members, name: result.name };
    }

    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      console.error(`[TELEGRAM] Empty Apify response, falling back to direct fetch`);
      const result = await fetchTelegramDirect(telegramUrl);
      return { members: result.members, name: result.name };
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[TELEGRAM] Failed to parse Apify response, falling back to direct fetch`);
      const result = await fetchTelegramDirect(telegramUrl);
      return { members: result.members, name: result.name };
    }

    const result = Array.isArray(data) ? data[0] : null;
    if (!result || !result.stats) {
      console.log(`[TELEGRAM] No Apify data, falling back to direct fetch`);
      const directResult = await fetchTelegramDirect(telegramUrl);
      return { members: directResult.members, name: directResult.name };
    }

    const statsText = result.stats;
    const memberMatch = statsText.match(/([\d\s]+) members/);
    
    if (memberMatch) {
      const memberCount = parseInt(memberMatch[1].replace(/\s/g, ''), 10);
      console.log(`[TELEGRAM] Extracted member count: ${memberCount}`);
      return { members: memberCount, name: result.title || '', description: result.description || '' };
    }
    
    console.log(`[TELEGRAM] Could not parse Apify stats, falling back to direct fetch`);
    const directResult = await fetchTelegramDirect(telegramUrl);
    return { members: directResult.members, name: directResult.name };

  } catch (error) {
    console.error(`[TELEGRAM] Apify error, falling back to direct fetch:`, error);
    const result = await fetchTelegramDirect(telegramUrl);
    return { members: result.members, name: result.name };
  }
}