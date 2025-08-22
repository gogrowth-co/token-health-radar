-- Update sitemap to include token report URLs with proper structure
-- This ensures all existing token reports follow the new SEO implementation

-- First, let's ensure we have proper indexing for token reports
CREATE INDEX IF NOT EXISTS idx_token_reports_symbol_created 
ON token_reports(token_symbol, created_at);

-- Add a function to refresh the sitemap with all token reports
CREATE OR REPLACE FUNCTION refresh_token_sitemap()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  -- This function can be called to ensure all token reports 
  -- are properly indexed in search engines
  -- The actual sitemap generation happens via edge function
  PERFORM pg_notify('sitemap_refresh', 'token_reports_updated');
END;
$$;