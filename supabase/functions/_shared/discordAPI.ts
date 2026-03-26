// Discord API integration for member count data
export async function fetchDiscordMemberCount(discordUrl: string): Promise<number | null> {
  if (!discordUrl) {
    console.log('[DISCORD] No Discord URL provided');
    return null;
  }

  try {
    console.log(`[DISCORD] Extracting invite code from URL: ${discordUrl}`);
    
    // Extract invite code from Discord URLs
    // Supports: discord.gg/{code}, discord.com/invite/{code}
    let inviteCode: string | null = null;
    const inviteCodeMatch = discordUrl.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9-]+)/);
    
    if (inviteCodeMatch) {
      inviteCode = inviteCodeMatch[1];
    } else {
      // Non-standard URL (e.g. https://aave.com/discord) — follow redirects to find the real invite
      console.log(`[DISCORD] Non-standard URL, following redirects: ${discordUrl}`);
      try {
        const redirectRes = await fetch(discordUrl, { method: 'HEAD', redirect: 'follow' });
        const finalUrl = redirectRes.url;
        console.log(`[DISCORD] Redirected to: ${finalUrl}`);
        const redirectMatch = finalUrl.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9-]+)/);
        if (redirectMatch) {
          inviteCode = redirectMatch[1];
        }
      } catch (redirectError) {
        console.error(`[DISCORD] Redirect follow failed:`, redirectError);
      }
    }
    
    if (!inviteCode) {
      console.log(`[DISCORD] Could not extract invite code from: ${discordUrl}`);
      return null;
    }
    
    console.log(`[DISCORD] Extracted invite code: ${inviteCode}`);
    
    const apiUrl = `https://discord.com/api/v9/invites/${inviteCode}?with_counts=true`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      console.error(`[DISCORD] HTTP error: ${response.status}`);
      return null;
    }

    const responseText = await response.text();
    
    if (!responseText || responseText.trim() === '') {
      console.error(`[DISCORD] Empty response from Discord API`);
      return null;
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[DISCORD] Failed to parse JSON response:`, parseError);
      return null;
    }

    const memberCount = data?.approximate_member_count || null;
    const guildName = data?.guild?.name || null;
    
    if (memberCount !== null) {
      console.log(`[DISCORD] Successfully fetched: ${guildName || 'server'}: ${memberCount} members`);
    } else {
      console.log(`[DISCORD] No member data found for invite: ${inviteCode}`);
    }

    return memberCount;
  } catch (error) {
    console.error(`[DISCORD] Error fetching Discord member count for ${discordUrl}:`, error);
    return null;
  }
}