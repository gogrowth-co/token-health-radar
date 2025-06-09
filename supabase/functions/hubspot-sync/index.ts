
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
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const hubspotApiKey = Deno.env.get('HUBSPOT_API_KEY');
    if (!hubspotApiKey) {
      throw new Error('HUBSPOT_API_KEY is not configured');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the request body
    const { user_id } = await req.json();
    
    if (!user_id) {
      console.log('No user_id provided, syncing all contacts');
    }

    // Fetch contact data from our view
    let query = supabase.from('hubspot_contact_data').select('*');
    
    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    const { data: contacts, error } = await query;

    if (error) {
      console.error('Error fetching contact data:', error);
      throw error;
    }

    if (!contacts || contacts.length === 0) {
      console.log('No contacts found to sync');
      return new Response(
        JSON.stringify({ message: 'No contacts found to sync' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Syncing ${contacts.length} contacts to HubSpot`);

    // Process each contact
    const results = [];
    for (const contact of contacts as HubSpotContactData[]) {
      try {
        // First, try to find existing contact by email
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

        const searchData = await searchResponse.json();
        
        // Prepare contact properties
        const contactProperties: HubSpotContact['properties'] = {
          email: contact.email,
          firstname: contact.name,
          scan_credits_remaining: contact.scan_credits_remaining,
          signup_date: new Date(contact.signup_date).toISOString().split('T')[0], // Format as YYYY-MM-DD
          pro_subscriber: contact.pro_subscriber
        };

        // Add last scan date if available
        if (contact.last_scan_date) {
          contactProperties.last_scan_date = new Date(contact.last_scan_date).toISOString().split('T')[0];
        }

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
          console.error(`HubSpot API error for ${contact.email}:`, errorText);
          results.push({
            email: contact.email,
            status: 'error',
            error: errorText
          });
        } else {
          const responseData = await hubspotResponse.json();
          console.log(`Successfully synced ${contact.email} to HubSpot`);
          results.push({
            email: contact.email,
            status: 'success',
            hubspot_id: responseData.id
          });
        }
      } catch (contactError) {
        console.error(`Error processing contact ${contact.email}:`, contactError);
        results.push({
          email: contact.email,
          status: 'error',
          error: contactError.message
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${contacts.length} contacts`,
        results: results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Error in hubspot-sync function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);
