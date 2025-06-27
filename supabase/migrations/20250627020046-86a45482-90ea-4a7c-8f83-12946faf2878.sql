
-- First, drop all foreign key constraints that depend on the primary keys
ALTER TABLE public.token_scans DROP CONSTRAINT IF EXISTS token_scans_token_address_fkey;
ALTER TABLE public.token_security_cache DROP CONSTRAINT IF EXISTS token_security_cache_token_address_fkey;
ALTER TABLE public.token_liquidity_cache DROP CONSTRAINT IF EXISTS token_liquidity_cache_token_address_fkey;
ALTER TABLE public.token_tokenomics_cache DROP CONSTRAINT IF EXISTS token_tokenomics_cache_token_address_fkey;
ALTER TABLE public.token_community_cache DROP CONSTRAINT IF EXISTS token_community_cache_token_address_fkey;
ALTER TABLE public.token_development_cache DROP CONSTRAINT IF EXISTS token_development_cache_token_address_fkey;

-- Add chain_id column to all token cache tables to support multichain
ALTER TABLE public.token_data_cache ADD COLUMN IF NOT EXISTS chain_id TEXT DEFAULT '0x1';
ALTER TABLE public.token_security_cache ADD COLUMN IF NOT EXISTS chain_id TEXT DEFAULT '0x1';
ALTER TABLE public.token_tokenomics_cache ADD COLUMN IF NOT EXISTS chain_id TEXT DEFAULT '0x1';
ALTER TABLE public.token_liquidity_cache ADD COLUMN IF NOT EXISTS chain_id TEXT DEFAULT '0x1';
ALTER TABLE public.token_development_cache ADD COLUMN IF NOT EXISTS chain_id TEXT DEFAULT '0x1';
ALTER TABLE public.token_community_cache ADD COLUMN IF NOT EXISTS chain_id TEXT DEFAULT '0x1';
ALTER TABLE public.token_scans ADD COLUMN IF NOT EXISTS chain_id TEXT DEFAULT '0x1';

-- Update existing data to have chain_id = '0x1' (Ethereum mainnet)
UPDATE public.token_data_cache SET chain_id = '0x1' WHERE chain_id IS NULL;
UPDATE public.token_security_cache SET chain_id = '0x1' WHERE chain_id IS NULL;
UPDATE public.token_tokenomics_cache SET chain_id = '0x1' WHERE chain_id IS NULL;
UPDATE public.token_liquidity_cache SET chain_id = '0x1' WHERE chain_id IS NULL;
UPDATE public.token_development_cache SET chain_id = '0x1' WHERE chain_id IS NULL;
UPDATE public.token_community_cache SET chain_id = '0x1' WHERE chain_id IS NULL;
UPDATE public.token_scans SET chain_id = '0x1' WHERE chain_id IS NULL;

-- Make chain_id NOT NULL after updating existing data
ALTER TABLE public.token_data_cache ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE public.token_security_cache ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE public.token_tokenomics_cache ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE public.token_liquidity_cache ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE public.token_development_cache ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE public.token_community_cache ALTER COLUMN chain_id SET NOT NULL;
ALTER TABLE public.token_scans ALTER COLUMN chain_id SET NOT NULL;

-- Now update primary keys to be composite (token_address, chain_id)
ALTER TABLE public.token_data_cache DROP CONSTRAINT IF EXISTS token_data_cache_pkey;
ALTER TABLE public.token_data_cache ADD PRIMARY KEY (token_address, chain_id);

ALTER TABLE public.token_security_cache DROP CONSTRAINT IF EXISTS token_security_cache_pkey;
ALTER TABLE public.token_security_cache ADD PRIMARY KEY (token_address, chain_id);

ALTER TABLE public.token_tokenomics_cache DROP CONSTRAINT IF EXISTS token_tokenomics_cache_pkey;
ALTER TABLE public.token_tokenomics_cache ADD PRIMARY KEY (token_address, chain_id);

ALTER TABLE public.token_liquidity_cache DROP CONSTRAINT IF EXISTS token_liquidity_cache_pkey;
ALTER TABLE public.token_liquidity_cache ADD PRIMARY KEY (token_address, chain_id);

ALTER TABLE public.token_development_cache DROP CONSTRAINT IF EXISTS token_development_cache_pkey;
ALTER TABLE public.token_development_cache ADD PRIMARY KEY (token_address, chain_id);

ALTER TABLE public.token_community_cache DROP CONSTRAINT IF EXISTS token_community_cache_pkey;
ALTER TABLE public.token_community_cache ADD PRIMARY KEY (token_address, chain_id);

-- Recreate foreign key constraints with composite keys (token_address, chain_id)
ALTER TABLE public.token_security_cache 
ADD CONSTRAINT token_security_cache_token_address_chain_id_fkey 
FOREIGN KEY (token_address, chain_id) REFERENCES public.token_data_cache(token_address, chain_id);

ALTER TABLE public.token_tokenomics_cache 
ADD CONSTRAINT token_tokenomics_cache_token_address_chain_id_fkey 
FOREIGN KEY (token_address, chain_id) REFERENCES public.token_data_cache(token_address, chain_id);

ALTER TABLE public.token_liquidity_cache 
ADD CONSTRAINT token_liquidity_cache_token_address_chain_id_fkey 
FOREIGN KEY (token_address, chain_id) REFERENCES public.token_data_cache(token_address, chain_id);

ALTER TABLE public.token_development_cache 
ADD CONSTRAINT token_development_cache_token_address_chain_id_fkey 
FOREIGN KEY (token_address, chain_id) REFERENCES public.token_data_cache(token_address, chain_id);

ALTER TABLE public.token_community_cache 
ADD CONSTRAINT token_community_cache_token_address_chain_id_fkey 
FOREIGN KEY (token_address, chain_id) REFERENCES public.token_data_cache(token_address, chain_id);

-- For token_scans, we'll keep it simple since it might have scans without full token data
-- Just add a reference constraint that allows orphaned scans
ALTER TABLE public.token_scans 
ADD CONSTRAINT token_scans_token_address_chain_id_fkey 
FOREIGN KEY (token_address, chain_id) REFERENCES public.token_data_cache(token_address, chain_id) ON DELETE SET NULL;
