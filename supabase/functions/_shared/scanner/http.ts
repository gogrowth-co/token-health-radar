// Provider HTTP client for the scanner: timeouts, retries with backoff, a
// per-provider circuit breaker, and a per-scan call/credit budget.
//
// A provider failure is returned as a typed reason (never thrown, never
// turned into a value). The caller decides what that means for the field.
import type { ReasonCode, SourceRef } from './field.ts';

export interface ProviderStat {
  calls: number;
  failures: number;
  last_reason?: ReasonCode;
  last_status?: number;
  credits: number;
  ms: number;
}

export type FetchResult<T = any> =
  | { ok: true; data: T; ref: SourceRef; status: number }
  | { ok: false; reason: ReasonCode; status?: number; detail?: string; ref: SourceRef; data?: undefined };

// Circuit breaker state lives per isolate (a warm edge-function instance
// scanning a batch shares it). 3 consecutive failures open the circuit for 60s.
const BREAKER_THRESHOLD = 3;
const BREAKER_COOLDOWN_MS = 60_000;
const breaker = new Map<string, { fails: number; openUntil: number }>();

export function resetBreakers() {
  breaker.clear();
}

export interface ScanBudget {
  maxCalls: number; // all HTTP calls in one scan
  maxPaidCredits: number; // provider credits (Nansen 5/call, CMC 1/call...) in one scan
}

export const DEFAULT_BUDGET: ScanBudget = { maxCalls: 80, maxPaidCredits: 15 };

export class ScanContext {
  stats: Record<string, ProviderStat> = {};
  calls = 0;
  credits = 0;
  constructor(public budget: ScanBudget = DEFAULT_BUDGET, public now: () => Date = () => new Date()) {}

  private stat(p: string): ProviderStat {
    return (this.stats[p] ??= { calls: 0, failures: 0, credits: 0, ms: 0 });
  }

  async fetchJson<T = any>(
    provider: string,
    url: string,
    init: RequestInit & { timeoutMs?: number; retries?: number; credits?: number; excerpt?: (d: any) => Record<string, unknown> } = {},
  ): Promise<FetchResult<T>> {
    const fetched_at = this.now().toISOString();
    const ref: SourceRef = { source: provider, fetched_at };
    const st = this.stat(provider);
    const b = breaker.get(provider);
    if (b && b.openUntil > Date.now()) return { ok: false, reason: 'circuit_open', ref, detail: `${provider} circuit open` };
    if (this.calls >= this.budget.maxCalls) return { ok: false, reason: 'budget_exhausted', ref, detail: 'per-scan call budget spent' };
    const credits = init.credits ?? 0;
    if (credits > 0 && this.credits + credits > this.budget.maxPaidCredits) {
      return { ok: false, reason: 'budget_exhausted', ref, detail: `per-scan paid-credit budget (${this.budget.maxPaidCredits}) would be exceeded` };
    }

    const retries = init.retries ?? 2;
    let last: FetchResult<T> = { ok: false, reason: 'provider_failed', ref };
    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) await sleep(attempt === 1 ? 600 : 1800);
      this.calls++;
      st.calls++;
      if (credits) {
        this.credits += credits;
        st.credits += credits;
      }
      const t0 = Date.now();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), init.timeoutMs ?? 10_000);
      try {
        const res = await fetch(url, { ...init, signal: ctrl.signal });
        const text = await res.text();
        st.ms += Date.now() - t0;
        st.last_status = res.status;
        if (res.status === 404) {
          last = { ok: false, reason: 'not_found', status: 404, ref, detail: text.slice(0, 160) };
          break; // a 404 is an answer, not a failure: don't retry, don't trip the breaker
        }
        if (res.status === 429) {
          last = { ok: false, reason: 'rate_limited', status: 429, ref };
          continue;
        }
        // GeckoTerminal intermittently serves a Cloudflare challenge page with 403.
        const isHtml = /^\s*</.test(text);
        if (!res.ok || isHtml) {
          last = { ok: false, reason: 'provider_failed', status: res.status, ref, detail: isHtml ? 'HTML/bot-challenge body instead of JSON' : text.slice(0, 160) };
          if (res.status >= 400 && res.status < 500 && res.status !== 403 && res.status !== 408) break; // client error: retrying won't help
          continue;
        }
        let data: any;
        try {
          data = JSON.parse(text);
        } catch {
          last = { ok: false, reason: 'provider_failed', status: res.status, ref, detail: 'non-JSON body' };
          continue;
        }
        ref.raw_ref = await shortHash(text);
        if (init.excerpt) {
          try {
            ref.raw_excerpt = init.excerpt(data);
          } catch { /* excerpt is best-effort */ }
        }
        breaker.delete(provider);
        return { ok: true, data, ref, status: res.status };
      } catch (e) {
        st.ms += Date.now() - t0;
        const aborted = (e as Error)?.name === 'AbortError';
        last = { ok: false, reason: aborted ? 'timeout' : 'provider_failed', ref, detail: (e as Error)?.message?.slice(0, 160) };
      } finally {
        clearTimeout(timer);
      }
    }
    if (last.ok === false && last.reason !== 'not_found') {
      st.failures++;
      st.last_reason = last.reason;
      const cur = breaker.get(provider) ?? { fails: 0, openUntil: 0 };
      cur.fails++;
      if (cur.fails >= BREAKER_THRESHOLD) cur.openUntil = Date.now() + BREAKER_COOLDOWN_MS;
      breaker.set(provider, cur);
    }
    return last;
  }

  /** JSON-RPC over a fallback chain of endpoints. Each endpoint is its own provider for breaker/stats. */
  async rpc<T = any>(family: string, endpoints: Array<{ name: string; url: string }>, method: string, params: unknown[], timeoutMs = 10_000): Promise<FetchResult<T>> {
    let last: FetchResult<T> | null = null;
    for (const ep of endpoints) {
      const r = await this.fetchJson<any>(`${family}:${ep.name}`, ep.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        timeoutMs,
        retries: 1,
      });
      if (r.ok) {
        if (r.data?.error) {
          // An execution revert is an answer about the contract, not an endpoint failure.
          if (/revert|execution reverted/i.test(r.data.error.message ?? '')) {
            return { ok: false, reason: 'no_data', ref: r.ref, detail: `reverted: ${r.data.error.message}`.slice(0, 160) };
          }
          last = { ok: false, reason: r.data.error.code === 429 ? 'rate_limited' : 'provider_failed', ref: r.ref, detail: JSON.stringify(r.data.error).slice(0, 160) };
          continue;
        }
        return { ok: true, data: r.data.result as T, ref: { ...r.ref, raw_excerpt: { method } }, status: r.status };
      }
      last = r;
    }
    return last ?? { ok: false, reason: 'provider_failed', ref: { source: family, fetched_at: this.now().toISOString() }, detail: 'no endpoints configured' };
  }

  failures(): Record<string, ReasonCode> {
    return Object.fromEntries(Object.entries(this.stats).filter(([, s]) => s.failures > 0).map(([k, s]) => [k, s.last_reason ?? 'provider_failed']));
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function shortHash(text: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return 'sha256:' + [...h.slice(0, 8)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
