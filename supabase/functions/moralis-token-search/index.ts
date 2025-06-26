
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
  tokens: MoralisTokenResult[];
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

    // Call Moralis token search API
    const moralisUrl = `https://deep-index.moralis.io/api/v2.2/search/tokens?q=${encodeURIComponent(searchTerm)}&filter=evm_chains&limit=${limit}`;
    
    const response = await fetch(moralisUrl, {
      headers: {
        'X-API-Key': moralisApiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[MORALIS-SEARCH] API Error: ${response.status} ${response.statusText}`);
      throw new Error(`Moralis API Error: ${response.status}`);
    }

    const data: MoralisSearchResponse = await response.json();
    console.log(`[MORALIS-SEARCH] Found ${data.tokens?.length || 0} tokens`);

    // Transform Moralis results to our format
    const transformedTokens = (data.tokens || [])
      .filter(token => token.address && token.chain && token.name && token.symbol)
      .map(token => ({
        id: `${token.chain}-${token.address}`,
        name: token.name,
        symbol: token.symbol.toUpperCase(),
        address: token.address,
        chain: token.chain,
        logo: token.logo || token.thumbnail || '',
        verified: token.verified_contract || false,
        decimals: token.decimals || 18,
        // Create a search-friendly display
        title: `${token.symbol.toUpperCase()} — ${token.name}`,
        subtitle: token.chain.charAt(0).toUpperCase() + token.chain.slice(1),
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
