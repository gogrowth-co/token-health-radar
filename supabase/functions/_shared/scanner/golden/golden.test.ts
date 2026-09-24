// Golden-set test: runs the real collector (live, read-only providers) on every
// token in golden-set.json and checks the hand-verified expectations.
// Run: deno test -A supabase/functions/_shared/scanner/golden/
// Filter one token: GOLDEN_ONLY=JUP deno test -A ...
import { collectToken } from '../collect.ts';
import { resetBreakers } from '../http.ts';
import type { Field } from '../field.ts';
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

for (const t of golden.tokens) {
  if (only && !only.includes(t.id)) continue;
  Deno.test({
    name: `golden ${t.id} (${t.chain})`,
    sanitizeOps: false,
    sanitizeResources: false,
    fn: async () => {
      resetBreakers();
      const rec = await collectToken(t.address, t.chain);
      const errors = checkExpectations(rec, t.expect);
      const outDir = Deno.env.get('GOLDEN_OUT');
      if (outDir) await Deno.writeTextFile(`${outDir}/${t.id}.json`, JSON.stringify(rec, null, 1));
      if (errors.length) {
        throw new Error(`${t.id}: ${errors.length} expectation(s) failed\n  - ${errors.join('\n  - ')}\n  provider failures: ${JSON.stringify(rec.quality.provider_failures)}`);
      }
    },
  });
}
