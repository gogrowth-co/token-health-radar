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
async function fetchCoinMarketCapGithubUrl(tokenAddress: string, chainId?: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available`);
      return '';
    }

    console.log(`[CMC] Fetching GitHub URL for token: ${tokenAddress}`);
    
    // CMC uses different platform identifiers, need to include platform parameter for Base chain
    const platformParam = chainId === '0x2105' ? '&platform=base' : '';
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}${platformParam}&aux=urls`,
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
async function fetchCoinMarketCapDiscordUrl(tokenAddress: string, chainId?: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available for Discord fallback`);
      return '';
    }

    console.log(`[CMC] Fetching Discord URL for token: ${tokenAddress}`);
    
    // CMC uses different platform identifiers, need to include platform parameter for Base chain
    const platformParam = chainId === '0x2105' ? '&platform=base' : '';
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}${platformParam}&aux=urls`,
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
async function fetchCoinMarketCapTelegramUrl(tokenAddress: string, chainId?: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available for Telegram fallback`);
      return '';
    }

    console.log(`[CMC] Fetching Telegram URL for token: ${tokenAddress}`);
    
    // CMC uses different platform identifiers, need to include platform parameter for Base chain
    const platformParam = chainId === '0x2105' ? '&platform=base' : '';
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}${platformParam}&aux=urls`,
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

// CoinMarketCap fallback for token description
async function fetchCoinMarketCapDescription(tokenAddress: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available for description fallback`);
      return '';
    }

    console.log(`[CMC] Fetching description for token: ${tokenAddress}`);
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}&aux=description,urls,logo`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`[CMC] Description fallback API request failed: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    console.log(`[CMC] Description fallback API response status:`, data.status);

    if (data.status?.error_code !== 0) {
      console.log(`[CMC] Description fallback API error:`, data.status?.error_message);
      return '';
    }

    // Extract token data - CMC returns data keyed by contract address
    const tokenData = Object.values(data.data || {})[0] as any;
    
    if (!tokenData) {
      console.log(`[CMC] No token data found for description fallback: ${tokenAddress}`);
      return '';
    }

    console.log(`[CMC] Found token for description fallback:`, tokenData.name, tokenData.symbol);

    // Extract description
    const description = tokenData.description;
    
    if (description && description.trim() && description.length > 50) {
      console.log(`[CMC] Description found via fallback: ${description.substring(0, 100)}...`);
      return description.trim();
    } else {
      console.log(`[CMC] No valid description found via fallback`);
      return '';
    }

  } catch (error) {
    console.error(`[CMC] Error fetching description:`, error);
    return '';
  }
}

// Fetch website URL from CoinMarketCap as fallback
async function fetchCoinMarketCapWebsiteUrl(tokenAddress: string, chainId?: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available for website fallback`);
      return '';
    }

    console.log(`[CMC] Fetching website for token: ${tokenAddress}`);
    
    // CMC uses different platform identifiers, need to include platform parameter for Base chain
    const platformParam = chainId === '0x2105' ? '&platform=base' : '';
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}${platformParam}&aux=urls`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`[CMC] Website fallback API request failed: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    console.log(`[CMC] Website fallback API response status:`, data.status);

    if (data.status?.error_code !== 0) {
      console.log(`[CMC] Website fallback API error:`, data.status?.error_message);
      return '';
    }

    // Extract token data - CMC returns data keyed by contract address
    const tokenData = Object.values(data.data || {})[0] as any;
    
    if (!tokenData) {
      console.log(`[CMC] No token data found for website fallback: ${tokenAddress}`);
      return '';
    }

    console.log(`[CMC] Found token for website fallback:`, tokenData.name, tokenData.symbol);

    // Extract website URL
    const urls = tokenData.urls;
    const website = urls?.website?.[0];
    
    if (website && website.trim()) {
      console.log(`[CMC] Website found via fallback: ${website}`);
      return website.trim();
    } else {
      console.log(`[CMC] No valid website found via fallback`);
      return '';
    }

  } catch (error) {
    console.error(`[CMC] Error fetching website:`, error);
    return '';
  }
}

// Website meta description fallback (OpenGraph/Twitter/Meta tags)
async function fetchWebsiteMetaDescription(websiteUrl: string): Promise<string> {
  try {
    if (!websiteUrl) return '';
    let url = websiteUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    console.log(`[WEBSITE-DESC] Fetching site for meta description: ${url}`);
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 5000);
    let resp: Response;
    try {
      resp = await fetch(url, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'TokenHealthScanBot/1.0 (+https://tokenhealthscan.com)'
        },
        signal: controller.signal
      });
    } finally {
      clearTimeout(t);
    }

    if (!resp.ok) {
      console.log(`[WEBSITE-DESC] Request failed: ${resp.status} ${resp.statusText}`);
      return '';
    }

    const html = await resp.text();

    // Helper to extract content for a meta tag regardless of attribute order
    const extractMeta = (attr: 'name' | 'property', value: string): string => {
      const pattern1 = new RegExp(`<meta[^>]*${attr}\\s*=\\s*["]${value}["][^>]*content\\s*=\\s*["]([^\"]+)["][^>]*>`, 'i');
      const pattern2 = new RegExp(`<meta[^>]*content\\s*=\\s*["]([^\"]+)["][^>]*${attr}\\s*=\\s*["]${value}["][^>]*>`, 'i');
      const m1 = html.match(pattern1);
      if (m1 && m1[1]) return m1[1];
      const m2 = html.match(pattern2);
      if (m2 && m2[1]) return m2[1];
      return '';
    };

    let desc =
      extractMeta('property', 'og:description') ||
      extractMeta('name', 'twitter:description') ||
      extractMeta('name', 'description');

    // Basic HTML entity decode for common entities
    if (desc) {
      desc = desc
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }

    if (desc && desc.trim().length > 50) {
      console.log(`[WEBSITE-DESC] Extracted meta description: ${desc.substring(0, 120)}...`);
      return desc.trim();
    }

    console.log(`[WEBSITE-DESC] No suitable meta description found`);
    return '';
  } catch (err) {
    console.error(`[WEBSITE-DESC] Error extracting meta description:`, err);
    return '';
  }
}

