// Canonical result builder — the "Bridge" layer decided 2026-09-14.
//
// This is a PURE function: no network calls, no DB access. It takes the same
// per-category scores and raw provider-presence signals that run-token-scan
// already computes today, and turns them into the PRD's evidence-first result
// shape (schema_version, categories[], evidence[], limitations, health_band,
// completeness, confidence). It does not change how any score is calculated —
// scoringUtils.ts remains the only place score math happens. This module only
// adds the evidence/coverage/interpretation layer on top, so run-token-scan,
// token-health-mcp, and (later) the x402 endpoint can all consume one object
// instead of drifting into different shapes.
//
// PHASE 0 SCOPE NOTE: `checks[]` with a numeric per-check `contribution` (as
// sketched in the PRD's sample response) requires refactoring scoringUtils.ts
// to expose its internal point-by-point breakdown, which is deliberately out of
// scope for Phase 0 to avoid touching live scoring math on a commercial product.
// Findings below carry severity + claim + evidence_refs (no numeric
// contribution) until that refactor is scheduled as a named Phase 1 task.

import {
  CATEGORY_KEYS,
  CATEGORY_WEIGHTS,
  CategoryKey,
  ConfidenceLevel,
  HealthBand,
  RUBRIC_VERSION,
  Severity,
  completenessToConfidence,
  scoreToHealthBand,
} from "./rubric.ts";

export interface Finding {
  severity: Severity;
  claim: string;
  evidence_refs: string[];
}

export interface EvidenceRecord {
  id: string;
  source: string; // "goplus" | "moralis" | "github" | "lunarcrush" | "discord" | "telegram" | ...
  source_url?: string | null;
  retrieved_at: string; // ISO timestamp
  block_number?: number | null;
  freshness: "fresh" | "stale" | "unavailable";
}

export interface CategoryInput {
  score: number; // 0-100, already computed by scoringUtils.ts — unchanged
  coverage: number; // 0..1 — fraction of expected signals actually present
  findings: Finding[];
  evidenceRefs: string[]; // ids referencing entries in the shared evidence[] array
}

export interface CanonicalResultInput {
  requestId: string;
  chain: string;
  tokenAddress: string;
  tier: "preview" | "quick" | "deep";
  retrievedAt: string; // ISO timestamp
  categories: Record<CategoryKey, CategoryInput>;
  evidence: EvidenceRecord[];
  limitations: string[];
}

export interface CanonicalCategoryResult {
  key: CategoryKey;
  score: number;
  status: HealthBand;
  coverage: number;
  confidence: ConfidenceLevel;
  findings: Finding[];
  evidence_refs: string[];
}

export interface CanonicalResult {
  schema_version: string;
  request_id: string;
  token: { chain: string; address: string };
  scan: {
    tier: string;
    rubric_version: string;
    retrieved_at: string;
    health_band: HealthBand;
    completeness: number;
    confidence: ConfidenceLevel;
  };
  categories: CanonicalCategoryResult[];
  evidence: EvidenceRecord[];
  limitations: string[];
  // Backward-compat alias per PRD: "`dimensions` remains an accepted alias only
  // during a versioned migration; new clients should use `categories`."
  dimensions: Record<CategoryKey, number>;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function weightedAverage(values: Record<CategoryKey, number>): number {
  let sum = 0;
  let weightSum = 0;
  for (const key of CATEGORY_KEYS) {
    const w = CATEGORY_WEIGHTS[key];
    sum += (values[key] ?? 0) * w;
    weightSum += w;
  }
  return weightSum > 0 ? sum / weightSum : 0;
}

export function buildCanonicalResult(input: CanonicalResultInput): CanonicalResult {
  const categories: CanonicalCategoryResult[] = CATEGORY_KEYS.map((key) => {
    const c = input.categories[key];
    const coverage = Math.max(0, Math.min(1, c?.coverage ?? 0));
    const confidence = completenessToConfidence(coverage);
    const status = scoreToHealthBand(c?.score ?? 0, coverage);
    return {
      key,
      score: c?.score ?? 0,
      status,
      coverage: round2(coverage),
      confidence,
      findings: c?.findings ?? [],
      evidence_refs: c?.evidenceRefs ?? [],
    };
  });

  const scoreByKey = Object.fromEntries(categories.map((c) => [c.key, c.score])) as Record<
    CategoryKey,
    number
  >;
  const coverageByKey = Object.fromEntries(categories.map((c) => [c.key, c.coverage])) as Record<
    CategoryKey,
    number
  >;

  const overallScore = Math.round(weightedAverage(scoreByKey));
  const overallCompleteness = round2(weightedAverage(coverageByKey));
  const overallConfidence = completenessToConfidence(overallCompleteness);
  const healthBand = scoreToHealthBand(overallScore, overallCompleteness);

  const dimensions = Object.fromEntries(categories.map((c) => [c.key, c.score])) as Record<
    CategoryKey,
    number
  >;

  return {
    schema_version: "1.0",
    request_id: input.requestId,
    token: { chain: input.chain, address: input.tokenAddress },
    scan: {
      tier: input.tier,
      rubric_version: RUBRIC_VERSION,
      retrieved_at: input.retrievedAt,
      health_band: healthBand,
      completeness: overallCompleteness,
      confidence: overallConfidence,
    },
    categories,
    evidence: input.evidence,
    limitations: input.limitations,
    dimensions,
  };
}

// --- Additive helpers used by run-token-scan to build CategoryInput without
// touching scoringUtils.ts. Kept here (not inline in run-token-scan) so they are
// unit-testable and reusable by the future x402 endpoint. ---

export function coverageFromPresence(presentCount: number, totalExpected: number): number {
  if (totalExpected <= 0) return 0;
  return Math.max(0, Math.min(1, presentCount / totalExpected));
}

/**
 * Maps GoPlus's already-fetched boolean flags to PRD-style findings. Does not
 * call GoPlus or interpret any field GoPlus didn't already return — purely a
 * safe presentation layer over data run-token-scan already has in memory.
 */
export function findingsFromGoPlus(
  goplus: {
    can_mint?: boolean | null;
    honeypot_detected?: boolean | null;
    freeze_authority?: boolean | null;
    is_blacklisted?: boolean | null;
    ownership_renounced?: boolean | null;
  } | null,
  evidenceId: string,
): Finding[] {
  if (!goplus) return [];
  const findings: Finding[] = [];
  if (goplus.honeypot_detected === true) {
    findings.push({
      severity: "critical",
      claim: "Honeypot behavior was detected — sells may be blocked.",
      evidence_refs: [evidenceId],
    });
  }
  if (goplus.can_mint === true) {
    findings.push({
      severity: "high",
      claim: "The contract owner can mint new tokens.",
      evidence_refs: [evidenceId],
    });
  }
  if (goplus.freeze_authority === true) {
    findings.push({
      severity: "high",
      claim: "The owner can pause or freeze transfers.",
      evidence_refs: [evidenceId],
    });
  }
  if (goplus.is_blacklisted === true) {
    findings.push({
      severity: "high",
      claim: "The contract includes address-blacklisting capability.",
      evidence_refs: [evidenceId],
    });
  }
  if (goplus.ownership_renounced === false) {
    findings.push({
      severity: "medium",
      claim: "Contract ownership has not been renounced.",
      evidence_refs: [evidenceId],
    });
  }
  return findings;
}
