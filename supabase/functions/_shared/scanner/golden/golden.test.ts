// Golden-set test: runs the real collector (live, read-only providers) on every
// token in golden-set.json and checks the hand-verified expectations.
// Run: deno test -A supabase/functions/_shared/scanner/golden/
// Filter one token: GOLDEN_ONLY=JUP deno test -A ...
import { collectToken } from '../collect.ts';
import { resetBreakers } from '../http.ts';
import { corroborated, type Field, usable } from '../field.ts';
import { scoreRecord } from '../scoring.ts';
import { buildRows, vestingText } from '../persist.ts';
import type { ScanRecord } from '../types.ts';

const golden = JSON.parse(await Deno.readTextFile(new URL('./golden-set.json', import.meta.url)));
const only = Deno.env.get('GOLDEN_ONLY')?.split(',');

export function getPath(rec: ScanRecord, path: string): Field<unknown> | undefined {
  const parts = path.split('.');
  let cur: any = rec;
  for (const p of parts) cur = cur?.[p];
  return cur;
}

export function checkExpectations(rec: ScanRecord, expect: Record<string, any>): string[] {
  const errors: string[] = [];
  for (const [path, e] of Object.entries(expect)) {
    if (path === 'flags') {
      const bad = rec.quality.flags.filter((f) => f.severity !== 'info');
      for (const rule of e.flag_absent ?? []) if (bad.some((f) => f.rule === rule)) errors.push(`flag ${rule} present: ${bad.find((f) => f.rule === rule)!.detail}`);
      for (const rule of e.flag_present ?? []) if (!rec.quality.flags.some((f) => f.rule === rule)) errors.push(`flag ${rule} missing`);
      continue;
    }
    const f = getPath(rec, path);
    if (!f) {
      errors.push(`${path}: field missing`);
      continue;
    }
    const where = `${path} = ${JSON.stringify(f.value)} [${f.status}${f.reason ? ':' + f.reason : ''}]`;
    if (e.status && f.status !== e.status) errors.push(`${where}: expected status ${e.status}${f.detail ? ' (' + f.detail + ')' : ''}`);
    if (e.reason && f.reason !== e.reason) errors.push(`${where}: expected reason ${e.reason}`);
    // A value only counts when the field is usable: a disputed field keeps its primary value for display.
    if ('eq' in e && !e.status && f.status !== 'ok') errors.push(`${where}: expected ${JSON.stringify(e.eq)} with status ok`);
    if ('eq' in e && f.value !== e.eq) errors.push(`${where}: expected ${JSON.stringify(e.eq)}${f.detail ? ' (' + f.detail + ')' : ''}`);
    if ('approx' in e) {
      if (typeof f.value !== 'number' || f.status !== 'ok') errors.push(`${where}: expected ~${e.approx} (status ok)${f.detail ? ' (' + f.detail + ')' : ''}`);
      else {
        const diff = Math.abs(f.value - e.approx);
        const tol = 'abs' in e ? e.abs : Math.abs(e.approx) * (e.rel ?? 0.02);
        if (diff > tol) errors.push(`${where}: expected ~${e.approx} (tolerance ${tol})`);
      }
    }
    if (e.not_eq_path) {
      const other = getPath(rec, e.not_eq_path);
      if (f.value !== null && other?.value === f.value) errors.push(`${where}: must not equal ${e.not_eq_path}`);
    }
  }
  return errors;
}

/** Invariants that must hold for EVERY token: nothing unusable is scored or stored (Codex review finding 18). */
export function checkInvariants(rec: ScanRecord): string[] {
  const errors: string[] = [];
  const score = scoreRecord(rec);
  const rows = buildRows(rec, score, null);
  const c = rec.chain;
  const m = rec.market;
  const sec = score.dimensions.security;
  if (sec.score !== null) {
    if (!corroborated(c.mint_authority_active)) errors.push('security scored without a corroborated mint authority');
    if (rec.chain_id === 'solana' && !corroborated(c.freeze_authority_active)) errors.push('security scored without a corroborated freeze authority');
  }
  if (score.dimensions.tokenomics.score !== null) {
    if (!corroborated(m.circulating_supply)) errors.push('tokenomics scored without corroborated circulating supply');
    if (!corroborated(c.top10_pct)) errors.push('tokenomics scored without corroborated top-10 concentration');
    if (!usable(c.total_supply_onchain)) errors.push('tokenomics scored while on-chain total supply is not usable');
  }
  if (score.overall !== null && (sec.score === null || Object.values(score.dimensions).filter((d) => d.score !== null).length < 3)) errors.push('overall scored without security + 3 dimensions');
  const t = rows.token_tokenomics_cache as any;
  const sc = rows.token_security_cache as any;
  if (t.circulating_supply !== (usable(m.circulating_supply) ? m.circulating_supply.value : null)) errors.push('stored circulating_supply differs from the usable field');
  if (t.actual_circulating_supply !== t.circulating_supply) errors.push('actual_circulating_supply not kept in step with circulating_supply');
  if (usable(m.circulating_supply) && usable(m.total_supply_market) && t.total_supply !== null && usable(c.total_supply_onchain) && usable(m.platform_count) && m.platform_count.value > 1 && t.total_supply === c.total_supply_onchain.value && c.total_supply_onchain.value !== m.total_supply_market.value) errors.push('multichain token stored the chain-local total next to a global circulating supply');
  if (!usable(c.mint_authority_active) && sc.can_mint !== null) errors.push('can_mint stored although mint authority is not usable');
  if (!usable(c.top10_pct) && t.holder_concentration_risk !== null) errors.push('concentration text stored although top-10 is not usable');
  const vt = vestingText(rec);
  if (vt && /null|undefined|NaN/.test(vt)) errors.push(`vesting text contains an unformatted value: ${vt}`);
  return errors;
}

for (const t of golden.tokens) {
  if (only && !only.includes(t.id)) continue;
  Deno.test({
    name: `golden ${t.id} (${t.chain})`,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      resetBreakers();
      const rec = await collectToken(t.address, t.chain);
      const errors = [...checkExpectations(rec, t.expect), ...checkInvariants(rec)];
      const outDir = Deno.env.get('GOLDEN_OUT');
      if (outDir) {
        await Deno.writeTextFile(`${outDir}/${t.id}.json`, JSON.stringify(rec, null, 1));
        await Deno.writeTextFile(`${outDir}/${t.id}.score.json`, JSON.stringify(scoreRecord(rec), null, 1));
      }
      if (errors.length) {
        throw new Error(`${t.id}: ${errors.length} expectation(s) failed\n  - ${errors.join('\n  - ')}\n  provider failures: ${JSON.stringify(rec.quality.provider_failures)}`);
      }
    },
  });
}
