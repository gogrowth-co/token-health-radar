-- Ensure sitemaps bucket is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'sitemaps';

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access to sitemaps" ON storage.objects;
DROP POLICY IF EXISTS "Service role can manage sitemaps" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload sitemaps" ON storage.objects;

-- Create new policies
CREATE POLICY "Public read access to sitemaps" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'sitemaps');

CREATE POLICY "Service role can manage sitemaps" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'sitemaps');

CREATE POLICY "Service role can upload sitemaps" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'sitemaps');