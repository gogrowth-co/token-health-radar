import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== AIRTABLE DEBUG TEST v3 ===');

    // SECURITY: Verify JWT and check admin role
    console.log('[DEBUG-AIRTABLE] Verifying authentication...');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[DEBUG-AIRTABLE] No authorization header provided');
      return new Response(
        JSON.stringify({
          error: 'Unauthorized - Authentication required',
          message: 'This endpoint requires admin access. Please include a valid authorization token.'
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
      console.error('[DEBUG-AIRTABLE] Invalid token:', userError?.message);
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

    console.log(`[DEBUG-AIRTABLE] User authenticated: ${user.id} (${user.email})`);

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
      _user_id: user.id
    });

    if (roleError) {
      console.error('[DEBUG-AIRTABLE] Error checking user role:', roleError);
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
    console.log(`[DEBUG-AIRTABLE] User role: ${roleData}, isAdmin: ${isAdmin}`);

    if (!isAdmin) {
      console.error(`[DEBUG-AIRTABLE] Unauthorized access attempt by non-admin user: ${user.email}`);
      return new Response(
        JSON.stringify({
          error: 'Forbidden - Admin access required',
          message: 'This endpoint is restricted to admin users only.'
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[DEBUG-AIRTABLE] Admin access granted: ${user.email}`);
    
    // Get the token directly from environment
    const airtableToken = Deno.env.get('AIRTABLE_ACCESS_TOKEN');
    
    console.log('Environment check:', {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      AIRTABLE_ACCESS_TOKEN: !!airtableToken,
      tokenLength: airtableToken?.length || 0
    });
    
    if (!airtableToken) {
      console.error('AIRTABLE_ACCESS_TOKEN not found in environment');
      return new Response(
        JSON.stringify({ 
          error: 'AIRTABLE_ACCESS_TOKEN not configured',
          tokenExists: false,
          envVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('AIRTABLE'))
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test Airtable API connection
    console.log('Testing Airtable API connection...');
    const testResponse = await fetch(
      'https://api.airtable.com/v0/app4JRfXh5wCJcqBj/tblnIbszxeVftpsiU?maxRecords=1',
      {
        headers: {
          'Authorization': `Bearer ${airtableToken}`,
        },
      }
    );

    console.log('Airtable API Response Status:', testResponse.status);
    
    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('Airtable API Error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Airtable API test failed',
          status: testResponse.status,
          details: errorText,
          tokenExists: true
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const testData = await testResponse.json();
    console.log('Airtable API Test Success. Records found:', testData.records?.length || 0);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Airtable connection successful',
        tokenExists: true,
        apiWorking: true,
        existingRecords: testData.records?.length || 0,
        testData: testData,
        requestedBy: user.email,
        requestedAt: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in debug test:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: 'An unexpected error occurred during the Airtable debug test.',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);