// Fetch Twitter handle from CoinMarketCap as fallback
async function fetchCoinMarketCapTwitterHandle(tokenAddress: string, chainId?: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available for Twitter fallback`);
      return '';
    }

    console.log(`[CMC] Fetching Twitter for token: ${tokenAddress}`);
    
    // CMC uses different platform identifiers, need to include platform parameter for Base chain
    const platformParam = chainId === '0x2105' ? '&platform=base' : '';
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}${platformParam}&aux=urls`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`[CMC] Twitter fallback API request failed: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    console.log(`[CMC] Twitter fallback API response status:`, data.status);

    if (data.status?.error_code !== 0) {
      console.log(`[CMC] Twitter fallback API error:`, data.status?.error_message);
      return '';
    }

    // Extract token data - CMC returns data keyed by contract address
    const tokenData = Object.values(data.data || {})[0] as any;
    
    if (!tokenData) {
      console.log(`[CMC] No token data found for Twitter fallback: ${tokenAddress}`);
      return '';
    }

    console.log(`[CMC] Found token for Twitter fallback:`, tokenData.name, tokenData.symbol);

    // Extract Twitter URL
    const urls = tokenData.urls;
    const twitterUrls = urls?.twitter || [];
    
    if (twitterUrls.length > 0) {
      const twitterUrl = twitterUrls[0];
      // Extract handle from Twitter URL
      const match = twitterUrl.match(/twitter\.com\/([^\/\?]+)/);
      if (match && match[1]) {
        const handle = match[1];
        console.log(`[CMC] Twitter handle found via fallback: ${handle}`);
        return handle;
      }
    }
    
    console.log(`[CMC] No valid Twitter handle found via fallback`);
    return '';

  } catch (error) {
    console.error(`[CMC] Error fetching Twitter:`, error);
    return '';
  }
}

// Fetch logo URL from CoinMarketCap as fallback
async function fetchCoinMarketCapLogoUrl(tokenAddress: string): Promise<string> {
  try {
    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      console.log(`[CMC] CoinMarketCap API key not available for logo fallback`);
      return '';
    }

    console.log(`[CMC] Fetching logo for token: ${tokenAddress}`);
    
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?address=${tokenAddress}&aux=logo`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': cmcApiKey,
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      console.log(`[CMC] Logo fallback API request failed: ${response.status} ${response.statusText}`);
      return '';
    }

    const data = await response.json();
    console.log(`[CMC] Logo fallback API response status:`, data.status);

    if (data.status?.error_code !== 0) {
      console.log(`[CMC] Logo fallback API error:`, data.status?.error_message);
      return '';
    }

    // Extract token data - CMC returns data keyed by contract address
    const tokenData = Object.values(data.data || {})[0] as any;
    
    if (!tokenData) {
      console.log(`[CMC] No token data found for logo fallback: ${tokenAddress}`);
      return '';
    }

    console.log(`[CMC] Found token for logo fallback:`, tokenData.name, tokenData.symbol);

    // Extract logo URL
    const logo = tokenData.logo;
    
    if (logo && logo.trim()) {
      console.log(`[CMC] Logo found via fallback: ${logo}`);
      return logo.trim();
    } else {
      console.log(`[CMC] No valid logo found via fallback`);
      return '';
    }

  } catch (error) {
    console.error(`[CMC] Error fetching logo:`, error);
    return '';
  }
}

// Check if description is generic/template-based
function isGenericDescription(description: string): boolean {
  if (!description || description.length < 80) {
    console.log(`[DESCRIPTION-DEBUG] isGenericDescription: REJECT - too short (${description?.length || 0} chars)`);
    return true;
  }
  
  const genericPatterns = [
    /is a cryptocurrency launched in \d{4}/i,
    /operates on the .+ platform/i,
    /has a current supply of/i,
    /more information can be found at/i,
    /is currently trading on \d+ active market/i,
    /the last known price/i
  ];
  
  // Check if it matches any generic patterns
  const matchingPatterns = genericPatterns.filter(pattern => pattern.test(description));
  const matchesGeneric = matchingPatterns.length > 0;
  
  // Check for technical keywords that indicate quality content
  const technicalKeywords = [
    'protocol', 'blockchain', 'smart contract', 'defi', 'dao', 'nft',
    'consensus', 'validator', 'governance', 'staking', 'yield', 'liquidity',
    'bridge', 'layer', 'zero-knowledge', 'zk', 'rollup', 'privacy', 'oracle',
    'interoperability', 'cross-chain', 'scalability', 'dapp', 'proof', 'proofs', 'prover', 'succinct'
  ];
  
  const foundKeywords = technicalKeywords.filter(keyword => 
    description.toLowerCase().includes(keyword)
  );
  const technicalScore = foundKeywords.length;
  
  const isGeneric = matchesGeneric || technicalScore < 1;
  
  console.log(`[DESCRIPTION-DEBUG] isGenericDescription analysis:`, {
    length: description.length,
    matchesGeneric,
    matchingPatterns: matchingPatterns.length,
    technicalScore,
    foundKeywords,
    isGeneric,
    preview: description.substring(0, 150)
  });
  
  // Generic if matches template patterns or has low technical content
  return isGeneric;
}

