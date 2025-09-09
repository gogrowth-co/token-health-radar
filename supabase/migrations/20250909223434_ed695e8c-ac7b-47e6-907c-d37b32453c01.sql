-- Ensure sitemaps bucket has proper permissions
UPDATE storage.buckets 
SET public = true 
WHERE id = 'sitemaps';

-- Create storage policies for sitemaps bucket
INSERT INTO storage.objects (bucket_id, name, owner, metadata) 
VALUES ('sitemaps', '.keep', null, '{}') 
ON CONFLICT DO NOTHING;

-- Allow public read access to sitemaps
CREATE POLICY IF NOT EXISTS "Public read access to sitemaps" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sitemaps');

-- Allow service role to manage sitemaps
CREATE POLICY IF NOT EXISTS "Service role can manage sitemaps" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'sitemaps' AND auth.role() = 'service_role');

-- Allow authenticated users to upload sitemaps
CREATE POLICY IF NOT EXISTS "Authenticated users can upload sitemaps" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sitemaps' AND auth.role() = 'service_role');