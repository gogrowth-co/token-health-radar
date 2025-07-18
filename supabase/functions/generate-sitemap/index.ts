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

    // Fetch all token reports
    const { data: tokenReports, error } = await supabase
      .from('token_reports')
      .select('token_symbol, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching token reports:', error);
      throw error;
    }

    // Generate sitemap XML
    const baseUrl = 'https://tokenhealthscan.com';
    const currentDate = new Date().toISOString().split('T')[0];
    
    const staticPages = [
      { url: '', lastmod: '2025-06-20', changefreq: 'daily', priority: '1.0' },
      { url: '/token-scan-guide', lastmod: '2025-06-20', changefreq: 'weekly', priority: '0.8' },
      { url: '/token-sniffer-vs-tokenhealthscan', lastmod: '2025-06-23', changefreq: 'weekly', priority: '0.8' },
      { url: '/solana-launchpads', lastmod: '2025-06-25', changefreq: 'weekly', priority: '0.8' },
      { url: '/ethereum-launchpads', lastmod: '2025-01-15', changefreq: 'weekly', priority: '0.8' },
      { url: '/token', lastmod: currentDate, changefreq: 'daily', priority: '0.9' },
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

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
      },
    });

  } catch (error) {
    console.error('Error generating sitemap:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});