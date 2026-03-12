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
    console.log('🚀 Sitemap generation started');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all token reports
    console.log('📊 Fetching token reports from database...');
    const { data: tokenReports, error } = await supabase
      .from('token_reports')
      .select('token_symbol, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching token reports:', error);
      throw error;
    }

    console.log(`✅ Found ${tokenReports?.length || 0} token reports`);

    // Generate sitemap XML
    const baseUrl = 'https://tokenhealthscan.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const staticPages = [
      { url: '', lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
      { url: '/token', lastmod: currentDate, changefreq: 'daily', priority: '0.9' },
      { url: '/token-scan-guide', lastmod: '2025-06-20', changefreq: 'weekly', priority: '0.8' },
      { url: '/token-sniffer-vs-tokenhealthscan', lastmod: '2025-06-23', changefreq: 'weekly', priority: '0.8' },
      { url: '/solana-launchpads', lastmod: '2025-06-25', changefreq: 'weekly', priority: '0.8' },
      { url: '/ethereum-launchpads', lastmod: '2025-01-15', changefreq: 'weekly', priority: '0.8' },
      { url: '/pricing', lastmod: '2025-06-20', changefreq: 'monthly', priority: '0.7' },
      { url: '/ai-agents', lastmod: '2025-06-20', changefreq: 'monthly', priority: '0.6' },
      { url: '/copilot', lastmod: '2025-06-20', changefreq: 'monthly', priority: '0.6' },
      { url: '/privacy', lastmod: '2025-06-20', changefreq: 'yearly', priority: '0.3' },
      { url: '/terms', lastmod: '2025-06-20', changefreq: 'yearly', priority: '0.3' },
    ];

    const tokenPages = tokenReports?.map(report => ({
      url: `/token/${report.token_symbol.toLowerCase()}`,
      lastmod: report.created_at.split('T')[0],
      changefreq: 'weekly',
      priority: '0.7'
    })) || [];

    const allPages = [...staticPages, ...tokenPages];

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    // Save sitemap to storage bucket with enhanced error handling
    console.log('💾 Uploading sitemap to storage bucket...');
    console.log(`📝 Sitemap content length: ${sitemap.length} characters`);
    
    // First, try to remove the existing file to avoid conflicts
    await supabase.storage
      .from('sitemaps')
      .remove(['sitemap.xml']);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('sitemaps')
      .upload('sitemap.xml', new Blob([sitemap], { type: 'application/xml' }), {
        contentType: 'application/xml',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Error uploading sitemap to storage:', uploadError);
      console.error('Upload error details:', JSON.stringify(uploadError, null, 2));
      throw new Error(`Failed to upload sitemap: ${uploadError.message}`);
    } else {
      console.log('✅ Sitemap successfully uploaded to storage');
      console.log('Upload details:', JSON.stringify(uploadData, null, 2));
    }

    console.log('🎉 Sitemap generation completed successfully');
    
    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('❌ Critical error generating sitemap:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        function: 'generate-sitemap'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});