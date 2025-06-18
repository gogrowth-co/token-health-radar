
-- Fix RLS policies for token cache tables to allow service role insertions and public reads

-- First, drop any existing conflicting policies on cache tables
DROP POLICY IF EXISTS "Allow public read access to token data" ON public.token_data_cache;
DROP POLICY IF EXISTS "Allow public read access to token security data" ON public.token_security_cache;
DROP POLICY IF EXISTS "Allow public read access to token tokenomics data" ON public.token_tokenomics_cache;
DROP POLICY IF EXISTS "Allow public read access to token liquidity data" ON public.token_liquidity_cache;
DROP POLICY IF EXISTS "Allow public read access to token community data" ON public.token_community_cache;
DROP POLICY IF EXISTS "Allow public read access to token development data" ON public.token_development_cache;

DROP POLICY IF EXISTS "Allow service role to manage token data" ON public.token_data_cache;
DROP POLICY IF EXISTS "Allow service role to manage token security data" ON public.token_security_cache;
DROP POLICY IF EXISTS "Allow service role to manage token tokenomics data" ON public.token_tokenomics_cache;
DROP POLICY IF EXISTS "Allow service role to manage token liquidity data" ON public.token_liquidity_cache;
DROP POLICY IF EXISTS "Allow service role to manage token community data" ON public.token_community_cache;
DROP POLICY IF EXISTS "Allow service role to manage token development data" ON public.token_development_cache;

-- Add missing cmc_id column to token_scans table to fix edge function error
ALTER TABLE public.token_scans ADD COLUMN IF NOT EXISTS cmc_id integer;

-- Create comprehensive policies for all cache tables

-- Token data cache policies
CREATE POLICY "Public read access to token data cache" ON public.token_data_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to token data cache" ON public.token_data_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Token security cache policies  
CREATE POLICY "Public read access to token security cache" ON public.token_security_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to token security cache" ON public.token_security_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Token tokenomics cache policies
CREATE POLICY "Public read access to token tokenomics cache" ON public.token_tokenomics_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to token tokenomics cache" ON public.token_tokenomics_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Token liquidity cache policies
CREATE POLICY "Public read access to token liquidity cache" ON public.token_liquidity_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to token liquidity cache" ON public.token_liquidity_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Token community cache policies
CREATE POLICY "Public read access to token community cache" ON public.token_community_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to token community cache" ON public.token_community_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Token development cache policies
CREATE POLICY "Public read access to token development cache" ON public.token_development_cache
  FOR SELECT USING (true);

CREATE POLICY "Service role full access to token development cache" ON public.token_development_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Update token_scans policies to include the new cmc_id column
DROP POLICY IF EXISTS "Service role full access to token scans" ON public.token_scans;
DROP POLICY IF EXISTS "Anonymous scan attempts insert" ON public.token_scans;
DROP POLICY IF EXISTS "Allow users to view scan records" ON public.token_scans;

CREATE POLICY "Service role full access to token scans" ON public.token_scans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Anonymous users can insert scan records" ON public.token_scans
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can view relevant scan records" ON public.token_scans
  FOR SELECT USING (
    user_id = auth.uid() OR 
    is_anonymous = true OR 
    auth.role() = 'service_role'
  );
