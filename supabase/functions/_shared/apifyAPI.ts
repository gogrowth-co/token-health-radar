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

// Telegram member count fetching using Web Scraper
export async function fetchTelegramMembers(telegramUrl: string): Promise<{ members: number | null, name?: string, description?: string }> {
  if (!telegramUrl) {
    console.log('[TELEGRAM] No Telegram URL provided');
    return { members: null };
  }

  const apiKey = Deno.env.get('APIFY_API_KEY');
  if (!apiKey) {
    console.error('[TELEGRAM] APIFY_API_KEY not configured');
    return { members: null };
  }

  try {
    console.log(`[TELEGRAM] Fetching member count for: ${telegramUrl}`);
    
    const apiUrl = `https://api.apify.com/v2/acts/apify~web-scraper/run-sync-get-dataset-items?token=${apiKey}`;
    
    const requestBody = {
      startUrls: [{ url: telegramUrl }],
      pageFunction: "async function pageFunction(context) {\n  const title = document.querySelector('.tgme_page_title span')?.innerText.trim();\n  const stats = document.querySelector('.tgme_page_extra')?.innerText.trim();\n  const description = document.querySelector('.tgme_page_description')?.innerText.trim();\n  return { title, stats, description };\n}"
    };
    
    console.log(`[TELEGRAM] Request body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`[TELEGRAM] HTTP error: ${response.status}`);
      return { members: null };
    }

    const responseText = await response.text();
    console.log(`[TELEGRAM] Raw response text:`, responseText);
    
    if (!responseText || responseText.trim() === '') {
      console.error(`[TELEGRAM] Empty response body from Apify API`);
      return { members: null };
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[TELEGRAM] Parsed response:`, JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error(`[TELEGRAM] Failed to parse JSON response:`, parseError);
      return { members: null };
    }

    // Extract data from first result
    const result = Array.isArray(data) ? data[0] : null;
    if (!result || !result.stats) {
      console.log(`[TELEGRAM] No member data found in response`);
      return { members: null };
    }

    // Parse member count from stats like "35 546 members, 1 138 online"
    const statsText = result.stats;
    const memberMatch = statsText.match(/([\d\s]+) members/);
    
    if (memberMatch) {
      // Remove spaces and parse number
      const memberCount = parseInt(memberMatch[1].replace(/\s/g, ''), 10);
      console.log(`[TELEGRAM] Successfully extracted member count: ${memberCount}`);
      
      return {
        members: memberCount,
        name: result.title || '',
        description: result.description || ''
      };
    } else {
      console.log(`[TELEGRAM] Could not parse member count from stats: ${statsText}`);
      return { members: null };
    }

  } catch (error) {
    console.error(`[TELEGRAM] Error fetching member count:`, error);
    return { members: null };
  }
}