-- Atomic scan persistence (2026-09-25). ADDITIVE: one new function, nothing else changes.
--
-- run-token-scan used to write six cache tables and the scan history as separate requests, so a failure in
-- one could leave a mix of new and old rows that the site then displayed as one scan. This function writes
-- them all in ONE transaction: either every row of the scan lands, or none does.
--
-- p_caches: { "<table>": { column: value, ... }, ... } for the whitelisted cache tables below. Only the
--           columns present in a row are written; columns left out keep their current value (same as the
--           previous upsert behaviour). An unknown column name raises an error instead of being ignored.
-- p_scan:   the token_scans row (history, append-only).
-- Returns the new token_scans id.
CREATE OR REPLACE FUNCTION public.persist_token_scan(p_caches jsonb, p_scan jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  -- token_data_cache first: the other caches reference it.
  tables constant text[] := ARRAY['token_data_cache', 'token_security_cache', 'token_tokenomics_cache', 'token_liquidity_cache', 'token_community_cache', 'token_development_cache'];
  t text;
  r jsonb;
  cols text[];
  bad text[];
  scan_id uuid;
BEGIN
  IF jsonb_typeof(p_caches) IS DISTINCT FROM 'object' OR jsonb_typeof(p_caches -> 'token_data_cache') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'persist_token_scan: token_data_cache row is required';
  END IF;
  SELECT array_agg(k) INTO bad FROM jsonb_object_keys(p_caches) k WHERE k <> ALL (tables);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'persist_token_scan: unknown table(s) %', bad;
  END IF;

  FOREACH t IN ARRAY tables LOOP
    r := p_caches -> t;
    CONTINUE WHEN r IS NULL OR jsonb_typeof(r) <> 'object';
    SELECT array_agg(k ORDER BY k) INTO cols FROM jsonb_object_keys(r) k;
    IF NOT (cols @> ARRAY['token_address', 'chain_id']) THEN
      RAISE EXCEPTION 'persist_token_scan: % row needs token_address and chain_id', t;
    END IF;
    SELECT array_agg(c) INTO bad FROM unnest(cols) c
      WHERE NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = format('public.%I', t)::regclass AND a.attname = c AND a.attnum > 0 AND NOT a.attisdropped);
    IF bad IS NOT NULL THEN
      RAISE EXCEPTION 'persist_token_scan: unknown column(s) for %: %', t, bad;
    END IF;
    EXECUTE format(
      'INSERT INTO public.%1$I (%2$s) SELECT %2$s FROM jsonb_populate_record(NULL::public.%1$I, $1) ON CONFLICT (token_address, chain_id) DO UPDATE SET %3$s',
      t,
      (SELECT string_agg(quote_ident(c), ', ') FROM unnest(cols) c),
      (SELECT string_agg(format('%1$I = EXCLUDED.%1$I', c), ', ') FROM unnest(cols) c WHERE c NOT IN ('token_address', 'chain_id'))
    ) USING r;
  END LOOP;

  IF jsonb_typeof(p_scan) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'persist_token_scan: scan row is required';
  END IF;
  SELECT array_agg(k ORDER BY k) INTO cols FROM jsonb_object_keys(p_scan) k;
  SELECT array_agg(c) INTO bad FROM unnest(cols) c
    WHERE NOT EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = 'public.token_scans'::regclass AND a.attname = c AND a.attnum > 0 AND NOT a.attisdropped);
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'persist_token_scan: unknown column(s) for token_scans: %', bad;
  END IF;
  EXECUTE format(
    'INSERT INTO public.token_scans (%1$s) SELECT %1$s FROM jsonb_populate_record(NULL::public.token_scans, $1) RETURNING id',
    (SELECT string_agg(quote_ident(c), ', ') FROM unnest(cols) c)
  ) USING p_scan INTO scan_id;
  RETURN scan_id;
END;
$$;

-- Only the backend (service role) may call it.
REVOKE ALL ON FUNCTION public.persist_token_scan(jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.persist_token_scan(jsonb, jsonb) TO service_role;
