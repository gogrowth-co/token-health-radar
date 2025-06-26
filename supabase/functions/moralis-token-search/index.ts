
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
  chain: string;
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
      results = await searchBySymbol(searchTerm.trim(), moralisApiKey, limit);
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

async function searchBySymbol(searchTerm: string, apiKey: string, limit: number): Promise<TokenResult[]> {
  // Capitalize the symbol as required by Moralis API
  const capitalizedSymbol = searchTerm.toUpperCase();
  
  console.log(`[MORALIS-SEARCH] Multi-chain symbol search for: "${capitalizedSymbol}"`);
  
  try {
    // Use the correct Moralis endpoint for symbol-based metadata lookup
    // This endpoint searches across all chains in one call
    const response = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20/metadata/symbols?symbols=["${capitalizedSymbol}"]`,
      {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    console.log(`[MORALIS-SEARCH] API Response Status: ${response.status}`);

    if (!response.ok) {
      console.error(`[MORALIS-SEARCH] API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`[MORALIS-SEARCH] Error Details: ${errorText}`);
      return [];
    }

    const data: MoralisTokenMetadata[] = await response.json();
    console.log(`[MORALIS-SEARCH] Raw API Response:`, JSON.stringify(data, null, 2));
    console.log(`[MORALIS-SEARCH] Found ${data.length} tokens across all chains`);

    if (!Array.isArray(data) || data.length === 0) {
      console.log(`[MORALIS-SEARCH] No tokens found for symbol: ${capitalizedSymbol}`);
      return [];
    }

    const results: TokenResult[] = [];

    for (const token of data) {
      try {
        // Filter out spam tokens
        if (token.possible_spam) {
          console.log(`[MORALIS-SEARCH] Filtering out spam token: ${token.symbol} on ${token.chain}`);
          continue;
        }

        console.log(`[MORALIS-SEARCH] Processing token: ${token.name} (${token.symbol}) on ${token.chain} with logo: ${token.logo || 'none'}`);
        
        const transformedToken = transformTokenData(token);
        results.push(transformedToken);
        
        // Limit results
        if (results.length >= limit) {
          break;
        }
      } catch (error) {
        console.error(`[MORALIS-SEARCH] Error processing token ${token.address}:`, error);
      }
    }

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

    results.sort((a, b) => {
      const priorityA = chainPriority[a.chain] || 999;
      const priorityB = chainPriority[b.chain] || 999;
      return priorityA - priorityB;
    });

    console.log(`[MORALIS-SEARCH] Returning ${results.length} processed tokens`);
    return results;

  } catch (error) {
    console.error(`[MORALIS-SEARCH] Exception in searchBySymbol:`, error);
    return [];
  }
}

async function searchByAddress(searchTerm: string, apiKey: string): Promise<TokenResult[]> {
  const cleanAddress = searchTerm.startsWith('0x') ? searchTerm : `0x${searchTerm}`;
  const results: TokenResult[] = [];
  
  // Supported chains for address lookup
  const supportedChains = ['eth', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'optimism', 'base'];
  
  for (const chain of supportedChains) {
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
          // Add chain info to the token data
          const tokenWithChain = { ...data, chain };
          results.push(transformTokenData(tokenWithChain));
        }
      }
    } catch (error) {
      console.error(`[MORALIS-SEARCH] Error checking ${chain}:`, error);
    }
  }
  
  return results;
}

function transformTokenData(tokenData: MoralisTokenMetadata): TokenResult {
  return {
    id: `${tokenData.chain}-${tokenData.address}`,
    name: tokenData.name,
    symbol: tokenData.symbol.toUpperCase(),
    address: tokenData.address,
    chain: tokenData.chain,
    logo: tokenData.logo || '',
    chainLogo: CHAIN_LOGOS[tokenData.chain] || '',
    verified: tokenData.verified_contract || false,
    decimals: tokenData.decimals || 18,
    title: `${tokenData.symbol.toUpperCase()} — ${tokenData.name}`,
    subtitle: getChainDisplayName(tokenData.chain),
    value: `${tokenData.chain}/${tokenData.address}`
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
