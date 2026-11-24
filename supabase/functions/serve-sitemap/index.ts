import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    console.log('📡 Serving sitemap request');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download sitemap from storage
    console.log('📥 Attempting to download sitemap from storage...');
    const { data, error } = await supabase.storage
      .from('sitemaps')
      .download('sitemap.xml');

    if (error) {
      console.error('❌ Error downloading sitemap from storage:', error);
      console.log('🔄 Falling back to on-the-fly generation...');
      
      // Fallback: generate sitemap on the fly
      const { data: response, error: invokeError } = await supabase.functions.invoke('generate-sitemap');
      
      if (invokeError) {
        console.error('❌ Fallback generation failed:', invokeError);
        throw new Error(`Failed to generate fallback sitemap: ${invokeError.message}`);
      }

      console.log('✅ Fallback sitemap generated successfully');
      return new Response(response, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/xml',
          'Cache-Control': 'public, max-age=300', // Reduced cache to 5 minutes
        },
      });
    }

    console.log('✅ Sitemap downloaded from storage successfully');
    const sitemapText = await data.text();
    console.log(`📄 Sitemap content length: ${sitemapText.length} characters`);

    return new Response(sitemapText, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300', // Reduced cache to 5 minutes
        'Last-Modified': new Date().toUTCString(),
      },
    });

  } catch (error) {
    console.error('Error serving sitemap:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to serve sitemap' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});