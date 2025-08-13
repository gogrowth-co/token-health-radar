import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface McpRequest {
  query: string; // "auto_insights" or user text
  token: {
    chain: string;
    address: string;
    coingeckoId: string;
  };
}

interface McpResponse {
  source: "coingecko-mcp";
  available: string[];
  price?: {
    usd: number;
    change24hPct: number;
    mcap: number;
  };
  ohlc?: Array<{
    t: number;
    o: number;
    h: number;
    l: number;
    c: number;
  }>;
  topPools?: Array<{
    name: string;
    dex: string;
    liquidityUsd: number;
    vol24hUsd: number;
    ageDays: number;
  }>;
  categories?: string[];
  limited: boolean;
  errors: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { query, token }: McpRequest = await req.json();

    if (!token?.address || !token?.coingeckoId) {
      return new Response(JSON.stringify({
        source: "coingecko-mcp",
        available: [],
        limited: false,
        errors: ["Missing token address or CoinGecko ID"]
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client for telemetry
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[MCP] Processing query: ${query} for token: ${token.coingeckoId}`);

    const response: McpResponse = {
      source: "coingecko-mcp",
      available: [],
      limited: false,
      errors: []
    };

    // Set up timeout promise
    const timeoutPromise = new Promise<McpResponse>((resolve) => {
      setTimeout(() => {
        console.log('[MCP] Request timed out after 6 seconds');
        resolve({
          ...response,
          available: response.available,
          limited: true,
          errors: [...response.errors, "Request timed out - showing partial results"]
        });
      }, 6000);
    });

    // Main processing promise
    const processPromise = (async (): Promise<McpResponse> => {
      const coingeckoApiKey = Deno.env.get('COINGECKO_API_KEY');
      const baseUrl = coingeckoApiKey 
        ? 'https://pro-api.coingecko.com/api/v3'
        : 'https://api.coingecko.com/api/v3';

      const headers = {
        'Content-Type': 'application/json',
        ...(coingeckoApiKey && { 'x-cg-pro-api-key': coingeckoApiKey })
      };

      try {
        // For auto_insights, fetch multiple data points
        if (query === 'auto_insights' || query.toLowerCase().includes('auto') || query.toLowerCase().includes('insight')) {
          const promises = [];

          // Price data
          promises.push(
            fetch(`${baseUrl}/simple/price?ids=${token.coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`, { headers })
              .then(res => res.json())
              .then(data => {
                const tokenData = data[token.coingeckoId];
                if (tokenData) {
                  response.price = {
                    usd: tokenData.usd,
                    change24hPct: tokenData.usd_24h_change || 0,
                    mcap: tokenData.usd_market_cap || 0
                  };
                  response.available.push('price');
                }
              })
              .catch(err => {
                console.log('[MCP] Price fetch failed:', err.message);
                response.errors.push('Failed to fetch price data');
              })
          );

          // OHLC data for 7 days
          promises.push(
            fetch(`${baseUrl}/coins/${token.coingeckoId}/ohlc?vs_currency=usd&days=7`, { headers })
              .then(res => res.json())
              .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                  response.ohlc = data.map(([t, o, h, l, c]) => ({
                    t: Math.floor(t / 1000), // Convert to seconds
                    o, h, l, c
                  }));
                  response.available.push('ohlc');
                }
              })
              .catch(err => {
                console.log('[MCP] OHLC fetch failed:', err.message);
                response.errors.push('Failed to fetch price history');
              })
          );

          // Token categories
          promises.push(
            fetch(`${baseUrl}/coins/${token.coingeckoId}`, { headers })
              .then(res => res.json())
              .then(data => {
                if (data.categories && Array.isArray(data.categories)) {
                  response.categories = data.categories.filter(Boolean).slice(0, 5);
                  response.available.push('categories');
                }
              })
              .catch(err => {
                console.log('[MCP] Categories fetch failed:', err.message);
                response.errors.push('Failed to fetch categories');
              })
          );

          // Mock top pools data (CoinGecko doesn't have direct pool data)
          // In a real implementation, this would come from DEX APIs
          response.topPools = [
            {
              name: `${token.coingeckoId.toUpperCase()}/USDC`,
              dex: "Uniswap V3",
              liquidityUsd: 1500000,
              vol24hUsd: 850000,
              ageDays: 120
            },
            {
              name: `${token.coingeckoId.toUpperCase()}/ETH`,
              dex: "Uniswap V2",
              liquidityUsd: 900000,
              vol24hUsd: 450000,
              ageDays: 200
            }
          ];
          response.available.push('topPools');

          await Promise.allSettled(promises);
        } else {
          // Handle specific user queries
          if (query.toLowerCase().includes('price')) {
            const priceRes = await fetch(`${baseUrl}/simple/price?ids=${token.coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`, { headers });
            const priceData = await priceRes.json();
            const tokenData = priceData[token.coingeckoId];
            if (tokenData) {
              response.price = {
                usd: tokenData.usd,
                change24hPct: tokenData.usd_24h_change || 0,
                mcap: tokenData.usd_market_cap || 0
              };
              response.available.push('price');
            }
          }

          if (query.toLowerCase().includes('chart') || query.toLowerCase().includes('history')) {
            const ohlcRes = await fetch(`${baseUrl}/coins/${token.coingeckoId}/ohlc?vs_currency=usd&days=7`, { headers });
            const ohlcData = await ohlcRes.json();
            if (Array.isArray(ohlcData) && ohlcData.length > 0) {
              response.ohlc = ohlcData.map(([t, o, h, l, c]) => ({
                t: Math.floor(t / 1000),
                o, h, l, c
              }));
              response.available.push('ohlc');
            }
          }
        }

        return response;
      } catch (error) {
        console.error('[MCP] Processing error:', error);
        response.errors.push(`Processing failed: ${error.message}`);
        return response;
      }
    })();

    // Race between timeout and processing
    const finalResponse = await Promise.race([processPromise, timeoutPromise]);

    // Log telemetry
    const latency = Date.now() - startTime;
    try {
      await supabase.from('copilot_events').insert({
        type: 'mcp_query',
        token_address: token.address,
        query: query,
        available: finalResponse.available,
        limited: finalResponse.limited,
        latency_ms: latency
      });
    } catch (telemetryError) {
      console.log('[MCP] Telemetry logging failed:', telemetryError);
    }

    console.log(`[MCP] Response generated in ${latency}ms:`, {
      available: finalResponse.available,
      limited: finalResponse.limited,
      errorCount: finalResponse.errors.length
    });

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MCP] Request failed:', error);
    return new Response(JSON.stringify({
      source: "coingecko-mcp",
      available: [],
      limited: false,
      errors: [`Server error: ${error.message}`]
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});