import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { privilegedAccess } from "../_shared/adminAccess.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-secret, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const access = await privilegedAccess(req, supabase);
    if (!access.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: 'Admin or internal authorization required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: access.status }
      );
    }

    console.log('Starting test webhook send...');
    
    // Latest token report data
    const latestTokenReport = {
      "id": "23d54bab-f930-4d5a-8132-3091ce190ee9",
      "token_name": "Aerodrome",
      "token_symbol": "AERO",
      "token_address": "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
      "chain_id": "0x2105",
      "report_content": {
        "metadata": {
          "chainId": "0x2105",
          "currentPrice": 1.3626847604723464,
          "generatedAt": "2025-08-26T20:15:35.821Z",
          "generatedBy": "ai",
          "marketCap": 1207106846.38,
          "overallScore": 68,
          "scores": {
            "community": 70,
            "development": 65,
            "liquidity": 55,
            "security": 69,
            "tokenomics": 81
          },
          "tokenAddress": "0x940181a94a35a4569e4529a3cdfb74e38fd98631",
          "tokenName": "Aerodrome",
          "tokenSymbol": "AERO"
        }
      },
      "generated_by": "a97608f8-5df3-4780-9832-d15cbe8414ac",
      "created_at": "2025-08-26T20:15:36.229447+00:00",
      "updated_at": null
    };

    console.log('Sending data to Make.com webhook...');

    const makeWebhookUrl = Deno.env.get('MAKE_WEBHOOK_URL');
    if (!makeWebhookUrl) {
      console.error('MAKE_WEBHOOK_URL secret not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook endpoint not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 503 }
      );
    }

    // Send to Make.com webhook
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...latestTokenReport,
        webhook_triggered_at: new Date().toISOString(),
        source: 'manual_test_via_edge_function'
      })
    });

    console.log(`Make.com response status: ${response.status}`);
    
    await response.text().catch(() => '');
    
    if (response.ok) {
      console.log('✅ Successfully sent to Make.com webhook!');
      return new Response(JSON.stringify({ 
        success: true, 
        status: response.status
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      console.error('❌ Make.com webhook failed:', response.status, response.statusText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Webhook delivery failed'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 502
      });
    }
    
  } catch (error) {
    console.error('❌ Error sending to Make.com:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Webhook delivery failed' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});