
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MoralisTokenResult {
  address: string;
  name: string;
  symbol: string;
  logo?: string;
  thumbnail?: string;
  chain: string;
  decimals?: number;
  verified_contract?: boolean;
  possible_spam?: boolean;
}

interface MoralisSearchResponse {
  result: MoralisTokenResult[];
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

// Simplified function to fetch token logos using individual metadata calls
async function fetchTokenLogosFromMoralis(tokens: MoralisTokenResult[], moralisApiKey: string): Promise<MoralisTokenResult[]> {
  console.log(`[MORALIS-SEARCH] Starting individual logo fetch for ${tokens.length} tokens`);
  
  const enhancedTokens: MoralisTokenResult[] = [];

  for (const token of tokens) {
    try {
      // Try individual metadata call to get logo
      const response = await fetch(
        `https://deep-index.moralis.io/api/v2/erc20/${token.address}/metadata?chain=${token.chain}`,
        {
          headers: {
            'X-API-Key': moralisApiKey,
            'Accept': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.logo) {
          console.log(`[MORALIS-SEARCH] Found logo for ${token.symbol}: ${data.logo}`);
          enhancedTokens.push({ ...token, logo: data.logo, thumbnail: data.logo });
        } else {
          console.log(`[MORALIS-SEARCH] No logo found for ${token.symbol}`);
          enhancedTokens.push(token);
        }
      } else {
        console.log(`[MORALIS-SEARCH] Metadata fetch failed for ${token.symbol}: ${response.status}`);
        enhancedTokens.push(token);
      }
    } catch (error) {
      console.error(`[MORALIS-SEARCH] Logo fetch error for ${token.symbol}:`, error);
      enhancedTokens.push(token);
    }

    // Small delay to avoid rate limiting
    if (tokens.indexOf(token) < tokens.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return enhancedTokens;
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

    const moralisApiKey = Deno.env.get('MORALIS_API_KEY');
    if (!moralisApiKey) {
      console.error('MORALIS_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'Moralis API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[MORALIS-SEARCH] Searching for: "${searchTerm}"`);

    // Check if input is an address
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/i.test(searchTerm.trim());
    
    let results: MoralisTokenResult[] = [];
    
    if (isAddress) {
      // Search by address across multiple chains
      const chains = ['eth', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'optimism', 'base'];
      const cleanAddress = searchTerm.startsWith('0x') ? searchTerm : `0x${searchTerm}`;
      
      for (const chain of chains) {
        try {
          const response = await fetch(
            `https://deep-index.moralis.io/api/v2/erc20/${cleanAddress}/metadata?chain=${chain}`,
            {
              headers: {
                'X-API-Key': moralisApiKey,
                'Accept': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (data && data.address) {
              console.log(`[MORALIS-SEARCH] Found token on ${chain}:`, data);
              results.push({ ...data, chain });
            }
          }
        } catch (error) {
          console.log(`[MORALIS-SEARCH] Chain ${chain} search failed:`, error);
          // Continue with other chains
        }
      }
    } else {
      // For symbol/name search, use the symbols endpoint
      const chains = ['eth', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'optimism', 'base'];
      
      for (const chain of chains) {
        try {
          const response = await fetch(
            `https://deep-index.moralis.io/api/v2/erc20/metadata/symbols?chain=${chain}&symbols=${encodeURIComponent(searchTerm)}`,
            {
              headers: {
                'X-API-Key': moralisApiKey,
                'Accept': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
              console.log(`[MORALIS-SEARCH] Found ${data.length} tokens on ${chain}`);
              results.push(...data.map(token => ({ ...token, chain })));
            }
          }
        } catch (error) {
          console.error(`[MORALIS-SEARCH] Symbol search failed for ${chain}:`, error);
        }
      }

      if (results.length === 0) {
        return new Response(
          JSON.stringify({
            tokens: [],
            count: 0,
            message: `No tokens found for "${searchTerm}" across supported chains. Try a different symbol or paste a contract address.`
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
    }

    console.log(`[MORALIS-SEARCH] Found ${results.length} tokens before logo enhancement`);

    // Enhanced logo fetching with individual calls
    const tokensWithLogos = await fetchTokenLogosFromMoralis(results, moralisApiKey);
    console.log(`[MORALIS-SEARCH] After logo fetch: ${tokensWithLogos.filter(t => t.logo).length}/${tokensWithLogos.length} have logos`);

    // Transform results and remove duplicates
    const seenTokens = new Set();
    const transformedTokens = tokensWithLogos
      .filter(token => token && token.address && token.name && token.symbol)
      .filter(token => !token.possible_spam)
      .filter(token => {
        const tokenKey = `${token.chain}-${token.address}`;
        if (seenTokens.has(tokenKey)) {
          return false;
        }
        seenTokens.add(tokenKey);
        return true;
      })
      .map(token => {
        console.log(`[MORALIS-SEARCH] Final token data for ${token.symbol}:`, {
          name: token.name,
          logo: token.logo,
          thumbnail: token.thumbnail,
          chain: token.chain
        });
        
        return {
          id: `${token.chain}-${token.address}`,
          name: token.name,
          symbol: token.symbol.toUpperCase(),
          address: token.address,
          chain: token.chain,
          logo: token.logo || token.thumbnail || '',
          chainLogo: CHAIN_LOGOS[token.chain] || '',
          verified: token.verified_contract || false,
          decimals: token.decimals || 18,
          title: `${token.symbol.toUpperCase()} — ${token.name}`,
          subtitle: getChainDisplayName(token.chain),
          value: `${token.chain}/${token.address}`
        };
      })
      .slice(0, limit);

    console.log(`[MORALIS-SEARCH] Returning ${transformedTokens.length} tokens, ${transformedTokens.filter(t => t.logo).length} with logos`);

    return new Response(
      JSON.stringify({
        tokens: transformedTokens,
        count: transformedTokens.length
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
