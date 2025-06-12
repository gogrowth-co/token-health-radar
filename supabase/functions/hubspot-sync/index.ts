
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    scan_credits_remaining: number;
    signup_date: string;
    last_scan_date?: string;
    pro_subscriber: boolean;
  };
}

const handler = async (req: Request): Promise<Response> => {
  console.log('HubSpot sync function called at:', new Date().toISOString());
  console.log('Request method:', req.method);
  console.log('Request headers:', Object.fromEntries(req.headers.entries()));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hubspotApiKey = Deno.env.get('HUBSPOT_API_KEY');
    console.log('HubSpot API key exists:', !!hubspotApiKey);
    
    if (!hubspotApiKey) {
      console.error('HUBSPOT_API_KEY is not configured');
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
    console.log('Supabase URL exists:', !!supabaseUrl);
    console.log('Service key exists:', !!supabaseServiceKey);
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request body
    let body;
    try {
      body = await req.json();
      console.log('Request body parsed:', body);
    } catch (e) {
      console.log('No JSON body or parse error:', e.message);
      body = {};
    }
    
    const { user_id } = body;
    
    if (!user_id) {
      console.log('No user_id provided, syncing all contacts');
    } else {
      console.log('Syncing specific user:', user_id);
    }

    // Fetch contact data from our view
    let query = supabase.from('hubspot_contact_data').select('*');
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    console.log('Executing Supabase query...');
    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching contact data:', error);
      return new Response(
        JSON.stringify({ 
          error: `Database error: ${error.message}`,
          success: false
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`Found ${contacts?.length || 0} contacts to sync`);

    if (!contacts || contacts.length === 0) {
      console.log('No contacts found to sync');
      return new Response(
        JSON.stringify({ 
          message: 'No contacts found to sync',
          success: true,
          synced_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${contacts.length} contacts for HubSpot sync`);

    // Process each contact
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const contact of contacts as HubSpotContactData[]) {
      console.log(`Processing contact: ${contact.email}`);
      
      try {
        if (!contact.email) {
          console.log(`Skipping contact ${contact.user_id} - no email`);
          continue;
        }

        // First, try to find existing contact by email
        console.log(`Searching for existing contact: ${contact.email}`);
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
              properties: ['email', 'firstname', 'scan_credits_remaining', 'pro_subscriber']
            })
          }
        );

        if (!searchResponse.ok) {
          const errorText = await searchResponse.text();
          console.error(`HubSpot search error for ${contact.email}:`, searchResponse.status, errorText);
          results.push({
            email: contact.email,
            status: 'error',
            error: `Search failed: ${searchResponse.status} - ${errorText}`
          });
          errorCount++;
          continue;
        }

        const searchData = await searchResponse.json();
        console.log(`Search result for ${contact.email}:`, searchData.results?.length || 0, 'contacts found');
        
        // Prepare contact properties
        const contactProperties: HubSpotContact['properties'] = {
          email: contact.email,
          firstname: contact.name || 'Unknown',
          scan_credits_remaining: contact.scan_credits_remaining || 0,
          signup_date: new Date(contact.signup_date).toISOString().split('T')[0],
          pro_subscriber: contact.pro_subscriber || false
        };

        // Add last scan date if available
        if (contact.last_scan_date) {
          contactProperties.last_scan_date = new Date(contact.last_scan_date).toISOString().split('T')[0];
        }

        console.log(`Contact properties for ${contact.email}:`, contactProperties);

        let hubspotResponse;
        
        if (searchData.results && searchData.results.length > 0) {
          // Update existing contact
          const contactId = searchData.results[0].id;
          console.log(`Updating existing HubSpot contact: ${contact.email} (ID: ${contactId})`);
          
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
          console.log(`Creating new HubSpot contact: ${contact.email}`);
          
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
          console.error(`HubSpot API error for ${contact.email}:`, hubspotResponse.status, errorText);
          
          // Check if it's a property error and handle gracefully
          if (errorText.includes('Property') && errorText.includes('does not exist')) {
            console.log(`Retrying without custom properties for ${contact.email}`);
            
            // Retry with only standard properties
            const standardProperties = {
              email: contact.email,
              firstname: contact.name || 'Unknown'
            };

            const retryResponse = await fetch(
              searchData.results && searchData.results.length > 0 
                ? `https://api.hubapi.com/crm/v3/objects/contacts/${searchData.results[0].id}`
                : `https://api.hubapi.com/crm/v3/objects/contacts`,
              {
                method: searchData.results && searchData.results.length > 0 ? 'PATCH' : 'POST',
                headers: {
                  'Authorization': `Bearer ${hubspotApiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ properties: standardProperties })
              }
            );

            if (retryResponse.ok) {
              const responseData = await retryResponse.json();
              console.log(`Successfully synced ${contact.email} with standard properties only`);
              results.push({
                email: contact.email,
                status: 'partial_success',
                hubspot_id: responseData.id,
                note: 'Synced with standard properties only - custom properties may need to be created in HubSpot'
              });
              successCount++;
            } else {
              const retryErrorText = await retryResponse.text();
              console.error(`Retry failed for ${contact.email}:`, retryResponse.status, retryErrorText);
              results.push({
                email: contact.email,
                status: 'error',
                error: `${retryResponse.status} - ${retryErrorText}`
              });
              errorCount++;
            }
          } else {
            results.push({
              email: contact.email,
              status: 'error',
              error: `${hubspotResponse.status} - ${errorText}`
            });
            errorCount++;
          }
        } else {
          const responseData = await hubspotResponse.json();
          console.log(`Successfully synced ${contact.email} to HubSpot (ID: ${responseData.id})`);
          results.push({
            email: contact.email,
            status: 'success',
            hubspot_id: responseData.id
          });
          successCount++;
        }
      } catch (contactError) {
        console.error(`Error processing contact ${contact.email}:`, contactError);
        results.push({
          email: contact.email,
          status: 'error',
          error: contactError.message
        });
        errorCount++;
      }
    }

    console.log(`Sync completed. Success: ${successCount}, Errors: ${errorCount}`);

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
    console.error('Error in hubspot-sync function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        debug_info: {
          function_called_at: new Date().toISOString(),
          error_stack: error.stack
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
