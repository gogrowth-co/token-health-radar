import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { privilegedAccess } from '../_shared/adminAccess.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[TEST-SCAN] === TESTING TOKEN SCAN FUNCTION ===`);
    console.log(`[TEST-SCAN] Timestamp: ${new Date().toISOString()}`);

    // SECURITY: Require verified admin or internal/service authorization in EVERY environment.
    const access = await privilegedAccess(req, supabase);
    if (!access.allowed) {
      return new Response(
        JSON.stringify({
          error: access.status === 401 ? 'Unauthorized - Authentication required' : 'Forbidden - Admin access required',
          message: access.status === 401
            ? 'This test endpoint requires verified admin or internal authorization.'
            : 'This test endpoint is restricted to admin users.'
        }),
        {
          status: access.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    console.log(`[TEST-SCAN] Authorization granted via ${access.via}`);

    // Test the run-token-scan function with Pendle token
    const testParams = {
      token_address: '0x808507121b80c02388fad14726482e061b8da827',
      chain_id: '0x1',
      force_refresh: true
    };
    
    console.log(`[TEST-SCAN] Calling run-token-scan with params:`, testParams);
    
    const internalSecret = Deno.env.get('INTERNAL_API_SECRET');
    const { data, error } = await supabase.functions.invoke('run-token-scan', {
      body: testParams,
      headers: internalSecret ? { 'x-internal-secret': internalSecret } : undefined,
    });
    
    if (error) {
      console.error(`[TEST-SCAN] ERROR:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Scan test failed",
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }
    
    console.log(`[TEST-SCAN] SUCCESS - Scan completed:`, data);
    
    return new Response(
      JSON.stringify({
        success: true,
        data,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[TEST-SCAN] Exception during test:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Scan test failed",
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});