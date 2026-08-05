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

    // Fetch all token reports (updated_at drives lastmod — created_at made
    // pages look permanently stale to crawlers; fixed 2026-08-05)
    console.log('📊 Fetching token reports from database...');
    const { data: tokenReports, error } = await supabase
      .from('token_reports')
      .select('token_symbol, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching token reports:', error);
      throw error;
    }

    console.log(`✅ Found ${tokenReports?.length || 0} token reports`);

    // Fetch all published EN publications (missing entirely pre-2026-08-05 —
    // only 7 of 11 live articles were crawler-discoverable)
    const { data: pubRows, error: pubError } = await supabase
      .from('page_translations')
      .select('slug, updated_at, pages!inner(status, updated_at)')
      .eq('language', 'en')
      .eq('pages.status', 'published');

    if (pubError) {
      console.error('❌ Error fetching publications:', pubError);
      throw pubError;
    }

    console.log(`✅ Found ${pubRows?.length || 0} published publications`);

    // Generate sitemap XML
    const baseUrl = 'https://tokenhealthscan.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const staticPages = [
      { url: '', lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
      { url: '/token', lastmod: currentDate, changefreq: 'daily', priority: '0.9' },
      { url: '/publications', lastmod: currentDate, changefreq: 'weekly', priority: '0.9' },
      { url: '/token-scan-guide', lastmod: '2026-05-22', changefreq: 'monthly', priority: '0.8' },
      { url: '/token-sniffer-vs-tokenhealthscan', lastmod: '2026-05-22', changefreq: 'monthly', priority: '0.8' },
      { url: '/solana-launchpads', lastmod: '2026-05-22', changefreq: 'monthly', priority: '0.8' },
      { url: '/ethereum-launchpads', lastmod: '2026-05-22', changefreq: 'monthly', priority: '0.8' },
      { url: '/pricing', lastmod: '2026-05-22', changefreq: 'monthly', priority: '0.7' },
      { url: '/ai-agents', lastmod: '2026-05-22', changefreq: 'monthly', priority: '0.6' },
      { url: '/copilot', lastmod: '2026-05-22', changefreq: 'monthly', priority: '0.6' },
      { url: '/privacy', lastmod: '2026-05-22', changefreq: 'yearly', priority: '0.3' },
      { url: '/terms', lastmod: '2026-05-22', changefreq: 'yearly', priority: '0.3' },
    ];

    // Dedupe token symbols, newest first
    const seenSymbols = new Set<string>();
    const tokenPages = (tokenReports || []).filter(report => {
      const sym = (report.token_symbol || '').toLowerCase();
      if (!sym || seenSymbols.has(sym)) return false;
      seenSymbols.add(sym);
      return true;
    }).map(report => ({
      url: `/token/${report.token_symbol.toLowerCase()}`,
      lastmod: report.updated_at.split('T')[0],
      changefreq: 'weekly',
      priority: '0.7'
    }));

    const publicationPages = (pubRows || []).map((row: any) => ({
      url: `/publications/${encodeURIComponent(row.slug)}`,
      lastmod: ((row.pages?.updated_at || row.updated_at) as string).split('T')[0],
      changefreq: 'monthly',
      priority: '0.8'
    }));

    const allPages = [...staticPages, ...tokenPages, ...publicationPages];

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