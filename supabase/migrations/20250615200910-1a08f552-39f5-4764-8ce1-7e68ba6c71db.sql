
-- Fix RLS policy violations by allowing service role to insert/update cache data
-- and allow public read access to all token cache tables

-- First, drop existing policies that might be conflicting
DROP POLICY IF EXISTS "Allow service role to manage token data" ON public.token_data_cache;
DROP POLICY IF EXISTS "Allow service role to manage token security data" ON public.token_security_cache;
DROP POLICY IF EXISTS "Allow service role to manage token tokenomics data" ON public.token_tokenomics_cache;
DROP POLICY IF EXISTS "Allow service role to manage token liquidity data" ON public.token_liquidity_cache;
DROP POLICY IF EXISTS "Allow service role to manage token community data" ON public.token_community_cache;
DROP POLICY IF EXISTS "Allow service role to manage token development data" ON public.token_development_cache;
DROP POLICY IF EXISTS "Allow service role to manage token scans" ON public.token_scans;

-- Allow service role full access to all cache tables (for edge functions)
CREATE POLICY "Service role full access to token data" ON public.token_data_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token security" ON public.token_security_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token tokenomics" ON public.token_tokenomics_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token liquidity" ON public.token_liquidity_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token community" ON public.token_community_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token development" ON public.token_development_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to token scans" ON public.token_scans
  FOR ALL USING (auth.role() = 'service_role');

-- Allow anonymous users to insert scan attempts
CREATE POLICY "Anonymous scan attempts insert" ON public.token_scans
  FOR INSERT WITH CHECK (user_id IS NULL);
