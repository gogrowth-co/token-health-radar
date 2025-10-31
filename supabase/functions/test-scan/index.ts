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

    // SECURITY: In production, require admin authentication
    const environment = Deno.env.get('ENVIRONMENT') || 'production';
    console.log(`[TEST-SCAN] Environment: ${environment}`);

    if (environment === 'production') {
      console.log('[TEST-SCAN] Production mode - verifying authentication...');

      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        console.error('[TEST-SCAN] No authorization header in production');
        return new Response(
          JSON.stringify({
            error: 'Unauthorized - Authentication required',
            message: 'This test endpoint requires admin access in production. Please include a valid authorization token.'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const token = authHeader.replace('Bearer ', '');

      // Verify the JWT and get user
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        console.error('[TEST-SCAN] Invalid token:', userError?.message);
        return new Response(
          JSON.stringify({
            error: 'Unauthorized - Invalid token',
            message: 'Your authentication token is invalid or expired.'
          }),
          {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
        _user_id: user.id
      });

      if (roleError) {
        console.error('[TEST-SCAN] Error checking user role:', roleError);
        return new Response(
          JSON.stringify({
            error: 'Authorization check failed',
            message: 'Unable to verify user permissions.'
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const isAdmin = roleData === 'admin';
      console.log(`[TEST-SCAN] User role: ${roleData}, isAdmin: ${isAdmin}`);

      if (!isAdmin) {
        console.error(`[TEST-SCAN] Unauthorized access attempt by non-admin user: ${user.email}`);
        return new Response(
          JSON.stringify({
            error: 'Forbidden - Admin access required',
            message: 'This test endpoint is restricted to admin users only in production.'
          }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`[TEST-SCAN] Admin access granted: ${user.email}`);
    } else {
      console.log('[TEST-SCAN] Development/testing mode - authentication bypassed');
    }

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