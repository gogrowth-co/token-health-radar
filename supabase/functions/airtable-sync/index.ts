import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AIRTABLE_ACCESS_TOKEN = Deno.env.get('AIRTABLE_ACCESS_TOKEN');
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

interface SyncRequest {
  operation: 'INSERT' | 'UPDATE';
  record: TokenReport;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!AIRTABLE_ACCESS_TOKEN) {
    console.error('AIRTABLE_ACCESS_TOKEN is not set');
    return new Response(
      JSON.stringify({ error: 'Airtable access token not configured' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const { operation, record }: SyncRequest = await req.json();
    
    console.log(`Syncing ${operation} operation for token_reports record:`, record.id);

    // Prepare the record for Airtable
    const airtableRecord = {
      fields: {
        id: record.id,
        token_name: record.token_name,
        token_symbol: record.token_symbol,
        token_address: record.token_address,
        chain_id: record.chain_id,
        report_content: typeof record.report_content === 'object' 
          ? JSON.stringify(record.report_content) 
          : record.report_content,
        generated_by: record.generated_by,
        created_at: record.created_at,
        updated_at: record.updated_at,
      }
    };

    let airtableResponse;

    if (operation === 'INSERT') {
      // Create new record in Airtable
      airtableResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(airtableRecord),
        }
      );
    } else if (operation === 'UPDATE') {
      // First, find the record by the id field
      const findResponse = await fetch(
        `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula={id}="${record.id}"`,
        {
          headers: {
            'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
          },
        }
      );

      const findData = await findResponse.json();
      
      if (findData.records && findData.records.length > 0) {
        const airtableRecordId = findData.records[0].id;
        
        // Update existing record
        airtableResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${airtableRecordId}`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(airtableRecord),
          }
        );
      } else {
        // Record doesn't exist, create it instead
        console.log(`Record ${record.id} not found in Airtable, creating new record`);
        airtableResponse = await fetch(
          `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${AIRTABLE_ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(airtableRecord),
          }
        );
      }
    }

    if (!airtableResponse.ok) {
      const errorText = await airtableResponse.text();
      console.error('Airtable API error:', errorText);
      throw new Error(`Airtable API error: ${airtableResponse.status} - ${errorText}`);
    }

    const result = await airtableResponse.json();
    console.log(`Successfully synced ${operation} for record ${record.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        operation,
        recordId: record.id,
        airtableResult: result 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in airtable-sync function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

serve(handler);