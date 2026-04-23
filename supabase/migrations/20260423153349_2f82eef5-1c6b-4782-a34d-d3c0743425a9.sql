-- Create public storage bucket for per-route SEO/AEO HTML snapshots.
-- Snapshots are publicly readable (so the Cloudflare Worker and Supabase
-- edge function can serve them to bots without auth) but only the service
-- role may write/update/delete them.

INSERT INTO storage.buckets (id, name, public)
VALUES ('seo-snapshots', 'seo-snapshots', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Public read access
DROP POLICY IF EXISTS "SEO snapshots are publicly readable" ON storage.objects;
CREATE POLICY "SEO snapshots are publicly readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'seo-snapshots');

-- Writes restricted to service role (edge functions running with service key)
DROP POLICY IF EXISTS "Service role can insert SEO snapshots" ON storage.objects;
CREATE POLICY "Service role can insert SEO snapshots"
ON storage.objects
FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'seo-snapshots');

DROP POLICY IF EXISTS "Service role can update SEO snapshots" ON storage.objects;
CREATE POLICY "Service role can update SEO snapshots"
ON storage.objects
FOR UPDATE
TO service_role
USING (bucket_id = 'seo-snapshots');

DROP POLICY IF EXISTS "Service role can delete SEO snapshots" ON storage.objects;
CREATE POLICY "Service role can delete SEO snapshots"
ON storage.objects
FOR DELETE
TO service_role
USING (bucket_id = 'seo-snapshots');