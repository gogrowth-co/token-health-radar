
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
      // Direct address search - use metadata endpoint
      const chains = ['eth', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'optimism', 'base'];
      const cleanAddress = searchTerm.startsWith('0x') ? searchTerm : `0x${searchTerm}`;
      
      console.log(`[MORALIS-SEARCH] Address search for: ${cleanAddress}`);
      
      for (const chain of chains) {
        try {
          console.log(`[MORALIS-SEARCH] Checking ${chain} for address ${cleanAddress}`);
          
          const response = await fetch(
            `https://deep-index.moralis.io/api/v2.2/erc20/${cleanAddress}/metadata?chain=${chain}`,
            {
              headers: {
                'X-API-Key': moralisApiKey,
                'Accept': 'application/json',
              },
            }
          );

          console.log(`[MORALIS-SEARCH] ${chain} response status: ${response.status}`);

          if (response.ok) {
            const data = await response.json();
            console.log(`[MORALIS-SEARCH] ${chain} response data:`, JSON.stringify(data, null, 2));
            
            if (data && data.address) {
              console.log(`[MORALIS-SEARCH] Found token on ${chain}: ${data.name} (${data.symbol}) with logo: ${data.logo || 'none'}`);
              results.push({ ...data, chain });
            }
          } else {
            console.log(`[MORALIS-SEARCH] ${chain} request failed with status: ${response.status}`);
          }
        } catch (error) {
          console.error(`[MORALIS-SEARCH] Error checking ${chain}:`, error);
        }
      }
    } else {
      // Symbol/name search - for now, return a helpful message
      console.log(`[MORALIS-SEARCH] Symbol search requested for: "${searchTerm}"`);
      
      return new Response(
        JSON.stringify({
          tokens: [],
          count: 0,
          message: `Symbol search for "${searchTerm}" is currently unavailable. Please paste the contract address instead for accurate results with logos.`
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    console.log(`[MORALIS-SEARCH] Total results found: ${results.length}`);

    if (results.length === 0) {
      return new Response(
        JSON.stringify({
          tokens: [],
          count: 0,
          message: isAddress 
            ? `No token found for address "${searchTerm}" across supported chains.`
            : `No tokens found for "${searchTerm}". Try pasting a contract address instead.`
        }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Transform results and remove duplicates
    const seenTokens = new Set();
    const transformedTokens = results
      .filter(token => {
        if (!token || !token.address || !token.name || !token.symbol) {
          console.log(`[MORALIS-SEARCH] Filtering out invalid token:`, token);
          return false;
        }
        if (token.possible_spam) {
          console.log(`[MORALIS-SEARCH] Filtering out spam token: ${token.symbol}`);
          return false;
        }
        
        const tokenKey = `${token.chain}-${token.address}`;
        if (seenTokens.has(tokenKey)) {
          console.log(`[MORALIS-SEARCH] Filtering out duplicate: ${tokenKey}`);
          return false;
        }
        seenTokens.add(tokenKey);
        return true;
      })
      .map(token => {
        const transformedToken = {
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
        
        console.log(`[MORALIS-SEARCH] Transformed token: ${transformedToken.symbol} - Logo: ${transformedToken.logo || 'none'}`);
        return transformedToken;
      })
      .slice(0, limit);

    const tokensWithLogos = transformedTokens.filter(t => t.logo).length;
    console.log(`[MORALIS-SEARCH] Returning ${transformedTokens.length} tokens, ${tokensWithLogos} with logos`);

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
