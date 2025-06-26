
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

interface MoralisLogoResult {
  address: string;
  logo?: string;
  logo_hash?: string;
}

// Enhanced function to fetch token logos using the dedicated logos endpoint
async function fetchTokenLogosFromMoralis(tokens: MoralisTokenResult[], moralisApiKey: string): Promise<MoralisTokenResult[]> {
  console.log(`[MORALIS-SEARCH] Starting logo fetch for ${tokens.length} tokens`);
  
  // Group tokens by chain for batch processing
  const tokensByChain = tokens.reduce((acc, token) => {
    if (!acc[token.chain]) {
      acc[token.chain] = [];
    }
    acc[token.chain].push(token);
    return acc;
  }, {} as Record<string, MoralisTokenResult[]>);

  const enhancedTokens: MoralisTokenResult[] = [];

  // Process each chain separately
  for (const [chain, chainTokens] of Object.entries(tokensByChain)) {
    console.log(`[MORALIS-SEARCH] Processing ${chainTokens.length} tokens on ${chain}`);
    
    // Collect addresses for this chain
    const addresses = chainTokens.map(token => token.address);
    
    try {
      // Try the metadata/logos endpoint for batch logo fetching
      if (addresses.length > 0) {
        const logoResponse = await fetch(
          `https://deep-index.moralis.io/api/v2/erc20/metadata/logos?chain=${chain}`,
          {
            method: 'POST',
            headers: {
              'X-API-Key': moralisApiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ addresses }),
          }
        );

        if (logoResponse.ok) {
          const logoData: MoralisLogoResult[] = await logoResponse.json();
          console.log(`[MORALIS-SEARCH] Got ${logoData.length} logo results for ${chain}`);
          
          // Create a map of address -> logo for quick lookup
          const logoMap = logoData.reduce((acc, item) => {
            if (item.logo) {
              acc[item.address.toLowerCase()] = item.logo;
            }
            return acc;
          }, {} as Record<string, string>);

          // Apply logos to tokens
          for (const token of chainTokens) {
            const logo = logoMap[token.address.toLowerCase()];
            if (logo) {
              console.log(`[MORALIS-SEARCH] Found Moralis logo for ${token.symbol}: ${logo}`);
              enhancedTokens.push({ ...token, logo, thumbnail: logo });
            } else {
              // Try individual metadata call as fallback
              try {
                const individualResponse = await fetch(
                  `https://deep-index.moralis.io/api/v2/erc20/${token.address}/metadata?chain=${chain}`,
                  {
                    headers: {
                      'X-API-Key': moralisApiKey,
                      'Accept': 'application/json',
                    },
                  }
                );

                if (individualResponse.ok) {
                  const individualData = await individualResponse.json();
                  if (individualData.logo) {
                    console.log(`[MORALIS-SEARCH] Found individual logo for ${token.symbol}: ${individualData.logo}`);
                    enhancedTokens.push({ ...token, logo: individualData.logo, thumbnail: individualData.logo });
                    continue;
                  }
                }
              } catch (error) {
                console.log(`[MORALIS-SEARCH] Individual fetch failed for ${token.symbol}:`, error);
              }

              // No logo found, add without logo
              enhancedTokens.push(token);
            }
          }
        } else {
          console.log(`[MORALIS-SEARCH] Batch logo fetch failed for ${chain}:`, logoResponse.status);
          // Add tokens without logos
          enhancedTokens.push(...chainTokens);
        }
      }
    } catch (error) {
      console.error(`[MORALIS-SEARCH] Logo fetch error for ${chain}:`, error);
      // Add tokens without logos
      enhancedTokens.push(...chainTokens);
    }

    // Small delay between chains to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return enhancedTokens;
}

// Enhanced CoinGecko fallback using contract address
async function enhanceWithCoinGeckoLogos(tokens: MoralisTokenResult[]): Promise<MoralisTokenResult[]> {
  console.log(`[MORALIS-SEARCH] Starting CoinGecko logo enhancement for ${tokens.length} tokens`);
  
  const enhancedTokens: MoralisTokenResult[] = [];
  
  for (const token of tokens) {
    // Skip if already has logo
    if (token.logo) {
      enhancedTokens.push(token);
      continue;
    }

    // Try CoinGecko for popular tokens or if we have a contract address
    try {
      // Map chain names to CoinGecko platform IDs
      const chainToPlatform: Record<string, string> = {
        'eth': 'ethereum',
        'polygon': 'polygon-pos',
        'bsc': 'binance-smart-chain',
        'arbitrum': 'arbitrum-one',
        'avalanche': 'avalanche',
        'optimism': 'optimistic-ethereum',
        'base': 'base'
      };

      const platform = chainToPlatform[token.chain];
      
      if (platform && token.address) {
        const coinGeckoResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/${platform}/contract/${token.address}`,
          { 
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000) // 5 second timeout
          }
        );
        
        if (coinGeckoResponse.ok) {
          const coinGeckoData = await coinGeckoResponse.json();
          if (coinGeckoData.image?.large) {
            console.log(`[MORALIS-SEARCH] Found CoinGecko logo for ${token.symbol}: ${coinGeckoData.image.large}`);
            enhancedTokens.push({ 
              ...token, 
              logo: coinGeckoData.image.large, 
              thumbnail: coinGeckoData.image.small || coinGeckoData.image.large 
            });
            continue;
          }
        }
      }

      // Fallback: Try by symbol for very popular tokens
      if (['ETH', 'USDC', 'USDT', 'BTC', 'WETH', 'DAI', 'LINK', 'UNI', 'AAVE', 'COMP'].includes(token.symbol.toUpperCase())) {
        try {
          const symbolResponse = await fetch(
            `https://api.coingecko.com/api/v3/coins/${token.symbol.toLowerCase()}`,
            { 
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(3000) // 3 second timeout
            }
          );
          
          if (symbolResponse.ok) {
            const symbolData = await symbolResponse.json();
            if (symbolData.image?.large) {
              console.log(`[MORALIS-SEARCH] Found CoinGecko symbol logo for ${token.symbol}: ${symbolData.image.large}`);
              enhancedTokens.push({ 
                ...token, 
                logo: symbolData.image.large, 
                thumbnail: symbolData.image.small || symbolData.image.large 
              });
              continue;
            }
          }
        } catch (error) {
          console.log(`[MORALIS-SEARCH] CoinGecko symbol fallback failed for ${token.symbol}:`, error);
        }
      }

      // No logo found, add without logo
      enhancedTokens.push(token);

    } catch (error) {
      console.log(`[MORALIS-SEARCH] CoinGecko lookup failed for ${token.symbol}:`, error);
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

    // Step 1: Enhance with Moralis logos
    const tokensWithMoralisLogos = await fetchTokenLogosFromMoralis(results, moralisApiKey);
    console.log(`[MORALIS-SEARCH] After Moralis logo fetch: ${tokensWithMoralisLogos.filter(t => t.logo).length}/${tokensWithMoralisLogos.length} have logos`);

    // Step 2: Enhance remaining tokens with CoinGecko logos
    const finalEnhancedTokens = await enhanceWithCoinGeckoLogos(tokensWithMoralisLogos);
    console.log(`[MORALIS-SEARCH] After CoinGecko enhancement: ${finalEnhancedTokens.filter(t => t.logo).length}/${finalEnhancedTokens.length} have logos`);

    // Transform results and remove duplicates
    const seenTokens = new Set();
    const transformedTokens = finalEnhancedTokens
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
