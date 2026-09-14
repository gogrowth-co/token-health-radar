// CoinGecko contract-address lookup — Moralis metadata/price fallback.
//
// Added 2026-09-14: Moralis's key started returning 401s (plan lapsed
// 2026-09-01). This covers name/symbol/market cap/price/social links from a
// single call, keyed by contract address directly — no pre-existing
// coingecko_id needed (unlike the old Moralis-metadata-derived fallback this
// replaces). Verified live against all 5 EVM chains this project supports.
//
// Free, keyless for the public API tier. COINGECKO_API_KEY (already
// configured) raises rate limits when present but is not required for this
// endpoint to work.
//
// Fix 2026-09-14 (found via live smoke test after this file's first deploy):
// the configured COINGECKO_API_KEY is a Demo-tier key, not Pro. Demo keys
// only work against api.coingecko.com with the `x-cg-demo-api-key` header —
// sending one to pro-api.coingecko.com with `x-cg-pro-api-key` (the previous
// behavior here, "send a Pro header whenever a key exists") gets HTTP 400
// ("If you are using Demo API key, please change your root URL... to
// api.coingecko.com") on every call, silently nulling this whole fallback.
// Confirmed live: api.coingecko.com + x-cg-demo-api-key → 200 with this key;
// pro-api.coingecko.com + x-cg-pro-api-key → 400 with the same key. If this
// key is ever upgraded to a paid Pro plan, switch baseUrl back to
// pro-api.coingecko.com and the header back to x-cg-pro-api-key.
import { getChainConfigByMoralisId } from './chainConfig.ts';

export interface CoinGeckoTokenData {
  name: string;
  symbol: string;
  logo: string;
  description: string;
  total_supply: string | null;
  circulating_supply: number | null;
  market_cap: number | null;
  current_price_usd: number;
  price_change_24h: number | null;
  trading_volume_24h_usd: number;
  links: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    github?: string;
    website?: string;
  };
}

export async function fetchCoinGeckoTokenData(
  tokenAddress: string,
  chainId: string,
): Promise<CoinGeckoTokenData | null> {
  console.log(`[COINGECKO] === STARTING CONTRACT LOOKUP ===`);
  console.log(`[COINGECKO] Token: ${tokenAddress}, Chain: ${chainId}`);

  try {
    const chainConfig = getChainConfigByMoralisId(chainId);
    if (!chainConfig?.coingeckoPlatform) {
      console.log(`[COINGECKO] No platform mapping for chain: ${chainId}`);
      return null;
    }

    const apiKey = Deno.env.get('COINGECKO_API_KEY');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (apiKey) headers['x-cg-demo-api-key'] = apiKey;
    const baseUrl = 'https://api.coingecko.com';

    const url = `${baseUrl}/api/v3/coins/${chainConfig.coingeckoPlatform}/contract/${tokenAddress.toLowerCase()}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=false`;
    console.log(`[COINGECKO] Request URL: ${url}`);

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.error(`[COINGECKO] API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    if (!data || !data.id) {
      console.log(`[COINGECKO] No data found for ${tokenAddress}`);
      return null;
    }

    const marketData = data.market_data || {};
    const links = data.links || {};

    const discordLink = Array.isArray(links.chat_url)
      ? links.chat_url.find((u: string) => u?.includes('discord'))
      : undefined;
    const githubLink = links.repos_url?.github?.length > 0 ? links.repos_url.github[0] : undefined;
    const websiteLink = Array.isArray(links.homepage) ? links.homepage.find((u: string) => u) : undefined;

    console.log(`[COINGECKO] Found: ${data.name} (${data.symbol}), market_cap=${marketData.market_cap?.usd}`);

    return {
      name: data.name || '',
      symbol: (data.symbol || '').toUpperCase(),
      logo: data.image?.large || data.image?.small || '',
      description: data.description?.en || '',
      total_supply: marketData.total_supply != null ? String(marketData.total_supply) : null,
      circulating_supply: marketData.circulating_supply ?? null,
      market_cap: marketData.market_cap?.usd ?? null,
      current_price_usd: marketData.current_price?.usd ?? 0,
      price_change_24h: marketData.price_change_percentage_24h ?? null,
      trading_volume_24h_usd: marketData.total_volume?.usd ?? 0,
      links: {
        twitter: links.twitter_screen_name ? `https://twitter.com/${links.twitter_screen_name}` : undefined,
        telegram: links.telegram_channel_identifier ? `https://t.me/${links.telegram_channel_identifier}` : undefined,
        discord: discordLink,
        github: githubLink,
        website: websiteLink,
      },
    };
  } catch (error) {
    console.error(`[COINGECKO] Error fetching contract data:`, error);
    return null;
  }
}
