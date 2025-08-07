import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  normalizeChainId, 
  getChainConfigByMoralisId 
} from '../_shared/chainConfig.ts'
import {
  fetchGoPlusSecurity,
  fetchWebacySecurity,
  fetchMoralisMetadata,
  fetchMoralisPriceData,
  fetchMoralisTokenStats,
  fetchMoralisTokenPairs,
  fetchMoralisTokenOwners,
  fetchGitHubRepoData,
  calculateSecurityScore,
  calculateLiquidityScore,
  calculateTokenomicsScore,
  calculateDevelopmentScore
} from '../_shared/apiClients.ts'
import { fetchDeFiLlamaTVL } from '../_shared/defillama.ts'
import { fetchTwitterFollowers, fetchTelegramMembers } from '../_shared/apifyAPI.ts'
import { fetchDiscordMemberCount } from '../_shared/discordAPI.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

// Discord URL validation helper
function isValidDiscordUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const discordPattern = /(?:discord\.gg|discord\.com\/invite)\/([a-zA-Z0-9]+)/;
  return discordPattern.test(url);
}

// Telegram URL validation helper
function isValidTelegramUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const telegramPattern = /(?:t\.me|telegram\.me|telegram\.dog)\/(?:s\/|joinchat\/|\+)?([a-zA-Z0-9_]+)/;
  return telegramPattern.test(url);
}

// CoinMarketCap fallback for GitHub URL
async function fetchCoinMarketCapGithubUrl(tokenAddress: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available`);
      return '';
    }

    console.log(`[CMC] Fetching GitHub URL for token: ${tokenAddress}`);
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}&aux=urls`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`[CMC] API request failed: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    console.log(`[CMC] API response status:`, data.status);

    if (data.status?.error_code !== 0) {
      console.log(`[CMC] API error:`, data.status?.error_message);
      return '';
    }

    // Extract token data - CMC returns data keyed by contract address
    const tokenData = Object.values(data.data || {})[0] as any;
    
    if (!tokenData) {
      console.log(`[CMC] No token data found for address: ${tokenAddress}`);
      return '';
    }

    console.log(`[CMC] Found token:`, tokenData.name, tokenData.symbol);

    // Extract GitHub URL from source_code URLs
    const urls = tokenData.urls || {};
    const sourceCodeUrls = urls.source_code || [];
    
    console.log(`[CMC] Source code URLs found:`, sourceCodeUrls.length);

    // Find GitHub URL in source code links
    const githubUrl = sourceCodeUrls.find((url: string) => 
      url && url.includes('github.com')
    );

    if (githubUrl) {
      console.log(`[CMC] GitHub URL found: ${githubUrl}`);
      return githubUrl;
    } else {
      console.log(`[CMC] No GitHub URL found in source code URLs`);
      return '';
    }

  } catch (error) {
    console.error(`[CMC] Error fetching GitHub URL:`, error);
    return '';
  }
}

// CoinMarketCap fallback for Discord URL
async function fetchCoinMarketCapDiscordUrl(tokenAddress: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available for Discord fallback`);
      return '';
    }

    console.log(`[CMC] Fetching Discord URL for token: ${tokenAddress}`);
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}&aux=urls`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`[CMC] Discord fallback API request failed: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    console.log(`[CMC] Discord fallback API response status:`, data.status);

    if (data.status?.error_code !== 0) {
      console.log(`[CMC] Discord fallback API error:`, data.status?.error_message);
      return '';
    }

    // Extract token data - CMC returns data keyed by contract address
    const tokenData = Object.values(data.data || {})[0] as any;
    
    if (!tokenData) {
      console.log(`[CMC] No token data found for Discord fallback: ${tokenAddress}`);
      return '';
    }

    console.log(`[CMC] Found token for Discord fallback:`, tokenData.name, tokenData.symbol);

    // Extract Discord URL from chat URLs (CoinMarketCap stores Discord/Telegram in chat category)
    const urls = tokenData.urls || {};
    const chatUrls = urls.chat || [];
    
    console.log(`[CMC] Chat URLs found:`, chatUrls.length);

    // Find Discord URL in chat links
    const discordUrl = chatUrls.find((url: string) => 
      url && (url.includes('discord.gg') || url.includes('discord.com/invite'))
    );

    if (discordUrl && isValidDiscordUrl(discordUrl)) {
      console.log(`[CMC] Discord URL found: ${discordUrl}`);
      return discordUrl;
    } else {
      console.log(`[CMC] No valid Discord URL found in chat URLs`);
      return '';
    }

  } catch (error) {
    console.error(`[CMC] Error fetching Discord URL:`, error);
    return '';
  }
}

