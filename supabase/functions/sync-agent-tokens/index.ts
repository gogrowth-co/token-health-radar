import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const CHAIN_PRIORITY = [
  'base',
  'ethereum',
  'solana',
  'arbitrum-one',
  'polygon-pos',
  'binance-smart-chain',
];

const CHAIN_ID_MAP: Record<string, string> = {
  'ethereum': '0x1',
  'base': '0x2105',
  'solana': 'solana',
  'arbitrum-one': '0xa4b1',
  'polygon-pos': '0x89',
  'binance-smart-chain': '0x38',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // SECURITY: Validate internal API secret or service role key
  console.log('[SYNC-AGENT-TOKENS] Validating authentication...');

  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const internalSecret = Deno.env.get('INTERNAL_API_SECRET');

  if (!authHeader) {
    console.error('[SYNC-AGENT-TOKENS] No authorization header provided');
    return new Response(
      JSON.stringify({
        error: 'Unauthorized - Authentication required',
        message: 'This endpoint requires authentication. Please include a valid authorization token or internal API secret.',
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  const isValidServiceRole = token === serviceRoleKey;
  const isValidInternal = internalSecret && token === internalSecret;

  if (!isValidServiceRole && !isValidInternal) {
    console.error('[SYNC-AGENT-TOKENS] Invalid authentication token');
    return new Response(
      JSON.stringify({
        error: 'Unauthorized - Invalid token',
        message: 'Your authentication token is invalid.',
      }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log('[SYNC-AGENT-TOKENS] Authentication successful');

  const coingeckoApiKey = Deno.env.get('COINGECKO_API_KEY');
  if (!coingeckoApiKey) {
    console.error('[SYNC-AGENT-TOKENS] COINGECKO_API_KEY not configured');
    return new Response(
      JSON.stringify({ error: 'COINGECKO_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Fetch AI agent tokens from CoinGecko
    console.log('[SYNC-AGENT-TOKENS] Fetching AI agent tokens from CoinGecko...');
    const cgResponse = await fetch(
      'https://pro-api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=ai-agents&order=market_cap_desc&per_page=50&page=1',
      { headers: { 'x-cg-pro-api-key': coingeckoApiKey } }
    );

    if (!cgResponse.ok) {
      const errText = await cgResponse.text();
      throw new Error(`CoinGecko API error: ${cgResponse.status} - ${errText}`);
    }

    const tokens = await cgResponse.json();
    console.log(`[SYNC-AGENT-TOKENS] Received ${tokens.length} tokens from CoinGecko`);

    // Fetch existing tokens to identify new ones
    const { data: existingTokens, error: fetchError } = await supabase
      .from('agent_tokens')
      .select('coingecko_id');

    if (fetchError) {
      throw new Error(`Failed to fetch existing tokens: ${fetchError.message}`);
    }

    const existingIds = new Set((existingTokens || []).map((t: any) => t.coingecko_id));

    const now = new Date().toISOString();
    const errors: string[] = [];
    let syncedCount = 0;
    let newCount = 0;

    for (const item of tokens) {
      try {
        const isNew = !existingIds.has(item.id);

        // Build upsert data with only market data fields
        // Editorial fields (category, agent_framework, description, is_featured, display_order)
        // are intentionally excluded so they are never overwritten for existing tokens
        const upsertData: Record<string, any> = {
          coingecko_id: item.id,
          name: item.name,
          symbol: item.symbol.toUpperCase(),
          image_url: item.image,
          current_price_usd: item.current_price,
          market_cap_usd: item.market_cap,
          volume_24h_usd: item.total_volume,
          price_change_24h_pct: item.price_change_percentage_24h,
          market_cap_rank: item.market_cap_rank,
          last_synced_at: now,
        };

        // For new tokens, look up contract address
        if (isNew) {
          console.log(`[SYNC-AGENT-TOKENS] New token detected: ${item.id} - fetching contract address`);

          // Respect CoinGecko rate limits
          await new Promise((resolve) => setTimeout(resolve, 1500));

          try {
            const coinResponse = await fetch(
              `https://pro-api.coingecko.com/api/v3/coins/${item.id}`,
              { headers: { 'x-cg-pro-api-key': coingeckoApiKey } }
            );

            if (coinResponse.ok) {
              const coinData = await coinResponse.json();
              const platforms: Record<string, string> = coinData.platforms || {};

              // Select best chain by priority order
              let selectedPlatform: string | null = null;
              let selectedAddress: string | null = null;

              for (const platform of CHAIN_PRIORITY) {
                if (platforms[platform]) {
                  selectedPlatform = platform;
                  selectedAddress = platforms[platform];
                  break;
                }
              }

              // Fall back to first available platform
              if (!selectedPlatform) {
                const firstKey = Object.keys(platforms).find((k) => platforms[k]);
                if (firstKey) {
                  selectedPlatform = firstKey;
                  selectedAddress = platforms[firstKey];
                }
              }

              if (selectedPlatform && selectedAddress) {
                const chainId = CHAIN_ID_MAP[selectedPlatform] || selectedPlatform;
                // Lowercase for EVM chains, preserve case for Solana
                const tokenAddress =
                  selectedPlatform === 'solana'
                    ? selectedAddress
                    : selectedAddress.toLowerCase();

                upsertData.token_address = tokenAddress;
                upsertData.chain_id = chainId;

                console.log(
                  `[SYNC-AGENT-TOKENS] ${item.id}: chain=${chainId}, address=${tokenAddress}`
                );
              } else {
                console.log(`[SYNC-AGENT-TOKENS] ${item.id}: no contract address found`);
              }
            } else {
              const errText = await coinResponse.text();
              console.error(
                `[SYNC-AGENT-TOKENS] Coin detail API error for ${item.id}: ${coinResponse.status} - ${errText}`
              );
              errors.push(`Address lookup failed for ${item.id}: HTTP ${coinResponse.status}`);
            }
          } catch (addrError: any) {
            console.error(
              `[SYNC-AGENT-TOKENS] Failed to get address for ${item.id}:`,
              addrError.message
            );
            errors.push(`Address lookup failed for ${item.id}: ${addrError.message}`);
          }

          newCount++;
        }

        // Upsert market data; conflict on coingecko_id updates only the provided columns,
        // leaving editorial fields untouched
        const { error: upsertError } = await supabase
          .from('agent_tokens')
          .upsert(upsertData, { onConflict: 'coingecko_id', ignoreDuplicates: false });

        if (upsertError) {
          throw new Error(`Upsert failed for ${item.id}: ${upsertError.message}`);
        }

        syncedCount++;
      } catch (tokenError: any) {
        console.error(
          `[SYNC-AGENT-TOKENS] Error processing token ${item.id}:`,
          tokenError.message
        );
        errors.push(`${item.id}: ${tokenError.message}`);
      }
    }

    console.log(
      `[SYNC-AGENT-TOKENS] Done. synced=${syncedCount}, new_tokens=${newCount}, errors=${errors.length}`
    );

    return new Response(
      JSON.stringify({ synced: syncedCount, new_tokens: newCount, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[SYNC-AGENT-TOKENS] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
