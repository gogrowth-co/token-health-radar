
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

// Chain configuration for parallel searches
const CHAIN_CONFIG = [
  { id: 'eth', name: 'Ethereum', logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' },
  { id: '0xa', name: 'Optimism', logo: 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png' },
  { id: '0xa4b1', name: 'Arbitrum', logo: 'https://cryptologos.cc/logos/arbitrum-arb-logo.png' },
  { id: 'bsc', name: 'BSC', logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' },
  { id: '0x2105', name: 'Base', logo: 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png' }
];

// Chain logos mapping (including hex IDs)
const CHAIN_LOGOS: Record<string, string> = {
  'eth': 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
  'polygon': 'https://cryptologos.cc/logos/polygon-matic-logo.png',
  'bsc': 'https://cryptologos.cc/logos/bnb-bnb-logo.png',
  'arbitrum': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  '0xa4b1': 'https://cryptologos.cc/logos/arbitrum-arb-logo.png',
  'avalanche': 'https://cryptologos.cc/logos/avalanche-avax-logo.png',
  'optimism': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  '0xa': 'https://assets.coingecko.com/coins/images/25244/small/Optimism.png',
  'base': 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png',
  '0x2105': 'https://assets.coingecko.com/coins/images/35845/small/coinbase-base-logo.png',
  'fantom': 'https://cryptologos.cc/logos/fantom-ftm-logo.png'
};

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
      console.log(`[MORALIS-SEARCH] Symbol search for: ${searchTerm}`);
      results = await searchBySymbolParallel(searchTerm.trim(), moralisApiKey, limit);
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

async function searchBySymbolParallel(searchTerm: string, apiKey: string, limit: number): Promise<TokenResult[]> {
  const capitalizedSymbol = searchTerm.toUpperCase();
  
  console.log(`[MORALIS-SEARCH] dd.xyz-style parallel search for: "${capitalizedSymbol}" across ${CHAIN_CONFIG.length} chains`);
  
  // Create parallel requests for all chains
  const searchPromises = CHAIN_CONFIG.map(async (chainConfig) => {
    try {
      console.log(`[MORALIS-SEARCH] Searching ${chainConfig.name} (${chainConfig.id}) for ${capitalizedSymbol}`);
      
      // Fixed URL encoding - use proper JSON array format
      const symbolsParam = encodeURIComponent(`["${capitalizedSymbol}"]`);
      const url = `https://deep-index.moralis.io/api/v2.2/erc20/metadata/symbols?symbols=${symbolsParam}&chain=${chainConfig.id}`;
      
      console.log(`[MORALIS-SEARCH] Request URL: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json'
        }
      });

      console.log(`[MORALIS-SEARCH] ${chainConfig.name} response status: ${response.status}`);

      if (!response.ok) {
        console.error(`[MORALIS-SEARCH] ${chainConfig.name} request failed:`, response.status, response.statusText);
        return [];
      }

      const data: MoralisTokenMetadata[] = await response.json();
      console.log(`[MORALIS-SEARCH] ${chainConfig.name} raw response:`, JSON.stringify(data, null, 2));
      console.log(`[MORALIS-SEARCH] ${chainConfig.name} returned ${data.length} tokens`);

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`[MORALIS-SEARCH] ${chainConfig.name} returned no valid data`);
        return [];
      }

      // Process tokens from this chain
      const processedTokens: TokenResult[] = [];
      
      for (const token of data) {
        try {
          // Filter out spam tokens
          if (token.possible_spam) {
            console.log(`[MORALIS-SEARCH] Filtering out spam token: ${token.symbol} on ${chainConfig.name}`);
            continue;
          }

          // Ensure required fields exist
          if (!token.address || !token.name || !token.symbol) {
            console.log(`[MORALIS-SEARCH] Filtering out token with missing required fields on ${chainConfig.name}`);
            continue;
          }

          console.log(`[MORALIS-SEARCH] Processing token: ${token.name} (${token.symbol}) on ${chainConfig.name} with logo: ${token.logo || 'none'}`);
          
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

      console.log(`[MORALIS-SEARCH] ${chainConfig.name} processed ${processedTokens.length} valid tokens`);
      return processedTokens;

    } catch (error) {
      console.error(`[MORALIS-SEARCH] Exception searching ${chainConfig.name}:`, error);
      return [];
    }
  });

  // Wait for all parallel requests to complete
  const chainResults = await Promise.all(searchPromises);
  
  // Flatten and combine all results
  const allResults = chainResults.flat();
  
  console.log(`[MORALIS-SEARCH] Combined results from all chains: ${allResults.length} tokens`);

  // Sort by chain priority (Ethereum first, then others)
  const chainPriority: Record<string, number> = {
    'eth': 1,
    '0xa4b1': 2, // Arbitrum
    'bsc': 3,
    '0xa': 4, // Optimism
    '0x2105': 5, // Base
  };

  allResults.sort((a, b) => {
    const priorityA = chainPriority[a.chain] || 999;
    const priorityB = chainPriority[b.chain] || 999;
    return priorityA - priorityB;
  });

  // Apply limit after sorting
  const limitedResults = allResults.slice(0, limit);
  
  console.log(`[MORALIS-SEARCH] Returning ${limitedResults.length} processed tokens after limit`);
  return limitedResults;
}

async function searchByAddress(searchTerm: string, apiKey: string): Promise<TokenResult[]> {
  const cleanAddress = searchTerm.startsWith('0x') ? searchTerm : `0x${searchTerm}`;
  const results: TokenResult[] = [];
  
  // Use same chain configuration for address search
  for (const chainConfig of CHAIN_CONFIG) {
    try {
      console.log(`[MORALIS-SEARCH] Checking ${chainConfig.name} for address ${cleanAddress}`);
      
      const url = `https://deep-index.moralis.io/api/v2.2/erc20/metadata?chain=${chainConfig.id}&addresses=${cleanAddress}`;
      
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
        console.log(`[MORALIS-SEARCH] Found token on ${chainConfig.name}: ${tokenData.name} (${tokenData.symbol}) with logo: ${tokenData.logo || 'none'}`);
        
        if (tokenData && tokenData.address && !tokenData.possible_spam) {
          // Add chain info to the token data
          const tokenWithChain = { ...tokenData, chain: chainConfig.id };
          const transformedToken = transformTokenData(tokenWithChain, chainConfig);
          if (transformedToken) {
            results.push(transformedToken);
          }
        }
      }
    } catch (error) {
      console.error(`[MORALIS-SEARCH] Error checking ${chainConfig.name}:`, error);
    }
  }
  
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
