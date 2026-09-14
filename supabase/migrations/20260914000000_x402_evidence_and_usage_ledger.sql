-- Phase 0 (2026-09-14): evidence ledger + x402 usage ledger.
-- Additive only — no existing table, column, or policy is modified.
-- Source of truth for these tables: docs/plan-x402-build-2026-09-14.md and the
-- PRD's "Evidence record" and "Operational requirements" sections.

-- ============================================================================
-- evidence_records — one row per material claim/observation attached to a scan.
-- Mirrors the canonicalResult.ts `EvidenceRecord` shape. Non-sensitive (source
-- name, URL, timestamp, freshness only) — public read, like the existing
-- token_*_cache tables, so agents/operators can inspect the evidence trail.
-- ============================================================================
CREATE TABLE public.evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES public.token_scans(id) ON DELETE CASCADE,
  category TEXT,
  source TEXT NOT NULL,
  source_url TEXT,
  retrieved_at TIMESTAMPTZ NOT NULL,
  block_number BIGINT,
  freshness TEXT NOT NULL DEFAULT 'fresh',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_records_scan_id ON public.evidence_records (scan_id);

ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to evidence records"
ON public.evidence_records
FOR SELECT
USING (true);

CREATE POLICY "Service role full access to evidence records"
ON public.evidence_records
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- x402_usage_ledger — one row per x402 request. Contains payment/cost data,
-- so unlike evidence_records this is NOT publicly readable — service role
-- only. Idempotency: a given (payment_nonce, request_fingerprint) pair can
-- appear at most once, so a client retry with the same signed payment cannot
-- be double-processed (PRD Story 3 AC3).
-- ============================================================================
CREATE TABLE public.x402_usage_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL UNIQUE,
  token_address TEXT NOT NULL,
  chain_id TEXT NOT NULL,
  tier TEXT NOT NULL,
  price_usd NUMERIC(10, 4),
  payment_state TEXT NOT NULL DEFAULT 'not_required'
    CHECK (payment_state IN ('not_required', 'required', 'verified', 'settled', 'not_settled', 'failed')),
  payment_nonce TEXT,
  request_fingerprint TEXT,
  source_states JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  http_status INTEGER,
  result_state TEXT
    CHECK (result_state IS NULL OR result_state IN ('complete', 'partial', 'unavailable', 'validation_error', 'failed')),
  gross_payment_usd NUMERIC(10, 4),
  direct_cost_usd NUMERIC(10, 4),
  rubric_version TEXT,
  adapter_versions JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotency: prevents a replayed payment (same nonce) from being applied to
-- a different request fingerprint (different token/chain/tier), or processed
-- twice for the same one. NULL nonces (pre-payment / not_required rows) are
-- excluded from the uniqueness check.
CREATE UNIQUE INDEX idx_x402_usage_ledger_idempotency
  ON public.x402_usage_ledger (payment_nonce, request_fingerprint)
  WHERE payment_nonce IS NOT NULL;

CREATE INDEX idx_x402_usage_ledger_token ON public.x402_usage_ledger (token_address, chain_id);

ALTER TABLE public.x402_usage_ledger ENABLE ROW LEVEL SECURITY;

-- No public policy is created: payment/cost data is service-role only. The
-- owner inspects it via the service role (dashboard/reporting), not via the
-- public anon key.
CREATE POLICY "Service role full access to x402 usage ledger"
ON public.x402_usage_ledger
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
