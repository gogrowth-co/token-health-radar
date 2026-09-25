import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // --- Authentication (same pattern as sync-agent-tokens) ---
  const authHeader = req.headers.get('Authorization');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const internalSecret = Deno.env.get('INTERNAL_API_SECRET');

  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const token = authHeader.replace('Bearer ', '');
  let authenticated = token === serviceRoleKey || (internalSecret && token === internalSecret);

  if (!authenticated) {
    try {
      const supabaseAuth = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const { data: userData, error: userError } = await supabaseAuth.auth.getUser(token);
      if (!userError && userData?.user) {
        const adminClient = createClient(
          Deno.env.get('SUPABASE_URL')!,
          serviceRoleKey!
        );
        const { data: roleData } = await adminClient.rpc('has_role', {
          _user_id: userData.user.id,
          _role: 'admin',
        });
        if (roleData === true) {
          authenticated = true;
          console.log(`[BATCH-SCAN-AGENTS] Admin user authenticated: ${userData.user.id}`);
        }
      }
    } catch (err: any) {
      console.error('[BATCH-SCAN-AGENTS] Auth check error:', err.message);
    }
  }

  if (!authenticated) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - Admin access required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // --- Main logic ---
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    serviceRoleKey!
  );

  const { data: tokens, error: fetchError } = await supabase
    .from('agent_tokens')
    .select('coingecko_id, token_address, chain_id, name')
    .eq('is_featured', true)
    .not('token_address', 'is', null);

  if (fetchError) {
    console.error('[BATCH-SCAN-AGENTS] Failed to fetch tokens:', fetchError.message);
    return new Response(
      JSON.stringify({ error: fetchError.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const total = tokens?.length ?? 0;
  console.log(`[BATCH-SCAN-AGENTS] Found ${total} featured tokens to scan`);

  let scanned = 0;
  let failed = 0;
  const errors: string[] = [];
  const scanUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/run-token-scan`;

  const scanOne = async (t: NonNullable<typeof tokens>[number], n: number) => {
    console.log(`[BATCH-SCAN-AGENTS] (${n}/${total}) Scanning ${t.name} [${t.coingecko_id}]`);
    try {
      // run-token-scan reads snake_case fields. The address is sent exactly as stored:
      // Solana mints are case-sensitive, so it must not be lowercased here.
      const res = await fetch(scanUrl, {
        method: 'POST',
        // run-token-scan only accepts a user JWT or x-internal-secret; the service key
        // is no longer a JWT, so the bearer alone is rejected with 401.
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          ...(internalSecret ? { 'x-internal-secret': internalSecret } : {}),
        },
        body: JSON.stringify({
          token_address: t.token_address,
          chain_id: t.chain_id,
          force_refresh: true,
          user_id: null,
        }),
      });

      const bodyText = await res.text();
      let body: any = null;
      try { body = JSON.parse(bodyText); } catch { /* non-JSON error body */ }
      if (!res.ok || body?.success === false) {
        throw new Error(`HTTP ${res.status}: ${(body?.error ?? bodyText).toString().substring(0, 200)}`);
      }

      await supabase
        .from('agent_tokens')
        .update({ last_scanned_at: new Date().toISOString() })
        .eq('coingecko_id', t.coingecko_id);

      scanned++;
      console.log(`[BATCH-SCAN-AGENTS] ✓ ${t.name} scanned successfully`);
    } catch (err: any) {
      failed++;
      const msg = `${t.coingecko_id}: ${err.message}`;
      errors.push(msg);
      console.error(`[BATCH-SCAN-AGENTS] ✗ ${t.name} failed:`, err.message);
    }
  };

  // A few scans at a time: one-by-one with 5s gaps ran past the 150s gateway limit.
  const CONCURRENCY = 3;
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, async () => {
    while (next < total) {
      const i = next++;
      await scanOne(tokens![i], i + 1);
    }
  }));

  console.log(`[BATCH-SCAN-AGENTS] Done. scanned=${scanned}, failed=${failed}, total=${total}`);

  return new Response(
    JSON.stringify({ scanned, failed, total, errors }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
