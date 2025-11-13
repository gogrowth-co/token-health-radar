-- One-time data migration: Lowercase all existing token_symbol values in token_reports
-- This fixes the casing mismatch causing "Report Not Found" errors for existing reports

UPDATE token_reports 
SET token_symbol = LOWER(token_symbol)
WHERE token_symbol != LOWER(token_symbol);

-- Log the number of updated records
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % token_symbol values to lowercase in token_reports', updated_count;
END $$;