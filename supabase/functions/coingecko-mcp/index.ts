import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startTime = Date.now();
    const { query, token } = await req.json();

    if (!token?.address || !token?.coingeckoId) {
      return new Response(JSON.stringify({
        source: "coingecko-mcp",
        available: [],
        limited: false,
        errors: ["Missing token data"]
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    console.log(`[MCP] Processing: "${query}" for ${token.coingeckoId}`);

    const response = {
      source: "coingecko-mcp",
      available: [],
      limited: false,
      errors: []
    };

    // 6-second timeout
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          ...response,
          limited: true,
          errors: [...response.errors, "Timeout - partial results"]
        });
      }, 6000);
    });

    // Main data fetching
    const processPromise = (async () => {
      const baseUrl = 'https://api.coingecko.com/api/v3';
      const headers = { 'Content-Type': 'application/json' };

      try {
        const promises = [];
        
        // ALWAYS fetch price data for ANY query
        promises.push(
          fetch(`${baseUrl}/simple/price?ids=${token.coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`, { 
            headers,
            signal: AbortSignal.timeout(4000) 
          })
            .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
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
              console.log('[MCP] Price failed:', err);
              response.errors.push('Price unavailable');
            })
        );

        // Check for chart/trend/history/7d in query
        if (query === 'auto_insights' || 
            query.toLowerCase().includes('chart') || 
            query.toLowerCase().includes('trend') || 
            query.toLowerCase().includes('history') ||
            query.toLowerCase().includes('7d') ||
            query.toLowerCase().includes('price')) {
          
          promises.push(
            fetch(`${baseUrl}/coins/${token.coingeckoId}/ohlc?vs_currency=usd&days=7`, { 
              headers,
              signal: AbortSignal.timeout(4000)
            })
              .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
              .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                  response.ohlc = data.map(([t, o, h, l, c]) => ({
                    t: Math.floor(t / 1000),
                    o, h, l, c
                  }));
                  response.available.push('ohlc');
                }
              })
              .catch(err => {
                console.log('[MCP] OHLC failed:', err);
                response.errors.push('Chart unavailable');
              })
          );
        }

        // Check for pools/liquidity/dex/top in query
        if (query === 'auto_insights' || 
            query.toLowerCase().includes('pool') || 
            query.toLowerCase().includes('liquidity') ||
            query.toLowerCase().includes('dex') ||
            query.toLowerCase().includes('top')) {
          
          promises.push(
            fetch(`https://api.geckoterminal.com/api/v2/networks/eth/tokens/${token.address}/pools?page=1`, { 
              signal: AbortSignal.timeout(4000)
            })
              .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
              .then(data => {
                if (data.data && data.data.length > 0) {
                  response.topPools = data.data.slice(0, 5).map(pool => ({
                    name: pool.attributes.name || 'Unknown',
                    dex: pool.relationships?.dex?.data?.id || 'Unknown',
                    liquidityUsd: parseFloat(pool.attributes.reserve_in_usd || 0),
                    vol24hUsd: parseFloat(pool.attributes.volume_usd?.h24 || 0),
                    ageDays: pool.attributes.pool_created_at ? 
                      Math.floor((Date.now() - new Date(pool.attributes.pool_created_at).getTime()) / 86400000) : 0
                  }));
                  response.available.push('topPools');
                }
              })
              .catch(err => {
                console.log('[MCP] Pools failed:', err);
                // Fallback pools
                response.topPools = [{
                  name: `${token.coingeckoId.toUpperCase()}/USDC`,
                  dex: "Data Unavailable",
                  liquidityUsd: 0,
                  vol24hUsd: 0,
                  ageDays: 0
                }];
                response.available.push('topPools');
              })
        );
        }

        // Handle TVL queries (redirect to market cap)
        if (query.toLowerCase().includes('tvl')) {
          response.errors.push('TVL not directly available. Showing market cap instead.');
        }

        // Handle 30d queries
        if (query.toLowerCase().includes('30d') || query.toLowerCase().includes('30 d')) {
          promises.push(
            fetch(`${baseUrl}/coins/${token.coingeckoId}/ohlc?vs_currency=usd&days=30`, { 
              headers,
              signal: AbortSignal.timeout(4000)
            })
              .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
              .then(data => {
                if (Array.isArray(data) && data.length > 0) {
                  const firstPrice = data[0][4]; // closing price 30d ago
                  const lastPrice = data[data.length - 1][4]; // current price
                  const change30d = ((lastPrice - firstPrice) / firstPrice) * 100;
                  
                  // Add 30d change to price data
                  response.price = response.price || {};
                  response.price.change30dPct = change30d;
                  
                  if (!response.available.includes('price')) {
                    response.available.push('price');
                  }
                }
              })
              .catch(err => {
                console.log('[MCP] 30d data failed:', err);
                response.errors.push('30-day data unavailable');
              })
          );
        }

        // Categories for auto_insights only
        if (query === 'auto_insights') {
          promises.push(
            fetch(`${baseUrl}/coins/${token.coingeckoId}`, { 
              headers,
              signal: AbortSignal.timeout(4000)
            })
              .then(res => res.ok ? res.json() : Promise.reject(`HTTP ${res.status}`))
              .then(data => {
                if (data.categories && Array.isArray(data.categories)) {
                  response.categories = data.categories.filter(Boolean).slice(0, 5);
                  response.available.push('categories');
                }
              })
              .catch(err => {
                console.log('[MCP] Categories failed:', err);
              })
          );
        }

        // Wait for all promises
        await Promise.allSettled(promises);

        // If no data was fetched, ensure we at least try to get price
        if (response.available.length === 0) {
          try {
            const priceRes = await fetch(
              `${baseUrl}/simple/price?ids=${token.coingeckoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
              { headers, signal: AbortSignal.timeout(2000) }
            );
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
          } catch (e) {
            response.errors.push('Unable to fetch any data');
          }
        }

        return response;
      } catch (error) {
        console.error('[MCP] Processing error:', error);
        response.errors.push(`Processing failed: ${error.message}`);
        return response;
      }
    })();

    const finalResponse = await Promise.race([processPromise, timeoutPromise]);

    // Log telemetry
    const latency = Date.now() - startTime;
    const eventType = query === 'auto_insights' 
      ? (finalResponse.errors.length === 0 ? 'auto_insights_success' : 'auto_insights_partial')
      : (finalResponse.errors.length === 0 ? 'ask_success' : 'ask_error');

    await supabase.from('copilot_events').insert({
      type: eventType,
      token_address: token.address,
      query: query,
      available: finalResponse.available,
      limited: finalResponse.limited,
      latency_ms: latency
    }).catch(err => console.log('[MCP] Telemetry failed:', err));

    console.log(`[MCP] Complete in ${latency}ms:`, {
      query: query,
      available: finalResponse.available,
      errors: finalResponse.errors
    });

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[MCP] Failed:', error);
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