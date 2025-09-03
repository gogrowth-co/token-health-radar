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