
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CMC-EDGE] Incoming request:', req.method);
    
    const { action, searchTerm, cmcIds, convert, limit } = await req.json();
    
    console.log(`[CMC-EDGE] Request body:`, { action, searchTerm, cmcIds, convert, limit });
    console.log(`[CMC-EDGE] Action: ${action}, SearchTerm: "${searchTerm}", CMC IDs: ${cmcIds}, Convert: ${convert}, Limit: ${limit}`);

    const cmcApiKey = Deno.env.get('COINMARKETCAP_API_KEY');
    if (!cmcApiKey) {
      throw new Error('CoinMarketCap API key not configured');
    }

    const headers = {
      'Accepts': 'application/json',
      'X-CMC_PRO_API_KEY': cmcApiKey,
    };

    let url = '';
    let params = new URLSearchParams();

    if (action === 'search') {
      console.log(`[CMC-EDGE] Searching for: "${searchTerm}"`);
      
      // For search, we use the map endpoint to get all cryptocurrencies
      url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/map';
      params.append('listing_status', 'active');
      params.append('limit', '2000'); // Get more results for better search
      
      console.log(`[CMC-EDGE] Attempting name search for: "${searchTerm}"`);
    } else if (action === 'details') {
      console.log(`[CMC-EDGE] Fetching details for CMC IDs: ${cmcIds.join(',')}`);
      
      // Use v2 endpoint for better description data
      url = 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/info';
      params.append('id', cmcIds.join(','));
    } else if (action === 'quotes') {
      console.log(`[CMC-EDGE] Fetching quotes for CMC IDs: ${cmcIds.join(',')}`);
      
      url = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest';
      params.append('id', cmcIds.join(','));
      if (convert) {
        params.append('convert', convert);
      }
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    const fullUrl = `${url}?${params.toString()}`;
    console.log(`[CMC-EDGE] Calling CMC API: ${fullUrl}`);
    console.log(`[CMC-EDGE] Request params:`, Object.fromEntries(params));

    const response = await fetch(fullUrl, { headers });
    
    console.log(`[CMC-EDGE] CMC API Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[CMC-EDGE] CMC API Error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`CoinMarketCap API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[CMC-EDGE] CMC API Response:`, JSON.stringify(data.status || data, null, 2));

    if (data.status && data.status.error_code !== 0) {
      console.error(`[CMC-EDGE] CMC API Error:`, data.status);
      throw new Error(`CoinMarketCap API Error: ${data.status.error_message}`);
    }

    console.log(`[CMC-EDGE] CMC API Success: returning ${data.data ? Object.keys(data.data).length || data.data.length : 0} results`);

    if (action === 'search') {
      // Filter the results based on the search term
      const searchResults = data.data || [];
      const filteredResults = searchResults.filter((token: any) => {
        const nameMatch = token.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const symbolMatch = token.symbol?.toLowerCase().includes(searchTerm.toLowerCase());
        return nameMatch || symbolMatch;
      }).slice(0, limit || 10);

      console.log(`[CMC-EDGE] Name search found ${searchResults.length} total matches, returning ${filteredResults.length} results`);
      console.log(`[CMC-EDGE] Sample results:`, filteredResults.slice(0, 2).map((token: any) => ({
        name: token.name,
        symbol: token.symbol,
        slug: token.slug
      })));
      console.log(`[CMC-EDGE] Success: search completed, returning ${filteredResults.length} results`);

      return new Response(JSON.stringify({
        data: filteredResults,
        status: data.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } else if (action === 'details') {
      // For v2 API, the response structure is different - data is nested under each ID
      console.log(`[CMC-EDGE] V2 API Response structure:`, Object.keys(data.data || {}));
      
      // Log individual token details to debug descriptions
      Object.entries(data.data || {}).forEach(([id, tokenData]: [string, any]) => {
        console.log(`[CMC-EDGE] Token ${id} description:`, tokenData.description?.substring(0, 200) + '...');
        console.log(`[CMC-EDGE] Token ${id} name:`, tokenData.name);
        console.log(`[CMC-EDGE] Token ${id} has description:`, !!tokenData.description);
      });
      
      console.log(`[CMC-EDGE] Success: details completed, returning ${Object.keys(data.data || {}).length} results`);
    } else if (action === 'quotes') {
      console.log(`[CMC-EDGE] Success: quotes completed, returning ${Object.keys(data.data || {}).length} results`);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[CMC-EDGE] Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
