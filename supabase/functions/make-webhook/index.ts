import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenReport {
  id: string;
  token_name: string;
  token_symbol: string;
  token_address: string;
  chain_id: string;
  report_content: any;
  generated_by: string;
  created_at: string;
  updated_at: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Make.com webhook triggered');
    
    // Check if this is a test request
    if (req.url.includes('test=true')) {
      console.log('Test mode - sending latest token report');
      
      const testRecord = {
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
      
      // Send test data directly to Make.com
      const response = await fetch('https://hook.us2.make.com/6agypb495rymylvki6b0iw9iofu6pkds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...testRecord,
          webhook_triggered_at: new Date().toISOString(),
          source: 'manual_test'
        })
      });

      const result = await response.text();
      console.log('Make.com test response:', result);

      return new Response(
        JSON.stringify({ 
          success: response.ok, 
          message: 'Test data sent to Make.com',
          makeResponse: result,
          status: response.status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }
    
    const { record } = await req.json();
    console.log('Received record:', record);

    // Make.com webhook URL
    const makeWebhookUrl = 'https://hook.us2.make.com/6agypb495rymylvki6b0iw9iofu6pkds';

    // Send data to Make.com
    const response = await fetch(makeWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...record,
        webhook_triggered_at: new Date().toISOString(),
        source: 'token_health_scan'
      })
    });

    if (!response.ok) {
      throw new Error(`Make.com webhook failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.text();
    console.log('Make.com webhook response:', result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Data sent to Make.com successfully',
        makeResponse: result 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in Make.com webhook:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});