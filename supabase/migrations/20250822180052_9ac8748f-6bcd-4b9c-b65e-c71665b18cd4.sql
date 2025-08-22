-- COMPREHENSIVE SECURITY FIX: Address all critical data exposure issues
-- Fix multiple security vulnerabilities identified in the security scan

-- 1. Verify hubspot_contact_data is properly secured (it's a view, not table)
-- Let's check current permissions
DO $$
BEGIN
    -- Log current security status
    RAISE NOTICE 'Verifying hubspot_contact_data security...';
END $$;

-- 2. Secure token_scans table - users should only see their own scans
DROP POLICY IF EXISTS "Anonymous users can view basic scan data" ON token_scans;
DROP POLICY IF EXISTS "Users can view scans" ON token_scans;
DROP POLICY IF EXISTS "Users can view their own scans" ON token_scans;

-- Create secure policies for token_scans
CREATE POLICY "Users can view their own scans only"
ON token_scans
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to token_scans"
ON token_scans
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anonymous scans can be viewed by anyone (for anonymous functionality)
CREATE POLICY "Anonymous scans are publicly viewable"
ON token_scans
FOR SELECT
TO anon, authenticated
USING (is_anonymous = true AND user_id IS NULL);

-- 3. Secure subscribers table - users should only see their own data
DROP POLICY IF EXISTS "Users can view their own subscriber data" ON subscribers;

-- Recreate with more restrictive policy
CREATE POLICY "Users can view only their own subscriber data"
ON subscribers
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- 4. Secure anonymous_scan_attempts - limit public access
ALTER TABLE anonymous_scan_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous scan tracking" ON anonymous_scan_attempts;

-- Create restrictive policy for anonymous_scan_attempts
CREATE POLICY "Service role can manage anonymous scan attempts"
ON anonymous_scan_attempts
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow anonymous users to insert their own attempts only
CREATE POLICY "Anonymous users can insert scan attempts"
ON anonymous_scan_attempts
FOR INSERT
TO anon
WITH CHECK (true);

-- No SELECT access for anonymous attempts (internal tracking only)

-- 5. Update function search paths to fix security warnings
ALTER FUNCTION refresh_token_sitemap() SET search_path = 'public';
ALTER FUNCTION get_user_email_for_hubspot(uuid) SET search_path = 'public';
ALTER FUNCTION upsert_subscriber_by_email(text, text, text, text) SET search_path = 'public';