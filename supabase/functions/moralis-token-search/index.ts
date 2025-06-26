
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

    // Use the correct Moralis API endpoint for token metadata search
    const moralisUrl = `https://deep-index.moralis.io/api/v2/erc20/metadata?chain=eth&addresses=${encodeURIComponent(searchTerm)}`;
    
    // If it's not an address, try the search endpoint
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/i.test(searchTerm);
    let finalUrl = moralisUrl;
    
    if (!isAddress) {
      // For name search, we'll use a different approach
      // Since Moralis doesn't have a direct name search, we'll return a helpful message
      return new Response(
        JSON.stringify({
          tokens: [],
          count: 0,
          message: 'Please enter a token contract address. Name search coming soon.'
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    
    const response = await fetch(finalUrl, {
      headers: {
        'X-API-Key': moralisApiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[MORALIS-SEARCH] API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[MORALIS-SEARCH] Error details: ${errorText}`);
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({
            tokens: [],
            count: 0,
            message: 'Token not found. Please check the contract address.'
          }),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      throw new Error(`Moralis API Error: ${response.status}`);
    }

    const data: MoralisTokenResult[] = await response.json();
    console.log(`[MORALIS-SEARCH] Found ${data?.length || 0} tokens`);

    // Transform Moralis results to our format
    const transformedTokens = (Array.isArray(data) ? data : [data])
      .filter(token => token && token.address && token.name && token.symbol)
      .map(token => ({
        id: `eth-${token.address}`,
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        address: token.address,
        chain: 'eth',
        logo: token.logo || token.thumbnail || '',
        verified: token.verified_contract || false,
        decimals: token.decimals || 18,
        // Create a search-friendly display
        title: `${token.symbol.toUpperCase()} — ${token.name}`,
        subtitle: 'Ethereum',
        value: `eth/${token.address}`
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
