DROP POLICY IF EXISTS "Users can view copilot events" ON public.copilot_events;
DROP POLICY IF EXISTS "System can insert copilot events" ON public.copilot_events;
CREATE POLICY "Admins can view copilot events" ON public.copilot_events FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can manage sitemaps" ON storage.objects;
DROP POLICY IF EXISTS "Service role can upload sitemaps" ON storage.objects;

DROP POLICY IF EXISTS "Public read access to token_community_cache" ON public.token_community_cache;
DROP POLICY IF EXISTS "Public read access to token_data_cache" ON public.token_data_cache;
DROP POLICY IF EXISTS "Public read access to token_development_cache" ON public.token_development_cache;
DROP POLICY IF EXISTS "Public read access to token_liquidity_cache" ON public.token_liquidity_cache;
DROP POLICY IF EXISTS "Public read access to token_security_cache" ON public.token_security_cache;