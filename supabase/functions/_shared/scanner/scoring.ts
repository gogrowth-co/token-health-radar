// Scoring v2: versioned, null-gated. (Replaces the v1 functions in
// scoringUtils.ts/solanaAPI.ts for scans, which gave points for unknown inputs:
// "+8 ownership unknown", a 25 floor with no GitHub data, and a Solana
// tokenomics score of 90 built from "supply exists" + market cap.)
//
// Rules:
// - A dimension is scored only from usable inputs (status ok). Disputed and
//   unknown inputs are listed under `excluded` with their reason.
// - If a REQUIRED input is not usable, the dimension is null ("not scored").
// - Optional inputs that are missing are dropped from the denominator, so a
//   missing input neither helps nor hurts.
// - Overall = mean of scored dimensions, only if security is scored and at
//   least 3 of 5 dimensions are; it names the dimensions it excludes.
import { type Field, usable } from './field.ts';
import { isRenounced } from './evm.ts';
import type { ScanRecord } from './types.ts';

export const SCORING_VERSION = '2.2.0'; // 2.1.0 -> 2.2.0: concentration scored on raw top-10 with corroborated supply; measured zeros count; EVM absence claims earn nothing

export interface DimensionScore {
  score: number | null;
  status: 'scored' | 'not_scored';
  reason?: string;
  inputs_used: Record<string, { value: unknown; points: number; max: number }>;
  inputs_excluded: Record<string, string>; // input -> reason
}

export interface ScoreResult {
  scoring_version: string;
  overall: number | null;
  overall_reason?: string;
  excluded_dimensions: string[];
  dimensions: Record<'security' | 'tokenomics' | 'liquidity' | 'community' | 'development', DimensionScore>;
}

// `corroborated`: the handoff requires two independent sources for the fields that drive a score (supply,
// circulating supply, holder concentration, mint and freeze authority). A single-source value is kept as an
// observation but earns no points and blocks a required slot.
// `gateOnlyIf`: corroboration is demanded only for values where it matters (e.g. only a FAVOURABLE reading like "not pausable"
// needs two sources; a single-source warning still counts against the token, because ignoring it would flatter).
type Input = { name: string; field: Field<any> | undefined; max: number; points: (v: any) => number; required?: boolean; corroborated?: boolean; gateOnlyIf?: (v: any) => boolean };

function dimension(inputs: Input[], opts: { minInputs?: number } = {}): DimensionScore {
  const used: DimensionScore['inputs_used'] = {};
  const excluded: DimensionScore['inputs_excluded'] = {};
  const missingRequired: string[] = [];
  for (const i of inputs) {
    const f = i.field as Field<any> | undefined;
    const single = !!f && (usable(f) as boolean) && !!i.corroborated && f.corroborated !== true && (!i.gateOnlyIf || i.gateOnlyIf(f.value));
    if (f && (usable(f) as boolean) && !single) used[i.name] = { value: f.value, points: i.points(f.value), max: i.max };
    else {
      const why = !f ? 'missing' : single ? 'not_corroborated (one source only; two independent sources required)' : f.status === 'disputed' ? `disputed (${f.reason ?? 'sources_disagree'})` : (f.reason ?? 'unknown');
      if (f?.reason !== 'not_applicable') excluded[i.name] = why;
      if (i.required) missingRequired.push(`${i.name}: ${why}`);
    }
  }
  const max = Object.values(used).reduce((s, u) => s + u.max, 0);
  const usedCount = Object.keys(used).length;
  if (opts.minInputs && usedCount < opts.minInputs && !missingRequired.length) {
    return { score: null, status: 'not_scored', reason: `only ${usedCount} usable input(s); at least ${opts.minInputs} are needed for this dimension`, inputs_used: used, inputs_excluded: excluded };
  }
  if (missingRequired.length || max === 0) {
    return { score: null, status: 'not_scored', reason: missingRequired.length ? `required input not usable: ${missingRequired.join('; ')}` : 'no usable inputs', inputs_used: used, inputs_excluded: excluded };
  }
  const got = Object.values(used).reduce((s, u) => s + u.points, 0);
  return { score: Math.round((got / max) * 100), status: 'scored', inputs_used: used, inputs_excluded: excluded };
}

const band = (v: number, steps: Array<[number, number]>, otherwise: number) => {
  for (const [lim, pts] of steps) if (v < lim) return pts;
  return otherwise;
};

