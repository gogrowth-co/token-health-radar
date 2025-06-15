
-- Allow public read access to all token cache tables for scan results
-- These policies enable both authenticated and anonymous users to view scan data

-- Token data cache - basic token information
CREATE POLICY "Allow public read access to token data" ON public.token_data_cache
  FOR SELECT USING (true);

-- Token security cache - security analysis results
CREATE POLICY "Allow public read access to token security data" ON public.token_security_cache
  FOR SELECT USING (true);

-- Token tokenomics cache - tokenomics analysis results
CREATE POLICY "Allow public read access to token tokenomics data" ON public.token_tokenomics_cache
  FOR SELECT USING (true);

-- Token liquidity cache - liquidity analysis results
CREATE POLICY "Allow public read access to token liquidity data" ON public.token_liquidity_cache
  FOR SELECT USING (true);

-- Token community cache - community analysis results
CREATE POLICY "Allow public read access to token community data" ON public.token_community_cache
  FOR SELECT USING (true);

-- Token development cache - development analysis results
CREATE POLICY "Allow public read access to token development data" ON public.token_development_cache
  FOR SELECT USING (true);

-- Allow service role to insert/update cache data (for edge functions)
CREATE POLICY "Allow service role to manage token data" ON public.token_data_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage token security data" ON public.token_security_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage token tokenomics data" ON public.token_tokenomics_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage token liquidity data" ON public.token_liquidity_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage token community data" ON public.token_community_cache
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role to manage token development data" ON public.token_development_cache
  FOR ALL USING (auth.role() = 'service_role');

-- Also fix the token_scans table to allow service role to insert scan records
CREATE POLICY "Allow service role to manage token scans" ON public.token_scans
  FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to see their own scans and anonymous scans
CREATE POLICY "Allow users to view scan records" ON public.token_scans
  FOR SELECT USING (
    user_id = auth.uid() OR 
    is_anonymous = true OR 
    auth.role() = 'service_role'
  );
