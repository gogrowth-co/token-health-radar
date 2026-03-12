import { createClient } from '@supabase/supabase-js';

// Use environment variables — never hardcode credentials.
// Set SUPABASE_URL and SUPABASE_ANON_KEY in the Vercel/Netlify dashboard.
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

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