import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== AIRTABLE DEBUG TEST v3 ===');
    
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
        testData: testData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in debug test:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        tokenExists: !!airtableToken
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);