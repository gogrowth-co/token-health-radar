import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Rate limiting
let lastApiCallTime = 0;
const MIN_API_CALL_INTERVAL = 1000; // 1 second between calls

async function callCoinMarketCapAPI(endpoint: string, params: Record<string, any> = {}) {
  const now = Date.now();
  
  // Rate limiting
  if (now - lastApiCallTime < MIN_API_CALL_INTERVAL) {
    const waitTime = MIN_API_CALL_INTERVAL - (now - lastApiCallTime);
    console.log(`[CMC-EDGE] Rate limiting: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastApiCallTime = Date.now();

  if (!cmcApiKey) {
    console.error('[CMC-EDGE] No CoinMarketCap API key configured');
    throw new Error("CoinMarketCap API key not configured");
  }

  const url = new URL(`https://pro-api.coinmarketcap.com/v1${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });

  console.log(`[CMC-EDGE] Calling CMC API: ${url.toString()}`);
  console.log(`[CMC-EDGE] Request params:`, params);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-CMC_PRO_API_KEY': cmcApiKey,
      }
    });

    console.log(`[CMC-EDGE] CMC API Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CMC-EDGE] CMC API Error ${response.status}:`, errorText);
      throw new Error(`CoinMarketCap API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`[CMC-EDGE] CMC API Response:`, data.status);
    
    if (data.status?.error_code !== 0) {
      console.error(`[CMC-EDGE] CMC API Status Error:`, data.status);
      throw new Error(`CoinMarketCap API Error: ${data.status?.error_message || 'Unknown error'}`);
    }

    console.log(`[CMC-EDGE] CMC API Success: returning ${data.data?.length || 0} results`);
    return data;
  } catch (error) {
    console.error(`[CMC-EDGE] Request failed:`, error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[CMC-EDGE] Incoming request: ${req.method}`);
    
    const requestBody = await req.json();
    const { action, searchTerm, cmcIds, convert, limit } = requestBody;
    
    console.log(`[CMC-EDGE] Request body:`, requestBody);
    console.log(`[CMC-EDGE] Action: ${action}, SearchTerm: "${searchTerm}", CMC IDs: ${cmcIds}, Convert: ${convert}, Limit: ${limit}`);

    let result;

    switch (action) {
      case 'search':
        if (!searchTerm || searchTerm.trim() === '') {
          console.error('[CMC-EDGE] Empty search term provided');
          throw new Error('Search term is required');
        }
        
        const cleanSearchTerm = searchTerm.trim();
        console.log(`[CMC-EDGE] Searching for: "${cleanSearchTerm}"`);
        
        // Initialize result with empty data
        result = { data: [] };
        let nameSearchSucceeded = false;
        
        try {
          // Try name search first (more reliable for partial matches)
          console.log(`[CMC-EDGE] Attempting name search for: "${cleanSearchTerm}"`);
          
          const allData = await callCoinMarketCapAPI('/cryptocurrency/map', {
            listing_status: 'active',
            limit: 2000 // Increase limit to catch more tokens
          });
          
          if (allData.data) {
            // Enhanced filtering - check name, slug, AND symbol
            const searchLower = cleanSearchTerm.toLowerCase();
            const filteredTokens = allData.data.filter((token: any) => {
              const name = token.name?.toLowerCase() || '';
              const slug = token.slug?.toLowerCase() || '';
              const symbol = token.symbol?.toLowerCase() || '';
              
              const matchesName = name.includes(searchLower);
              const matchesSlug = slug.includes(searchLower);
              const matchesSymbol = symbol.includes(searchLower);
              
              return matchesName || matchesSlug || matchesSymbol;
            });
            
            result.data = filteredTokens.slice(0, limit || 10);
            
            console.log(`[CMC-EDGE] Name search found ${filteredTokens.length} total matches, returning ${result.data.length} results`);
            
            // Log some examples of what we found for debugging
            if (result.data.length > 0) {
              console.log(`[CMC-EDGE] Sample results:`, result.data.slice(0, 3).map((token: any) => ({
                name: token.name,
                symbol: token.symbol,
                slug: token.slug
              })));
              nameSearchSucceeded = true;
            }
          }
        } catch (nameError) {
          console.log(`[CMC-EDGE] Name search failed:`, nameError.message);
          // Continue to symbol search fallback
        }
        
        // If name search didn't succeed, try symbol search as fallback
        if (!nameSearchSucceeded && (!result.data || result.data.length === 0)) {
          try {
            console.log(`[CMC-EDGE] Name search had no results, trying symbol search for: "${cleanSearchTerm.toUpperCase()}"`);
            result = await callCoinMarketCapAPI('/cryptocurrency/map', {
              symbol: cleanSearchTerm.toUpperCase(),
              limit: limit || 10
            });
            
            console.log(`[CMC-EDGE] Symbol search returned ${result.data?.length || 0} results`);
          } catch (symbolError: any) {
            console.log(`[CMC-EDGE] Symbol search also failed:`, symbolError.message);
            // If both searches failed, we'll return empty results
            result = { data: [] };
          }
        }
        break;

      case 'details':
        if (!cmcIds || cmcIds.length === 0) {
          console.error('[CMC-EDGE] No CMC IDs provided for details');
          throw new Error('CMC IDs are required for details');
        }
        console.log(`[CMC-EDGE] Fetching details for CMC IDs: ${cmcIds}`);
        result = await callCoinMarketCapAPI('/cryptocurrency/info', {
          id: cmcIds.join(',')
        });
        break;

      case 'quotes':
        if (!cmcIds || cmcIds.length === 0) {
          console.error('[CMC-EDGE] No CMC IDs provided for quotes');
          throw new Error('CMC IDs are required for quotes');
        }
        console.log(`[CMC-EDGE] Fetching quotes for CMC IDs: ${cmcIds}`);
        result = await callCoinMarketCapAPI('/cryptocurrency/quotes/latest', {
          id: cmcIds.join(','),
          convert: convert || 'USD'
        });
        break;

      default:
        console.error(`[CMC-EDGE] Unknown action: ${action}`);
        throw new Error(`Unknown action: ${action}`);
    }

    console.log(`[CMC-EDGE] Success: ${action} completed, returning ${result.data?.length || 0} results`);
    
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[CMC-EDGE] Edge function error:', error);
    console.error('[CMC-EDGE] Error stack:', error.stack);
    
    // Return more specific error messages
    let errorMessage = 'An unexpected error occurred';
    let statusCode = 500;
    
    if (error.message?.includes('API key')) {
      errorMessage = 'CoinMarketCap API configuration error';
      statusCode = 503;
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'API rate limit reached. Please wait a moment and try again.';
      statusCode = 429;
    } else if (error.message?.includes('Search term is required')) {
      errorMessage = 'Please enter a valid token name or symbol';
      statusCode = 400;
    } else if (error.message?.includes('CoinMarketCap API Error')) {
      errorMessage = error.message;
      statusCode = 502;
    }
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: Deno.env.get('DENO_DEPLOYMENT_ID') ? undefined : error.message
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
