// refresh-token-page breaker (2026-11-18): pure, so it is unit-tested offline (breaker.test.ts).
// Provider circuit breaker (2026-11-18): from 10 Nov LunarCrush failed for every token and the hourly gap retry rescanned all 54 tokens
// around the clock (1,440 paid scans a day, 0 published). When the latest refreshes of BREAKER_TOKENS different tokens all lost the
// same input to a provider failure, the provider is down for everyone: no rescan can complete, so the cron stops rescanning and sends
// one probe token (one scan) every PROBE_EVERY_H. A probe that completes closes the breaker. Pages keep their last complete scan.
export const BREAKER_TOKENS = 3;
export const BREAKER_WINDOW_H = 6;
export const PROBE_EVERY_H = 1;
// Recovery ramp: at most this many tokens rescanned by the cron per rolling hour (steady state needs 54 / 20 h = 2.7). After an
// outage every token is due at once; the cap spreads the rebuilt cards and moved scores over about 4.5 hours instead of one (12 an hour,
// Gabriel 2026-11-18 "make it recover now"; LunarCrush: about 3 to 7 calls a scan, 2 keys of about 929 a day).
export const RESCAN_TOKENS_PER_HOUR = 12;
const SCAN_ERROR = /^(run-token-scan answered|the scan ran but no new scan|.*signal timed out|.*aborted)/i;
/** The breaker, read from the run log itself (no extra state): the latest refresh of each token that rescanned, newest first. */
export function breakerFrom(runs: Array<{ started_at: string; results: any[] | null }>, now = Date.now()) {
  const latest = new Map<string, { at: number; failing: Set<string>; probe: boolean }>();
  const attempts: number[] = [];
  for (const run of [...runs].sort((a, b) => Date.parse(b.started_at) - Date.parse(a.started_at))) {
    for (const r of run.results ?? []) {
      if (!r || !(Number(r.scan_attempts ?? r.rescanned) > 0)) continue;   // a scan was started for this token (paid), whatever came of it
      const at = Date.parse(run.started_at);
      attempts.push(at);
      if (latest.has(r.token)) continue;
      const failing = new Set<string>((r.gaps ?? []).map((g: string) => String(g).split(':')[0]));
      // the scan itself failed (run-token-scan errored or stored nothing): not a success either, so it never closes the breaker
      if (!r.ok && !failing.size && SCAN_ERROR.test(String(r.error ?? ''))) failing.add('scan');
      latest.set(r.token, { at, probe: !!r.probe, failing });
    }
  }
  const byTime = [...latest.entries()].sort((a, b) => b[1].at - a[1].at);
  const head = byTime.slice(0, BREAKER_TOKENS);
  let common: Set<string> | null = null as Set<string> | null;
  for (const [, v] of head) common = common ? new Set([...common].filter((k: string) => v.failing.has(k))) : new Set(v.failing);
  // a probe that completed is newer than every failure: the latest attempt decides first
  const open = head.length >= BREAKER_TOKENS && !!common && common.size > 0 && byTime[0][1].failing.size > 0;
  const lastAttempt = attempts.length ? Math.max(...attempts) : null;
  return {
    open, inputs: open ? [...common!].sort() : [], tokens: head.map(([t]) => t),
    probeDue: open && (lastAttempt == null || now - lastAttempt >= PROBE_EVERY_H * 3600000),
    rescannedLastHour: attempts.filter((a) => now - a < 3600000).length,   // token refreshes that started a scan, rolling hour
  };
}