// Additional quality check for marketing/tagline-style descriptions
function isTaglineStyle(description: string): boolean {
  if (!description) return true;
  const text = description.toLowerCase();
  const marketingPhrases = [
    'for everyone', 'revolution', 'revolutionize', 'next-gen', 'next generation',
    'empower', 'seamless', 'warp speed', 'the future of', 'unlock', 'supercharge'
  ];
  const hasMarketing = marketingPhrases.some(p => text.includes(p));
  const sentenceCount = (description.match(/[.!?]/g) || []).length;
  const tooShort = description.length < 120;
  return hasMarketing || sentenceCount <= 1 || tooShort;
}

// Compose a formal, informative token description from available data
function composeFormalDescription(opts: {
  name: string; symbol: string; chainName: string; contract: string;
  security?: any; stats?: any; price?: any; marketCap?: number; website?: string;
}): string {
  // Handle null values by providing safe defaults
  const { name, symbol, chainName, contract, marketCap, website } = opts;
  const security = opts.security || {};
  const stats = opts.stats || {};
  const price = opts.price || {};
  
  console.log(`[DESCRIPTION-DEBUG] composeFormalDescription called with:`, {
    hasStats: !!opts.stats,
    hasSecurity: !!opts.security,
    hasPrice: !!opts.price,
    statsType: typeof opts.stats,
    securityType: typeof opts.security,
    priceType: typeof opts.price
  });
  
  const parts: string[] = [];
  // First sentence: identity
  let identity = `${name} (${symbol}) is a token on ${chainName}`;
  if (security.contract_verified === true) {
    identity += ' with a verified smart contract';
  }
  identity += `.`;
  parts.push(identity);

  // Security notes
  const notes: string[] = [];
  if (security.ownership_renounced === true) notes.push('ownership renounced');
  if (security.can_mint === false) notes.push('minting disabled');
  if (security.freeze_authority === false) notes.push('no freeze authority');
  if (security.honeypot_detected === false) notes.push('no honeypot detected');
  if (notes.length) {
    parts.push(`Key security notes: ${notes.join('; ')}.`);
  }

  // Supply/holders - Fixed null safety
  const holders = stats?.holders ? 
    (typeof stats.holders === 'number' ? stats.holders : Number(stats.holders) || 0) : 0;
  const totalSupply = stats?.total_supply && stats.total_supply !== '0' ? stats.total_supply : '';
  const supplyBits: string[] = [];
  if (totalSupply) supplyBits.push(`total supply ${totalSupply}`);
  if (holders > 0) supplyBits.push(`approximately ${holders.toLocaleString()} holders`);
  if (supplyBits.length) {
    parts.push(`Token distribution: ${supplyBits.join('; ')}.`);
  }

  // Market context - Fixed null safety
  const priceUsd = typeof price?.current_price_usd === 'number' ? price.current_price_usd : null;
  const mcUsd = typeof marketCap === 'number' && !Number.isNaN(marketCap)
    ? marketCap
    : (typeof price?.market_cap_usd === 'number' ? price.market_cap_usd : null);
  const fmt = (n: number) => {
    if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(2)}k`;
    return `$${n.toFixed(4)}`;
  };
  const marketBits: string[] = [];
  if (priceUsd && priceUsd > 0) marketBits.push(`price around ${fmt(priceUsd)}`);
  if (mcUsd && mcUsd > 0) marketBits.push(`market capitalization approximately ${fmt(mcUsd)}`);
  if (marketBits.length) {
    parts.push(`Market overview: ${marketBits.join(', ')}.`);
  }

  return parts.join(' ');
}

// Fetch description from CoinGecko API
async function fetchCoinGeckoDescription(tokenAddress: string, chainId: string): Promise<string> {
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig || !chainConfig.gecko) {
      console.log(`[COINGECKO] No CoinGecko platform mapping for chain: ${chainId}`);
      return '';
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
    console.log(`[COINGECKO] Fetching description for ${tokenAddress} on platform: ${coinGeckoPlatform}`);

    // Step 1: Get CoinGecko ID for the token
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
        console.log(`[COINGECKO] Token not found on CoinGecko`);
        return '';
      }
      throw new Error(`CoinGecko API error: ${idResponse.status}`);
    }

    const tokenData = await idResponse.json();
    const coinGeckoId = tokenData.id;
    
    if (!coinGeckoId) {
      console.log(`[COINGECKO] No CoinGecko ID found for token`);
      return '';
    }

    console.log(`[COINGECKO] Found CoinGecko ID: ${coinGeckoId}`);

    // Step 2: Get detailed token information including description
    const detailResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false`,
      {
        headers: {
          'accept': 'application/json',
          ...(Deno.env.get('COINGECKO_API_KEY') && {
            'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY')
          })
        }
      }
    );

    if (!detailResponse.ok) {
      console.log(`[COINGECKO] Failed to fetch token details: ${detailResponse.status}`);
      return '';
    }

    const detailData = await detailResponse.json();
    const description = detailData.description?.en || '';
    
    if (description && description.length > 100 && !isGenericDescription(description)) {
      console.log(`[COINGECKO] High-quality description found (${description.length} chars)`);
      return description.trim();
    } else {
      console.log(`[COINGECKO] Description not suitable: ${description ? 'generic/low quality' : 'not found'}`);
      return '';
    }

  } catch (error) {
    console.error(`[COINGECKO] Error fetching description:`, error);
    return '';
  }
}

