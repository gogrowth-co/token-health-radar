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
import { calculateCommunityScore, calculateDevelopmentScore } from '../scoringUtils.ts';
import { type Field, usable } from './field.ts';
import { isRenounced } from './evm.ts';
import type { ScanRecord } from './types.ts';

export const SCORING_VERSION = '2.0.0';

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

type Input = { name: string; field: Field<any> | undefined; max: number; points: (v: any) => number; required?: boolean };

function dimension(inputs: Input[]): DimensionScore {
  const used: DimensionScore['inputs_used'] = {};
  const excluded: DimensionScore['inputs_excluded'] = {};
  const missingRequired: string[] = [];
  for (const i of inputs) {
    const f = i.field as Field<any> | undefined;
    if (f && (usable(f) as boolean)) used[i.name] = { value: f.value, points: i.points(f.value), max: i.max };
    else {
      const why = !f ? 'missing' : f.status === 'disputed' ? `disputed (${f.reason ?? 'sources_disagree'})` : (f.reason ?? 'unknown');
      if (f?.reason !== 'not_applicable') excluded[i.name] = why;
      if (i.required) missingRequired.push(`${i.name}: ${why}`);
    }
  }
  const max = Object.values(used).reduce((s, u) => s + u.max, 0);
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

export function scoreRecord(
  rec: ScanRecord,
  extras: {
    community?: { sentiment: number | null; socialDominance: number | null; trend: string | null; discordMembers: number | null; telegramMembers: number | null } | null;
    github?: any | null;
  } = {},
): ScoreResult {
  const c = rec.chain;
  const isSol = rec.chain_id === 'solana';
  const renounced = isSol ? null : isRenounced(c.owner_address);
  const privileged = (active: boolean, full: number, ifRenounced: number, ifActive: number) => (!active ? full : renounced ? ifRenounced : ifActive);

  const security = isSol
    ? dimension([
      { name: 'mint_authority_active', field: c.mint_authority_active, max: 35, points: (v) => (v ? 0 : 35), required: true },
      { name: 'freeze_authority_active', field: c.freeze_authority_active, max: 30, points: (v) => (v ? 0 : 30), required: true },
      { name: 'permanent_delegate', field: c.permanent_delegate, max: 15, points: (v) => (v ? 0 : 15) },
      { name: 'transfer_hook', field: c.transfer_hook, max: 10, points: (v) => (v ? 0 : 10) },
      { name: 'transfer_tax_pct', field: c.transfer_tax_pct, max: 10, points: (v) => (v === 0 ? 10 : v <= 1 ? 5 : 0) },
    ])
    : dimension([
      { name: 'honeypot', field: c.honeypot, max: 30, points: (v) => (v ? 0 : 30), required: true },
      { name: 'mint_authority_active', field: c.mint_authority_active, max: 20, points: (v) => privileged(v, 20, 15, 0), required: true },
      { name: 'upgradeable_proxy', field: c.upgradeable_proxy, max: 15, points: (v) => (v ? 5 : 15) },
      { name: 'pausable', field: c.pausable, max: 10, points: (v) => privileged(v, 10, 8, 3) },
      { name: 'blacklist', field: c.blacklist, max: 10, points: (v) => privileged(v, 10, 8, 3) },
      { name: 'max_tax_pct', field: maxTax(c.buy_tax_pct, c.sell_tax_pct), max: 15, points: (v) => (v === 0 ? 15 : v <= 1 ? 12 : v <= 5 ? 6 : v <= 10 ? 2 : 0) },
    ]);
  // A confirmed honeypot is a hard fail regardless of other inputs.
  if (!isSol && usable(c.honeypot) && c.honeypot.value === true) security.score = 0;

  // Concentration: prefer the share held by holders NOT labeled as project/pool/exchange/lock/burn.
  const useExternal = usable(c.top10_excl_noncirculating_pct) && usable(c.top10_pct);
  const conc: Field<number> = useExternal ? c.top10_excl_noncirculating_pct : c.top10_pct;
  const tokenomics = dimension([
    { name: 'circulating_ratio', field: rec.derived.circulating_ratio, max: 35, points: (v) => band(v, [[0.3, 6], [0.5, 12], [0.7, 18], [0.9, 24]], 35), required: true },
    { name: useExternal ? 'top10_excl_noncirculating_pct' : 'top10_pct', field: conc, max: 40, points: (v) => band(v, [[20, 40], [35, 32], [50, 22], [70, 12]], 4), required: true },
    { name: 'unlock_90d_pct_of_circ', field: rec.derived.unlock_90d_pct_of_circ, max: 25, points: (v) => band(v, [[0.001, 25], [2, 20], [5, 12], [10, 6]], 0) },
  ]);

  const l = rec.liquidity;
  const liquidity = dimension([
    { name: 'dex_liquidity_usd', field: l.dex_liquidity_usd, max: 40, points: (v) => (v > 10e6 ? 40 : v > 1e6 ? 32 : v > 250e3 ? 24 : v > 50e3 ? 14 : v > 10e3 ? 6 : 0), required: true },
    { name: 'slippage_100k_pct', field: l.slippage_100k_pct, max: 30, points: (v) => band(v, [[1, 30], [3, 22], [10, 12], [30, 5]], 0) },
    { name: 'volume_24h_usd', field: rec.market.volume_24h_usd, max: 15, points: (v) => (v > 10e6 ? 15 : v > 1e6 ? 11 : v > 100e3 ? 6 : 2) },
    { name: 'liquidity_locked_pct', field: c.liquidity_locked_pct, max: 15, points: (v) => (v >= 90 ? 15 : v >= 50 ? 10 : v > 0 ? 5 : 0) },
  ]);

  const cm = extras.community;
  const hasCommunity = !!cm && (cm.sentiment !== null || cm.socialDominance !== null || cm.trend !== null || (cm.discordMembers ?? 0) > 0 || (cm.telegramMembers ?? 0) > 0);
  const community: DimensionScore = hasCommunity
    ? { score: calculateCommunityScore({ sentiment: cm!.sentiment, socialDominance: cm!.socialDominance, trend: cm!.trend, discordMembers: cm!.discordMembers ?? 0, telegramMembers: cm!.telegramMembers ?? 0 }), status: 'scored', inputs_used: { social: { value: cm, points: 0, max: 0 } }, inputs_excluded: {} }
    : { score: null, status: 'not_scored', reason: 'no LunarCrush, Discord or Telegram data', inputs_used: {}, inputs_excluded: { social: 'no_data' } };
  const development: DimensionScore = extras.github
    ? { score: calculateDevelopmentScore(extras.github), status: 'scored', inputs_used: { github: { value: `${extras.github.owner}/${extras.github.repo}`, points: 0, max: 0 } }, inputs_excluded: {} }
    : { score: null, status: 'not_scored', reason: 'no GitHub repository data', inputs_used: {}, inputs_excluded: { github: 'no_data' } };

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
