-- Manually trigger sitemap generation by updating the ONDO record
UPDATE token_reports 
SET updated_at = now() 
WHERE token_symbol ILIKE '%ondo%' 
RETURNING token_symbol, id;