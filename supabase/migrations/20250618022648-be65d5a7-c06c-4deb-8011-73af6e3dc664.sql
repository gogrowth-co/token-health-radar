
-- Phase 1: Fix database schema issues

-- Add missing cmc_id column to token_data_cache table
ALTER TABLE public.token_data_cache ADD COLUMN IF NOT EXISTS cmc_id integer;

-- Ensure all RLS policies are correctly set up for the service role
-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "Public read access to token data cache" ON public.token_data_cache;
DROP POLICY IF EXISTS "Service role full access to token data cache" ON public.token_data_cache;
DROP POLICY IF EXISTS "Public read access to token security cache" ON public.token_security_cache;
DROP POLICY IF EXISTS "Service role full access to token security cache" ON public.token_security_cache;
DROP POLICY IF EXISTS "Public read access to token tokenomics cache" ON public.token_tokenomics_cache;
DROP POLICY IF EXISTS "Service role full access to token tokenomics cache" ON public.token_tokenomics_cache;
DROP POLICY IF EXISTS "Public read access to token liquidity cache" ON public.token_liquidity_cache;
DROP POLICY IF EXISTS "Service role full access to token liquidity cache" ON public.token_liquidity_cache;
DROP POLICY IF EXISTS "Public read access to token community cache" ON public.token_community_cache;
DROP POLICY IF EXISTS "Service role full access to token community cache" ON public.token_community_cache;
DROP POLICY IF EXISTS "Public read access to token development cache" ON public.token_development_cache;
DROP POLICY IF EXISTS "Service role full access to token development cache" ON public.token_development_cache;

-- Create new RLS policies that properly allow service role operations
CREATE POLICY "Allow public read access" ON public.token_data_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all operations" ON public.token_data_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON public.token_security_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all operations" ON public.token_security_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON public.token_tokenomics_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all operations" ON public.token_tokenomics_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON public.token_liquidity_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all operations" ON public.token_liquidity_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON public.token_community_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all operations" ON public.token_community_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow public read access" ON public.token_development_cache
  FOR SELECT USING (true);

CREATE POLICY "Allow service role all operations" ON public.token_development_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Also ensure token_scans table has proper policies
DROP POLICY IF EXISTS "Service role full access to token scans" ON public.token_scans;
DROP POLICY IF EXISTS "Anonymous users can insert scan records" ON public.token_scans;
DROP POLICY IF EXISTS "Users can view relevant scan records" ON public.token_scans;

CREATE POLICY "Service role full access" ON public.token_scans
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can insert scans" ON public.token_scans
  FOR INSERT WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can view scans" ON public.token_scans
  FOR SELECT USING (
    user_id = auth.uid() OR 
    is_anonymous = true OR 
    auth.role() = 'service_role'
  );
