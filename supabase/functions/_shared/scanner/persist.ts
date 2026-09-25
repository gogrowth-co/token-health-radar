// Map a ScanRecord + ScoreResult onto database rows.
//
// Legacy cache columns (read by the site today) receive ONLY usable values;
// unknown or disputed fields are written as null, never as 0/false/"total
// supply". Fields the scanner does not collect are omitted from the payload,
// so an upsert leaves those columns untouched. The full field-level record
// (value + source + fetched_at + confidence + raw ref) goes to token_scans.
import { type Field, usable } from './field.ts';
import { isRenounced } from './evm.ts';
import type { ScoreResult } from './scoring.ts';
import type { ScanRecord } from './types.ts';

const v = <T>(f: Field<T> | undefined): T | null => (usable(f) ? f.value : null);

export interface ScanRows {
  token_data_cache: Record<string, unknown>;
  token_security_cache: Record<string, unknown>;
  token_tokenomics_cache: Record<string, unknown>;
  token_liquidity_cache: Record<string, unknown>;
  token_scans: Record<string, unknown>; // base insert (columns that exist today)
  token_scans_v2: Record<string, unknown>; // columns added by migration 20260924120000
}

// Each date and amount is only rendered when that field is usable: an unknown never prints as "null" or "0".
export function vestingText(rec: ScanRecord): string | null {
  const u = rec.unlocks;
  if (!usable(u.emissions_source)) return null;
  const n = (x: number) => Math.round(x).toLocaleString('en-US');
  const source = u.emissions_source.value;
  const date = v(u.next_unlock_date);
  const amount = v(u.next_unlock_amount);
  const unsched = v(u.unscheduled_supply);
  const parts: string[] = [];
  if (source === 'derived_fully_circulating') {
    return unsched === null ? null : `No unlock schedule found; at most ${n(unsched)} tokens are not yet circulating (derived from CoinGecko and CoinMarketCap with supply unable to grow)`;
  }
  if (date === 'none_scheduled') parts.push(`No dated unlocks remain (DeFiLlama ${source}, schedule complete, last event ${v(u.last_scheduled_event) ?? 'n/a'})`);
  else if (date !== null) parts.push(`Next unlock ${date}${amount !== null ? `: ${n(amount)} tokens` : ''} (DeFiLlama ${source})`);
  if (unsched !== null && unsched > 0 && date !== 'none_scheduled') parts.push(`${n(unsched)} tokens have no schedule in the dataset`);
  return parts.length ? parts.join('; ') : null;
}

export function buildRows(rec: ScanRecord, score: ScoreResult, userId: string | null): ScanRows {
  const key = { token_address: rec.address_key, chain_id: rec.chain_id };
  const m = rec.market;
  const c = rec.chain;
  const isSol = rec.chain_id === 'solana';
  const name = v(m.name);
  const symbol = v(m.symbol);
  const links = v(m.links) ?? {};
  const twitterHandle = links.twitter?.match(/(?:twitter\.com|x\.com)\/([A-Za-z0-9_]+)/)?.[1] ?? null;
  const top10 = v(c.top10_pct);
  const ext = v(c.top10_excl_noncirculating_pct);
  const d = score.dimensions;

  const concentrationText = top10 === null
    ? null
    : `Top 10 hold ${top10.toFixed(1)}% of on-chain supply${ext !== null ? `; ${ext.toFixed(1)}% excluding labeled project, pool, exchange, lock and burn wallets` : ''} (${c.top10_pct.confidence} confidence, ${rec.scanned_at.slice(0, 10)})`;

  const vesting = vestingText(rec);

  const liq = v(rec.liquidity.dex_liquidity_usd);
  const lpLocked = v(c.liquidity_locked_pct);

  return {
    token_data_cache: {
      ...key,
      name: name ?? `Token ${rec.address_key.slice(0, 8)}`,
      symbol: symbol ?? 'UNKNOWN',
      logo_url: v(m.logo_url),
      coingecko_id: v(m.coingecko_id),
      current_price_usd: v(m.price_usd),
      market_cap_usd: v(m.market_cap_usd),
      circulating_supply: v(m.circulating_supply),
      website_url: links.website ?? null,
      twitter_handle: twitterHandle,
      github_url: links.github ?? null,
    },
    token_security_cache: {
      ...key,
      ownership_renounced: isSol ? (usable(c.mint_authority_active) ? !c.mint_authority_active.value : null) : isRenounced(c.owner_address),
      can_mint: v(c.mint_authority_active),
      freeze_authority: isSol ? v(c.freeze_authority_active) : null,
      honeypot_detected: v(c.honeypot),
      is_proxy: v(c.upgradeable_proxy),
      is_blacklisted: v(c.blacklist),
      is_liquidity_locked: lpLocked === null ? null : lpLocked > 0,
      liquidity_percentage: lpLocked,
      score: d.security.score,
      updated_at: rec.scanned_at,
    },
    token_tokenomics_cache: {
      ...key,
      total_supply: v(c.total_supply_onchain),
      circulating_supply: v(m.circulating_supply),
      supply_cap: v(m.max_supply),
      dex_liquidity_usd: liq,
      major_dex_pairs: v(rec.liquidity.top_pools),
      top_holders_count: v(c.holder_count),
      distribution_gini_coefficient: null, // needs a full holder list; see gini_coefficient field reason
      holder_concentration_risk: concentrationText,
      vesting_schedule: vesting,
      data_confidence_score: Math.round(rec.quality.completeness_pct),
      last_holder_analysis: top10 !== null ? rec.scanned_at : null,
      score: d.tokenomics.score,
      updated_at: rec.scanned_at,
    },
    token_liquidity_cache: {
      ...key,
      trading_volume_24h_usd: v(m.volume_24h_usd),
      dex_depth_status: liq === null ? null : liq > 1e6 ? 'Deep' : liq > 1e5 ? 'Moderate' : liq > 1e4 ? 'Shallow' : 'Very Low',
      holder_distribution: concentrationText,
      score: d.liquidity.score,
      updated_at: rec.scanned_at,
    },
    token_scans: {
      ...key,
      user_id: userId,
      score_total: score.overall,
      is_anonymous: !userId,
      pro_scan: false,
    },
    token_scans_v2: {
      scoring_version: score.scoring_version,
      dimension_scores: score,
      field_data: rec,
      data_quality: rec.quality,
      completeness_pct: rec.quality.completeness_pct,
      canonical_address: v(rec.address_canonical),
    },
  };
}
