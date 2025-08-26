-- Create storage bucket for sitemap
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sitemaps', 'sitemaps', true);

-- Create RLS policies for sitemap bucket
CREATE POLICY "Public can view sitemap files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sitemaps');

CREATE POLICY "Service role can manage sitemap files" 
ON storage.objects 
FOR ALL 
TO service_role
USING (bucket_id = 'sitemaps')
WITH CHECK (bucket_id = 'sitemaps');