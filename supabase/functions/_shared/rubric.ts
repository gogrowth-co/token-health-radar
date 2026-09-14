// Versioned scoring/evidence rubric for the canonical result layer.
//
// This is the single source of truth for thresholds and vocabulary that affect
// interpretation (PRD: "Version everything that affects interpretation"). It does
// NOT change any existing scoring math in scoringUtils.ts — those functions keep
// producing the same 0-100 numbers they do today. This module only governs how
// the canonical result layer (canonicalResult.ts) interprets those same numbers
// plus data-presence to produce coverage, confidence, and health bands.
//
// PLACEHOLDER VALUES: several thresholds below are launch-hypothesis defaults per
// the PRD ("baselines... must be replaced with observed values after the first
// pilot week"). They are flagged inline. Bumping RUBRIC_VERSION is required for
// any change here that affects a live health_band/confidence/completeness result.

export const RUBRIC_VERSION = "2026-09-14";

export const CATEGORY_KEYS = [
  "security",
  "liquidity",
  "tokenomics",
  "community",
  "development",
] as const;

export type CategoryKey = typeof CATEGORY_KEYS[number];

// PRD default: equal 20% per category until a versioned alternative is validated.
export const CATEGORY_WEIGHTS: Record<CategoryKey, number> = {
  security: 0.2,
  liquidity: 0.2,
  tokenomics: 0.2,
  community: 0.2,
  development: 0.2,
};

// PLACEHOLDER (PRD open item: "Decide the completeness threshold for
// insufficient_data", Phase 0 task). Below this overall completeness, the health
// band is forced to `insufficient_data` regardless of score. Revisit after the
// first pilot week's observed evidence-coverage data.
export const COMPLETENESS_INSUFFICIENT_THRESHOLD = 0.5;

// PLACEHOLDER health-band score cutoffs. The PRD names the four bands but does not
// fix numeric cutoffs; these are launch defaults, not validated thresholds.
export const HEALTH_BAND_CUTOFFS = {
  clear_signals: 75,
  watch_signals: 50,
  // below watch_signals cutoff => elevated_risk_signals
};

export type HealthBand =
  | "clear_signals"
  | "watch_signals"
  | "elevated_risk_signals"
  | "insufficient_data";

export function scoreToHealthBand(overallScore: number, overallCompleteness: number): HealthBand {
  if (overallCompleteness < COMPLETENESS_INSUFFICIENT_THRESHOLD) return "insufficient_data";
  if (overallScore >= HEALTH_BAND_CUTOFFS.clear_signals) return "clear_signals";
  if (overallScore >= HEALTH_BAND_CUTOFFS.watch_signals) return "watch_signals";
  return "elevated_risk_signals";
}

// PLACEHOLDER confidence-from-completeness mapping (per-category and overall).
export type ConfidenceLevel = "high" | "medium" | "low";

export function completenessToConfidence(completeness: number): ConfidenceLevel {
  if (completeness >= 0.8) return "high";
  if (completeness >= 0.5) return "medium";
  return "low";
}

export const SEVERITY_LEVELS = ["info", "low", "medium", "high", "critical"] as const;
export type Severity = typeof SEVERITY_LEVELS[number];

// x402 tiers this rubric version supports. Prices are the launch decision from
// 2026-09-14 (fixed, not a range) — new and separate from the existing $99/mo
// waitlist tier and the parked offer-sheet numbers.
export const X402_TIERS = {
  quick: { price_usd: 0.10 },
  deep: { price_usd: 1.00 },
} as const;
