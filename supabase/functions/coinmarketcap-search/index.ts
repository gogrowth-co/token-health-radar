
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
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastApiCallTime = Date.now();

  if (!cmcApiKey) {
    throw new Error("CoinMarketCap API key not configured");
  }

  const url = new URL(`https://pro-api.coinmarketcap.com/v1${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, value.toString());
    }
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X-CMC_PRO_API_KEY': cmcApiKey,
    }
  });

  if (!response.ok) {
    throw new Error(`CoinMarketCap API Error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.status?.error_code !== 0) {
    throw new Error(`CoinMarketCap API Error: ${data.status?.error_message || 'Unknown error'}`);
  }

  return data;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, searchTerm, cmcIds } = await req.json();
    console.log(`[CMC-EDGE] Action: ${action}, SearchTerm: ${searchTerm}, CMC IDs: ${cmcIds}`);

    let result;

    switch (action) {
      case 'search':
        // Search by symbol first
        result = await callCoinMarketCapAPI('/cryptocurrency/map', {
          symbol: searchTerm.toUpperCase(),
          limit: 10
        });
        
        if (!result.data || result.data.length === 0) {
          // If no results by symbol, try by name
          const allData = await callCoinMarketCapAPI('/cryptocurrency/map', {
            listing_status: 'active',
            limit: 100
          });
          
          result.data = allData.data?.filter((token: any) => 
            token.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            token.slug?.toLowerCase().includes(searchTerm.toLowerCase())
          ).slice(0, 10) || [];
        }
        break;

      case 'details':
        result = await callCoinMarketCapAPI('/cryptocurrency/info', {
          id: cmcIds.join(',')
        });
        break;

      case 'quotes':
        result = await callCoinMarketCapAPI('/cryptocurrency/quotes/latest', {
          id: cmcIds.join(','),
          convert: 'USD'
        });
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[CMC-EDGE] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
