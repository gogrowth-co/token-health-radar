
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
      // Search by address across multiple chains using metadata endpoint
      const chains = ['eth', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'optimism', 'base'];
      const cleanAddress = searchTerm.startsWith('0x') ? searchTerm : `0x${searchTerm}`;
      
      for (const chain of chains) {
        try {
          const response = await fetch(
            `https://deep-index.moralis.io/api/v2.2/erc20/${cleanAddress}/metadata?chain=${chain}`,
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
              console.log(`[MORALIS-SEARCH] Found token on ${chain}:`, {
                name: data.name,
                symbol: data.symbol,
                logo: data.logo
              });
              results.push({ ...data, chain });
            }
          }
        } catch (error) {
          console.log(`[MORALIS-SEARCH] Chain ${chain} search failed:`, error);
          // Continue with other chains
        }
      }
    } else {
      // For symbol/name search, first get addresses then get metadata with logos
      const chains = ['eth', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'optimism', 'base'];
      
      for (const chain of chains) {
        try {
          // First get token addresses
          const symbolResponse = await fetch(
            `https://deep-index.moralis.io/api/v2/erc20/metadata/symbols?chain=${chain}&symbols=${encodeURIComponent(searchTerm)}`,
            {
              headers: {
                'X-API-Key': moralisApiKey,
                'Accept': 'application/json',
              },
            }
          );

          if (symbolResponse.ok) {
            const symbolData = await symbolResponse.json();
            if (Array.isArray(symbolData) && symbolData.length > 0) {
              console.log(`[MORALIS-SEARCH] Found ${symbolData.length} addresses on ${chain}`);
              
              // Now get metadata (including logos) for each token
              for (const token of symbolData) {
                try {
                  const metadataResponse = await fetch(
                    `https://deep-index.moralis.io/api/v2.2/erc20/${token.address}/metadata?chain=${chain}`,
                    {
                      headers: {
                        'X-API-Key': moralisApiKey,
                        'Accept': 'application/json',
                      },
                    }
                  );

                  if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    if (metadata && metadata.address) {
                      console.log(`[MORALIS-SEARCH] Got metadata for ${metadata.symbol} on ${chain}:`, {
                        name: metadata.name,
                        symbol: metadata.symbol,
                        logo: metadata.logo
                      });
                      results.push({ ...metadata, chain });
                    }
                  }
                  
                  // Small delay to avoid rate limiting
                  await new Promise(resolve => setTimeout(resolve, 50));
                } catch (error) {
                  console.error(`[MORALIS-SEARCH] Metadata fetch error for ${token.address}:`, error);
                }
              }
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

    console.log(`[MORALIS-SEARCH] Found ${results.length} tokens with logos: ${results.filter(t => t.logo).length}`);

    // Transform results and remove duplicates
    const seenTokens = new Set();
    const transformedTokens = results
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
          chain: token.chain
        });
        
        return {
          id: `${token.chain}-${token.address}`,
          name: token.name,
          symbol: token.symbol.toUpperCase(),
          address: token.address,
          chain: token.chain,
          logo: token.logo || '',
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
