// Local, read-only scanner run: `deno run -A cli.ts <address> <chain> [--json out.json]`.
// Collects and scores one token without touching the database.
import { collectToken } from './collect.ts';
import { scoreRecord } from './scoring.ts';
import type { Field } from './field.ts';

const [address, chain] = Deno.args;
const jsonIdx = Deno.args.indexOf('--json');
const rec = await collectToken(address, chain);
const score = scoreRecord(rec);
if (jsonIdx > -1) await Deno.writeTextFile(Deno.args[jsonIdx + 1], JSON.stringify({ record: rec, score }, null, 1));

const show = (name: string, f: Field<unknown>) => {
  const v = Array.isArray(f.value) ? `[${f.value.length} items]` : typeof f.value === 'object' && f.value !== null ? JSON.stringify(f.value).slice(0, 60) : f.value;
  console.log(`  ${name.padEnd(34)} ${String(v).padEnd(24)} ${f.status}${f.reason ? ':' + f.reason : ''} ${f.confidence ?? ''} [${[...new Set(f.sources.map((s) => s.source))].join(',')}]${f.status !== 'ok' && f.detail ? ' - ' + f.detail.slice(0, 110) : ''}`);
};
console.log(`${address} on ${rec.chain_id} (canonical ${rec.address_canonical.value})`);
for (const [grp, obj] of Object.entries({ market: rec.market, chain: rec.chain, liquidity: rec.liquidity, unlocks: rec.unlocks, derived: rec.derived })) {
  console.log(grp);
  for (const [k, f] of Object.entries(obj as Record<string, Field<unknown>>)) show(k, f);
}
const q = rec.quality;
console.log(`quality: ${q.completeness_pct}% complete, ok ${q.fields_ok}, disputed ${q.fields_disputed}, unknown ${q.fields_unknown}, n/a ${q.fields_not_applicable}, required missing [${q.required_missing}], paid credits ${q.paid_credits}`);
console.log('provider failures', JSON.stringify(q.provider_failures));
for (const fl of q.flags) console.log(`  flag ${fl.severity} ${fl.rule}: ${fl.detail}`);
console.log('score', JSON.stringify(score));
