
-- Remove cmc_id column from token_data_cache table
ALTER TABLE public.token_data_cache DROP COLUMN IF EXISTS cmc_id;

-- Remove cmc_id column from token_scans table  
ALTER TABLE public.token_scans DROP COLUMN IF EXISTS cmc_id;
