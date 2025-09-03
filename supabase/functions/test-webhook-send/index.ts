import { serve } from "https://deno.land/std@0.208.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    
    // Send to Make.com webhook
    const response = await fetch('https://hook.us2.make.com/6agypb495rymylvki6b0iw9iofu6pkds', {
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
    
    const result = await response.text();
    console.log(`Make.com response: ${result}`);
    
    if (response.ok) {
      console.log('✅ Successfully sent to Make.com webhook!');
      return new Response(JSON.stringify({ 
        success: true, 
        status: response.status,
        makeResponse: result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    } else {
      console.error('❌ Make.com webhook failed:', response.status, response.statusText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Webhook failed: ${response.status} ${response.statusText}`,
        makeResponse: result 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }
    
  } catch (error) {
    console.error('❌ Error sending to Make.com:', error.message);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});