// CoinMarketCap fallback for Telegram URL
async function fetchCoinMarketCapTelegramUrl(tokenAddress: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available for Telegram fallback`);
      return '';
    }

    console.log(`[CMC] Fetching Telegram URL for token: ${tokenAddress}`);
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}&aux=urls`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`[CMC] Telegram fallback API request failed: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    console.log(`[CMC] Telegram fallback API response status:`, data.status);

    if (data.status?.error_code !== 0) {
      console.log(`[CMC] Telegram fallback API error:`, data.status?.error_message);
      return '';
    }

    // Extract token data - CMC returns data keyed by contract address
    const tokenData = Object.values(data.data || {})[0] as any;
    
    if (!tokenData) {
      console.log(`[CMC] No token data found for Telegram fallback: ${tokenAddress}`);
      return '';
    }

    console.log(`[CMC] Found token for Telegram fallback:`, tokenData.name, tokenData.symbol);

    // Extract Telegram URL from chat URLs (CoinMarketCap stores Discord/Telegram in chat category)
    const chatUrls = tokenData.urls?.chat || [];
    console.log(`[CMC] Found ${chatUrls.length} chat URLs for Telegram extraction`);
    
    for (const chatUrl of chatUrls) {
      console.log(`[CMC] Checking chat URL for Telegram:`, chatUrl);
      if (chatUrl && (chatUrl.includes('t.me') || chatUrl.includes('telegram'))) {
        console.log(`[CMC] Found Telegram URL via fallback: ${chatUrl}`);
        return chatUrl;
      }
    }

    console.log(`[CMC] No Telegram URL found in chat URLs via fallback`);
    return '';

  } catch (error) {
    console.error(`[CMC] Error fetching Telegram URL:`, error);
    return '';
  }
}

// Fetch CEX count from CoinGecko API
async function fetchCoinGeckoCexCount(tokenAddress: string, chainId: string): Promise<number> {
  console.log(`[CEX] Fetching CEX count for ${tokenAddress} on chain ${chainId}`);
  
  const chainConfig = getChainConfigByMoralisId(chainId);
  if (!chainConfig || !chainConfig.gecko) {
    console.log(`[CEX] No CoinGecko platform mapping for chain: ${chainId}`);
    return 0;
  }

  // Map chain to CoinGecko platform
  const platformMap: Record<string, string> = {
    'eth': 'ethereum',
    'bsc': 'binance-smart-chain', 
    'polygon_pos': 'polygon-pos',
    'arbitrum': 'arbitrum-one',
    'optimism': 'optimistic-ethereum',
    'base': 'base'
  };
  
  const coinGeckoPlatform = platformMap[chainConfig.gecko] || chainConfig.gecko;
  console.log(`[CEX] Using CoinGecko platform: ${coinGeckoPlatform}`);

  const cexAllowlist = [
    "Binance", "Coinbase", "OKX", "KuCoin", "Gate.io", "Kraken", 
    "Bitfinex", "MEXC", "Bitget", "Huobi", "Bybit", "Crypto.com"
  ];

  try {
    // Step 1: Get CoinGecko ID for the token
    console.log(`[CEX] Step 1: Getting CoinGecko ID...`);
    const idResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoPlatform}/contract/${tokenAddress.toLowerCase()}`,
      {
        headers: {
          'accept': 'application/json',
          ...(Deno.env.get('COINGECKO_API_KEY') && {
            'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY')
          })
        }
      }
    );

    if (!idResponse.ok) {
      if (idResponse.status === 404) {
        console.log(`[CEX] Token not found on CoinGecko`);
        return 0;
      }
      throw new Error(`CoinGecko API error: ${idResponse.status}`);
    }

    const tokenData = await idResponse.json();
    const coinGeckoId = tokenData.id;
    console.log(`[CEX] Found CoinGecko ID: ${coinGeckoId}`);

    // Step 2: Get token tickers/exchanges
    console.log(`[CEX] Step 2: Getting exchange listings...`);
    const tickersResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}/tickers`,
      {
        headers: {
          'accept': 'application/json',
          ...(Deno.env.get('COINGECKO_API_KEY') && {
            'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY')
          })
        }
      }
    );

    if (!tickersResponse.ok) {
      throw new Error(`CoinGecko tickers API error: ${tickersResponse.status}`);
    }

    const tickersData = await tickersResponse.json();
    const tickers = tickersData.tickers || [];
    
    console.log(`[CEX] Found ${tickers.length} total tickers`);

    // Step 3: Count unique CEX exchanges
    const cexExchanges = new Set<string>();
    
    for (const ticker of tickers) {
      const marketName = ticker.market?.name;
      if (marketName && cexAllowlist.includes(marketName)) {
        cexExchanges.add(marketName);
        console.log(`[CEX] Found CEX: ${marketName}`);
      }
    }

    const cexCount = cexExchanges.size;
    console.log(`[CEX] Total unique CEX exchanges: ${cexCount}`);
    
    return cexCount;

  } catch (error) {
    console.error(`[CEX] Error fetching CEX count:`, error);
    return 0; // Default to 0 on error
  }
}

// Fetch comprehensive token data from multiple APIs using Moralis as primary metadata source
async function fetchTokenDataFromAPIs(tokenAddress: string, chainId: string) {
  console.log(`[SCAN] Fetching token data from multiple APIs for: ${tokenAddress} on chain: ${chainId}`);
  
  const chainConfig = getChainConfigByMoralisId(chainId);
  if (!chainConfig) {
    console.log(`[SCAN] Unsupported chain: ${chainId}`);
    return null;
  }

  try {
    // Fetch data from all APIs in parallel - prioritize Webacy for security
    console.log(`[SCAN] Calling external APIs for fresh data...`);
    const apiStartTime = Date.now();
    
    // Add detailed API key debugging BEFORE making calls
    console.log(`[SCAN] === API KEY STATUS CHECK ===`);
    console.log(`[SCAN] WEBACY_API_KEY configured: ${!!Deno.env.get('WEBACY_API_KEY')}`);
    console.log(`[SCAN] GOPLUS_APP_KEY configured: ${!!Deno.env.get('GOPLUS_APP_KEY')}`);
    console.log(`[SCAN] GOPLUS_APP_SECRET configured: ${!!Deno.env.get('GOPLUS_APP_SECRET')}`);
    console.log(`[SCAN] MORALIS_API_KEY configured: ${!!Deno.env.get('MORALIS_API_KEY')}`);
    console.log(`[SCAN] COINGECKO_API_KEY configured: ${!!Deno.env.get('COINGECKO_API_KEY')}`);
    if (Deno.env.get('WEBACY_API_KEY')) {
      const key = Deno.env.get('WEBACY_API_KEY')!;
      console.log(`[SCAN] WEBACY_API_KEY length: ${key.length}, starts with: ${key.substring(0, 8)}...`);
    }
    if (Deno.env.get('GOPLUS_APP_KEY')) {
      const key = Deno.env.get('GOPLUS_APP_KEY')!;
      console.log(`[SCAN] GOPLUS_APP_KEY length: ${key.length}, starts with: ${key.substring(0, 8)}...`);
    }
    
    // Phase 1: Core data APIs (always needed)
    const [webacySecurityData, goplusSecurityData, priceData, metadataData] = await Promise.allSettled([
      fetchWebacySecurity(tokenAddress, chainId),
      fetchGoPlusSecurity(tokenAddress, chainId),
      fetchMoralisPriceData(tokenAddress, chainId),
      fetchMoralisMetadata(tokenAddress, chainId)
    ]);

    // Phase 2: Enhanced tokenomics APIs (new features)
    console.log(`[SCAN] Fetching enhanced tokenomics data...`);
    const [statsData, pairsData, ownersData, tvlData] = await Promise.allSettled([
      fetchMoralisTokenStats(tokenAddress, chainId),
      fetchMoralisTokenPairs(tokenAddress, chainId),
      fetchMoralisTokenOwners(tokenAddress, chainId),
      fetchDeFiLlamaTVL(tokenAddress)
    ]);

    // Phase 3: CEX listings data
    console.log(`[SCAN] Fetching CEX listings data...`);
    const [cexData] = await Promise.allSettled([
      fetchCoinGeckoCexCount(tokenAddress, chainId)
    ]);

    const apiEndTime = Date.now();
    console.log(`[SCAN] API calls completed in ${apiEndTime - apiStartTime}ms`);

    // Log detailed API results for debugging
    const webacySecurity = webacySecurityData.status === 'fulfilled' ? webacySecurityData.value : null;
    const goplusSecurity = goplusSecurityData.status === 'fulfilled' ? goplusSecurityData.value : null;
    const priceDataResult = priceData.status === 'fulfilled' ? priceData.value : null;
    const metadata = metadataData.status === 'fulfilled' ? metadataData.value : null;
    
    // Enhanced tokenomics data
    const stats = statsData.status === 'fulfilled' ? statsData.value : null;
    const pairs = pairsData.status === 'fulfilled' ? pairsData.value : null;
    const owners = ownersData.status === 'fulfilled' ? ownersData.value : null;
    const tvl = tvlData.status === 'fulfilled' ? tvlData.value : null;
    
    // CEX listings data
    const cexCount = cexData.status === 'fulfilled' ? cexData.value : 0;

    // Log API failures for debugging
    if (webacySecurityData.status === 'rejected') {
      console.error(`[SCAN] Webacy API failed:`, webacySecurityData.reason);
    }
    if (goplusSecurityData.status === 'rejected') {
      console.error(`[SCAN] GoPlus API failed:`, goplusSecurityData.reason);
    }
    if (priceData.status === 'rejected') {
      console.error(`[SCAN] Moralis Price API failed:`, priceData.reason);
    }
    if (metadataData.status === 'rejected') {
      console.error(`[SCAN] Moralis Metadata API failed:`, metadataData.reason);
    }
    if (statsData.status === 'rejected') {
      console.error(`[SCAN] Moralis Stats API failed:`, statsData.reason);
    }
    if (pairsData.status === 'rejected') {
      console.error(`[SCAN] Moralis Pairs API failed:`, pairsData.reason);
    }
    if (ownersData.status === 'rejected') {
      console.error(`[SCAN] Moralis Owners API failed:`, ownersData.reason);
    }
    if (tvlData.status === 'rejected') {
      console.error(`[SCAN] DeFiLlama TVL API failed:`, tvlData.reason);
    }

    // Enhanced security data merging with detailed logging
    const security = {};
    console.log(`[SCAN] === SECURITY DATA MERGING ===`);
    
    if (webacySecurity) {
      console.log(`[SCAN] Adding Webacy security data:`, JSON.stringify(webacySecurity, null, 2));
      Object.assign(security, webacySecurity);
    } else {
      console.log(`[SCAN] No Webacy security data available`);
    }
    
    if (goplusSecurity) {
      console.log(`[SCAN] Adding GoPlus security data:`, JSON.stringify(goplusSecurity, null, 2));
      Object.assign(security, goplusSecurity);
    } else {
      console.log(`[SCAN] No GoPlus security data available`);
    }
    
    console.log(`[SCAN] Final merged security data:`, JSON.stringify(security, null, 2));
    console.log(`[SCAN] Merged security has ${Object.keys(security).length} properties`);

    console.log(`[SCAN] API Data Summary:`, {
      webacySecurity: webacySecurity ? 'available' : 'unavailable',
      goplusSecurity: goplusSecurity ? 'available' : 'unavailable',
      mergedSecurity: Object.keys(security).length > 0 ? 'available' : 'unavailable',
      priceData: priceDataResult ? 'available' : 'unavailable', 
      metadata: metadata ? 'available' : 'unavailable',
      enhancedTokenomics: {
        stats: stats ? 'available' : 'unavailable',
        pairs: pairs ? 'available' : 'unavailable',
        owners: owners ? 'available' : 'unavailable',
        tvl: tvl ? 'available' : 'unavailable'
      },
      totalApiTime: `${apiEndTime - apiStartTime}ms`
    });

    // Enhanced logging for debugging
    console.log(`[SCAN] === SECURITY DATA MERGE ANALYSIS ===`);
    console.log(`[SCAN] Webacy data:`, webacySecurity ? JSON.stringify(webacySecurity, null, 2) : 'null');
    console.log(`[SCAN] GoPlus data:`, goplusSecurity ? JSON.stringify(goplusSecurity, null, 2) : 'null');
    console.log(`[SCAN] Merged security data:`, JSON.stringify(security, null, 2));

    // GitHub data will be fetched later after CoinMarketCap fallback
    let githubData = null;

    // Extract social links from Moralis metadata first
    console.log(`[SCAN] === SOCIAL LINKS EXTRACTION ===`);
    console.log(`[SCAN] Raw metadata object:`, JSON.stringify(metadata, null, 2));
    console.log(`[SCAN] Raw metadata.links:`, metadata?.links);
    console.log(`[SCAN] Links type:`, typeof metadata?.links);
    console.log(`[SCAN] Links is array:`, Array.isArray(metadata?.links));
    
    // Extract social links from metadata.links array OR object
    const links = metadata?.links || [];
    let website_url = '';
    let twitter_handle = '';
    let github_url = '';
    let discord_url = '';
    
    // Handle both array and object formats for links
    if (Array.isArray(links)) {
      console.log(`[SCAN] Processing ${links.length} links from metadata array`);
      
      // Find website (first non-social media HTTP link)
      website_url = links.find(link => 
        typeof link === 'string' && 
        !link.includes('twitter.com') && 
        !link.includes('x.com') && 
        !link.includes('github.com') &&
        !link.includes('telegram') &&
        !link.includes('discord') &&
        (link.startsWith('http://') || link.startsWith('https://'))
      ) || '';
      
      // Find Twitter link
      const twitterLink = links.find(link => 
        typeof link === 'string' && (
          link.includes('twitter.com') || 
          link.includes('x.com')
        )
      );
      
      if (twitterLink) {
        const match = twitterLink.match(/(?:twitter\.com\/|x\.com\/)([^\/\?]+)/);
        if (match && match[1]) {
          twitter_handle = match[1].replace('@', '');
          console.log(`[SCAN] Extracted Twitter handle from metadata: @${twitter_handle}`);
        }
      }
      
      // Find GitHub link
      github_url = links.find(link => 
        typeof link === 'string' && link.includes('github.com')
      ) || '';
      
      // Find Discord URL (contains discord.gg or discord.com/invite)
      discord_url = links.find(link => 
        typeof link === 'string' && 
        (link.toLowerCase().includes('discord.gg') || link.toLowerCase().includes('discord.com/invite'))
      ) || '';
      
      // Validate Discord URL
      if (discord_url && !isValidDiscordUrl(discord_url)) {
        console.log(`[SCAN] Invalid Discord URL format found: ${discord_url}`);
        discord_url = '';
      }
      
      // Find Telegram URL (contains t.me, telegram.me, or telegram.dog)
      const telegramLink = links.find(link => 
        typeof link === 'string' && 
        (link.toLowerCase().includes('t.me') || 
         link.toLowerCase().includes('telegram.me') || 
         link.toLowerCase().includes('telegram.dog'))
      ) || '';
      
      let telegram_url = '';
      if (telegramLink && isValidTelegramUrl(telegramLink)) {
        telegram_url = telegramLink;
        console.log(`[SCAN] Valid Telegram URL found: ${telegram_url}`);
      } else if (telegramLink) {
        console.log(`[SCAN] Invalid Telegram URL format found: ${telegramLink}`);
      }
      
    } else if (links && typeof links === 'object') {
      console.log(`[SCAN] Processing links from metadata object`);
      
      // Handle object format: { website: "...", twitter: "...", github: "..." }
      website_url = links.website || links.homepage || '';
      
      if (links.twitter) {
        const twitterUrl = links.twitter;
        if (twitterUrl.includes('twitter.com') || twitterUrl.includes('x.com')) {
          const match = twitterUrl.match(/(?:twitter\.com\/|x\.com\/)([^\/\?]+)/);
          if (match && match[1]) {
            twitter_handle = match[1].replace('@', '');
            console.log(`[SCAN] Extracted Twitter handle from object: @${twitter_handle}`);
          }
        } else {
          // Assume it's already a handle
          twitter_handle = twitterUrl.replace('@', '');
          console.log(`[SCAN] Using Twitter handle from object: @${twitter_handle}`);
        }
      }
      
      github_url = links.github || '';
      discord_url = links.discord || '';
      
      // Validate Discord URL from object
      if (discord_url && !isValidDiscordUrl(discord_url)) {
        console.log(`[SCAN] Invalid Discord URL format found in object: ${discord_url}`);
        discord_url = '';
      }
    }
    
    // Additional extraction from other metadata fields if not found in links
    if (!twitter_handle && metadata?.twitter_username) {
      twitter_handle = metadata.twitter_username.replace('@', '');
      console.log(`[SCAN] Using Twitter from metadata.twitter_username: @${twitter_handle}`);
    }
    
    if (!website_url && metadata?.website) {
      website_url = metadata.website;
      console.log(`[SCAN] Using website from metadata.website: ${website_url}`);
    }
    
    if (!github_url && metadata?.github) {
      github_url = metadata.github;
      console.log(`[SCAN] Using GitHub from metadata.github: ${github_url}`);
    }
    
    console.log(`[SCAN] Final extracted social links:`, {
      website_url,
      twitter_handle,
      github_url,
      discord_url
    });
    
    // CoinMarketCap fallback for GitHub URL if not found from Moralis
    if (!github_url) {
      console.log(`[SCAN] GitHub URL not found in Moralis, trying CoinMarketCap fallback`);
      const cmcGithubUrl = await fetchCoinMarketCapGithubUrl(tokenAddress);
      if (cmcGithubUrl) {
        github_url = cmcGithubUrl;
        console.log(`[SCAN] GitHub URL found via CoinMarketCap: ${github_url}`);
      } else {
        console.log(`[SCAN] No GitHub URL found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] GitHub URL already found from Moralis: ${github_url}`);
    }
    
    // CoinMarketCap fallback for Discord URL if not found from Moralis
    if (!discord_url) {
      console.log(`[SCAN] Discord URL not found in Moralis, trying CoinMarketCap fallback`);
      const cmcDiscordUrl = await fetchCoinMarketCapDiscordUrl(tokenAddress);
      if (cmcDiscordUrl && isValidDiscordUrl(cmcDiscordUrl)) {
        discord_url = cmcDiscordUrl;
        console.log(`[SCAN] Discord URL found via CoinMarketCap: ${discord_url}`);
      } else {
        console.log(`[SCAN] No valid Discord URL found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] Discord URL already found from Moralis: ${discord_url}`);
    }
    
    // CoinMarketCap fallback for Telegram URL if not found from Moralis
    if (!telegram_url) {
      console.log(`[SCAN] Telegram URL not found in Moralis, trying CoinMarketCap fallback`);
      const cmcTelegramUrl = await fetchCoinMarketCapTelegramUrl(tokenAddress);
      if (cmcTelegramUrl && isValidTelegramUrl(cmcTelegramUrl)) {
        telegram_url = cmcTelegramUrl;
        console.log(`[SCAN] Telegram URL found via CoinMarketCap: ${telegram_url}`);
      } else {
        console.log(`[SCAN] No valid Telegram URL found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] Telegram URL already found from Moralis: ${telegram_url}`);
    }
    
    // Fetch GitHub data now that we have the final GitHub URL (including CoinMarketCap fallback)
    if (github_url) {
      console.log(`[GITHUB] === FETCHING GITHUB DATA ===`);
      console.log(`[GITHUB] URL: ${github_url}`);
      const githubResult = await Promise.allSettled([fetchGitHubRepoData(github_url)]);
      githubData = githubResult[0].status === 'fulfilled' ? githubResult[0].value : null;
      console.log(`[GITHUB] Data fetch result: ${githubData ? 'SUCCESS' : 'FAILED'}`);
      if (githubData) {
        console.log(`[GITHUB] === REPOSITORY METRICS ===`);
        console.log(`[GITHUB] Repository: ${githubData.repository || 'Unknown'}`);
        console.log(`[GITHUB] Stars: ${githubData.stars}`);
        console.log(`[GITHUB] Forks: ${githubData.forks}`);
        console.log(`[GITHUB] Contributors: ${githubData.contributors_count} (THIS IS THE KEY METRIC)`);
        console.log(`[GITHUB] Recent Commits (30d): ${githubData.commits_30d}`);
        console.log(`[GITHUB] Last Commit: ${githubData.lastCommitDate}`);
        console.log(`[GITHUB] === REPOSITORY SELECTION VERIFIED ===`);
      } else {
        console.warn(`[GITHUB] Failed to fetch data for ${github_url}`);
      }
    } else {
      console.log(`[GITHUB] No GitHub URL available - skipping GitHub data fetch`);
    }
    
    // Try to get existing Twitter handle from database if not found in metadata
    if (!twitter_handle) {
      try {
        const { data: existingToken } = await supabase
          .from('token_data_cache')
          .select('twitter_handle')
          .eq('token_address', tokenAddress)
          .eq('chain_id', normalizedChainId)
          .single();
        
        if (existingToken?.twitter_handle) {
          twitter_handle = existingToken.twitter_handle.replace('@', '');
          console.log(`[SCAN] Using existing Twitter handle from database: @${twitter_handle}`);
        }
      } catch (error) {
        console.log(`[SCAN] No existing Twitter handle found in database`);
      }
    }
    
    // Fetch Twitter follower data if Twitter handle is available
    let twitterFollowers = 0;
    if (twitter_handle) {
      console.log(`[SCAN] Twitter handle found: @${twitter_handle} - fetching follower count via Apify`);
      const followerCount = await fetchTwitterFollowers(twitter_handle);
      if (followerCount !== null) {
        twitterFollowers = followerCount;
        console.log(`[SCAN] Successfully retrieved Twitter follower count: ${twitterFollowers}`);
      } else {
        console.log(`[SCAN] Failed to fetch Twitter follower count for @${twitter_handle}`);
      }
    } else {
      console.log(`[SCAN] No Twitter handle found - skipping Apify API call`);
    }
    
    // Fetch Discord member count if valid Discord URL is available
    let discordMembers = 0;
    if (discord_url && isValidDiscordUrl(discord_url)) {
      console.log(`[SCAN] Valid Discord URL found: ${discord_url} - fetching member count`);
      const memberCount = await fetchDiscordMemberCount(discord_url);
      if (memberCount !== null) {
        discordMembers = memberCount;
        console.log(`[SCAN] Successfully retrieved Discord member count: ${discordMembers}`);
      } else {
        console.log(`[SCAN] Failed to fetch Discord member count for ${discord_url}`);
      }
    } else {
      console.log(`[SCAN] No Discord URL found - skipping Discord API call`);
    }
    
    // Fetch Telegram member count if valid Telegram URL is available
    let telegramMembers = 0;
    let telegramData = { members: null, name: '', description: '' };
    if (telegram_url && isValidTelegramUrl(telegram_url)) {
      console.log(`[SCAN] Valid Telegram URL found: ${telegram_url} - fetching member count`);
      telegramData = await fetchTelegramMembers(telegram_url);
      if (telegramData.members !== null) {
        telegramMembers = telegramData.members;
        console.log(`[SCAN] Successfully retrieved Telegram member count: ${telegramMembers}`);
      } else {
        console.log(`[SCAN] Failed to fetch Telegram member count for ${telegram_url}`);
      }
    } else {
      console.log(`[SCAN] No Telegram URL found - skipping Telegram API call`);
    }

    // Prioritize Moralis metadata and price data
    const name = metadata?.name || priceDataResult?.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
    const symbol = metadata?.symbol || priceDataResult?.symbol || 'UNKNOWN';
    const logo_url = metadata?.logo || metadata?.thumbnail || '';
    
    // Use rich description from Moralis if available, otherwise create a basic one
    const description = metadata?.description && metadata.description.trim() 
      ? metadata.description
      : metadata?.name 
        ? `${metadata.name} (${metadata.symbol}) is a token on ${chainConfig.name}${metadata.verified_contract ? ' with a verified contract' : ''}.`
        : `${name} on ${chainConfig.name}`;


    // Combine data from all sources, prioritizing Moralis for richer data
    const combinedData = {
      name: metadata?.name || priceDataResult?.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
      symbol: metadata?.symbol || priceDataResult?.symbol || 'UNKNOWN',
      description: metadata?.description && metadata.description.trim() 
        ? metadata.description
        : metadata?.name 
          ? `${metadata.name} (${metadata.symbol}) is a token on ${chainConfig.name}${metadata.verified_contract ? ' with a verified contract' : ''}.`
          : `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)} on ${chainConfig.name}`,
      logo_url: metadata?.logo || metadata?.thumbnail || '',
      website_url: website_url,
      twitter_handle: twitter_handle,
      github_url: github_url,
      current_price_usd: priceDataResult?.current_price_usd || 0,
      price_change_24h: priceDataResult?.price_change_24h, // Keep null if no data
      market_cap_usd: metadata?.market_cap ? parseFloat(metadata.market_cap) : 0,
      total_supply: metadata?.total_supply || '0',
      trading_volume_24h_usd: priceDataResult?.trading_volume_24h_usd || 0
    };

    // Add detailed logging for data extraction
    console.log(`[SCAN] === DETAILED DATA EXTRACTION LOGGING ===`);
    console.log(`[SCAN] Raw Metadata from Moralis:`, {
      name: metadata?.name,
      symbol: metadata?.symbol,
      description: metadata?.description?.substring(0, 100) + '...',
      logo: metadata?.logo,
      market_cap: metadata?.market_cap,
      links: metadata?.links ? Object.keys(metadata.links) : []
    });
    console.log(`[SCAN] Raw Price Data from Moralis:`, {
      current_price_usd: priceDataResult?.current_price_usd,
      price_change_24h: priceDataResult?.price_change_24h,
      trading_volume_24h_usd: priceDataResult?.trading_volume_24h_usd,
      name: priceDataResult?.name,
      symbol: priceDataResult?.symbol
    });
    console.log(`[SCAN] Final Combined Data:`, {
      name: combinedData.name,
      symbol: combinedData.symbol,
      current_price_usd: combinedData.current_price_usd,
      price_change_24h: combinedData.price_change_24h,
      market_cap_usd: combinedData.market_cap_usd,
      logo_url: combinedData.logo_url,
      description_length: combinedData.description.length
    });

    console.log(`[SCAN] Combined token data:`, {
      name: combinedData.name,
      symbol: combinedData.symbol,
      logo_available: !!combinedData.logo_url,
      description_length: combinedData.description.length,
      social_links: {
        website: !!combinedData.website_url,
        twitter: !!combinedData.twitter_handle,
        github: !!combinedData.github_url
      }
    });

    return {
      tokenData: combinedData,
      securityData: security,
      webacyData: webacySecurity,
      goplusData: goplusSecurity,
      priceData: priceDataResult,
      metadataData: metadata,
      statsData: stats,
      pairsData: pairs,
      ownersData: owners,
      githubData: githubData,
      tvlData: tvl,
      cexData: cexCount,
      twitterFollowers: twitterFollowers,
      discordMembers: discordMembers,
      telegramMembers: telegramMembers
    };
  } catch (error) {
    console.error(`[SCAN] Error fetching token data from APIs:`, error);
    return null;
  }
}

// Generate category data with real API integration and enhanced tokenomics
function generateCategoryData(apiData: any) {
  console.log(`[TOKENOMICS] === STARTING CATEGORY DATA GENERATION ===`);
  console.log(`[TOKENOMICS] Input API data available:`, {
    securityData: !!apiData.securityData,
    webacyData: !!apiData.webacyData,
    goplusData: !!apiData.goplusData,
    priceData: !!apiData.priceData,
    metadataData: !!apiData.metadataData,
    statsData: !!apiData.statsData,
    pairsData: !!apiData.pairsData,
    ownersData: !!apiData.ownersData,
    githubData: !!apiData.githubData,
    tvlData: !!apiData.tvlData
  });

  console.log(`[TOKENOMICS] About to calculate security score with data:`, {
    securityDataKeys: apiData.securityData ? Object.keys(apiData.securityData) : 'null',
    webacyDataKeys: apiData.webacyData ? Object.keys(apiData.webacyData) : 'null', 
    goplusDataKeys: apiData.goplusData ? Object.keys(apiData.goplusData) : 'null'
  });
  
  const securityScore = calculateSecurityScore(apiData.securityData, apiData.webacyData, apiData.goplusData);
  console.log(`[TOKENOMICS] Security score calculated: ${securityScore}`);
  const liquidityScore = calculateLiquidityScore(apiData.priceData, apiData.securityData);
  
  // Enhanced tokenomics scoring with new data sources
  console.log(`[TOKENOMICS] Preparing tokenomics score calculation...`);
  console.log(`[TOKENOMICS] metadataData:`, apiData.metadataData ? {
    total_supply: apiData.metadataData.total_supply,
    verified_contract: apiData.metadataData.verified_contract,
    possible_spam: apiData.metadataData.possible_spam
  } : 'null');
  console.log(`[TOKENOMICS] priceData:`, apiData.priceData ? {
    current_price_usd: apiData.priceData.current_price_usd,
    price_change_24h: apiData.priceData.price_change_24h,
    trading_volume_24h_usd: apiData.priceData.trading_volume_24h_usd
  } : 'null');
  console.log(`[TOKENOMICS] statsData:`, apiData.statsData ? {
    total_supply: apiData.statsData.total_supply,
    holders: apiData.statsData.holders,
    transfers: apiData.statsData.transfers
  } : 'null');
  console.log(`[TOKENOMICS] ownersData:`, apiData.ownersData ? {
    gini_coefficient: apiData.ownersData.gini_coefficient,
    concentration_risk: apiData.ownersData.concentration_risk,
    total_holders: apiData.ownersData.total_holders
  } : 'null');
  console.log(`[TOKENOMICS] pairsData:`, apiData.pairsData ? {
    total_liquidity_usd: apiData.pairsData.total_liquidity_usd,
    total_pairs: apiData.pairsData.total_pairs,
    major_pairs_count: apiData.pairsData.major_pairs?.length
  } : 'null');
  
  const tokenomicsScore = calculateTokenomicsScore(
    apiData.metadataData, 
    apiData.priceData,
    apiData.statsData,
    apiData.ownersData,
    apiData.pairsData
  );
  
  console.log(`[TOKENOMICS] Calculated scores:`, {
    tokenomicsScore,
    securityScore,
    liquidityScore
  });
  
  const developmentScore = calculateDevelopmentScore(apiData.githubData);
  
  // Calculate dynamic community score based on social media metrics
  const communityScore = calculateCommunityScore({
    twitterFollowers: apiData.twitterFollowers || 0,
    discordMembers: apiData.discordMembers || 0,
    telegramMembers: apiData.telegramMembers || 0
  });

  console.log(`[TOKENOMICS] === FINAL TOKENOMICS DATA EXTRACTION ===`);
  
  // Log raw data before processing
  const rawTokenomicsData = {
    supply_cap: apiData.statsData?.total_supply || apiData.metadataData?.total_supply || null,
    circulating_supply: apiData.statsData?.total_supply || apiData.metadataData?.total_supply || null,
    actual_circulating_supply: apiData.statsData?.total_supply || null,
    total_supply: apiData.statsData?.total_supply || apiData.metadataData?.total_supply || null,
    dex_liquidity_usd: apiData.pairsData?.total_liquidity_usd || 0,
    major_dex_pairs: apiData.pairsData?.major_pairs || [],
    distribution_score: getDistributionScoreText(apiData.ownersData?.concentration_risk),
    distribution_gini_coefficient: apiData.ownersData?.gini_coefficient || null,
    holder_concentration_risk: apiData.ownersData?.concentration_risk || 'Unknown',
    top_holders_count: apiData.ownersData?.total_holders || null,
    burn_mechanism: null,
    vesting_schedule: 'unknown',
    tvl_usd: apiData.pairsData?.total_liquidity_usd || 0,
    treasury_usd: 0,
    data_confidence_score: calculateTokenomicsConfidence(apiData),
    last_holder_analysis: apiData.ownersData ? new Date().toISOString() : null,
    score: tokenomicsScore
  };
  
  console.log(`[TOKENOMICS] Final processed tokenomics data:`, rawTokenomicsData);
  console.log(`[TOKENOMICS] Data availability summary:`, {
    hasSupplyData: !!(apiData.statsData?.total_supply || apiData.metadataData?.total_supply),
    hasLiquidityData: !!apiData.pairsData?.total_liquidity_usd,
    hasDistributionData: !!apiData.ownersData?.gini_coefficient,
    hasPairsData: !!apiData.pairsData?.major_pairs?.length,
    confidenceScore: rawTokenomicsData.data_confidence_score,
    tvlData: apiData.tvlData
  });

  console.log(`[TOKENOMICS] === DETAILED SUPPLY DATA ANALYSIS ===`);
  console.log(`[TOKENOMICS] Moralis Stats API response:`, apiData.statsData);
  console.log(`[TOKENOMICS] Moralis Metadata API response supply:`, apiData.metadataData?.total_supply);
  console.log(`[TOKENOMICS] DeFiLlama TVL response:`, apiData.tvlData);
  console.log(`[TOKENOMICS] Pairs liquidity response:`, apiData.pairsData?.total_liquidity_usd);

  return {
    security: {
      ownership_renounced: apiData.securityData?.ownership_renounced || null,
      can_mint: apiData.securityData?.can_mint || null,
      honeypot_detected: apiData.securityData?.honeypot_detected || null,
      freeze_authority: apiData.securityData?.freeze_authority || null,
      audit_status: apiData.securityData?.audit_status || 'unverified',
      multisig_status: 'unknown',
      score: securityScore,
      // Webacy-specific fields for enhanced security analysis
      webacy_risk_score: apiData.webacyData?.riskScore || null,
      webacy_severity: apiData.webacyData?.severity || null,
      webacy_flags: apiData.webacyData?.flags || [],
      is_proxy: apiData.securityData?.is_proxy || null,
      is_blacklisted: apiData.securityData?.is_blacklisted || null,
      access_control: apiData.securityData?.access_control || null,
      contract_verified: apiData.securityData?.contract_verified || null,
      // CRITICAL: Include liquidity lock fields from GoPlus API
      is_liquidity_locked: apiData.securityData?.is_liquidity_locked || null,
      liquidity_lock_info: apiData.securityData?.liquidity_lock_info || null,
      liquidity_percentage: apiData.securityData?.liquidity_percentage || null
    },
    tokenomics: {
      // Enhanced supply data with better zero handling
      supply_cap: getValidSupplyValue(apiData.statsData?.total_supply) || getValidSupplyValue(apiData.metadataData?.total_supply) || null,
      circulating_supply: getValidSupplyValue(apiData.statsData?.total_supply) || getValidSupplyValue(apiData.metadataData?.total_supply) || null,
      actual_circulating_supply: getValidSupplyValue(apiData.statsData?.total_supply) || null,
      total_supply: getValidSupplyValue(apiData.statsData?.total_supply) || getValidSupplyValue(apiData.metadataData?.total_supply) || null,
      
      // Enhanced liquidity data using pairs API
      dex_liquidity_usd: apiData.pairsData?.total_liquidity_usd || 0,
      major_dex_pairs: apiData.pairsData?.major_pairs || [],
      
      // Enhanced distribution data using owners API
      distribution_score: getDistributionScoreText(apiData.ownersData?.concentration_risk),
      distribution_gini_coefficient: apiData.ownersData?.gini_coefficient || null,
      holder_concentration_risk: apiData.ownersData?.concentration_risk || 'Unknown',
      top_holders_count: apiData.ownersData?.total_holders || null,
      
      // Traditional fields (enhanced with better detection)
      burn_mechanism: null, // TODO: Add burn detection
      vesting_schedule: 'unknown',
      tvl_usd: apiData.tvlData, // Use DeFiLlama TVL data (null if not available)
      treasury_usd: null, // TODO: Add treasury detection
      
      // Data quality indicators
      data_confidence_score: calculateTokenomicsConfidence(apiData),
      last_holder_analysis: apiData.ownersData ? new Date().toISOString() : null,
      
      score: tokenomicsScore
    },
    liquidity: {
      trading_volume_24h_usd: apiData.priceData?.trading_volume_24h_usd || 0,
      liquidity_locked_days: calculateLiquidityLockedDays(apiData.securityData),
      dex_depth_status: apiData.priceData?.trading_volume_24h_usd > 10000 ? 'good' : 'limited',
      holder_distribution: apiData.ownersData?.concentration_risk || 'unknown',
      cex_listings: apiData.cexData || 0,
      score: liquidityScore
    },
    community: {
      twitter_followers: apiData.twitterFollowers || 0,
      twitter_verified: false,
      twitter_growth_7d: 0,
      discord_members: apiData.discordMembers || 0,
      telegram_members: apiData.telegramMembers || 0,
      active_channels: [],
      team_visibility: 'unknown',
      score: communityScore
    },
    development: {
      github_repo: apiData.githubData ? `${apiData.githubData.owner}/${apiData.githubData.repo}` : '',
      contributors_count: apiData.githubData?.contributors_count || 0,
      commits_30d: apiData.githubData?.commits_30d || 0,
      last_commit: apiData.githubData?.last_push || null,
      is_open_source: !!apiData.githubData,
      roadmap_progress: 'unknown',
      score: developmentScore
    }
  };
}

// Helper function to convert concentration risk to distribution score text
function getDistributionScoreText(concentrationRisk: string | undefined): string {
  if (!concentrationRisk) return 'Unknown';
  
  switch (concentrationRisk) {
    case 'Low': return 'Excellent';
    case 'Medium': return 'Good';
    case 'High': return 'Fair';
    case 'Very High': return 'Poor';
    default: return 'Unknown';
  }
}

// Helper function to validate supply values and distinguish actual zero from missing data
function getValidSupplyValue(value: any): number | null {
  if (value === null || value === undefined) return null;
  
  // Convert to number if it's a string
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Return null for invalid numbers or actual zeros (which may indicate missing data)
  if (isNaN(numValue) || numValue === 0) return null;
  
  return numValue;
}

// Helper function to calculate liquidity locked days from security data
function calculateLiquidityLockedDays(securityData: any): number {
  console.log(`[LIQUIDITY-LOCK] Calculating lock days from security data:`, {
    is_liquidity_locked: securityData?.is_liquidity_locked,
    liquidity_lock_info: securityData?.liquidity_lock_info,
    liquidity_percentage: securityData?.liquidity_percentage
  });
  
  if (!securityData?.is_liquidity_locked) {
    console.log(`[LIQUIDITY-LOCK] No liquidity lock detected, returning 0 days`);
    return 0;
  }
  
  const lockInfo = securityData.liquidity_lock_info;
  if (!lockInfo || lockInfo === 'Not Locked') {
    console.log(`[LIQUIDITY-LOCK] Lock info indicates not locked: ${lockInfo}`);
    return 0;
  }
  
  // Parse different formats: "180 days", "6 months", "1 year", etc.
  const dayMatch = lockInfo.match(/(\d+)\s*days?/i);
  if (dayMatch) {
    const days = parseInt(dayMatch[1]);
    console.log(`[LIQUIDITY-LOCK] Parsed ${days} days from: ${lockInfo}`);
    return days;
  }
  
  const monthMatch = lockInfo.match(/(\d+)\s*months?/i);
  if (monthMatch) {
    const days = parseInt(monthMatch[1]) * 30;
    console.log(`[LIQUIDITY-LOCK] Parsed ${days} days (${monthMatch[1]} months) from: ${lockInfo}`);
    return days;
  }
  
  const yearMatch = lockInfo.match(/(\d+)\s*years?/i);
  if (yearMatch) {
    const days = parseInt(yearMatch[1]) * 365;
    console.log(`[LIQUIDITY-LOCK] Parsed ${days} days (${yearMatch[1]} years) from: ${lockInfo}`);
    return days;
  }
  
  // If locked but can't parse duration, assume some lock exists
  const fallbackDays = securityData.is_liquidity_locked ? 1 : 0;
  console.log(`[LIQUIDITY-LOCK] Could not parse lock duration from "${lockInfo}", using fallback: ${fallbackDays} days`);
  return fallbackDays;
}

// Calculate confidence score for tokenomics data quality
function calculateTokenomicsConfidence(apiData: any): number {
  let confidence = 0;
  let totalChecks = 0;
  
  // Check data availability and quality
  if (apiData.statsData?.total_supply) {
    confidence += 20;
    totalChecks += 20;
  }
  
  if (apiData.pairsData?.total_liquidity_usd !== undefined) {
    confidence += 25;
    totalChecks += 25;
  }
  
  if (apiData.ownersData?.gini_coefficient !== undefined) {
    confidence += 30;
    totalChecks += 30;
  }
  
  if (apiData.metadataData?.verified_contract !== undefined) {
    confidence += 15;
    totalChecks += 15;
  }
  
  if (apiData.priceData?.current_price_usd !== undefined) {
    confidence += 10;
    totalChecks += 10;
  }
  
  return totalChecks > 0 ? Math.round((confidence / totalChecks) * 100) : 0;
}

// Calculate community score based on social media metrics
function calculateCommunityScore(data: { twitterFollowers: number; discordMembers: number; telegramMembers: number }): number {
  let score = 20; // Base score
  
  console.log(`[COMMUNITY-SCORE] === CALCULATING COMMUNITY SCORE ===`);
  console.log(`[COMMUNITY-SCORE] Twitter followers: ${data.twitterFollowers}`);
  console.log(`[COMMUNITY-SCORE] Discord members: ${data.discordMembers}`);
  console.log(`[COMMUNITY-SCORE] Telegram members: ${data.telegramMembers}`);
  
  // Twitter scoring (max 25 points)
  if (data.twitterFollowers >= 100000) {
    score += 25;
    console.log(`[COMMUNITY-SCORE] Twitter 100k+: +25 points`);
  } else if (data.twitterFollowers >= 50000) {
    score += 20;
    console.log(`[COMMUNITY-SCORE] Twitter 50k+: +20 points`);
  } else if (data.twitterFollowers >= 10000) {
    score += 15;
    console.log(`[COMMUNITY-SCORE] Twitter 10k+: +15 points`);
  } else if (data.twitterFollowers >= 1000) {
    score += 10;
    console.log(`[COMMUNITY-SCORE] Twitter 1k+: +10 points`);
  } else if (data.twitterFollowers > 0) {
    score += 5;
    console.log(`[COMMUNITY-SCORE] Twitter present: +5 points`);
  }
  
  // Discord scoring (max 20 points)
  if (data.discordMembers >= 50000) {
    score += 20;
    console.log(`[COMMUNITY-SCORE] Discord 50k+: +20 points`);
  } else if (data.discordMembers >= 10000) {
    score += 15;
    console.log(`[COMMUNITY-SCORE] Discord 10k+: +15 points`);
  } else if (data.discordMembers >= 5000) {
    score += 10;
    console.log(`[COMMUNITY-SCORE] Discord 5k+: +10 points`);
  } else if (data.discordMembers >= 1000) {
    score += 8;
    console.log(`[COMMUNITY-SCORE] Discord 1k+: +8 points`);
  } else if (data.discordMembers > 0) {
    score += 5;
    console.log(`[COMMUNITY-SCORE] Discord present: +5 points`);
  }
  
  // Telegram scoring (max 15 points)
  if (data.telegramMembers >= 50000) {
    score += 15;
    console.log(`[COMMUNITY-SCORE] Telegram 50k+: +15 points`);
  } else if (data.telegramMembers >= 10000) {
    score += 12;
    console.log(`[COMMUNITY-SCORE] Telegram 10k+: +12 points`);
  } else if (data.telegramMembers >= 5000) {
    score += 8;
    console.log(`[COMMUNITY-SCORE] Telegram 5k+: +8 points`);
  } else if (data.telegramMembers >= 1000) {
    score += 6;
    console.log(`[COMMUNITY-SCORE] Telegram 1k+: +6 points`);
  } else if (data.telegramMembers > 0) {
    score += 3;
    console.log(`[COMMUNITY-SCORE] Telegram present: +3 points`);
  }
  
  // Multi-platform bonus (max 20 points)
  const platforms = [
    data.twitterFollowers > 0,
    data.discordMembers > 0,
    data.telegramMembers > 0
  ].filter(Boolean).length;
  
  if (platforms === 3) {
    score += 20;
    console.log(`[COMMUNITY-SCORE] All 3 platforms: +20 points`);
  } else if (platforms === 2) {
    score += 10;
    console.log(`[COMMUNITY-SCORE] 2 platforms: +10 points`);
  } else if (platforms === 1) {
    score += 5;
    console.log(`[COMMUNITY-SCORE] 1 platform: +5 points`);
  }
  
  const finalScore = Math.min(100, score);
  console.log(`[COMMUNITY-SCORE] Final community score: ${finalScore}/100`);
  
  return finalScore;
}

// Calculate overall score from category scores
function calculateOverallScore(categoryData: any) {
  const scores = [
    categoryData.security.score,
    categoryData.tokenomics.score,
    categoryData.liquidity.score,
    categoryData.community.score,
    categoryData.development.score
  ].filter(score => typeof score === 'number' && score >= 0);
  
  return scores.length > 0 
    ? Math.round(scores.reduce((acc: number, curr: number) => acc + curr, 0) / scores.length)
    : 0;
}

// Delete cached data to force fresh scan - fixed to handle foreign key constraints properly
async function invalidateTokenCache(tokenAddress: string, chainId: string) {
  console.log(`[CACHE-INVALIDATION] Clearing cached data for: ${tokenAddress} on chain: ${chainId}`);
  
  try {
    // Delete child tables first to respect foreign key constraints
    const childTables = [
      'token_security_cache',
      'token_tokenomics_cache', 
      'token_liquidity_cache',
      'token_community_cache',
      'token_development_cache'
    ];
    
    let deletedCount = 0;
    
    // Delete child tables sequentially to avoid constraint violations
    for (const table of childTables) {
      try {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq('token_address', tokenAddress)
          .eq('chain_id', chainId);
          
        if (error) {
          console.warn(`[CACHE-INVALIDATION] Warning: Failed to delete from ${table}:`, error.message);
        } else {
          deletedCount++;
          console.log(`[CACHE-INVALIDATION] Successfully deleted from ${table}`);
        }
      } catch (err) {
        console.warn(`[CACHE-INVALIDATION] Warning: Exception deleting from ${table}:`, err);
      }
    }
    
    // Delete parent table last
    try {
      const { error } = await supabase
        .from('token_data_cache')
        .delete()
        .eq('token_address', tokenAddress)
        .eq('chain_id', chainId);
        
      if (error) {
        console.warn(`[CACHE-INVALIDATION] Warning: Failed to delete from token_data_cache:`, error.message);
      } else {
        deletedCount++;
        console.log(`[CACHE-INVALIDATION] Successfully deleted from token_data_cache`);
      }
    } catch (err) {
      console.warn(`[CACHE-INVALIDATION] Warning: Exception deleting from token_data_cache:`, err);
    }

    console.log(`[CACHE-INVALIDATION] === CACHE INVALIDATION COMPLETE ===`);
    console.log(`[CACHE-INVALIDATION] Successfully cleared ${deletedCount}/6 cache tables for ${tokenAddress}`);
    console.log(`[CACHE-INVALIDATION] Fresh data will now be fetched from all external APIs`);
    return deletedCount;
    
  } catch (error) {
    console.warn(`[CACHE-INVALIDATION] Warning: Cache invalidation failed, but continuing with scan:`, error);
    return 0;
  }
}

Deno.serve(async (req) => {
  // IMMEDIATE STARTUP LOGGING
  console.log(`[SCAN-STARTUP] === EDGE FUNCTION STARTED ===`);
  console.log(`[SCAN-STARTUP] Method: ${req.method}`);
  console.log(`[SCAN-STARTUP] URL: ${req.url}`);
  console.log(`[SCAN-STARTUP] Timestamp: ${new Date().toISOString()}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[SCAN-STARTUP] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  // HEALTH CHECK ENDPOINT - Add this for testing deployment
  if (req.method === 'GET') {
    console.log(`[SCAN-STARTUP] Health check requested`);
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Edge function is deployed and running',
      timestamp: new Date().toISOString(),
      deployment_status: 'active'
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Test deployment by checking environment variables immediately
  console.log(`[SCAN-STARTUP] === ENVIRONMENT CHECK ===`);
  const envCheck = {
    SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
    SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
    WEBACY_API_KEY: !!Deno.env.get('WEBACY_API_KEY'),
    MORALIS_API_KEY: !!Deno.env.get('MORALIS_API_KEY'),
    GITHUB_API_KEY: !!Deno.env.get('GITHUB_API_KEY'),
    APIFY_API_KEY: !!Deno.env.get('APIFY_API_KEY')
  };
  
  console.log(`[SCAN-STARTUP] Environment variables:`, envCheck);

  // Critical environment variables check
  if (!envCheck.SUPABASE_URL || !envCheck.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`[SCAN-STARTUP] CRITICAL: Missing Supabase configuration`);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Function misconfigured - missing Supabase credentials',
      envCheck 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  console.log(`[SCAN-STARTUP] Function deployment successful - processing request`);

  try {
    // Parse request body with error handling
    console.log(`[SCAN-STARTUP] Parsing request body...`);
    let requestBody;
    try {
      requestBody = await req.json();
    } catch (parseError) {
      console.error(`[SCAN-STARTUP] Failed to parse request body:`, parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid JSON in request body' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { token_address, chain_id, user_id, force_refresh = true } = requestBody;
    console.log(`[SCAN-STARTUP] Request parameters:`, { token_address, chain_id, user_id, force_refresh });
    
    // ALWAYS force fresh scans - ignore any cached data
    const alwaysRefresh = true;

    console.log(`[SCAN] === STARTING COMPREHENSIVE TOKEN SCAN ===`);
    console.log(`[SCAN] Token: ${token_address}, Chain: ${chain_id}, User: ${user_id}, Force Refresh: ${force_refresh}`);
    console.log(`[SCAN] Timestamp: ${new Date().toISOString()}`);

    if (!token_address || !chain_id) {
      console.error(`[SCAN] Missing required parameters - token_address: ${token_address}, chain_id: ${chain_id}`);
      throw new Error('Token address and chain ID are required');
    }

    // PHASE 1: Validate API Keys
    console.log(`[SCAN] === PHASE 1: API KEY VALIDATION ===`);
    const apiKeys = {
      webacy: Deno.env.get('WEBACY_API_KEY'),
      moralis: Deno.env.get('MORALIS_API_KEY'), 
      github: Deno.env.get('GITHUB_API_KEY')
    };
    
    console.log(`[SCAN] API Key Status:`, {
      webacy: apiKeys.webacy ? 'CONFIGURED' : 'MISSING',
      moralis: apiKeys.moralis ? 'CONFIGURED' : 'MISSING',
      github: apiKeys.github ? 'CONFIGURED' : 'MISSING'
    });

    if (!apiKeys.webacy) {
      console.error(`[SCAN] CRITICAL: WEBACY_API_KEY not configured`);
    }
    if (!apiKeys.moralis) {
      console.error(`[SCAN] CRITICAL: MORALIS_API_KEY not configured`);
    }
    if (!apiKeys.github) {
      console.warn(`[SCAN] WARNING: GITHUB_API_KEY not configured - development scores will be limited`);
    }

    // Normalize chain ID and validate
    const normalizedChainId = normalizeChainId(chain_id);
    const chainConfig = getChainConfigByMoralisId(normalizedChainId);
    
    if (!chainConfig) {
      throw new Error(`Unsupported chain: ${chain_id}`);
    }

    console.log(`[SCAN] Scanning on ${chainConfig.name} (${normalizedChainId})`);

    console.log(`[SCAN] === STARTING FRESH TOKEN SCAN ===`);
    console.log(`[SCAN] Token: ${token_address}, Chain: ${normalizedChainId}`);
    console.log(`[SCAN] Force refresh: ${force_refresh}`);
    console.log(`[SCAN] User: ${user_id || 'Anonymous'}`);
    console.log(`[SCAN] Timestamp: ${new Date().toISOString()}`);
    
    // FORCE FRESH SCAN: Delete all cached data before scanning (ALWAYS)
    if (force_refresh) {
      console.log(`[SCAN] === FORCE REFRESH ACTIVATED ===`);
      const clearedTables = await invalidateTokenCache(token_address.toLowerCase(), normalizedChainId);
      console.log(`[SCAN] Cache cleared: ${clearedTables} tables updated`);
    } else {
      await invalidateTokenCache(token_address.toLowerCase(), normalizedChainId);
    }

    // Check if user has pro access (simplified for now)
    const proScan = false; // Will be enhanced later with proper pro check
    console.log(`[SCAN] Pro scan permitted: ${proScan}`);

    // Fetch comprehensive token data from multiple APIs using Moralis as primary metadata source
    console.log(`[SCAN] Fetching FRESH data from APIs...`);
    const apiData = await fetchTokenDataFromAPIs(token_address, normalizedChainId);
    
    if (!apiData) {
      throw new Error('Failed to fetch token data from APIs');
    }

    console.log(`[SCAN] Token data collected for: ${apiData.tokenData.name} (${apiData.tokenData.symbol})`);

    // Generate category data with real API integration including GitHub
    const categoryData = generateCategoryData(apiData);
    const overallScore = calculateOverallScore(categoryData);

    console.log(`[SCAN] Calculated overall score: ${overallScore}`);

    try {
      // UPSERT token data to main cache table
      console.log(`[SCAN] === UPSERTING TOKEN DATA TO DATABASE ===`);
      console.log(`[SCAN] Token: ${token_address}, Chain: ${normalizedChainId}`);
      console.log(`[SCAN] Data to save:`, {
        name: apiData.tokenData.name,
        symbol: apiData.tokenData.symbol,
        current_price_usd: apiData.tokenData.current_price_usd,
        price_change_24h: apiData.tokenData.price_change_24h,
        market_cap_usd: apiData.tokenData.market_cap_usd,
        logo_url: apiData.tokenData.logo_url ? 'present' : 'missing',
        description_length: apiData.tokenData.description?.length || 0
      });
      
      const { error: upsertError } = await supabase
        .from('token_data_cache')
        .upsert({
          token_address: token_address.toLowerCase(),
          chain_id: normalizedChainId,
          name: apiData.tokenData.name,
          symbol: apiData.tokenData.symbol,
          description: apiData.tokenData.description,
          logo_url: apiData.tokenData.logo_url,
          website_url: apiData.tokenData.website_url,
          twitter_handle: apiData.tokenData.twitter_handle,
          github_url: apiData.tokenData.github_url,
          current_price_usd: apiData.tokenData.current_price_usd,
          price_change_24h: apiData.tokenData.price_change_24h,
          market_cap_usd: apiData.tokenData.market_cap_usd,
          circulating_supply: (() => {
            const circulatingFromMetadata = apiData.metadataData?.circulating_supply;
            const totalFromStats = apiData.statsData?.total_supply;
            const finalValue = circulatingFromMetadata || totalFromStats || null;
            console.log(`[SCAN] Circulating supply extraction:`, {
              fromMetadata: circulatingFromMetadata,
              fromStats: totalFromStats,
              finalStored: finalValue
            });
            return finalValue;
          })()
        }, {
          onConflict: 'token_address,chain_id'
        });

      if (upsertError) {
        console.error(`[SCAN] Error upserting token data:`, upsertError);
        throw new Error(`Failed to save token data: ${upsertError.message}`);
      }

      console.log(`[SCAN] Successfully upserted token data for: ${token_address} on ${chainConfig.name}`);
      
      // Verify the data was saved correctly
      const { data: verifyData, error: verifyError } = await supabase
        .from('token_data_cache')
        .select('name, symbol, current_price_usd, price_change_24h, market_cap_usd')
        .eq('token_address', token_address.toLowerCase())
        .eq('chain_id', normalizedChainId)
        .single();
      
      if (verifyError) {
        console.error(`[SCAN] Error verifying saved data:`, verifyError);
      } else {
        console.log(`[SCAN] Verified saved data:`, verifyData);
      }

      // UPSERT category data to cache tables using individual operations
      const cacheOperations = [
        {
          table: 'token_security_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.security.score,
            ownership_renounced: categoryData.security.ownership_renounced,
            can_mint: categoryData.security.can_mint,
            honeypot_detected: categoryData.security.honeypot_detected,
            freeze_authority: categoryData.security.freeze_authority,
            audit_status: categoryData.security.audit_status,
            multisig_status: categoryData.security.multisig_status,
            // Webacy-specific fields - ensure proper extraction from API data
            webacy_risk_score: apiData.webacyData?.webacy_risk_score || apiData.webacyData?.riskScore || null,
            webacy_severity: apiData.webacyData?.webacy_severity || apiData.webacyData?.severity || null,
            webacy_flags: apiData.webacyData?.webacy_flags || apiData.webacyData?.flags || null,
            is_proxy: categoryData.security.is_proxy,
            is_blacklisted: categoryData.security.is_blacklisted,
            access_control: categoryData.security.access_control,
            contract_verified: categoryData.security.contract_verified,
            // Liquidity lock fields (NEW)
            is_liquidity_locked: categoryData.security.is_liquidity_locked,
            liquidity_lock_info: categoryData.security.liquidity_lock_info,
            liquidity_percentage: categoryData.security.liquidity_percentage
          }
        },
        {
          table: 'token_tokenomics_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.tokenomics.score,
            supply_cap: categoryData.tokenomics.supply_cap,
            circulating_supply: categoryData.tokenomics.circulating_supply,
            burn_mechanism: categoryData.tokenomics.burn_mechanism,
            vesting_schedule: categoryData.tokenomics.vesting_schedule,
            distribution_score: categoryData.tokenomics.distribution_score,
            tvl_usd: categoryData.tokenomics.tvl_usd,
            treasury_usd: categoryData.tokenomics.treasury_usd,
            // Enhanced tokenomics fields
            actual_circulating_supply: categoryData.tokenomics.actual_circulating_supply,
            total_supply: categoryData.tokenomics.total_supply,
            dex_liquidity_usd: categoryData.tokenomics.dex_liquidity_usd,
            major_dex_pairs: categoryData.tokenomics.major_dex_pairs,
            distribution_gini_coefficient: categoryData.tokenomics.distribution_gini_coefficient,
            holder_concentration_risk: categoryData.tokenomics.holder_concentration_risk,
            top_holders_count: categoryData.tokenomics.top_holders_count,
            data_confidence_score: categoryData.tokenomics.data_confidence_score,
            last_holder_analysis: categoryData.tokenomics.last_holder_analysis
          }
        },
        {
          table: 'token_liquidity_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.liquidity.score,
            trading_volume_24h_usd: categoryData.liquidity.trading_volume_24h_usd,
            liquidity_locked_days: categoryData.liquidity.liquidity_locked_days,
            dex_depth_status: categoryData.liquidity.dex_depth_status,
            holder_distribution: categoryData.liquidity.holder_distribution,
            cex_listings: categoryData.liquidity.cex_listings
          }
        },
        {
          table: 'token_community_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.community.score,
            twitter_followers: categoryData.community.twitter_followers,
            twitter_verified: categoryData.community.twitter_verified,
            twitter_growth_7d: categoryData.community.twitter_growth_7d,
            discord_members: categoryData.community.discord_members,
            telegram_members: categoryData.community.telegram_members,
            active_channels: categoryData.community.active_channels,
            team_visibility: categoryData.community.team_visibility
          }
        },
        {
          table: 'token_development_cache',
          data: {
            token_address,
            chain_id: normalizedChainId,
            score: categoryData.development.score,
            github_repo: categoryData.development.github_repo,
            contributors_count: categoryData.development.contributors_count,
            commits_30d: categoryData.development.commits_30d,
            last_commit: categoryData.development.last_commit,
            is_open_source: categoryData.development.is_open_source,
            roadmap_progress: categoryData.development.roadmap_progress
          }
        }
      ];

      // Execute all cache operations using UPSERT
      for (const operation of cacheOperations) {
        try {
          const { error } = await supabase
            .from(operation.table)
            .upsert(operation.data, {
              onConflict: 'token_address,chain_id'
            });

          if (error) {
            console.error(`[SCAN] Error upserting ${operation.table}:`, error);
          } else {
            const categoryName = operation.table.replace('token_', '').replace('_cache', '');
            console.log(`[SCAN] Successfully upserted ${categoryName} data with score: ${operation.data.score}`);
          }
        } catch (error) {
          console.error(`[SCAN] Exception upserting ${operation.table}:`, error);
        }
      }

    // Record the scan with proper chain_id validation
    if (user_id) {
      try {
        // Validate chain_id is not null before inserting
        if (!normalizedChainId) {
          console.error(`[SCAN] ERROR: normalizedChainId is null/undefined for user scan`);
          console.error(`[SCAN] Original chain_id: ${chain_id}, normalized: ${normalizedChainId}`);
          throw new Error('Chain ID cannot be null for token scan record');
        }
        
        console.log(`[SCAN] Recording scan for user ${user_id} with chain_id: ${normalizedChainId}`);
        const { error: scanError } = await supabase
          .from('token_scans')
          .insert({
            user_id,
            token_address: token_address.toLowerCase(),
            chain_id: normalizedChainId,
            score_total: overallScore,
            pro_scan: proScan,
            is_anonymous: false
          });
        
        if (scanError) {
          console.error(`[SCAN] Error recording scan:`, scanError);
        } else {
          console.log(`[SCAN] Successfully recorded scan for user ${user_id}`);
        }
      } catch (error) {
        console.error(`[SCAN] Exception recording scan:`, error);
      }
    } else {
      // Also record anonymous scans for tracking
      try {
        // Validate chain_id is not null before inserting
        if (!normalizedChainId) {
          console.error(`[SCAN] ERROR: normalizedChainId is null/undefined for anonymous scan`);
          console.error(`[SCAN] Original chain_id: ${chain_id}, normalized: ${normalizedChainId}`);
          throw new Error('Chain ID cannot be null for anonymous token scan record');
        }
        
        console.log(`[SCAN] Recording anonymous scan with chain_id: ${normalizedChainId}`);
        const { error: scanError } = await supabase
          .from('token_scans')
          .insert({
            user_id: null,
            token_address: token_address.toLowerCase(),
            chain_id: normalizedChainId,
            score_total: overallScore,
            pro_scan: false,
            is_anonymous: true
          });
        
        if (scanError) {
          console.error(`[SCAN] Error recording anonymous scan:`, scanError);
        } else {
          console.log(`[SCAN] Successfully recorded anonymous scan`);
        }
      } catch (error) {
        console.error(`[SCAN] Exception recording anonymous scan:`, error);
      }
    }

    } catch (error) {
      console.error(`[SCAN] Error during database operations:`, error);
      throw error;
    }

    console.log(`[SCAN] Comprehensive scan completed for ${token_address} on ${chainConfig.name}, overall score: ${overallScore}`);

    return new Response(
      JSON.stringify({
        success: true,
        token_address,
        chain_id: normalizedChainId,
        overall_score: overallScore,
        data_sources: {
          security: apiData.webacyData ? 'Webacy API (primary)' : (apiData.goplusData ? 'GoPlus API (fallback)' : 'unavailable'),
          price: apiData.priceData ? 'Moralis Price API' : 'unavailable',
          metadata: apiData.metadataData ? 'Moralis Metadata API' : 'unavailable',
          development: apiData.githubData ? 'GitHub API' : 'unavailable'
        },
        category_scores: {
          security: categoryData.security.score,
          tokenomics: categoryData.tokenomics.score,
          liquidity: categoryData.liquidity.score,
          community: categoryData.community.score,
          development: categoryData.development.score
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[SCAN] Error during comprehensive token scan:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
