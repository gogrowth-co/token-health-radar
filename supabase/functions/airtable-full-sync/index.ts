import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AIRTABLE_BASE_ID = 'app4JRfXh5wCJcqBj';
const AIRTABLE_TABLE_ID = 'tblnIbszxeVftpsiU';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TokenReport {
  id: string;
  token_name: string;
  token_symbol: string;
  token_address: string;
  chain_id: string;
  report_content: any;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Helper function to sleep for rate limiting
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Force refresh env var to ensure we get the latest token (v4 deployment)
  const AIRTABLE_ACCESS_TOKEN = Deno.env.get('AIRTABLE_ACCESS_TOKEN');
  
  console.log('Environment check v4:', {
    supabaseUrl: !!supabaseUrl,
    serviceKey: !!supabaseServiceKey,
    airtableToken: !!AIRTABLE_ACCESS_TOKEN,
    tokenLength: AIRTABLE_ACCESS_TOKEN?.length || 0,
    allEnvVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('AIRTABLE'))
  });

  if (!AIRTABLE_ACCESS_TOKEN) {
    console.error('AIRTABLE_ACCESS_TOKEN is not set - deployment v4');
    return new Response(
      JSON.stringify({ 
        error: 'Airtable access token not configured', 
        tokenExists: false,
        envCheck: Object.keys(Deno.env.toObject()).filter(key => key.includes('AIRTABLE')),
        version: 'v4'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  // Test Airtable connection first
  console.log('Testing Airtable API connection v4...');
  try {
    const testResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?maxRecords=1`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
        },
      }
    );

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('Airtable API test failed:', testResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Airtable API connection failed',
          status: testResponse.status,
          details: errorText,
          version: 'v4'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Airtable API connection successful v4!');
  } catch (testError: any) {
    console.error('Exception testing Airtable API:', testError);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to test Airtable API',
        details: testError.message,
        version: 'v4'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    console.log('Starting full sync from Supabase to Airtable');

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all token reports from Supabase
    const { data: tokenReports, error } = await supabase
      .from('token_reports')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching token reports from Supabase:', error);
      throw new Error(`Supabase error: ${error.message}`);
    }

    if (!tokenReports || tokenReports.length === 0) {
      console.log('No token reports found in Supabase');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No token reports to sync',
          recordsProcessed: 0 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Found ${tokenReports.length} token reports to sync`);

    // Get existing records from Airtable to check for duplicates
    console.log('Fetching existing records from Airtable...');
    const existingRecordsResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?fields[]=id`,
      {
        headers: {
          'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
        },
      }
    );

    const existingRecordsData = await existingRecordsResponse.json();
    const existingIds = new Set(
      existingRecordsData.records?.map((record: any) => record.fields.id) || []
    );

    console.log(`Found ${existingIds.size} existing records in Airtable`);

    let processedCount = 0;
    let createdCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    // Process records in batches of 10 (Airtable API limit)
    const batchSize = 10;
    for (let i = 0; i < tokenReports.length; i += batchSize) {
      const batch = tokenReports.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(tokenReports.length / batchSize)}`);

      // Prepare batch for Airtable
      const recordsToCreate = [];
      const recordsToUpdate = [];

      for (const report of batch) {
        const airtableRecord = {
          fields: {
            id: report.id,
            token_name: report.token_name,
            token_symbol: report.token_symbol,
            token_address: report.token_address,
            chain_id: report.chain_id,
            report_content: typeof report.report_content === 'object' 
              ? JSON.stringify(report.report_content) 
              : report.report_content,
            generated_by: report.generated_by,
            created_at: report.created_at,
            updated_at: report.updated_at,
          }
        };

        if (existingIds.has(report.id)) {
          recordsToUpdate.push({ id: report.id, record: airtableRecord });
        } else {
          recordsToCreate.push(airtableRecord);
        }
      }

      // Create new records
      if (recordsToCreate.length > 0) {
        try {
          const createResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ records: recordsToCreate }),
            }
          );

          if (createResponse.ok) {
            const createResult = await createResponse.json();
            createdCount += createResult.records?.length || 0;
            console.log(`Created ${createResult.records?.length || 0} new records`);
          } else {
            const errorText = await createResponse.text();
            console.error('Error creating records:', errorText);
            errorCount += recordsToCreate.length;
          }
        } catch (error) {
          console.error('Exception creating records:', error);
          errorCount += recordsToCreate.length;
        }
      }

      // Update existing records
      for (const { id, record } of recordsToUpdate) {
        try {
          // First find the Airtable record ID
          const findResponse = await fetch(
            `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula={id}="${id}"`,
            {
              headers: {
                'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
              },
            }
          );

          const findData = await findResponse.json();
          
          if (findData.records && findData.records.length > 0) {
            const airtableRecordId = findData.records[0].id;
            
            const updateResponse = await fetch(
              `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${airtableRecordId}`,
              {
                method: 'PATCH',
                headers: {
                  'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(record),
              }
            );

            if (updateResponse.ok) {
              updatedCount++;
            } else {
              const errorText = await updateResponse.text();
              console.error(`Error updating record ${id}:`, errorText);
              errorCount++;
            }
          } else {
            console.error(`Record ${id} not found in Airtable for update`);
            errorCount++;
          }

          // Add small delay to respect rate limits
          await sleep(100);
        } catch (error) {
          console.error(`Exception updating record ${id}:`, error);
          errorCount++;
        }
      }

      processedCount += batch.length;

      // Add delay between batches to respect rate limits
      if (i + batchSize < tokenReports.length) {
        await sleep(200);
      }
    }

    const result = {
      success: true,
      message: 'Full sync completed',
      totalRecords: tokenReports.length,
      recordsProcessed: processedCount,
      recordsCreated: createdCount,
      recordsUpdated: updatedCount,
      errors: errorCount,
      timestamp: new Date().toISOString(),
    };

    console.log('Full sync completed:', result);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in airtable-full-sync function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);