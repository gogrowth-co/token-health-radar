
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { adminAccess } from "../_shared/adminAccess.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HubSpotContactData {
  user_id: string;
  email: string;
  name: string;
  signup_date: string;
  scan_credits_remaining: number;
  pro_subscriber: boolean;
  last_scan_date: string | null;
  plan: string;
  scans_used: number;
  pro_scan_limit: number;
}

interface HubSpotContact {
  properties: {
    email: string;
    firstname: string;
    scan_credits_remaining?: number;
    signup_date?: string;
    last_scan_date?: string;
    pro_subscriber?: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log('🚀 HubSpot sync function called at:', new Date().toISOString());
  console.log('📋 Request method:', req.method);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('⚡ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const db = createClient(Deno.env.get('SUPABASE_URL') || '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '');
    const access = await adminAccess(req, db);
    if (!access.allowed) return new Response(JSON.stringify({ error: 'Unauthorized', success: false }), { status: access.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const hubspotApiKey = Deno.env.get('HUBSPOT_API_KEY');
    console.log('🔑 HubSpot API key configured:', !!hubspotApiKey);
    
    if (!hubspotApiKey) {
      console.error('❌ HUBSPOT_API_KEY is not configured');
      return new Response(
        JSON.stringify({ 
          error: 'HUBSPOT_API_KEY is not configured',
          success: false
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    console.log('📊 Supabase connection configured:', !!supabaseUrl && !!supabaseServiceKey);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request body
    let body;
    try {
      body = await req.json();
      console.log('Request body parsed');
    } catch (e) {
      console.log('📝 No JSON body provided, proceeding with bulk sync');
      body = {};
    }
    
    const { user_id, test } = body;
    
    // Handle test requests
    if (test) {
      console.log('🧪 Test request received');
      return new Response(
        JSON.stringify({
          message: 'HubSpot sync function is working',
          success: true,
          timestamp: new Date().toISOString(),
          hubspot_api_configured: !!hubspotApiKey
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!user_id) {
      console.log('📢 No user_id provided, syncing all contacts');
    } else {
      console.log('👤 Syncing specific user:', user_id);
    }

    // Fetch contact data from our view
    let query = supabase.from('hubspot_contact_data').select('*');
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    console.log('🔍 Executing Supabase query...');
    const { data: contacts, error } = await query;

    if (error) {
      console.error('❌ Error fetching contact data:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Contact data unavailable',
          success: false
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`📊 Found ${contacts?.length || 0} contacts to sync`);

    if (!contacts || contacts.length === 0) {
      console.log('⚠️ No contacts found to sync');
      return new Response(
        JSON.stringify({ 
          message: 'No contacts found to sync',
          success: true,
          synced_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🔄 Processing ${contacts.length} contacts for HubSpot sync`);

    // Process each contact
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const contact of contacts as HubSpotContactData[]) {
      console.log('Processing contact');
      
      try {
        if (!contact.email) {
          console.log(`⚠️ Skipping contact ${contact.user_id} - no email`);
          continue;
        }

        // First, try to find existing contact by email
        console.log('Searching for existing contact');
        const searchResponse = await fetch(
          `https://api.hubapi.com/crm/v3/objects/contacts/search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${hubspotApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filterGroups: [{
                filters: [{
                  propertyName: 'email',
                  operator: 'EQ',
                  value: contact.email
                }]
              }],
              properties: ['email', 'firstname']
            })
          }
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error('HubSpot search failed', searchResponse.status);
          results.push({
            email: contact.email,
            status: 'error',
            error: 'Contact search failed'
          });
          errorCount++;
          continue;
        }

        const searchData = await searchResponse.json();
        console.log('Contacts found:', searchData.results?.length || 0);
        
        // Prepare contact properties - using only standard properties to avoid custom property errors
        const contactProperties: HubSpotContact['properties'] = {
          email: contact.email,
          firstname: contact.name || contact.email.split('@')[0] || 'User'
        };

        console.log('Contact properties prepared');

        let hubspotResponse;
        
        if (searchData.results && searchData.results.length > 0) {
          // Update existing contact
          const contactId = searchData.results[0].id;
          console.log('Updating existing contact');
          
          hubspotResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${hubspotApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ properties: contactProperties })
            }
          );
        } else {
          // Create new contact
          console.log('Creating contact');
          
          hubspotResponse = await fetch(
            `https://api.hubapi.com/crm/v3/objects/contacts`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${hubspotApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ properties: contactProperties })
            }
          );
        }

        if (!hubspotResponse.ok) {
          const errorText = await hubspotResponse.text();
          console.error('HubSpot request failed', hubspotResponse.status);
          results.push({
            email: contact.email,
            status: 'error',
            error: 'Contact sync failed'
          });
          errorCount++;
        } else {
          const responseData = await hubspotResponse.json();
          console.log('Contact synced successfully');
          results.push({
            email: contact.email,
            status: 'success',
            hubspot_id: responseData.id
          });
          successCount++;
        }
      } catch (contactError) {
        console.error('Contact processing failed');
        results.push({
          email: contact.email,
          status: 'error',
          error: 'Contact processing failed'
        });
        errorCount++;
      }
    }

    console.log(`🎉 Sync completed. Success: ${successCount}, Errors: ${errorCount}`);

    return new Response(
      JSON.stringify({
        message: `Processed ${contacts.length} contacts`,
        success: true,
        synced_count: successCount,
        error_count: errorCount,
        results: results,
        debug_info: {
          function_called_at: new Date().toISOString(),
          total_contacts_found: contacts.length,
          hubspot_api_key_configured: !!hubspotApiKey
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('HubSpot sync failed');
    return new Response(
      JSON.stringify({ 
        error: 'Contact sync failed',
        success: false
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
