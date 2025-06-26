
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MoralisSearchResult {
  address: string;
  name: string;
  symbol: string;
  chain: string;
  decimals?: number;
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
}

// Chain logo URLs
const CHAIN_LOGOS: Record<string, string> = {
  'eth': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'polygon': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'bsc': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'arbitrum': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  'avalanche': 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  'optimism': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  'base': 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png',
  'fantom': 'https://cryptologos.cc/logos/fantom-ftm-logo.png'
};

const SUPPORTED_CHAINS = ['eth', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'optimism', 'base'];

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

    const moralisApiKey = Deno.env.get('MORALIS_API_KEY');
    if (!moralisApiKey) {
      console.error('MORALIS_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Search service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MORALIS-SEARCH] Searching for: "${searchTerm}"`);

    // Check if input is an address
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/i.test(searchTerm.trim());
    
    let results: TokenResult[] = [];
    
    if (isAddress) {
      console.log(`[MORALIS-SEARCH] Address search for: ${searchTerm}`);
      results = await searchByAddress(searchTerm.trim(), moralisApiKey);
    } else {
      console.log(`[MORALIS-SEARCH] Name/symbol search for: ${searchTerm}`);
      results = await searchByNameOrSymbol(searchTerm.trim(), moralisApiKey, limit);
    }

    console.log(`[MORALIS-SEARCH] Total results found: ${results.length}`);

    if (results.length === 0) {
      return new Response(
        JSON.stringify({
          tokens: [],
          count: 0,
          message: isAddress 
            ? `No token found for address "${searchTerm}" across supported chains.`
            : `No tokens found for "${searchTerm}". Try searching for a different token or paste a contract address.`
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
    console.log(`[MORALIS-SEARCH] Returning ${results.length} tokens, ${tokensWithLogos} with logos`);

    return new Response(
      JSON.stringify({
        tokens: results,
        count: results.length
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

async function searchByAddress(searchTerm: string, apiKey: string): Promise<TokenResult[]> {
  const cleanAddress = searchTerm.startsWith('0x') ? searchTerm : `0x${searchTerm}`;
  const results: TokenResult[] = [];
  
  for (const chain of SUPPORTED_CHAINS) {
    try {
      console.log(`[MORALIS-SEARCH] Checking ${chain} for address ${cleanAddress}`);
      
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2.2/erc20/${cleanAddress}/metadata?chain=${chain}`,
        {
          headers: {
            'X-API-Key': apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data: MoralisTokenMetadata = await response.json();
        console.log(`[MORALIS-SEARCH] Found token on ${chain}: ${data.name} (${data.symbol}) with logo: ${data.logo || 'none'}`);
        
        if (data && data.address && !data.possible_spam) {
          results.push(transformTokenData(data, chain));
        }
      }
    } catch (error) {
      console.error(`[MORALIS-SEARCH] Error checking ${chain}:`, error);
    }
  }
  
  return results;
}

async function searchByNameOrSymbol(searchTerm: string, apiKey: string, limit: number): Promise<TokenResult[]> {
  const allResults: TokenResult[] = [];
  
  // Search across multiple chains for better coverage
  const primaryChains = ['eth', 'polygon', 'bsc', 'arbitrum'];
  
  for (const chain of primaryChains) {
    try {
      console.log(`[MORALIS-SEARCH] Searching ${chain} for symbol/name: ${searchTerm}`);
      
      // Phase 1: Search by name/symbol
      const searchResponse = await fetch(
        `https://deep-index.moralis.io/api/v2.2/tokens/search?q=${encodeURIComponent(searchTerm)}&chain=${chain}&limit=${Math.min(limit, 10)}`,
        {
          headers: {
            'X-API-Key': apiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (!searchResponse.ok) {
        console.log(`[MORALIS-SEARCH] Search failed for ${chain}: ${searchResponse.status}`);
        continue;
      }

      const searchData: MoralisSearchResult[] = await searchResponse.json();
      console.log(`[MORALIS-SEARCH] Found ${searchData.length} initial results on ${chain}`);

      if (searchData.length === 0) continue;

      // Phase 2: Enhance with metadata (including logos) for top results
      const topResults = searchData.slice(0, Math.min(8, limit)); // Limit to prevent rate limiting
      const metadataPromises = topResults.map(async (token) => {
        try {
          const metadataResponse = await fetch(
            `https://deep-index.moralis.io/api/v2.2/erc20/${token.address}/metadata?chain=${chain}`,
            {
              headers: {
                'X-API-Key': apiKey,
                'Accept': 'application/json',
              },
            }
          );

          if (metadataResponse.ok) {
            const metadata: MoralisTokenMetadata = await metadataResponse.json();
            console.log(`[MORALIS-SEARCH] Enhanced ${token.symbol} with logo: ${metadata.logo || 'none'}`);
            
            // Merge search result with metadata
            return {
              ...token,
              logo: metadata.logo,
              verified_contract: metadata.verified_contract,
              possible_spam: metadata.possible_spam,
              decimals: metadata.decimals || token.decimals
            };
          }
          
          return token; // Return original if metadata fetch fails
        } catch (error) {
          console.error(`[MORALIS-SEARCH] Failed to fetch metadata for ${token.address}:`, error);
          return token; // Return original on error
        }
      });

      // Wait for all metadata requests with proper error handling
      const enhancedResults = await Promise.allSettled(metadataPromises);
      
      enhancedResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const tokenData = result.value;
          
          // Filter out spam tokens
          if (tokenData.possible_spam) {
            console.log(`[MORALIS-SEARCH] Filtering out spam token: ${tokenData.symbol}`);
            return;
          }
          
          allResults.push(transformTokenData(tokenData, chain));
        } else {
          console.error(`[MORALIS-SEARCH] Failed to process token ${index}:`, result.status === 'rejected' ? result.reason : 'Unknown error');
        }
      });

    } catch (error) {
      console.error(`[MORALIS-SEARCH] Error searching ${chain}:`, error);
    }
  }

  // Remove duplicates and sort by chain priority
  const seenTokens = new Set();
  const uniqueResults = allResults.filter(token => {
    const tokenKey = `${token.symbol}-${token.address.toLowerCase()}`;
    if (seenTokens.has(tokenKey)) {
      return false;
    }
    seenTokens.add(tokenKey);
    return true;
  });

  // Sort by chain priority (Ethereum first, then others)
  const chainPriority: Record<string, number> = {
    'eth': 1,
    'arbitrum': 2,
    'polygon': 3,
    'bsc': 4,
    'avalanche': 5,
    'optimism': 6,
    'base': 7
  };

  uniqueResults.sort((a, b) => {
    const priorityA = chainPriority[a.chain] || 999;
    const priorityB = chainPriority[b.chain] || 999;
    return priorityA - priorityB;
  });

  return uniqueResults.slice(0, limit);
}

function transformTokenData(tokenData: any, chain: string): TokenResult {
  return {
    id: `${chain}-${tokenData.address}`,
    name: tokenData.name,
    symbol: tokenData.symbol.toUpperCase(),
    address: tokenData.address,
    chain: chain,
    logo: tokenData.logo || '',
    chainLogo: CHAIN_LOGOS[chain] || '',
    verified: tokenData.verified_contract || false,
    decimals: tokenData.decimals || 18,
    title: `${tokenData.symbol.toUpperCase()} — ${tokenData.name}`,
    subtitle: getChainDisplayName(chain),
    value: `${chain}/${tokenData.address}`
  };
}

function getChainDisplayName(chain: string): string {
  const chainNames: Record<string, string> = {
    'eth': 'Ethereum',
    'polygon': 'Polygon',
    'bsc': 'BSC',
    'arbitrum': 'Arbitrum',
    'avalanche': 'Avalanche',
    'optimism': 'Optimism',
    'base': 'Base',
    'fantom': 'Fantom'
  };
  return chainNames[chain.toLowerCase()] || chain.charAt(0).toUpperCase() + chain.slice(1);
}
