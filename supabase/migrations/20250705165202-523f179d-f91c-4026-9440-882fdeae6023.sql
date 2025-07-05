-- Fix chain_id constraint issue in token_scans table
-- The error shows: null value in column "chain_id" of relation "token_scans" violates not-null constraint

-- First, update any existing records that might have null chain_id
UPDATE token_scans 
SET chain_id = '0x1' 
WHERE chain_id IS NULL;

-- Add a proper default value for chain_id in token_scans table
ALTER TABLE token_scans 
ALTER COLUMN chain_id SET DEFAULT '0x1';

-- Also ensure all token cache tables have proper defaults
ALTER TABLE token_data_cache 
ALTER COLUMN chain_id SET DEFAULT '0x1';

ALTER TABLE token_security_cache 
ALTER COLUMN chain_id SET DEFAULT '0x1';

ALTER TABLE token_tokenomics_cache 
ALTER COLUMN chain_id SET DEFAULT '0x1';

ALTER TABLE token_liquidity_cache 
ALTER COLUMN chain_id SET DEFAULT '0x1';

ALTER TABLE token_community_cache 
ALTER COLUMN chain_id SET DEFAULT '0x1';

ALTER TABLE token_development_cache 
ALTER COLUMN chain_id SET DEFAULT '0x1';