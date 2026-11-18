// Offline unit tests for the refresh breaker and ramp. Run: deno test -A supabase/functions/refresh-token-page/breaker.test.ts
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { breakerFrom, RESCAN_TOKENS_PER_HOUR } from './breaker.ts';

const NOW = Date.parse('2026-11-18T14:00:00Z');
const at = (minAgo: number) => new Date(NOW - minAgo * 60000).toISOString();
const LC = ['community.trend: provider_failed', 'community.sentiment: provider_failed'];
const fail = (token: string, gaps = LC, extra: any = {}) => ({ token, ok: false, rescanned: 2, gaps, error: 'scan incomplete', ...extra });

Deno.test('three different tokens losing the same input open the breaker; no probe while the last attempt is recent', () => {
  const b = breakerFrom([{ started_at: at(2), results: [fail('AAVE')] }, { started_at: at(4), results: [fail('MNT')] }, { started_at: at(6), results: [fail('STRK')] }], NOW);
  assert(b.open); assertEquals(b.inputs, ['community.sentiment', 'community.trend']); assertEquals(b.probeDue, false);
});

Deno.test('an hour after the last attempt one probe is due', () => {
  const b = breakerFrom([{ started_at: at(61), results: [fail('AAVE')] }, { started_at: at(63), results: [fail('MNT')] }, { started_at: at(65), results: [fail('STRK')] }], NOW);
  assert(b.open); assert(b.probeDue);
});

Deno.test('a probe that completes closes it', () => {
  const b = breakerFrom([{ started_at: at(1), results: [{ token: 'JUP', ok: true, rescanned: 1, probe: true, gaps: null }] },
    { started_at: at(61), results: [fail('AAVE')] }, { started_at: at(63), results: [fail('MNT')] }, { started_at: at(65), results: [fail('STRK')] }], NOW);
  assertEquals(b.open, false);
});

Deno.test('a probe that fails keeps it open', () => {
  const b = breakerFrom([{ started_at: at(1), results: [fail('JUP', LC, { probe: true, rescanned: 1 })] },
    { started_at: at(61), results: [fail('AAVE')] }, { started_at: at(63), results: [fail('MNT')] }], NOW);
  assert(b.open); assertEquals(b.probeDue, false);
});

Deno.test('one token stuck on its own gap (the same token three times) does not open it', () => {
  const b = breakerFrom([{ started_at: at(2), results: [fail('ATH')] }, { started_at: at(62), results: [fail('ATH')] }, { started_at: at(122), results: [fail('ATH')] }], NOW);
  assertEquals(b.open, false);
});

Deno.test('different gaps on different tokens (per-token rate limits) do not open it', () => {
  const b = breakerFrom([{ started_at: at(2), results: [fail('A', ['community.discord_members: rate_limited'])] },
    { started_at: at(4), results: [fail('B', ['community.telegram_members: rate_limited'])] }, { started_at: at(6), results: [fail('C', LC)] }], NOW);
  assertEquals(b.open, false);
});

Deno.test('the BREAKER line and rebuilds without a scan are not attempts', () => {
  const b = breakerFrom([{ started_at: at(1), results: [{ token: 'BREAKER', ok: false, rescanned: 0, gaps: LC }] },
    { started_at: at(2), results: [{ token: 'PEPE', ok: true, rescanned: 0 }] }, { started_at: at(70), results: [fail('AAVE')] }, { started_at: at(72), results: [fail('MNT')] }, { started_at: at(74), results: [fail('STRK')] }], NOW);
  assert(b.open); assert(b.probeDue); assertEquals(b.rescannedLastHour, 0);
});

Deno.test('a scan that errored is not a success: it cannot close the breaker, and three of them open it', () => {
  const err = (token: string) => ({ token, ok: false, scan_attempts: 1, rescanned: 0, gaps: null, error: 'run-token-scan answered 546: no detail' });
  assert(breakerFrom([{ started_at: at(1), results: [err('A')] }, { started_at: at(3), results: [err('B')] }, { started_at: at(5), results: [err('C')] }], NOW).open);
  const b = breakerFrom([{ started_at: at(1), results: [err('JUP')] }, { started_at: at(61), results: [fail('AAVE')] }, { started_at: at(63), results: [fail('MNT')] }], NOW);
  assertEquals(b.open, false, 'no common input: not the LunarCrush breaker');   // the error is counted for the ramp, below
  assertEquals(b.rescannedLastHour, 1);
});

Deno.test('the ramp counts every token refresh that started a scan in the rolling hour', () => {
  const runs = [1, 10, 20, 30, 70].map((m, i) => ({ started_at: at(m), results: [{ token: `T${i}`, ok: true, rescanned: 1 }] }));
  const b = breakerFrom(runs, NOW);
  assertEquals(b.open, false); assertEquals(b.rescannedLastHour, 4); assert(RESCAN_TOKENS_PER_HOUR - b.rescannedLastHour <= 0);
});