// Fetch social media links from CoinGecko API
async function fetchCoinGeckoSocialLinks(tokenAddress: string, chainId: string): Promise<{
  website?: string;
  twitter?: string;
  github?: string;
  discord?: string;
  telegram?: string;
}> {
  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig || !chainConfig.gecko) {
      console.log(`[COINGECKO] No CoinGecko platform mapping for chain: ${chainId}`);
      return {};
    }

    // Platform mapping for CoinGecko API
    const platformMap: Record<string, string> = {
      'ethereum': 'ethereum',
      'bsc': 'binance-smart-chain',
      'polygon_pos': 'polygon-pos',
      'arbitrum': 'arbitrum-one',
      'optimism': 'optimistic-ethereum',
      'base': 'base'
    };
    
    const coinGeckoPlatform = platformMap[chainConfig.gecko] || chainConfig.gecko;
    console.log(`[COINGECKO] Fetching social links for ${tokenAddress} on platform: ${coinGeckoPlatform}`);

    // Step 1: Get CoinGecko ID for the token
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
        console.log(`[COINGECKO] Token not found on CoinGecko for social links`);
        return {};
      }
      throw new Error(`CoinGecko API error: ${idResponse.status}`);
    }

    const tokenData = await idResponse.json();
    const coinGeckoId = tokenData.id;
    
    if (!coinGeckoId) {
      console.log(`[COINGECKO] No CoinGecko ID found for social links`);
      return {};
    }

    console.log(`[COINGECKO] Found CoinGecko ID for social links: ${coinGeckoId}`);

    // Step 2: Get detailed token information including links
    const detailResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=false&market_data=false&community_data=true&developer_data=true`,
      {
        headers: {
          'accept': 'application/json',
          ...(Deno.env.get('COINGECKO_API_KEY') && {
            'x-cg-demo-api-key': Deno.env.get('COINGECKO_API_KEY')
          })
        }
      }
    );

    if (!detailResponse.ok) {
      throw new Error(`CoinGecko social links API error: ${detailResponse.status}`);
    }

    const detailData = await detailResponse.json();
    const links = detailData.links || {};
    const socialLinks: any = {};

    // Extract website
    if (links.homepage && links.homepage.length > 0) {
      const website = links.homepage[0]?.trim();
      if (website && website !== '') {
        socialLinks.website = website;
        console.log(`[COINGECKO] Found website: ${website}`);
      }
    }

    // Extract Twitter
    if (links.twitter_screen_name && links.twitter_screen_name.trim()) {
      socialLinks.twitter = links.twitter_screen_name.trim();
      console.log(`[COINGECKO] Found Twitter: @${socialLinks.twitter}`);
    }

    // Extract GitHub
    if (links.repos_url && links.repos_url.github && links.repos_url.github.length > 0) {
      const github = links.repos_url.github[0]?.trim();
      if (github && github !== '') {
        socialLinks.github = github;
        console.log(`[COINGECKO] Found GitHub: ${github}`);
      }
    }

    // Extract Discord from chat URLs
    if (links.chat_url && links.chat_url.length > 0) {
      for (const chatUrl of links.chat_url) {
        if (chatUrl?.includes('discord')) {
          socialLinks.discord = chatUrl.trim();
          console.log(`[COINGECKO] Found Discord: ${socialLinks.discord}`);
          break;
        }
      }
    }

    // Extract Telegram from chat URLs or announcement URLs
    if (links.chat_url && links.chat_url.length > 0) {
      for (const chatUrl of links.chat_url) {
        if (chatUrl?.includes('t.me') || chatUrl?.includes('telegram')) {
          socialLinks.telegram = chatUrl.trim();
          console.log(`[COINGECKO] Found Telegram: ${socialLinks.telegram}`);
          break;
        }
      }
    }

    // Also check announcement URLs for Telegram
    if (!socialLinks.telegram && links.announcement_url && links.announcement_url.length > 0) {
      for (const announceUrl of links.announcement_url) {
        if (announceUrl?.includes('t.me') || announceUrl?.includes('telegram')) {
          socialLinks.telegram = announceUrl.trim();
          console.log(`[COINGECKO] Found Telegram in announcements: ${socialLinks.telegram}`);
          break;
        }
      }
    }

    console.log(`[COINGECKO] Social links summary:`, {
      website: !!socialLinks.website,
      twitter: !!socialLinks.twitter,
      github: !!socialLinks.github,
      discord: !!socialLinks.discord,
      telegram: !!socialLinks.telegram
    });

    return socialLinks;

  } catch (error) {
    console.error(`[COINGECKO] Error fetching social links:`, error);
    return {};
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
    console.log(`[SCAN] Unsupported chain: ${chainId}, returning fallback data`);
    // Return fallback data for unsupported chains instead of null
    return {
      tokenData: {
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
        logo: '',
        description: `Token on unsupported chain (${chainId})`,
        total_supply: '0',
        verified_contract: false,
        possible_spam: false
      },
      securityData: {
        ownership_renounced: null,
        can_mint: false,
        honeypot_detected: false,
        freeze_authority: false,
        is_proxy: false,
        is_blacklisted: false,
        access_control: false,
        contract_verified: false,
        audit_status: 'unknown',
        buy_tax: 0,
        sell_tax: 0,
        transfer_tax: 0,
        is_liquidity_locked: false,
        liquidity_lock_info: null,
        liquidity_percentage: null,
        multisig_status: 'unknown'
      },
      webacyData: null,
      priceData: null,
      statsData: null,
      pairsData: null,
      ownersData: null,
      githubData: null,
      tvlData: null,
      cexData: 0,
      twitterFollowers: 0,
      discordMembers: 0,
      telegramMembers: 0
    };
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
    let telegram_url = ''; // Declare telegram_url in proper scope
    
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
       
       // Validate Telegram URL
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
       telegram_url = links.telegram || '';
       
       // Validate Discord URL from object
       if (discord_url && !isValidDiscordUrl(discord_url)) {
         console.log(`[SCAN] Invalid Discord URL format found in object: ${discord_url}`);
         discord_url = '';
       }
       
       // Validate Telegram URL from object
       if (telegram_url && !isValidTelegramUrl(telegram_url)) {
         console.log(`[SCAN] Invalid Telegram URL format found in object: ${telegram_url}`);
         telegram_url = '';
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
      discord_url,
      telegram_url
    });
    
    // CoinGecko fallback for social links (primary fallback - more reliable than CMC)
    if (!website_url || !twitter_handle || !github_url || !discord_url || !telegram_url) {
      console.log(`[SCAN] Missing social links from Moralis, trying CoinGecko fallback`);
      const cgSocialLinks = await fetchCoinGeckoSocialLinks(tokenAddress, chainId);
      
      if (!website_url && cgSocialLinks.website) {
        website_url = cgSocialLinks.website;
        console.log(`[SCAN] Website URL found via CoinGecko: ${website_url}`);
      }
      
      if (!twitter_handle && cgSocialLinks.twitter) {
        twitter_handle = cgSocialLinks.twitter;
        console.log(`[SCAN] Twitter handle found via CoinGecko: @${twitter_handle}`);
      }
      
      if (!github_url && cgSocialLinks.github) {
        github_url = cgSocialLinks.github;
        console.log(`[SCAN] GitHub URL found via CoinGecko: ${github_url}`);
      }
      
      if (!discord_url && cgSocialLinks.discord) {
        discord_url = cgSocialLinks.discord;
        console.log(`[SCAN] Discord URL found via CoinGecko: ${discord_url}`);
      }
      
      if (!telegram_url && cgSocialLinks.telegram) {
        telegram_url = cgSocialLinks.telegram;
        console.log(`[SCAN] Telegram URL found via CoinGecko: ${telegram_url}`);
      }
    }

    // CoinMarketCap fallback for remaining missing links (secondary fallback)
    if (!website_url) {
      console.log(`[SCAN] Website URL not found in Moralis/CoinGecko, trying CoinMarketCap fallback`);
      const cmcWebsiteUrl = await fetchCoinMarketCapWebsiteUrl(tokenAddress, chainId);
      if (cmcWebsiteUrl) {
        website_url = cmcWebsiteUrl;
        console.log(`[SCAN] Website URL found via CoinMarketCap: ${website_url}`);
      } else {
        console.log(`[SCAN] No website URL found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] Website URL already found: ${website_url}`);
    }

    if (!twitter_handle) {
      console.log(`[SCAN] Twitter handle not found in Moralis/CoinGecko, trying CoinMarketCap fallback`);
      const cmcTwitterHandle = await fetchCoinMarketCapTwitterHandle(tokenAddress, chainId);
      if (cmcTwitterHandle) {
        twitter_handle = cmcTwitterHandle;
        console.log(`[SCAN] Twitter handle found via CoinMarketCap: @${twitter_handle}`);
      } else {
        console.log(`[SCAN] No Twitter handle found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] Twitter handle already found: @${twitter_handle}`);
    }

    if (!github_url) {
      console.log(`[SCAN] GitHub URL not found in Moralis/CoinGecko, trying CoinMarketCap fallback`);
      const cmcGithubUrl = await fetchCoinMarketCapGithubUrl(tokenAddress, chainId);
      if (cmcGithubUrl) {
        github_url = cmcGithubUrl;
        console.log(`[SCAN] GitHub URL found via CoinMarketCap: ${github_url}`);
      } else {
        console.log(`[SCAN] No GitHub URL found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] GitHub URL already found: ${github_url}`);
    }
    
    if (!discord_url) {
      console.log(`[SCAN] Discord URL not found in Moralis/CoinGecko, trying CoinMarketCap fallback`);
      const cmcDiscordUrl = await fetchCoinMarketCapDiscordUrl(tokenAddress, chainId);
      if (cmcDiscordUrl && isValidDiscordUrl(cmcDiscordUrl)) {
        discord_url = cmcDiscordUrl;
        console.log(`[SCAN] Discord URL found via CoinMarketCap: ${discord_url}`);
      } else {
        console.log(`[SCAN] No valid Discord URL found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] Discord URL already found: ${discord_url}`);
    }
    
    if (!telegram_url) {
      console.log(`[SCAN] Telegram URL not found in Moralis/CoinGecko, trying CoinMarketCap fallback`);
      const cmcTelegramUrl = await fetchCoinMarketCapTelegramUrl(tokenAddress, chainId);
      if (cmcTelegramUrl && isValidTelegramUrl(cmcTelegramUrl)) {
        telegram_url = cmcTelegramUrl;
        console.log(`[SCAN] Telegram URL found via CoinMarketCap: ${telegram_url}`);
      } else {
        console.log(`[SCAN] No valid Telegram URL found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] Telegram URL already found: ${telegram_url}`);
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
          .eq('chain_id', chainId)
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
    
    // Logo fallback logic with CoinMarketCap
    let logo_url = metadata?.logo || metadata?.thumbnail || '';
    if (!logo_url) {
      console.log(`[SCAN] Logo URL not found in Moralis, trying CoinMarketCap fallback`);
      const cmcLogoUrl = await fetchCoinMarketCapLogoUrl(tokenAddress);
      if (cmcLogoUrl) {
        logo_url = cmcLogoUrl;
        console.log(`[SCAN] Logo URL found via CoinMarketCap: ${logo_url}`);
      } else {
        console.log(`[SCAN] No logo URL found via CoinMarketCap fallback`);
      }
    } else {
      console.log(`[SCAN] Logo URL already found from Moralis: ${logo_url}`);
    }
    
    // Enhanced description logic with CoinMarketCap fallback
    let description = '';
    
    // Debug what Moralis is returning
    console.log(`[DESCRIPTION-DEBUG] Moralis metadata description analysis:`, {
      hasDescription: !!metadata?.description,
      descriptionLength: metadata?.description?.length || 0,
      descriptionPreview: metadata?.description ? metadata.description.substring(0, 200) : 'null/undefined',
      isGeneric: metadata?.description ? isGenericDescription(metadata.description) : 'N/A',
      meetsLengthReq: metadata?.description ? metadata.description.length > 100 : false
    });
    
    // First try Moralis description (if high quality)
    if (metadata?.description && metadata.description.trim() && metadata.description.length > 100 && !isGenericDescription(metadata.description)) {
      description = metadata.description.trim();
      console.log(`[DESCRIPTION] Using high-quality Moralis description: ${description.substring(0, 100)}...`);
    } else {
      console.log(`[DESCRIPTION] Moralis description not available, too short, or generic. Trying fallbacks...`);
      
      console.log(`[DESCRIPTION] Trying CoinMarketCap fallback`);
      
      // Try CoinMarketCap as fallback
      const cmcDescription = await fetchCoinMarketCapDescription(tokenAddress);
      console.log(`[DESCRIPTION-DEBUG] CoinMarketCap response:`, {
        hasResponse: !!cmcDescription,
        responseLength: cmcDescription?.length || 0,
        responsePreview: cmcDescription ? cmcDescription.substring(0, 200) : 'null/undefined',
        isGeneric: cmcDescription ? isGenericDescription(cmcDescription) : 'N/A'
      });
      
      if (cmcDescription && !isGenericDescription(cmcDescription)) {
        description = cmcDescription;
        console.log(`[DESCRIPTION] Using CoinMarketCap description: ${description.substring(0, 100)}...`);
      } else {
        // Try website meta description fallback
        if (website_url) {
          console.log(`[DESCRIPTION] Trying website meta description fallback: ${website_url}`);
          const siteDesc = await fetchWebsiteMetaDescription(website_url);
          console.log(`[DESCRIPTION-DEBUG] Website meta response:`, {
            hasResponse: !!siteDesc,
            responseLength: siteDesc?.length || 0,
            responsePreview: siteDesc ? siteDesc.substring(0, 200) : 'null/undefined',
            isGeneric: siteDesc ? isGenericDescription(siteDesc) : 'N/A'
          });
          if (siteDesc && !isGenericDescription(siteDesc)) {
            description = siteDesc;
            console.log(`[DESCRIPTION] Using Website meta description: ${description.substring(0, 100)}...`);
          }
        }

        // Try CoinGecko description as additional fallback
        if (!description) {
          const cgDesc = await fetchCoinGeckoDescription(tokenAddress, chainId);
          console.log(`[DESCRIPTION-DEBUG] CoinGecko response:`, {
            hasResponse: !!cgDesc,
            responseLength: cgDesc?.length || 0,
            isGeneric: cgDesc ? isGenericDescription(cgDesc) : 'N/A'
          });
          if (cgDesc && !isGenericDescription(cgDesc)) {
            description = cgDesc.trim();
            console.log(`[DESCRIPTION] Using CoinGecko description: ${description.substring(0, 100)}...`);
          }
        }

        // Final fallback to enhanced generic template
        if (!description) {
          description = metadata?.name 
            ? `${metadata.name} (${metadata.symbol}) is a token on ${chainConfig.name}${metadata.verified_contract ? ' with a verified contract' : ''}.`
            : `${name} on ${chainConfig.name}`;
          console.log(`[DESCRIPTION] Using generic template: ${description}`);
        }
      }
    }
    
    // Ensure formal, informative description
    if (description) {
      if (isTaglineStyle(description) || description.length < 140) {
        const formal = composeFormalDescription({
          name,
          symbol,
          chainName: chainConfig.name,
          contract: tokenAddress,
          security,
          stats,
          price: priceDataResult,
          marketCap: metadata?.market_cap ? parseFloat(metadata.market_cap) : 0,
          website: website_url
        });
        if (formal) {
          description = formal;
          console.log(`[DESCRIPTION] Using composed formal description: ${description.substring(0, 120)}...`);
        }
      }
    }

    // Combine data from all sources, prioritizing Moralis for richer data
    const combinedData = {
      name: metadata?.name || priceDataResult?.name || `Token ${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`,
      symbol: metadata?.symbol || priceDataResult?.symbol || 'UNKNOWN',
      description: description,
      logo_url: logo_url,
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
    console.log(`[SCAN] Returning fallback data structure to prevent null reference errors`);
    
    // Return a fallback data structure instead of null to prevent crashes
    return {
      tokenData: {
        name: 'Unknown Token',
        symbol: 'UNKNOWN',
        decimals: 18,
        logo: '',
        description: '',
        total_supply: '0',
        verified_contract: false,
        possible_spam: false
      },
      securityData: {
        ownership_renounced: null,
        can_mint: false,
        honeypot_detected: false,
        freeze_authority: false,
        is_proxy: false,
        is_blacklisted: false,
        access_control: false,
        contract_verified: false,
        audit_status: 'unknown',
        buy_tax: 0,
        sell_tax: 0,
        transfer_tax: 0,
        is_liquidity_locked: false,
        liquidity_lock_info: null,
        liquidity_percentage: null,
        multisig_status: 'unknown'
      },
      webacyData: null,
      priceData: null,
      statsData: null,
      pairsData: null,
      ownersData: null,
      githubData: null,
      tvlData: null,
      cexData: 0,
      twitterFollowers: 0,
      discordMembers: 0,
      telegramMembers: 0
    };
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
  const startTime = Date.now();
  const requestId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  console.log(`[${requestId}] === EDGE FUNCTION STARTED ===`);
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] URL: ${req.url}`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response(null, { headers: corsHeaders });
  }

  // HEALTH CHECK ENDPOINT
  if (req.method === 'GET') {
    console.log(`[${requestId}] Health check requested`);
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Edge function is deployed and running',
      timestamp: new Date().toISOString(),
      deployment_status: 'active',
      request_id: requestId
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Comprehensive try-catch wrapper for all edge function logic
  try {
    // PHASE 1: Environment validation
    console.log(`[${requestId}] === PHASE 1: ENVIRONMENT VALIDATION ===`);
    
    const envCheck = {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      WEBACY_API_KEY: !!Deno.env.get('WEBACY_API_KEY'),
      MORALIS_API_KEY: !!Deno.env.get('MORALIS_API_KEY'),
      GITHUB_API_KEY: !!Deno.env.get('GITHUB_API_KEY'),
      APIFY_API_KEY: !!Deno.env.get('APIFY_API_KEY')
    };
    
    console.log(`[${requestId}] Environment check:`, envCheck);

    // Critical environment variables check
    if (!envCheck.SUPABASE_URL || !envCheck.SUPABASE_SERVICE_ROLE_KEY) {
      console.error(`[${requestId}] CRITICAL: Missing Supabase configuration`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Function misconfigured - missing Supabase credentials',
        request_id: requestId,
        env_check: envCheck 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // API key validation with warnings
    const missingKeys = [];
    if (!envCheck.WEBACY_API_KEY) missingKeys.push('WEBACY_API_KEY');
    if (!envCheck.MORALIS_API_KEY) missingKeys.push('MORALIS_API_KEY');
    
    if (missingKeys.length > 0) {
      console.error(`[${requestId}] CRITICAL: Missing required API keys:`, missingKeys);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Missing required API keys: ${missingKeys.join(', ')}`,
        request_id: requestId,
        missing_keys: missingKeys
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 2: Request parsing and validation
    console.log(`[${requestId}] === PHASE 2: REQUEST VALIDATION ===`);
    
    let requestBody;
    try {
      const bodyText = await req.text();
      console.log(`[${requestId}] Raw request body length: ${bodyText.length} chars`);
      
      if (!bodyText.trim()) {
        throw new Error('Empty request body');
      }
      
      requestBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse request body:`, parseError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid or empty JSON in request body',
        request_id: requestId,
        details: parseError.message
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { token_address, chain_id, user_id, force_refresh = true } = requestBody;
    console.log(`[${requestId}] Request parameters:`, { token_address, chain_id, user_id, force_refresh });
    
    // Validate required parameters
    if (!token_address || typeof token_address !== 'string') {
      console.error(`[${requestId}] Invalid token_address:`, token_address);
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing or invalid token_address parameter',
        request_id: requestId,
        received: { token_address, type: typeof token_address }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!chain_id || typeof chain_id !== 'string') {
      console.error(`[${requestId}] Invalid chain_id:`, chain_id);
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing or invalid chain_id parameter',
        request_id: requestId,
        received: { chain_id, type: typeof chain_id }
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate token address format (basic hex check)
    const addressPattern = /^0x[a-fA-F0-9]{40}$/;
    if (!addressPattern.test(token_address)) {
      console.error(`[${requestId}] Invalid token address format:`, token_address);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid token address format. Must be a valid Ethereum address (0x...)',
        request_id: requestId,
        received_address: token_address
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    // PHASE 3: Chain validation and normalization
    console.log(`[${requestId}] === PHASE 3: CHAIN VALIDATION ===`);
    
    let normalizedChainId;
    let chainConfig;
    
    try {
      normalizedChainId = normalizeChainId(chain_id);
      chainConfig = getChainConfigByMoralisId(normalizedChainId);
      
      if (!chainConfig) {
        console.error(`[${requestId}] Unsupported chain:`, chain_id);
        return new Response(JSON.stringify({
          success: false,
          error: `Unsupported chain: ${chain_id}`,
          request_id: requestId,
          supported_chains: ['0x1', '0x89', '0xa4b1', '0x38'] // Example
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`[${requestId}] Validated chain: ${chainConfig.name} (${normalizedChainId})`);
    } catch (error) {
      console.error(`[${requestId}] Chain validation error:`, error);
      return new Response(JSON.stringify({
        success: false,
        error: `Chain validation failed: ${error.message}`,
        request_id: requestId
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // PHASE 4: Set up timeout protection for the entire scan
    console.log(`[${requestId}] === PHASE 4: TIMEOUT SETUP ===`);
    
    const SCAN_TIMEOUT_MS = 50000; // 50 seconds (extended to reduce timeout errors)
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Scan timeout exceeded (${SCAN_TIMEOUT_MS}ms)`));
      }, SCAN_TIMEOUT_MS);
    });

    // PHASE 5: Execute main scan logic with timeout protection
    console.log(`[${requestId}] === PHASE 5: MAIN SCAN EXECUTION ===`);
    console.log(`[${requestId}] Token: ${token_address}, Chain: ${normalizedChainId}`);
    console.log(`[${requestId}] User: ${user_id || 'Anonymous'}, Force refresh: ${force_refresh}`);
    
    const mainScanLogic = async () => {
      // Cache invalidation
      console.log(`[${requestId}] Invalidating cache...`);
      try {
        const clearedTables = await invalidateTokenCache(token_address.toLowerCase(), normalizedChainId);
        console.log(`[${requestId}] Cache cleared: ${clearedTables} tables updated`);
      } catch (cacheError) {
        console.warn(`[${requestId}] Cache invalidation failed (continuing):`, cacheError);
      }

      // Fetch token data with comprehensive error handling
      console.log(`[${requestId}] Fetching token data from APIs...`);
      let apiData;
      
      try {
        apiData = await fetchTokenDataFromAPIs(token_address, normalizedChainId);
        
        if (!apiData) {
          throw new Error('fetchTokenDataFromAPIs returned null - no data available from external APIs');
        }
        
        console.log(`[${requestId}] Successfully fetched API data for: ${apiData.tokenData?.name || 'Unknown'} (${apiData.tokenData?.symbol || 'Unknown'})`);
      } catch (apiError) {
        console.error(`[${requestId}] API data fetch failed:`, apiError);
        throw new Error(`Failed to fetch token data: ${apiError.message}`);
      }

      // Generate scores and category data
      console.log(`[${requestId}] Generating category scores...`);
      let categoryData;
      let overallScore;
      
      try {
        categoryData = generateCategoryData(apiData);
        overallScore = calculateOverallScore(categoryData);
        console.log(`[${requestId}] Successfully calculated overall score: ${overallScore}`);
      } catch (scoreError) {
        console.error(`[${requestId}] Score calculation failed:`, scoreError);
        throw new Error(`Failed to calculate scores: ${scoreError.message}`);
      }

      // Database operations with enhanced error handling
      console.log(`[${requestId}] === DATABASE OPERATIONS ===`);
      
      try {
        // UPSERT token data to main cache table
        console.log(`[${requestId}] Upserting token data to database...`);
        console.log(`[${requestId}] Data summary:`, {
          name: apiData.tokenData.name,
          symbol: apiData.tokenData.symbol,
          current_price_usd: apiData.tokenData.current_price_usd,
          market_cap_usd: apiData.tokenData.market_cap_usd,
          logo_url: apiData.tokenData.logo_url ? 'present' : 'missing'
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
        
        // Determine if this is a pro scan (force_refresh indicates admin/pro access)
        const proScan = force_refresh || false;
        console.log(`[SCAN] Pro scan status: ${proScan} (force_refresh: ${force_refresh})`);
        
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

      } catch (dbError) {
        console.error(`[${requestId}] Database operations failed:`, dbError);
        throw new Error(`Database operations failed: ${dbError.message}`);
      }

      // Return successful scan result
      return {
        success: true,
        token_address,
        chain_id: normalizedChainId,
        overall_score: overallScore,
        request_id: requestId,
        processing_time_ms: Date.now() - startTime,
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
      };
    };

    // Execute main logic with timeout protection
    let scanResult;
    try {
      scanResult = await Promise.race([mainScanLogic(), timeoutPromise]);
      console.log(`[${requestId}] Scan completed successfully in ${Date.now() - startTime}ms`);
    } catch (timeoutError) {
      if (timeoutError.message.includes('timeout')) {
        console.error(`[${requestId}] Scan timed out:`, timeoutError);
        return new Response(JSON.stringify({
          success: false,
          error: 'Scan timeout - the operation took too long to complete',
          request_id: requestId,
          timeout_ms: SCAN_TIMEOUT_MS,
          processing_time_ms: Date.now() - startTime
        }), {
          status: 408,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } else {
        throw timeoutError; // Re-throw non-timeout errors
      }
    }

    // Return successful response
    return new Response(JSON.stringify(scanResult), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${requestId}] Comprehensive error during token scan:`, error);
    console.error(`[${requestId}] Error stack:`, error.stack);
    console.error(`[${requestId}] Processing time before error: ${processingTime}ms`);
    
    // Determine appropriate error status code
    let statusCode = 500;
    let errorMessage = error.message || 'Internal server error';
    
    if (errorMessage.includes('Invalid') || errorMessage.includes('Missing')) {
      statusCode = 400;
    } else if (errorMessage.includes('timeout')) {
      statusCode = 408;
    } else if (errorMessage.includes('API key') || errorMessage.includes('misconfigured')) {
      statusCode = 500;
    } else if (errorMessage.includes('Unsupported chain')) {
      statusCode = 400;
    }

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
      request_id: requestId,
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString(),
      error_type: error.constructor.name
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
