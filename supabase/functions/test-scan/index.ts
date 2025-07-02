import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

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
    
    // Test the run-token-scan function with Pendle token
    const testParams = {
      token_address: '0x808507121b80c02388fad14726482e061b8da827',
      chain_id: '0x1',
      user_id: null,
      force_refresh: true
    };
    
    console.log(`[TEST-SCAN] Calling run-token-scan with params:`, testParams);
    
    const { data, error } = await supabase.functions.invoke('run-token-scan', {
      body: testParams
    });
    
    if (error) {
      console.error(`[TEST-SCAN] ERROR:`, error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message,
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
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});