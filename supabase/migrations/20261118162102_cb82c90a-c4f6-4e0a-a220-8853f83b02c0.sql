DROP POLICY IF EXISTS "Public read access to token reports" ON public.token_reports;
CREATE POLICY "Public can read completed token reports" ON public.token_reports FOR SELECT TO anon, authenticated
  USING (token_symbol <> '' AND token_address <> '' AND report_content <> '{}'::jsonb);
REVOKE SELECT ON public.token_reports FROM anon, authenticated;
GRANT SELECT (id, token_address, chain_id, token_symbol, token_name, report_content, created_at, updated_at) ON public.token_reports TO anon, authenticated;