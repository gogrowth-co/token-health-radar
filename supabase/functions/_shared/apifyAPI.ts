// Apify API integration for Twitter follower data
export async function fetchTwitterFollowers(twitterHandle: string): Promise<number | null> {
  if (!twitterHandle) {
    console.log('[APIFY] No Twitter handle provided');
    return null;
  }

  const apiKey = Deno.env.get('APIFY_API_KEY');
  if (!apiKey) {
    console.error('[APIFY] APIFY_API_KEY not configured');
    return null;
  }

  try {
    console.log(`[APIFY] Fetching Twitter followers for: @${twitterHandle}`);
    
    const apiUrl = `https://api.apify.com/v2/acts/practicaltools~cheap-simple-twitter-api/run-sync-get-dataset-items?token=${apiKey}`;
    console.log(`[APIFY] API URL: ${apiUrl}`);
    
    const requestBody = {
      endpoint: 'user/info',
      parameters: {
        userName: twitterHandle
      }
    };
    console.log(`[APIFY] Request body:`, JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      console.error(`[APIFY] HTTP error: ${response.status}`);
      return null;
    }

    // Defensive JSON parsing to handle empty or malformed responses
    const responseText = await response.text();
    console.log(`[APIFY] Raw response text:`, responseText);
    
    if (!responseText || responseText.trim() === '') {
      console.error(`[APIFY] Empty response body from Apify API`);
      return null;
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[APIFY] Parsed Apify response:`, JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error(`[APIFY] Failed to parse JSON response:`, parseError);
      console.error(`[APIFY] Response text that failed to parse:`, responseText);
      return null;
    }

    // For /run-sync-get-dataset-items endpoint, response is an array
    const followerCount = Array.isArray(data) ? data[0]?.followers || null : null;
    
    if (followerCount !== null) {
      console.log(`[APIFY] Successfully fetched Twitter followers for @${twitterHandle}: ${followerCount}`);
    } else {
      console.log(`[APIFY] No follower data found for @${twitterHandle}`);
    }

    return followerCount;
  } catch (error) {
    console.error(`[APIFY] Error fetching Twitter followers for @${twitterHandle}:`, error);
    return null;
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