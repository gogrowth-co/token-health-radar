import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qaqebpcqespvzbfwawlp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3ODkxNzEsImV4cCI6MjA2MzM2NTE3MX0.11hoagaFRKXswTNtXTwDM4NDHpPMO5EDEUhyFS3N8v4';

export default async function handler(req: any, res: any) {
  try {
    console.log('🗺️ Serving sitemap via Vercel API');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Try to get sitemap from Supabase Storage first
    console.log('📥 Attempting to download sitemap from storage...');
    const { data, error } = await supabase.storage
      .from('sitemaps')
      .download('sitemap.xml');

    if (error) {
      console.error('❌ Error downloading sitemap from storage:', error);
      console.log('🔄 Generating sitemap on-the-fly...');
      
      // Fallback: generate sitemap on the fly
      const { data: response, error: invokeError } = await supabase.functions.invoke('generate-sitemap');
      
      if (invokeError) {
        console.error('❌ Fallback generation failed:', invokeError);
        throw new Error(`Failed to generate fallback sitemap: ${invokeError.message}`);
      }

      console.log('✅ Fallback sitemap generated successfully');
      
      res.setHeader('Content-Type', 'application/xml');
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
      res.status(200).send(response);
      return;
    }

    console.log('✅ Sitemap downloaded from storage successfully');
    const sitemapText = await data.text();
    console.log(`📄 Sitemap content length: ${sitemapText.length} characters`);

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes cache
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.status(200).send(sitemapText);

  } catch (error: any) {
    console.error('Error serving sitemap:', error);
    res.status(500).json({ error: error.message });
  }
}