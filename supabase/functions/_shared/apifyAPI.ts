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
    
    const response = await fetch(
      `https://api.apify.com/v2/acts/practicaltools~cheap-simple-twitter-api/run-sync?token=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'user/info',
          parameters: {
            userName: twitterHandle
          }
        })
      }
    );

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

    const followerCount = data?.data?.results?.[0]?.followers || null;
    
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