export function scoreRecord(rec: ScanRecord): ScoreResult {
  const c = rec.chain;
  const isSol = rec.chain_id === 'solana';
  const renounced = isSol ? null : isRenounced(c.owner_address);
  const privileged = (active: boolean, full: number, ifRenounced: number, ifActive: number) => (!active ? full : renounced ? ifRenounced : ifActive);

  const security = isSol
    ? dimension([
      { name: 'mint_authority_active', field: c.mint_authority_active, max: 35, points: (v) => (v ? 0 : 35), required: true, corroborated: true },
      { name: 'freeze_authority_active', field: c.freeze_authority_active, max: 30, points: (v) => (v ? 0 : 30), required: true, corroborated: true },
      { name: 'permanent_delegate', field: c.permanent_delegate, max: 15, points: (v) => (v ? 0 : 15) },
      { name: 'transfer_hook', field: c.transfer_hook, max: 10, points: (v) => (v ? 0 : 10) },
      { name: 'pausable', field: c.pausable, max: 10, points: (v) => (v ? 0 : 10) },
      { name: 'transfer_tax_pct', field: c.transfer_tax_pct, max: 10, points: (v) => (v === 0 ? 10 : v <= 1 ? 5 : 0) },
    ])
    : dimension([
      { name: 'honeypot', field: c.honeypot, max: 30, points: (v) => (v ? 0 : 30), required: true },
      { name: 'mint_authority_active', field: c.mint_authority_active, max: 20, points: (v) => privileged(v, 20, 15, 0), required: true, corroborated: true },
      { name: 'upgradeable_proxy', field: c.upgradeable_proxy, max: 15, points: (v) => (v ? 5 : 15) },
      { name: 'pausable', field: c.pausable, max: 10, points: (v) => privileged(v, 10, 8, 3), corroborated: true, gateOnlyIf: (v) => v === false },
      { name: 'blacklist', field: c.blacklist, max: 10, points: (v) => privileged(v, 10, 8, 3), corroborated: true, gateOnlyIf: (v) => v === false },
      { name: 'max_tax_pct', field: maxTax(c.buy_tax_pct, c.sell_tax_pct), max: 15, points: (v) => (v === 0 ? 15 : v <= 1 ? 12 : v <= 5 ? 6 : v <= 10 ? 2 : 0) },
    ]);
  // A confirmed honeypot is a hard fail regardless of other inputs.
  if (!isSol && usable(c.honeypot) && c.honeypot.value === true) security.score = 0;

  // Concentration is scored on the RAW top-10 share (two sources), and only when the on-chain supply it is a share of is
  // corroborated too. The label-adjusted share stays a stored, displayed measurement but does not drive the score: it
  // depends on labels and on balances below rank 10 that no second source checks (Codex round 2, finding 2).
  const denominatorOk = usable(c.total_supply_onchain) && c.total_supply_onchain.corroborated === true;
  const conc: Field<number> = { ...c.top10_pct, corroborated: usable(c.top10_pct) && c.top10_pct.corroborated === true && denominatorOk };
  const tokenomics = dimension([
    { name: 'circulating_ratio', field: rec.derived.circulating_ratio, max: 35, points: (v) => band(v, [[0.3, 6], [0.5, 12], [0.7, 18], [0.9, 24]], 35), required: true, corroborated: true },
    { name: 'top10_pct', field: conc, max: 40, points: (v) => band(v, [[20, 40], [35, 32], [50, 22], [70, 12]], 4), required: true, corroborated: true },
    { name: 'unlock_90d_pct_of_circ', field: rec.derived.unlock_90d_pct_of_circ, max: 25, points: (v) => band(v, [[0.001, 25], [2, 20], [5, 12], [10, 6]], 0) },
  ]);

  const l = rec.liquidity;
  const liquidity = dimension([
    { name: 'dex_liquidity_usd', field: l.dex_liquidity_usd, max: 40, points: (v) => (v > 10e6 ? 40 : v > 1e6 ? 32 : v > 250e3 ? 24 : v > 50e3 ? 14 : v > 10e3 ? 6 : 0), required: true },
    { name: 'slippage_100k_pct', field: l.slippage_100k_pct, max: 30, points: (v) => band(v, [[1, 30], [3, 22], [10, 12], [30, 5]], 0) },
    { name: 'volume_24h_usd', field: rec.market.volume_24h_usd, max: 15, points: (v) => (v > 10e6 ? 15 : v > 1e6 ? 11 : v > 100e3 ? 6 : 2) },
    { name: 'liquidity_locked_pct', field: c.liquidity_locked_pct, max: 15, points: (v) => (v >= 90 ? 15 : v >= 50 ? 10 : v > 0 ? 5 : 0) },
  ]);

  // Community and development read Fields from rec.social (social.ts): a failed provider call or a zero reading is
  // unknown and earns nothing; only usable inputs are scored, and at least two are needed.
  const so = rec.social?.community;
  const community = dimension([
    { name: 'sentiment', field: so?.sentiment, max: 35, points: (v) => (v >= 75 ? 35 : v >= 60 ? 22 : v >= 45 ? 12 : v > 0 ? 5 : 0) },
    { name: 'social_dominance', field: so?.social_dominance, max: 25, points: (v) => (v >= 2 ? 25 : v >= 0.5 ? 15 : v >= 0.1 ? 8 : v > 0 ? 3 : 0) },
    { name: 'trend', field: so?.trend, max: 10, points: (v) => (v === 'up' ? 10 : v === 'flat' ? 5 : 0) },
    { name: 'discord_members', field: so?.discord_members, max: 18, points: (v) => (v > 50000 ? 18 : v > 10000 ? 14 : v > 5000 ? 10 : v > 1000 ? 6 : 3) },
    { name: 'telegram_members', field: so?.telegram_members, max: 12, points: (v) => (v > 50000 ? 12 : v > 10000 ? 9 : v > 5000 ? 6 : v > 1000 ? 4 : 2) },
  ], { minInputs: 2 });

  const gh = rec.social?.github;
  const development = dimension([
    { name: 'commits_30d', field: gh?.commits_30d, max: 40, points: (v) => (v > 20 ? 40 : v > 10 ? 30 : v > 5 ? 20 : v > 0 ? 10 : 0), required: true },
    { name: 'last_push_age_days', field: gh?.last_push_age_days, max: 15, points: (v) => (v < 7 ? 15 : v < 30 ? 12 : v < 90 ? 8 : v < 180 ? 4 : 0), required: true },
    { name: 'issue_close_ratio', field: gh?.issue_close_ratio, max: 25, points: (v) => (v > 0.8 ? 25 : v > 0.6 ? 20 : v > 0.4 ? 15 : v > 0.2 ? 10 : 0) },
    { name: 'stars', field: gh?.stars, max: 8, points: (v) => (v > 1000 ? 8 : v > 100 ? 6 : v > 10 ? 4 : v > 0 ? 2 : 0) },
    { name: 'forks', field: gh?.forks, max: 7, points: (v) => (v > 100 ? 7 : v > 20 ? 5 : v > 5 ? 3 : v > 0 ? 1 : 0) },
    { name: 'contributors_count', field: gh?.contributors_count, max: 10, points: (v) => (v > 50 ? 10 : v > 20 ? 8 : v > 10 ? 6 : v > 5 ? 4 : v > 0 ? 2 : 0) },
    { name: 'not_archived', field: gh?.is_archived, max: 10, points: (v) => (v ? 0 : 10) },
  ]);

  const dimensions = { security, tokenomics, liquidity, community, development };
  const scored = Object.entries(dimensions).filter(([, d]) => d.score !== null);
  const excluded = Object.entries(dimensions).filter(([, d]) => d.score === null).map(([k]) => k);
  let overall: number | null = null;
  let overall_reason: string | undefined;
  if (security.score === null) overall_reason = 'security not scored';
  else if (scored.length < 3) overall_reason = `only ${scored.length} of 5 dimensions scored`;
  else overall = Math.round(scored.reduce((s, [, d]) => s + (d.score as number), 0) / scored.length);
  return { scoring_version: SCORING_VERSION, overall, overall_reason, excluded_dimensions: excluded, dimensions };
}

function maxTax(buy: Field<number>, sell: Field<number>): Field<number> {
  if (usable(buy) && usable(sell)) return { ...buy, value: Math.max(buy.value, sell.value), sources: [...buy.sources, ...sell.sources] };
  return !usable(buy) ? buy : sell;
}
