-- Scanner reliability layer (2026-09-24). ADDITIVE ONLY: new nullable columns and a view.
-- Nothing is dropped, renamed or backfilled. Existing readers are unaffected.
--
-- token_scans (append-only history) gains the full per-field record of each scan:
--   field_data      every field as {value, status, reason, unit, decimals, scope, confidence, sources[{source, fetched_at, raw_ref, raw_excerpt}]}
--   data_quality    completeness, required fields missing, provider failures/calls, paid credits, plausibility flags
--   dimension_scores scoring result incl. inputs used/excluded per dimension
--   scoring_version  e.g. '2.0.0'
--   canonical_address exact-case address used for provider calls (token_address stays lowercased as a lookup key)
ALTER TABLE public.token_scans
  ADD COLUMN IF NOT EXISTS scoring_version text,
  ADD COLUMN IF NOT EXISTS dimension_scores jsonb,
  ADD COLUMN IF NOT EXISTS field_data jsonb,
  ADD COLUMN IF NOT EXISTS data_quality jsonb,
  ADD COLUMN IF NOT EXISTS completeness_pct numeric,
  ADD COLUMN IF NOT EXISTS canonical_address text;

CREATE INDEX IF NOT EXISTS token_scans_addr_chain_scanned_idx
  ON public.token_scans (token_address, chain_id, scanned_at DESC);

-- Monitoring view: latest v2 scan per token, with required-field coverage and failures.
CREATE OR REPLACE VIEW public.scanner_quality_latest
WITH (security_invoker = true) AS
SELECT DISTINCT ON (s.token_address, s.chain_id)
  s.token_address,
  s.chain_id,
  s.canonical_address,
  s.scanned_at,
  s.scoring_version,
  s.score_total,
  s.completeness_pct,
  jsonb_array_length(COALESCE(s.data_quality -> 'required_missing', '[]'::jsonb)) = 0 AS all_required_present,
  s.data_quality -> 'required_missing' AS required_missing,
  s.data_quality -> 'provider_failures' AS provider_failures,
  (SELECT count(*) FROM jsonb_array_elements(COALESCE(s.data_quality -> 'flags', '[]'::jsonb)) f WHERE f ->> 'severity' = 'error') AS plausibility_errors
FROM public.token_scans s
WHERE s.scoring_version IS NOT NULL
ORDER BY s.token_address, s.chain_id, s.scanned_at DESC;

-- One-line health number: share of scanned tokens with every required field present.
CREATE OR REPLACE VIEW public.scanner_quality_summary
WITH (security_invoker = true) AS
SELECT
  count(*) AS tokens,
  round(100.0 * count(*) FILTER (WHERE all_required_present) / NULLIF(count(*), 0), 1) AS pct_all_required,
  round(avg(completeness_pct), 1) AS avg_completeness_pct,
  count(*) FILTER (WHERE plausibility_errors > 0) AS tokens_with_plausibility_errors
FROM public.scanner_quality_latest;

REVOKE ALL ON public.scanner_quality_latest FROM anon, authenticated;
REVOKE ALL ON public.scanner_quality_summary FROM anon, authenticated;
