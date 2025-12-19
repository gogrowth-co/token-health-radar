
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MoralisTokenMetadata {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  decimals?: number;
  verified_contract?: boolean;
  possible_spam?: boolean;
}

interface CoinGeckoCoin {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank: number | null;
  thumb: string;
  large: string;
}

interface CoinGeckoSearchResponse {
  coins: CoinGeckoCoin[];
}

interface CoinGeckoCoinDetail {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>; // platform name -> contract address
  image?: {
    thumb?: string;
    small?: string;
    large?: string;
  };
}

interface TokenResult {
  id: string;
  name: string;
  symbol: string;
  address: string;
  chain: string;
  logo: string;
  chainLogo: string;
  verified: boolean;
  decimals: number;
  title: string;
  subtitle: string;
  value: string;
  coingeckoId?: string; // CoinGecko slug for API calls (e.g., "uniswap", "ethereum")
}

// Server-side cache for search results (5-minute TTL)
const searchCache = new Map<string, { results: TokenResult[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting for CoinGecko (conservative for free tier: 10-30 calls/min)
let lastCoinGeckoCall = 0;
const COINGECKO_RATE_LIMIT = 3000; // 3 seconds between calls (20 calls/min max)

// Chain configuration for parallel searches
const CHAIN_CONFIG = [
  { id: 'eth', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: '0xa', name: 'Optimism', logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png' },
  { id: '0xa4b1', name: 'Arbitrum', logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png' },
  { id: 'bsc', name: 'BSC', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { id: '0x2105', name: 'Base', logo: 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png' },
  { id: '0x89', name: 'Polygon', logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png' }
];

// Chain logos mapping (including hex IDs and Solana)
const CHAIN_LOGOS: Record<string, string> = {
  'eth': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'polygon': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  '0x89': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'bsc': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'arbitrum': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  '0xa4b1': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  'avalanche': 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  'optimism': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  '0xa': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  'base': 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png',
  '0x2105': 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png',
  'fantom': 'https://cryptologos.cc/logos/fantom-ftm-logo.png',
  'solana': 'https://cryptologos.cc/logos/solana-sol-logo.png'
};

// Map CoinGecko platform names to our chain IDs (including Solana)
const COINGECKO_PLATFORM_MAP: Record<string, { chainId: string; isEVM: boolean }> = {
  'ethereum': { chainId: 'eth', isEVM: true },
  'polygon-pos': { chainId: '0x89', isEVM: true },
  'binance-smart-chain': { chainId: 'bsc', isEVM: true },
  'arbitrum-one': { chainId: '0xa4b1', isEVM: true },
  'optimistic-ethereum': { chainId: '0xa', isEVM: true },
  'base': { chainId: '0x2105', isEVM: true },
  'solana': { chainId: 'solana', isEVM: false }
};

// Known token addresses for testing and fallback
const KNOWN_TOKENS: Record<string, Record<string, string>> = {
  'PENDLE': {
    'eth': '0x808507121B80c02388fAd14726482e061B8bd3AAd',
    '0xa4b1': '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8'
  },
  'USDC': {
    'eth': '0xA0b86a33E6408c0b3C0c2d9c9b3e0a1d7a4e9a3b',
    '0xa4b1': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    'bsc': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'
  }
};

// CoinGecko search with rate limiting
async function searchCoinGecko(query: string, apiKey: string): Promise<TokenResult[]> {
  // Apply rate limiting
  const now = Date.now();
  const timeSinceLastCall = now - lastCoinGeckoCall;
  if (timeSinceLastCall < COINGECKO_RATE_LIMIT) {
    const waitTime = COINGECKO_RATE_LIMIT - timeSinceLastCall;
    console.log(`[COINGECKO] Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastCoinGeckoCall = Date.now();

  try {
    console.log(`[COINGECKO] Searching for: "${query}"`);

    // Step 1: Search for the token
    const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`;
    const searchHeaders: HeadersInit = {
      'Accept': 'application/json'
    };

    // Add API key if available (for higher rate limits)
    if (apiKey && apiKey !== '') {
      searchHeaders['x-cg-demo-api-key'] = apiKey;
    }

    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: searchHeaders
    });

    if (!searchResponse.ok) {
      console.error(`[COINGECKO] Search failed:`, searchResponse.status);
      return [];
    }

    const searchData: CoinGeckoSearchResponse = await searchResponse.json();

    if (!searchData.coins || searchData.coins.length === 0) {
      console.log(`[COINGECKO] No results found`);
      return [];
    }

    console.log(`[COINGECKO] Found ${searchData.coins.length} tokens`);

    // Take the top result (most relevant by market cap)
    const topCoin = searchData.coins[0];

    // Step 2: Get detailed info including platform addresses
    // Apply rate limiting again for the second call
    await new Promise(resolve => setTimeout(resolve, COINGECKO_RATE_LIMIT));
    lastCoinGeckoCall = Date.now();

    const detailUrl = `https://api.coingecko.com/api/v3/coins/${topCoin.id}`;
    const detailResponse = await fetch(detailUrl, {
      method: 'GET',
      headers: searchHeaders
    });

    if (!detailResponse.ok) {
      console.error(`[COINGECKO] Detail fetch failed:`, detailResponse.status);
      return [];
    }

    const coinDetail: CoinGeckoCoinDetail = await detailResponse.json();

    // Transform to TokenResult for each platform/chain
    const results: TokenResult[] = [];

    for (const [platformName, contractAddress] of Object.entries(coinDetail.platforms || {})) {
      if (!contractAddress || contractAddress === '') continue;

      const platformConfig = COINGECKO_PLATFORM_MAP[platformName];
      if (!platformConfig) {
        console.log(`[COINGECKO] Skipping unmapped platform: ${platformName}`);
        continue;
      }

      const { chainId, isEVM } = platformConfig;

      // For EVM chains, validate address format
      if (isEVM && !/^0x[a-fA-F0-9]{40}$/i.test(contractAddress)) {
        console.log(`[COINGECKO] Skipping invalid EVM address on ${platformName}: ${contractAddress}`);
        continue;
      }

      // For Solana, validate Base58 address format (32-44 chars, no 0, O, I, l)
      if (!isEVM && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(contractAddress)) {
        console.log(`[COINGECKO] Skipping invalid Solana address: ${contractAddress}`);
        continue;
      }

      const chainConfig = CHAIN_CONFIG.find(c => c.id === chainId);
      const chainName = chainConfig?.name || (chainId === 'solana' ? 'Solana' : chainId);
      const chainLogo = CHAIN_LOGOS[chainId] || chainConfig?.logo || '';

      results.push({
        id: `${chainId}-${contractAddress}`,
        name: coinDetail.name,
        symbol: coinDetail.symbol.toUpperCase(),
        address: contractAddress,
        chain: chainId,
        logo: coinDetail.image?.large || coinDetail.image?.small || topCoin.large || topCoin.thumb || '',
        chainLogo: chainLogo,
        verified: true, // CoinGecko tokens are generally verified
        decimals: isEVM ? 18 : 9, // Solana tokens typically use 9 decimals
        title: `${coinDetail.symbol.toUpperCase()} — ${coinDetail.name}`,
        subtitle: chainName,
        value: `${chainId}/${contractAddress}`,
        coingeckoId: coinDetail.id // The actual CoinGecko slug (e.g., "uniswap")
      });
    }

    // Sort by chain priority (Solana after Ethereum but before other chains)
    const chainPriority: Record<string, number> = {
      'eth': 1,
      'solana': 2, // Solana high priority
      '0xa4b1': 3,
      'bsc': 4,
      '0x89': 5,
      '0x2105': 6,
      '0xa': 7,
    };

    results.sort((a, b) => {
      const priorityA = chainPriority[a.chain] || 999;
      const priorityB = chainPriority[b.chain] || 999;
      return priorityA - priorityB;
    });

    console.log(`[COINGECKO] Returning ${results.length} tokens across chains (including Solana)`);
    return results;

  } catch (error: any) {
    console.error(`[COINGECKO] Search error:`, error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm, limit = 10 } = await req.json();

    if (!searchTerm || searchTerm.trim() === '') {
      return new Response(
        JSON.stringify({ error: 'Search term is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cacheKey = searchTerm.toLowerCase().trim();

    // Check server-side cache first
    const cached = searchCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log(`[SEARCH] Returning cached results for: "${searchTerm}"`);
      return new Response(
        JSON.stringify({
          tokens: cached.results.slice(0, limit),
          count: cached.results.length,
          source: 'cache'
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const moralisApiKey = Deno.env.get('MORALIS_API_KEY');
    const coinGeckoApiKey = Deno.env.get('COINGECKO_API_KEY') || '';

    if (!moralisApiKey) {
      console.error('MORALIS_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Search service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[SEARCH] Searching for: "${searchTerm}"`);

    // Check if input is an address
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/i.test(searchTerm.trim());

    let results: TokenResult[] = [];
    let source = 'unknown';

    if (isAddress) {
      // For address searches, use Moralis directly (more reliable for contract addresses)
      console.log(`[SEARCH] Address search via Moralis for: ${searchTerm}`);
      results = await searchByAddress(searchTerm.trim(), moralisApiKey);
      source = 'moralis';
    } else {
      // For symbol/name searches, try CoinGecko first, then fallback to Moralis
      console.log(`[SEARCH] Symbol search - trying CoinGecko first for: ${searchTerm}`);

      try {
        results = await searchCoinGecko(searchTerm.trim(), coinGeckoApiKey);
        if (results.length > 0) {
          source = 'coingecko';
          console.log(`[SEARCH] CoinGecko found ${results.length} results`);
        }
      } catch (error) {
        console.error(`[SEARCH] CoinGecko error:`, error);
      }

      // Fallback to Moralis if CoinGecko returned no results
      if (results.length === 0) {
        console.log(`[SEARCH] Falling back to Moralis for: ${searchTerm}`);
        results = await searchBySymbolParallel(searchTerm.trim(), moralisApiKey, limit);
        source = 'moralis';
      }
    }

    // Cache the results
    if (results.length > 0) {
      searchCache.set(cacheKey, {
        results: results,
        timestamp: Date.now()
      });
      console.log(`[SEARCH] Cached ${results.length} results for future requests`);
    }

    console.log(`[SEARCH] Total results found: ${results.length} (source: ${source})`);

    if (results.length === 0) {
      return new Response(
        JSON.stringify({
          tokens: [],
          count: 0,
          message: isAddress
            ? `No verified token found for address "${searchTerm}" across supported chains.`
            : `No verified tokens found for "${searchTerm}". Try searching for a different token or paste a contract address.`,
          source: source
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }

    const tokensWithLogos = results.filter(t => t.logo).length;
    console.log(`[SEARCH] Returning ${results.length} verified tokens, ${tokensWithLogos} with logos from ${source}`);

    return new Response(
      JSON.stringify({
        tokens: results.slice(0, limit),
        count: results.length,
        source: source
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

  } catch (error: any) {
    console.error('[MORALIS-SEARCH] Error:', error);
    
    let errorMessage = 'Search service temporarily unavailable';
    if (error.message?.includes('rate limit')) {
      errorMessage = 'Too many requests. Please wait a moment and try again.';
    } else if (error.message?.includes('API key')) {
      errorMessage = 'Search service configuration error';
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

async function searchBySymbolParallel(searchTerm: string, apiKey: string, limit: number): Promise<TokenResult[]> {
  const capitalizedSymbol = searchTerm.toUpperCase();
  
  console.log(`[MORALIS-SEARCH] Multi-chain symbol search for: "${capitalizedSymbol}" across ${CHAIN_CONFIG.length} chains`);
  
  // Execute searches for all chains in parallel
  const searchPromises = CHAIN_CONFIG.map(async (chainConfig) => {
    try {
      console.log(`[MORALIS-SEARCH] Starting search on ${chainConfig.name} (${chainConfig.id}) for ${capitalizedSymbol}`);
      
      const searchUrl = `https://deep-index.moralis.io/api/v2/erc20/metadata/symbols?chain=${chainConfig.id}&symbols=${capitalizedSymbol}`;
      console.log(`[MORALIS-SEARCH] ${chainConfig.name} search URL: ${searchUrl}`);
      
      const response = await fetch(searchUrl, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });

      console.log(`[MORALIS-SEARCH] ${chainConfig.name} response status: ${response.status}`);

      if (!response.ok) {
        console.error(`[MORALIS-SEARCH] ${chainConfig.name} request failed:`, response.status, response.statusText);
        const errorText = await response.text();
        console.error(`[MORALIS-SEARCH] ${chainConfig.name} error response:`, errorText);
        
        // Try known token addresses as fallback
        return await tryKnownTokenFallback(capitalizedSymbol, chainConfig, apiKey);
      }

      const data: MoralisTokenMetadata[] = await response.json();
      console.log(`[MORALIS-SEARCH] ${chainConfig.name} returned ${data.length} raw tokens`);

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[MORALIS-SEARCH] ${chainConfig.name} returned no valid data, trying fallback`);
        return await tryKnownTokenFallback(capitalizedSymbol, chainConfig, apiKey);
      }

      // Enhanced filtering and processing
      const processedTokens: TokenResult[] = [];
      let filteredCount = 0;
      
      for (const token of data) {
        try {
          // Enhanced filtering: both spam and verification checks
          if (token.possible_spam) {
            console.log(`[MORALIS-SEARCH] ${chainConfig.name}: Filtering out spam token: ${token.symbol}`);
            filteredCount++;
            continue;
          }

          if (!token.verified_contract) {
            console.log(`[MORALIS-SEARCH] ${chainConfig.name}: Filtering out unverified token: ${token.symbol}`);
            filteredCount++;
            continue;
          }

          // Ensure required fields exist
          if (!token.address || !token.name || !token.symbol) {
            console.log(`[MORALIS-SEARCH] ${chainConfig.name}: Filtering out token with missing required fields`);
            filteredCount++;
            continue;
          }

          console.log(`[MORALIS-SEARCH] ${chainConfig.name}: Processing verified token: ${token.name} (${token.symbol}) with logo: ${token.logo || 'none'}`);
          
          // Attach chain information explicitly since we know which chain this came from
          const tokenWithChain = { 
            ...token, 
            chain: chainConfig.id // Explicitly set chain from our request
          };
          
          const transformedToken = transformTokenData(tokenWithChain, chainConfig);
          if (transformedToken) {
            processedTokens.push(transformedToken);
          }
        } catch (error) {
          console.error(`[MORALIS-SEARCH] Error processing token ${token.address} on ${chainConfig.name}:`, error);
          // Continue processing other tokens even if one fails
        }
      }

      console.log(`[MORALIS-SEARCH] ${chainConfig.name}: Filtered out ${filteredCount} tokens, processed ${processedTokens.length} verified tokens`);
      return processedTokens;

    } catch (error) {
      console.error(`[MORALIS-SEARCH] Exception searching ${chainConfig.name}:`, error);
      // Try fallback on exception
      return await tryKnownTokenFallback(capitalizedSymbol, chainConfig, apiKey);
    }
  });

  // Wait for all parallel requests to complete
  const chainResults = await Promise.all(searchPromises);
  
  // Flatten and combine all results
  const allResults = chainResults.flat();
  
  console.log(`[MORALIS-SEARCH] Combined results from all chains: ${allResults.length} verified tokens`);

  // Sort by chain priority (Ethereum first, then others)
  const chainPriority: Record<string, number> = {
    'eth': 1,
    '0xa4b1': 2, // Arbitrum
    'bsc': 3,
    '0x89': 4, // Polygon
    '0x2105': 5, // Base
    '0xa': 6, // Optimism
  };

  allResults.sort((a, b) => {
    const priorityA = chainPriority[a.chain] || 999;
    const priorityB = chainPriority[b.chain] || 999;
    return priorityA - priorityB;
  });

  // Apply limit after sorting
  const limitedResults = allResults.slice(0, limit);
  
  console.log(`[MORALIS-SEARCH] Returning ${limitedResults.length} verified tokens after limit and sorting`);
  return limitedResults;
}

async function tryKnownTokenFallback(symbol: string, chainConfig: any, apiKey: string): Promise<TokenResult[]> {
  const knownAddress = KNOWN_TOKENS[symbol]?.[chainConfig.id];
  if (!knownAddress) {
    console.log(`[MORALIS-SEARCH] No known address for ${symbol} on ${chainConfig.name}`);
    return [];
  }

  console.log(`[MORALIS-SEARCH] Trying known address fallback for ${symbol} on ${chainConfig.name}: ${knownAddress}`);
  
  try {
    const url = `https://deep-index.moralis.io/api/v2/erc20/metadata?chain=${chainConfig.id}&addresses=${knownAddress}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`[MORALIS-SEARCH] Fallback failed for ${symbol} on ${chainConfig.name}:`, response.status);
      return [];
    }

    const data: MoralisTokenMetadata[] = await response.json();
    console.log(`[MORALIS-SEARCH] Fallback success for ${symbol} on ${chainConfig.name}:`, data.length, 'tokens');
    
    if (data && Array.isArray(data) && data.length > 0) {
      const tokenData = data[0];
      // Apply same filtering criteria to fallback tokens
      if (tokenData && tokenData.address && !tokenData.possible_spam && tokenData.verified_contract) {
        const tokenWithChain = { ...tokenData, chain: chainConfig.id };
        const transformedToken = transformTokenData(tokenWithChain, chainConfig);
        return transformedToken ? [transformedToken] : [];
      } else {
        console.log(`[MORALIS-SEARCH] Fallback token for ${symbol} on ${chainConfig.name} failed verification criteria`);
      }
    }
  } catch (error) {
    console.error(`[MORALIS-SEARCH] Fallback exception for ${symbol} on ${chainConfig.name}:`, error);
  }
  
  return [];
}

async function searchByAddress(searchTerm: string, apiKey: string): Promise<TokenResult[]> {
  const cleanAddress = searchTerm.startsWith('0x') ? searchTerm : `0x${searchTerm}`;
  const results: TokenResult[] = [];
  
  // Use same chain configuration for address search
  for (const chainConfig of CHAIN_CONFIG) {
    try {
      console.log(`[MORALIS-SEARCH] Checking ${chainConfig.name} for address ${cleanAddress}`);
      
      const url = `https://deep-index.moralis.io/api/v2/erc20/metadata?chain=${chainConfig.id}&addresses=${cleanAddress}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`[MORALIS-SEARCH] ${chainConfig.name} address request failed:`, response.status);
        continue;
      }

      const data: MoralisTokenMetadata[] = await response.json();
      
      if (data && Array.isArray(data) && data.length > 0) {
        const tokenData = data[0];
        console.log(`[MORALIS-SEARCH] Found token on ${chainConfig.name}: ${tokenData.name} (${tokenData.symbol}) with verification: ${tokenData.verified_contract}, spam: ${tokenData.possible_spam}`);
        
        // Apply enhanced filtering for address search as well
        if (tokenData && tokenData.address && !tokenData.possible_spam && tokenData.verified_contract) {
          // Add chain info to the token data
          const tokenWithChain = { ...tokenData, chain: chainConfig.id };
          const transformedToken = transformTokenData(tokenWithChain, chainConfig);
          if (transformedToken) {
            results.push(transformedToken);
          }
        } else {
          console.log(`[MORALIS-SEARCH] Address token on ${chainConfig.name} failed verification criteria`);
        }
      }
    } catch (error) {
      console.error(`[MORALIS-SEARCH] Error checking ${chainConfig.name}:`, error);
    }
  }
  
  console.log(`[MORALIS-SEARCH] Address search found ${results.length} verified tokens across all chains`);
  return results;
}

function transformTokenData(tokenData: MoralisTokenMetadata & { chain: string }, chainConfig?: { id: string; name: string; logo: string }): TokenResult | null {
  // Validate required fields before transformation
  if (!tokenData.chain || !tokenData.address || !tokenData.name || !tokenData.symbol) {
    console.log(`[MORALIS-SEARCH] Skipping token with missing required fields:`, {
      chain: tokenData.chain,
      address: tokenData.address,
      name: tokenData.name,
      symbol: tokenData.symbol
    });
    return null;
  }

  try {
    return {
      id: `${tokenData.chain}-${tokenData.address}`,
      name: tokenData.name,
      symbol: tokenData.symbol.toUpperCase(),
      address: tokenData.address,
      chain: tokenData.chain,
      logo: tokenData.logo || '',
      chainLogo: CHAIN_LOGOS[tokenData.chain] || (chainConfig?.logo || ''),
      verified: tokenData.verified_contract || false,
      decimals: tokenData.decimals || 18,
      title: `${tokenData.symbol.toUpperCase()} — ${tokenData.name}`,
      subtitle: getChainDisplayName(tokenData.chain, chainConfig),
      value: `${tokenData.chain}/${tokenData.address}`
    };
  } catch (error) {
    console.error(`[MORALIS-SEARCH] Error transforming token data:`, error);
    return null;
  }
}

function getChainDisplayName(chain: string, chainConfig?: { id: string; name: string; logo: string }): string {
  // Handle undefined/null chain gracefully
  if (!chain || chain === undefined || chain === null) {
    console.log(`[MORALIS-SEARCH] Warning: getChainDisplayName called with invalid chain: ${chain}`);
    return 'Unknown Chain';
  }

  // If we have chainConfig from our parallel search, use it
  if (chainConfig && chainConfig.id === chain) {
    return chainConfig.name;
  }

  // Fallback to mapping for hex chain IDs and standard names
  const chainNames: Record<string, string> = {
    'eth': 'Ethereum',
    'polygon': 'Polygon',
    '0x89': 'Polygon',
    'bsc': 'BSC',
    'arbitrum': 'Arbitrum',
    '0xa4b1': 'Arbitrum',
    'avalanche': 'Avalanche',
    'optimism': 'Optimism',
    '0xa': 'Optimism',
    'base': 'Base',
    '0x2105': 'Base',
    'fantom': 'Fantom'
  };
  
  return chainNames[chain.toLowerCase()] || chain.charAt(0).toUpperCase() + chain.slice(1);
}
