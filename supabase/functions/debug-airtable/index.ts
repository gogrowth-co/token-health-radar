import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AIRTABLE_ACCESS_TOKEN = Deno.env.get('AIRTABLE_ACCESS_TOKEN');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== AIRTABLE DEBUG TEST v2 ===');
    console.log('All env vars check:', {
      SUPABASE_URL: !!Deno.env.get('SUPABASE_URL'),
      SUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      AIRTABLE_ACCESS_TOKEN: !!AIRTABLE_ACCESS_TOKEN
    });
    console.log('Token exists:', !!AIRTABLE_ACCESS_TOKEN);
    console.log('Token length:', AIRTABLE_ACCESS_TOKEN?.length || 0);
    
    // Force refresh env var
    const freshToken = Deno.env.get('AIRTABLE_ACCESS_TOKEN');
    console.log('Fresh token check:', !!freshToken, freshToken?.length || 0);
    
    const activeToken = freshToken || AIRTABLE_ACCESS_TOKEN;
    
    if (!activeToken) {
      console.error('AIRTABLE_ACCESS_TOKEN not found in environment - both checks failed');
      return new Response(
        JSON.stringify({ 
          error: 'AIRTABLE_ACCESS_TOKEN not configured',
          tokenExists: false,
          freshTokenExists: !!freshToken,
          originalTokenExists: !!AIRTABLE_ACCESS_TOKEN
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Test Airtable API connection
    console.log('Testing Airtable API connection with active token...');
    const testResponse = await fetch(
      'https://api.airtable.com/v0/app4JRfXh5wCJcqBj/tblnIbszxeVftpsiU?maxRecords=1',
      {
        headers: {
          'Authorization': `Bearer ${activeToken}`,
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
        tokenExists: !!AIRTABLE_ACCESS_TOKEN
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);