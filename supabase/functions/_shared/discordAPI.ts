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
    const inviteCodeMatch = discordUrl.match(/(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9]+)/);
    
    if (!inviteCodeMatch) {
      console.log(`[DISCORD] Invalid Discord URL format: ${discordUrl}`);
      return null;
    }
    
    const inviteCode = inviteCodeMatch[1];
    console.log(`[DISCORD] Extracted invite code: ${inviteCode}`);
    
    const apiUrl = `https://discord.com/api/v9/invites/${inviteCode}?with_counts=true`;
    console.log(`[DISCORD] API URL: ${apiUrl}`);
    
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
    console.log(`[DISCORD] Raw response:`, responseText);
    
    if (!responseText || responseText.trim() === '') {
      console.error(`[DISCORD] Empty response from Discord API`);
      return null;
    }

    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`[DISCORD] Parsed Discord response:`, JSON.stringify(data, null, 2));
    } catch (parseError) {
      console.error(`[DISCORD] Failed to parse JSON response:`, parseError);
      return null;
    }

    const memberCount = data?.approximate_member_count || null;
    const onlineCount = data?.approximate_presence_count || null;
    const guildName = data?.guild?.name || null;
    
    if (memberCount !== null) {
      console.log(`[DISCORD] Successfully fetched Discord data for ${guildName || 'server'}: ${memberCount} members (${onlineCount || 0} online)`);
    } else {
      console.log(`[DISCORD] No member data found for invite: ${inviteCode}`);
    }

    return memberCount;
  } catch (error) {
    console.error(`[DISCORD] Error fetching Discord member count for ${discordUrl}:`, error);
    return null;
  }
}