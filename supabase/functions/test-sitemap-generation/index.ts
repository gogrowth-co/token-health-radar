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
    console.log('🚀 Testing sitemap generation system');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Test 1: Check token reports
    console.log('📊 Fetching token reports...');
    const { data: tokenReports, error: tokenError } = await supabase
      .from('token_reports')
      .select('token_symbol, created_at')
      .order('created_at', { ascending: false });

    if (tokenError) {
      console.error('❌ Error fetching token reports:', tokenError);
      throw tokenError;
    }

    console.log(`✅ Found ${tokenReports?.length || 0} token reports`);
    console.log('Token symbols:', tokenReports?.map(t => t.token_symbol).join(', '));

    // Test 2: Check storage bucket
    console.log('🗂️ Checking storage bucket...');
    const { data: bucketFiles, error: bucketError } = await supabase.storage
      .from('sitemaps')
      .list();

    if (bucketError) {
      console.error('❌ Error checking bucket:', bucketError);
    } else {
      console.log('✅ Bucket accessible, files:', bucketFiles?.length || 0);
    }

    // Test 3: Generate basic sitemap content
    console.log('📝 Generating sitemap content...');
    const baseUrl = 'https://tokenhealthscan.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const staticPages = [
      { url: '', lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
      { url: '/token', lastmod: currentDate, changefreq: 'daily', priority: '0.9' }
    ];

    const tokenPages = tokenReports?.map(report => ({
      url: `/token/${report.token_symbol.toLowerCase()}`,
      lastmod: report.created_at.split('T')[0],
      changefreq: 'weekly',
      priority: '0.7'
    })) || [];

    const allPages = [...staticPages, ...tokenPages];
    console.log(`📄 Total pages for sitemap: ${allPages.length}`);

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allPages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    console.log(`📏 Sitemap length: ${sitemap.length} characters`);

    // Test 4: Try to upload to storage
    console.log('💾 Testing storage upload...');
    
    // Remove existing file first
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
      console.error('❌ Upload error:', uploadError);
      return new Response(JSON.stringify({
        success: false,
        error: 'Upload failed',
        details: uploadError,
        sitemap_preview: sitemap.substring(0, 500) + '...'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ Upload successful:', uploadData);

    // Test 5: Verify file was created
    const { data: verifyFiles, error: verifyError } = await supabase.storage
      .from('sitemaps')
      .list();

    console.log('📋 Files after upload:', verifyFiles);

    return new Response(JSON.stringify({
      success: true,
      token_count: tokenReports?.length || 0,
      sitemap_length: sitemap.length,
      upload_data: uploadData,
      files_in_bucket: verifyFiles?.length || 0,
      sitemap_preview: sitemap.substring(0, 500) + '...'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});