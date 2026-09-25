// Field-level provenance for scanner data (added 2026-09-24, scanner reliability layer).
//
// Every value the scanner stores is a Field: the value plus where it came
// from, when, how confident we are, and a trace back to the raw provider
// response. A value the scanner does not know is `null` WITH a reason code,
// never a default (0, false, or "same as total supply"). See
// token-health-scan/_handoffs/2026-09-24-scanner-engine-rebuild.md, Phase 1.5.

export type ReasonCode =
  | 'provider_failed' // provider returned an error, a non-JSON body, or a bot challenge
  | 'timeout' // provider did not answer in time
  | 'rate_limited' // provider answered 429 after retries
  | 'circuit_open' // provider skipped because it failed repeatedly this isolate
  | 'budget_exhausted' // per-scan call/credit budget spent
  | 'not_found' // provider answered, and has no record of this token
  | 'not_listed' // token is not listed on a market-data source (e.g. brand-new memecoin)
  | 'not_supported_on_chain' // this field or provider does not exist for this chain
  | 'not_applicable' // the concept does not apply (e.g. EVM proxy on an SPL mint)
  | 'no_data' // provider answered but the field was empty/blank
  | 'sources_disagree' // two independent sources differ beyond tolerance
  | 'failed_plausibility' // value failed a plausibility rule
  | 'not_corroborated' // a single source answered; the scoring rule requires two independent sources
  | 'missing_input'; // a derived field could not be computed because an input is null

export type Confidence = 'high' | 'medium' | 'low';

export interface SourceRef {
  source: string; // e.g. 'solana_rpc:helius', 'coingecko', 'goplus'
  fetched_at: string; // ISO timestamp of the request
  raw_ref?: string; // short hash of the raw response body
  raw_excerpt?: Record<string, unknown>; // the key raw fields the value was read from
  value?: unknown; // this source's own value, when several sources were compared
}

export interface Field<T = unknown> {
  value: T | null;
  status: 'ok' | 'unknown' | 'disputed';
  reason?: ReasonCode;
  detail?: string;
  unit?: string; // 'tokens', 'usd', 'pct', 'bool', 'address', 'date', ...
  decimals?: number; // on-chain decimals applied to reach `value`, when relevant
  scope?: 'chain' | 'global'; // chain = this contract on this chain; global = aggregator, all chains
  confidence?: Confidence;
  // 'upper': the value is a ceiling (worst case), not a measurement. Only used for derived "at most" statements.
  bound?: 'upper';
  // true only when two INDEPENDENT sources were compared and agreed. A value can be `ok` from one source
  // (kept as an observation) but it may not drive a score that requires corroboration.
  corroborated?: boolean;
  sources: SourceRef[];
}

export function ok<T>(value: T, src: SourceRef | SourceRef[], opts: Partial<Field<T>> = {}): Field<T> {
  return { value, status: 'ok', confidence: 'medium', ...opts, sources: Array.isArray(src) ? src : [src] };
}

export function unknown<T = never>(reason: ReasonCode, detail?: string, sources: SourceRef[] = [], opts: Partial<Field<T>> = {}): Field<T> {
  return { value: null, status: 'unknown', reason, detail, confidence: undefined, ...opts, sources };
}

/** True when a field can be used as a scoring input. Disputed and unknown fields never can. */
export function usable<T>(f: Field<T> | undefined | null): f is Field<T> & { value: T } {
  return !!f && f.status === 'ok' && f.value !== null && f.value !== undefined;
}

/** Usable AND confirmed by a second independent source. Required for the score-driving fields. */
export function corroborated<T>(f: Field<T> | undefined | null): f is Field<T> & { value: T } {
  return usable(f) && f.corroborated === true;
}

export function relDiff(a: number, b: number): number {
  if (a === b) return 0;
  const d = Math.max(Math.abs(a), Math.abs(b));
  return d === 0 ? 0 : Math.abs(a - b) / d;
}

/**
 * Combine two independent numeric readings of the same quantity.
 * - both present and within tolerance -> ok, confidence high, primary's value
 * - both present, outside tolerance -> disputed (value kept for display, never scored)
 * - one present -> ok, confidence medium (single source), with the other's reason noted
 * - none -> unknown with the primary's reason
 * `tolerance` is relative (0.02 = 2%) unless `absTolerance` is given (e.g. 5 percentage points).
 */
