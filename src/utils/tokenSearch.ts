
import { toast } from "sonner";
import { TokenResult } from "@/components/token/types";

// Cache for token detail responses to reduce API calls - versioned
export const CACHE_VERSION = "v3"; // Increment this when logic changes
export const tokenDetailCache: Record<string, any> = {};

// Used to prevent too many API calls in a short period
let lastApiCallTime = 0;
let lastDetailApiCallTime = 0;
export const MIN_API_CALL_INTERVAL = 1000; // milliseconds between search calls
export const MIN_DETAIL_API_CALL_INTERVAL = 600; // milliseconds between detail calls

// Comprehensive list of known ERC-20 tokens that are definitely EVM-compatible
export const KNOWN_ERC20_TOKENS = [
  'ethereum', 'uniswap', 'dai', 'chainlink', 'aave', 'compound', 
  'maker', 'wrapped-bitcoin', 'tether', 'usd-coin', 'shiba-inu',
  'matic-network', 'the-graph', 'yearn-finance', 'synthetix-network-token',
  'bancor', 'balancer', '0x', 'kyber-network', 'republic-protocol',
  'augur', 'golem', 'basic-attention-token', 'omisego', 'status',
  'district0x', 'civic', 'storj', 'salt', 'power-ledger', 'request-network',
  'metal', 'tenx', 'raiden-network-token', 'wings', 'firstblood',
  'sngls', 'gnosis-gno', 'edgeless', 'melon', 'chronobank',
  'swarm-city', 'wetrust', 'humaniq', 'matchpool', 'tokencard',
  'numeraire', 'aragon', 'bancor-network-token', 'iexec-rlc',
  'viberate', 'simple-token', 'populous', 'trustcoin', 'monaco',
  'dogecoin', 'litecoin', 'bitcoin-cash', 'eos', 'stellar',
  'tron', 'binancecoin', 'cardano', 'vechain', 'theta-token',
  'crypto-com-chain', 'unus-sed-leo', 'ftx-token', 'okb',
  'huobi-token', 'kucoin-shares', 'celsius-degree-token',
  'nexo', 'terra-luna', 'avalanche-2', 'solana', 'polygon',
  'fantom', 'harmony', 'near', 'algorand', 'cosmos',
  'internet-computer', 'filecoin', 'the-sandbox', 'decentraland',
  'axie-infinity', 'enjincoin', 'gala', 'immutable-x', 'flow',
  'chiliz', 'wax', 'theta-fuel', 'render-token', 'livepeer'
];

// EVM-compatible chains that we support
export const EVM_CHAINS = [
  'ethereum', 'polygon-pos', 'binance-smart-chain', 'arbitrum-one', 
  'avalanche', 'optimistic-ethereum', 'base', 'fantom', 'cronos',
  'harmony-shard-0', 'moonbeam', 'aurora', 'celo', 'metis-andromeda',
  'milkomeda-cardano', 'boba', 'moonriver', 'xdai', 'polygon-zkevm',
  'arbitrum-nova', 'optimism'
];

// Helper function to properly determine if a token is ERC-20 compatible
export const isValidErc20Token = (token: any): boolean => {
  // Check if it's in our known ERC-20 whitelist
  if (KNOWN_ERC20_TOKENS.includes(token.id)) {
    return true;
  }
  
  // Check platforms data for ANY EVM chain with valid address
  if (token.platforms && typeof token.platforms === 'object') {
    const hasEvmPlatform = Object.entries(token.platforms).some(([platform, address]) => {
      if (!EVM_CHAINS.includes(platform)) return false;
      if (!address || typeof address !== 'string') return false;
      
      // Check for valid ethereum address format or special cases
      const addr = address.trim().toLowerCase();
      return addr.startsWith('0x') && (addr.length === 42 || addr.length === 40);
    });
    
    if (hasEvmPlatform) return true;
  }
  
  // Additional checks for tokens that might be EVM but not properly detected
  const nameAndSymbol = ((token.name || '') + (token.symbol || '')).toLowerCase();
  if (nameAndSymbol.includes('erc20') || nameAndSymbol.includes('erc-20') || 
      nameAndSymbol.includes('ethereum') || token.symbol?.toLowerCase().includes('eth')) {
    return true;
  }
  
  return false;
};

