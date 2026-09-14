// Pure unit tests for the canonical result builder — no network, no DB.
// Run with: deno test supabase/functions/_shared/canonicalResult.test.ts
//
// Covers the PRD's Phase 0 fixture requirement: "healthy signals, elevated-risk
// signals, missing data, and conflicting sources."

import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  buildCanonicalResult,
  coverageFromPresence,
  findingsFromGoPlus,
  CanonicalResultInput,
} from "./canonicalResult.ts";
import { RUBRIC_VERSION } from "./rubric.ts";

import healthyFixture from "./fixtures/scan-healthy.json" with { type: "json" };
import elevatedRiskFixture from "./fixtures/scan-elevated-risk.json" with { type: "json" };
import missingDataFixture from "./fixtures/scan-missing-data.json" with { type: "json" };
import conflictingSourcesFixture from "./fixtures/scan-conflicting-sources.json" with { type: "json" };

Deno.test("healthy fixture => clear_signals, high confidence", () => {
  const result = buildCanonicalResult(healthyFixture as CanonicalResultInput);
  assertEquals(result.schema_version, "1.0");
  assertEquals(result.scan.rubric_version, RUBRIC_VERSION);
  assertEquals(result.scan.health_band, "clear_signals");
  assertEquals(result.scan.confidence, "high");
  assertEquals(result.categories.length, 5);
  assertEquals(result.dimensions.security, 92);
  assertEquals(result.limitations.length, 0);
});

Deno.test("elevated-risk fixture => elevated_risk_signals, findings survive with severity", () => {
  const result = buildCanonicalResult(elevatedRiskFixture as CanonicalResultInput);
  assertEquals(result.scan.health_band, "elevated_risk_signals");

  const security = result.categories.find((c) => c.key === "security");
  assertExists(security);
  assertEquals(security!.findings.length, 2);
  assertEquals(security!.findings[0].severity, "critical");
  assertEquals(security!.findings[0].evidence_refs, ["ev_goplus_2"]);
});

Deno.test("missing-data fixture => insufficient_data regardless of raw scores", () => {
  const result = buildCanonicalResult(missingDataFixture as CanonicalResultInput);
  // Overall completeness for this fixture is well below the 0.5 threshold —
  // health_band must be forced to insufficient_data even though none of the
  // per-category scores are literally zero (per PRD: "unknown is a valid
  // result... missing or stale data must not be converted into a positive or
  // negative claim").
  assertEquals(result.scan.health_band, "insufficient_data");
  assertEquals(result.limitations.length, 3);
});

Deno.test("conflicting-sources fixture => both observations preserved, no silent averaging", () => {
  const result = buildCanonicalResult(conflictingSourcesFixture as CanonicalResultInput);
  const liquidity = result.categories.find((c) => c.key === "liquidity");
  assertExists(liquidity);
  // Both conflicting evidence records must be preserved on the category, not
  // collapsed into one.
  assertEquals(liquidity!.evidence_refs.length, 2);
  assertEquals(result.evidence.filter((e) => e.id.includes("_4")).length, 6);
  // The conflict is surfaced as a limitation, not silently resolved.
  assertEquals(
    result.limitations.some((l) => l.toLowerCase().includes("disagreement")),
    true,
  );
});

Deno.test("coverageFromPresence clamps to [0,1] and handles zero total", () => {
  assertEquals(coverageFromPresence(3, 6), 0.5);
  assertEquals(coverageFromPresence(6, 6), 1);
  assertEquals(coverageFromPresence(0, 6), 0);
  assertEquals(coverageFromPresence(5, 0), 0);
});

Deno.test("findingsFromGoPlus maps known-risky flags to findings, ignores nulls", () => {
  const findings = findingsFromGoPlus(
    { can_mint: true, honeypot_detected: false, freeze_authority: null, ownership_renounced: null },
    "ev_test_1",
  );
  assertEquals(findings.length, 1);
  assertEquals(findings[0].severity, "high");
  assertEquals(findings[0].evidence_refs, ["ev_test_1"]);
});

Deno.test("findingsFromGoPlus returns empty array for null input", () => {
  assertEquals(findingsFromGoPlus(null, "ev_test_2"), []);
});
