import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download sitemap from storage
    const { data, error } = await supabase.storage
      .from('sitemaps')
      .download('sitemap.xml');

    if (error) {
      console.error('Error downloading sitemap from storage:', error);
      // Fallback: generate sitemap on the fly
      const { data: response, error: invokeError } = await supabase.functions.invoke('generate-sitemap');
      
      if (invokeError) {
        throw new Error(`Failed to generate fallback sitemap: ${invokeError.message}`);
      }

      return new Response(response, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        },
      });
    }

    const sitemapText = await data.text();

    return new Response(sitemapText, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Error serving sitemap:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});