// Improved API call function with rate limiting and caching
export const callCoinGeckoAPI = async (url: string, isDetailRequest = false) => {
  const now = Date.now();
  const minInterval = isDetailRequest ? MIN_DETAIL_API_CALL_INTERVAL : MIN_API_CALL_INTERVAL;
  const lastTime = isDetailRequest ? lastDetailApiCallTime : lastApiCallTime;
  
  if (now - lastTime < minInterval) {
    await new Promise(resolve => 
      setTimeout(resolve, minInterval - (now - lastTime))
    );
  }
  
  if (isDetailRequest) {
    lastDetailApiCallTime = Date.now();
  } else {
    lastApiCallTime = Date.now();
  }
  
  // Check cache first for detail requests
  if (isDetailRequest && tokenDetailCache[url]) {
    console.log("Using cached data for:", url);
    return tokenDetailCache[url];
  }
  
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(url, { headers });
    
    if (response.status === 429) {
      const retryAfter = response.headers.get('retry-after');
      const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
      console.warn(`Rate limit hit, suggested wait time: ${waitTime}ms`);
      throw new Error("API rate limit reached. Please try again in a few moments.");
    }
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache detail responses
    if (isDetailRequest) {
      tokenDetailCache[url] = data;
    }
    
    return data;
  } catch (error) {
    throw error;
  }
};

// Function to fetch detailed token data including platforms
const fetchTokenDetails = async (tokenId: string): Promise<any> => {
  const detailUrl = `https://api.coingecko.com/api/v3/coins/${tokenId}`;
  try {
    return await callCoinGeckoAPI(detailUrl, true);
  } catch (error) {
    console.warn(`Failed to fetch details for ${tokenId}:`, error);
    return null;
  }
};

// Main search function for tokens
export const searchTokens = async (searchTerm: string): Promise<TokenResult[]> => {
  console.log("Searching for tokens with term:", searchTerm);
  
  // Check if search term looks like an address
  const isAddress = searchTerm.startsWith('0x') && searchTerm.length === 42;
  
  try {
    if (isAddress) {
      // Search by contract address
      const url = `https://api.coingecko.com/api/v3/coins/ethereum/contract/${searchTerm}`;
      const tokenData = await callCoinGeckoAPI(url, true);
      
      return [{
        id: tokenData.id,
        name: tokenData.name,
        symbol: tokenData.symbol,
        thumb: tokenData.image?.thumb || '',
        large: tokenData.image?.large || '',
        platforms: tokenData.platforms || {},
        market_cap: tokenData.market_data?.market_cap?.usd,
        price_usd: tokenData.market_data?.current_price?.usd,
        price_change_24h: tokenData.market_data?.price_change_percentage_24h,
        isErc20: isValidErc20Token(tokenData),
        description: tokenData.description?.en
      }];
    } else {
      // Search by name
      const url = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchTerm)}`;
      const searchData = await callCoinGeckoAPI(url);
      
      if (!searchData.coins || searchData.coins.length === 0) {
        return [];
      }
      
      // For search results, fetch detailed data for better platform information
      // Limit to top 10 results to avoid too many API calls
      const topResults = searchData.coins.slice(0, 10);
      
      const detailedResults = await Promise.allSettled(
        topResults.map(async (coin: any) => {
          // First try to get detailed data
          const detailData = await fetchTokenDetails(coin.id);
          
          if (detailData) {
            return {
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
              market_cap_rank: coin.market_cap_rank,
              thumb: coin.thumb,
              large: coin.large,
              platforms: detailData.platforms || {},
              market_cap: detailData.market_data?.market_cap?.usd,
              price_usd: detailData.market_data?.current_price?.usd,
              price_change_24h: detailData.market_data?.price_change_percentage_24h,
              isErc20: isValidErc20Token(detailData),
              description: detailData.description?.en
            };
          } else {
            // Fallback to basic data if detailed fetch fails
            return {
              id: coin.id,
              name: coin.name,
              symbol: coin.symbol,
              market_cap_rank: coin.market_cap_rank,
              thumb: coin.thumb,
              large: coin.large,
              platforms: {},
              isErc20: KNOWN_ERC20_TOKENS.includes(coin.id)
            };
          }
        })
      );
      
      // Filter successful results and sort by market cap rank
      return detailedResults
        .filter((result): result is PromiseFulfilledResult<TokenResult> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value)
        .sort((a, b) => {
          // Prioritize tokens with market cap rank
          if (a.market_cap_rank && b.market_cap_rank) {
            return a.market_cap_rank - b.market_cap_rank;
          }
          if (a.market_cap_rank && !b.market_cap_rank) return -1;
          if (!a.market_cap_rank && b.market_cap_rank) return 1;
          return 0;
        });
    }
  } catch (error) {
    console.error("Token search error:", error);
    throw error;
  }
};
