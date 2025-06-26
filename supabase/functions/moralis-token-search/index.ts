
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
            `https://deep-index.moralis.io/api/v2/erc20/metadata?chain=${chain}&addresses=${cleanAddress}`,
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
              results.push(...data.map(token => ({ ...token, chain })));
            }
          }
        } catch (error) {
          console.log(`[MORALIS-SEARCH] Chain ${chain} search failed:`, error);
          // Continue with other chains
        }
      }
    } else {
      // Search by name/symbol across multiple chains
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
              results.push(...data.map(token => ({ ...token, chain })));
            }
          }
        } catch (error) {
          console.error(`[MORALIS-SEARCH] Symbol search failed for ${chain}:`, error);
          // Continue with other chains
        }
      }

      // If no results from multi-chain symbol search, return helpful message
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

    console.log(`[MORALIS-SEARCH] Found ${results.length} tokens across chains`);

    // Transform results to our format and remove duplicates
    const seenTokens = new Set();
    const transformedTokens = results
      .filter(token => token && token.address && token.name && token.symbol)
      .filter(token => !token.possible_spam) // Filter out spam tokens
      .filter(token => {
        // Remove duplicates based on chain + address combination
        const tokenKey = `${token.chain}-${token.address}`;
        if (seenTokens.has(tokenKey)) {
          return false;
        }
        seenTokens.add(tokenKey);
        return true;
      })
      .map(token => ({
        id: `${token.chain}-${token.address}`,
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        address: token.address,
        chain: token.chain,
        logo: token.logo || token.thumbnail || '',
        verified: token.verified_contract || false,
        decimals: token.decimals || 18,
        title: `${token.symbol.toUpperCase()} — ${token.name}`,
        subtitle: getChainDisplayName(token.chain),
        value: `${token.chain}/${token.address}`
      }))
      .slice(0, limit);

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
