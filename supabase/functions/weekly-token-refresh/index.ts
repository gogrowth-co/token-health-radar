import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RefreshSummary {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ token: string; error: string }>;
  reportsRegenerated?: number;
  reportsFailed?: number;
  startTime: string;
  endTime: string;
  duration: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date();
  console.log(`[WEEKLY-REFRESH] Starting weekly token refresh at ${startTime.toISOString()}`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all token reports
    const { data: tokenReports, error: fetchError } = await supabase
      .from('token_reports')
      .select('token_address, chain_id, token_symbol, token_name');

    if (fetchError) {
      console.error('[WEEKLY-REFRESH] Error fetching token reports:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch token reports' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[WEEKLY-REFRESH] Found ${tokenReports?.length || 0} tokens to refresh`);

    const summary: RefreshSummary = {
      total: tokenReports?.length || 0,
      successful: 0,
      failed: 0,
      errors: [],
      startTime: startTime.toISOString(),
      endTime: '',
      duration: 0,
    };

    // Process each token
    if (tokenReports && tokenReports.length > 0) {
      for (const token of tokenReports) {
        console.log(`[WEEKLY-REFRESH] Processing ${token.token_symbol} (${token.token_address}) on chain ${token.chain_id}`);

        try {
          // Call run-token-scan with force_refresh
          const { data, error } = await supabase.functions.invoke('run-token-scan', {
            body: {
              token_address: token.token_address.toLowerCase(),
              chain_id: token.chain_id,
              force_refresh: true,
              user_id: null, // Automated system refresh
              batch_mode: true, // Indicate this is part of a batch operation
            },
          });

          if (error || !data?.success) {
            console.error(`[WEEKLY-REFRESH] Failed to refresh ${token.token_symbol}:`, error || data?.error);
            summary.failed++;
            summary.errors.push({
              token: `${token.token_symbol} (${token.token_address})`,
              error: error?.message || data?.error || 'Unknown error',
            });
          } else {
            console.log(`[WEEKLY-REFRESH] Successfully refreshed ${token.token_symbol}`);
            summary.successful++;
          }
        } catch (error: any) {
          console.error(`[WEEKLY-REFRESH] Exception refreshing ${token.token_symbol}:`, error);
          summary.failed++;
          summary.errors.push({
            token: `${token.token_symbol} (${token.token_address})`,
            error: error.message || 'Exception during refresh',
          });
        }

        // Delay to avoid rate limiting (3 seconds between tokens)
        await new Delayer(3000);
      }
    }

    // After all scans complete, regenerate reports with updated data
    console.log('[WEEKLY-REFRESH] Starting report regeneration for all tokens...');
    let reportsRegenerated = 0;
    let reportsFailed = 0;

    if (tokenReports && tokenReports.length > 0) {
      for (const token of tokenReports) {
        console.log(`[WEEKLY-REFRESH] Regenerating report for ${token.token_symbol}`);

        try {
          const response = await fetch(
            `${supabaseUrl}/functions/v1/generate-token-report`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                tokenAddress: token.token_address,
                chainId: token.chain_id,
              }),
            }
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`[WEEKLY-REFRESH] Failed to regenerate report for ${token.token_symbol}: ${errorText}`);
            reportsFailed++;
          } else {
            console.log(`[WEEKLY-REFRESH] Successfully regenerated report for ${token.token_symbol}`);
            reportsRegenerated++;
          }
        } catch (error: any) {
          console.error(`[WEEKLY-REFRESH] Exception regenerating report for ${token.token_symbol}:`, error);
          reportsFailed++;
        }

        // Rate limiting - 5 seconds between report generations
        await Delayer(5000);
      }
    }

    console.log(`[WEEKLY-REFRESH] Report regeneration complete: ${reportsRegenerated} successful, ${reportsFailed} failed`);

    // After all scans and report regeneration complete, trigger sitemap regeneration
    console.log('[WEEKLY-REFRESH] Triggering sitemap regeneration...');
    try {
      await supabase.functions.invoke('generate-sitemap', {
        body: {
          trigger_source: 'weekly_refresh',
          timestamp: new Date().toISOString(),
        },
      });
      console.log('[WEEKLY-REFRESH] Sitemap regeneration triggered successfully');
    } catch (error: any) {
      console.error('[WEEKLY-REFRESH] Failed to trigger sitemap regeneration:', error);
      // Don't fail the whole operation if sitemap generation fails
    }

    const endTime = new Date();
    summary.endTime = endTime.toISOString();
    summary.duration = endTime.getTime() - startTime.getTime();
    summary.reportsRegenerated = reportsRegenerated;
    summary.reportsFailed = reportsFailed;

    console.log('[WEEKLY-REFRESH] Refresh complete:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        message: `Refreshed ${summary.successful}/${summary.total} tokens and regenerated ${reportsRegenerated}/${summary.total} reports successfully`,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[WEEKLY-REFRESH] Fatal error during weekly refresh:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Unknown error during weekly refresh',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Helper function to delay execution
function Delayer(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