export function crossCheckNumber(
  primary: Field<number>,
  secondary: Field<number>,
  opts: { tolerance?: number; absTolerance?: number; unit?: string; label: string },
): Field<number> {
  const sources = [
    ...primary.sources.map((s) => ({ ...s, value: primary.value })),
    ...secondary.sources.map((s) => ({ ...s, value: secondary.value })),
  ];
  const base = { unit: opts.unit ?? primary.unit, decimals: primary.decimals, scope: primary.scope };
  if (usable(primary) && usable(secondary)) {
    if (!independent(primary, secondary)) return { ...base, ...primary, confidence: 'medium', corroborated: false, detail: `${opts.label}: both readings come from the same source (${sharedSource(primary, secondary)}), so this is one observation, not two`, sources };
    const diff = opts.absTolerance !== undefined ? Math.abs(primary.value - secondary.value) : relDiff(primary.value, secondary.value);
    const tol = opts.absTolerance ?? opts.tolerance ?? 0.02;
    if (diff <= tol) return { ...base, value: primary.value, status: 'ok', confidence: 'high', corroborated: true, sources };
    return {
      ...base,
      value: primary.value,
      status: 'disputed',
      reason: 'sources_disagree',
      confidence: 'low',
      corroborated: false,
      detail: `${opts.label}: ${fmt(primary.value)} vs ${fmt(secondary.value)} (diff ${opts.absTolerance !== undefined ? diff.toFixed(2) + ' pts' : (diff * 100).toFixed(2) + '%'}, tolerance ${opts.absTolerance !== undefined ? tol + ' pts' : tol * 100 + '%'})`,
      sources,
    };
  }
  if (usable(primary)) return { ...base, ...primary, confidence: 'medium', corroborated: false, detail: `single source; second source ${secondary.reason ?? 'unavailable'}`, sources };
  if (usable(secondary)) return { ...base, ...secondary, confidence: 'medium', corroborated: false, detail: `single source; first source ${primary.reason ?? 'unavailable'}`, sources };
  if (primary.status === 'disputed') return primary;
  return unknown(primary.reason ?? secondary.reason ?? 'no_data', `${opts.label}: no source returned a value`, sources, base);
}

/** Same idea for booleans (authorities, proxy, pausable...): agree -> high, disagree -> disputed. */
export function crossCheckBool(primary: Field<boolean>, secondary: Field<boolean>, label: string): Field<boolean> {
  const sources = [
    ...primary.sources.map((s) => ({ ...s, value: primary.value })),
    ...secondary.sources.map((s) => ({ ...s, value: secondary.value })),
  ];
  if (usable(primary) && usable(secondary)) {
    if (!independent(primary, secondary)) return { ...primary, confidence: 'medium', corroborated: false, detail: `${label}: both readings come from the same source (${sharedSource(primary, secondary)}), so this is one observation, not two`, sources };
    if (primary.value === secondary.value) return { value: primary.value, status: 'ok', confidence: 'high', corroborated: true, unit: 'bool', sources };
    return { value: primary.value, status: 'disputed', reason: 'sources_disagree', confidence: 'low', corroborated: false, unit: 'bool', detail: `${label}: sources disagree (${primary.value} vs ${secondary.value})`, sources };
  }
  if (usable(primary)) return { ...primary, confidence: 'medium', corroborated: false, detail: `single source; second source ${secondary.reason ?? 'unavailable'}`, sources };
  if (usable(secondary)) return { ...secondary, confidence: 'medium', corroborated: false, detail: `single source; first source ${primary.reason ?? 'unavailable'}`, sources };
  return unknown(primary.reason ?? secondary.reason ?? 'no_data', `${label}: no source returned a value`, sources, { unit: 'bool' });
}

// Two readings only corroborate each other when no source identity appears in both.
function sharedSource(a: Field<any>, b: Field<any>): string {
  const bs = new Set(b.sources.map((s) => s.source));
  return a.sources.map((s) => s.source).find((s) => bs.has(s)) ?? '';
}
export function independent(a: Field<any>, b: Field<any>): boolean {
  return sharedSource(a, b) === '';
}

function fmt(n: number): string {
  return Math.abs(n) >= 1e6 ? n.toExponential(4) : String(Math.round(n * 1e4) / 1e4);
}
