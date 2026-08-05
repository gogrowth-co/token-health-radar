import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';
import { requireCronSecret } from '../_shared/authGuard.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

// Supabase edge functions hit a ~150s idle timeout. The old implementation
// looped all tokens serially through run-token-scan (3s delay) then a
// SECOND full serial loop through generate-token-report (5s delay) — 208s
// of sleep alone before any API work, and generate-token-report's own call
// never included the required `userId` (it 400s without one — an admin
// gate, unrelated to the timeout). Both bugs meant this function has
// never fully completed a batch since generate-token-report added its
// admin-role check. Fixed 2026-08-05:
//   1. One per-token pass (scan -> report), not two.
//   2. ADMIN_USER_ID env var passed to generate-token-report.
//   3. Time-budgeted: stop launching new tokens past TIME_BUDGET_MS,
//      oldest-updated-first, so a truncated run still makes progress and
//      the next cron tick picks up where this one left off.
//   4. generate-token-report calls OpenAI directly — a burst of concurrent
//      calls 429s, so those run at concurrency 1 with backoff; run-token-scan
//      calls (multiple independent third-party APIs) run at concurrency 3.

const TIME_BUDGET_MS = 110_000; // leave ~40s margin under the 150s gateway limit
const STALE_AFTER_DAYS = 6; // refresh anything not updated in the last 6 days

interface TokenRow {
  token_address: string;
  chain_id: string;
  token_symbol: string;
  updated_at: string;
}

interface RefreshSummary {
  totalStale: number;
  attempted: number;
  scanOk: number;
  scanFailed: number;
  reportOk: number;
  reportFailed: number;
  truncatedByBudget: boolean;
  errors: Array<{ token: string; step: string; error: string }>;
  startTime: string;
  endTime: string;
  duration: number;
}

async function callFn(supabaseUrl: string, serviceKey: string, name: string, body: unknown, timeoutMs = 45000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: (e as Error).message };
  } finally {
    clearTimeout(t);
  }
}

async function withConcurrency<T, R>(items: T[], worker: (item: T) => Promise<R>, concurrency: number): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runner));
  return results;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const blocked = requireCronSecret(req, corsHeaders);
  if (blocked) return blocked;

  const startTime = new Date();
  const deadline = startTime.getTime() + TIME_BUDGET_MS;
  console.log(`[WEEKLY-REFRESH] Starting at ${startTime.toISOString()}, budget ${TIME_BUDGET_MS}ms`);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminUserId = Deno.env.get('ADMIN_USER_ID');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!adminUserId) {
      return new Response(
        JSON.stringify({ success: false, error: 'ADMIN_USER_ID not configured — generate-token-report requires an admin user id' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const staleCutoff = new Date(Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: tokenReports, error: fetchError } = await supabase
      .from('token_reports')
      .select('token_address, chain_id, token_symbol, updated_at')
      .lt('updated_at', staleCutoff)
      .order('updated_at', { ascending: true }); // stalest first — survives truncation

    if (fetchError) {
      console.error('[WEEKLY-REFRESH] fetch error:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch token reports' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const all = (tokenReports || []) as TokenRow[];
    const summary: RefreshSummary = {
      totalStale: all.length,
      attempted: 0,
      scanOk: 0,
      scanFailed: 0,
      reportOk: 0,
      reportFailed: 0,
      truncatedByBudget: false,
      errors: [],
      startTime: startTime.toISOString(),
      endTime: '',
      duration: 0,
    };

    // Slice to what plausibly fits the time budget; oldest-first ordering
    // means anything left over is picked up by the NEXT cron tick.
    const batch: TokenRow[] = [];
    for (const t of all) {
      if (Date.now() > deadline - 15000) {
        summary.truncatedByBudget = true;
        break;
      }
      batch.push(t);
    }
    console.log(`[WEEKLY-REFRESH] Processing ${batch.length}/${all.length} tokens this run`);

    // Phase 1: scans, concurrency 3 (independent 3rd-party APIs, no shared quota)
    await withConcurrency(
      batch,
      async (token) => {
        if (Date.now() > deadline) return;
        summary.attempted++;
        const r = await callFn(supabaseUrl, supabaseServiceKey, 'run-token-scan', {
          token_address: token.token_address.toLowerCase(),
          chain_id: token.chain_id,
          force_refresh: true,
          user_id: null,
          batch_mode: true,
        });
        if (r.ok) {
          summary.scanOk++;
        } else {
          summary.scanFailed++;
          summary.errors.push({ token: token.token_symbol, step: 'scan', error: r.text.slice(0, 200) });
        }
      },
      3
    );

    // Phase 2: report generation, concurrency 1 with backoff (shared OpenAI quota)
    for (const token of batch) {
      if (Date.now() > deadline) {
        summary.truncatedByBudget = true;
        break;
      }
      let delay = 4000;
      let done = false;
      for (let attempt = 0; attempt <= 3 && !done && Date.now() < deadline; attempt++) {
        const r = await callFn(supabaseUrl, supabaseServiceKey, 'generate-token-report', {
          tokenAddress: token.token_address,
          chainId: token.chain_id,
          userId: adminUserId,
        });
        if (r.ok) {
          summary.reportOk++;
          done = true;
        } else if (r.text.includes('429') && attempt < 3) {
          await new Promise((res) => setTimeout(res, delay));
          delay = Math.min(delay * 1.6, 12000);
        } else {
          summary.reportFailed++;
          summary.errors.push({ token: token.token_symbol, step: 'report', error: r.text.slice(0, 200) });
          done = true;
        }
      }
    }

    // Only regenerate the sitemap if something actually changed.
    if (summary.reportOk > 0) {
      try {
        await supabase.functions.invoke('generate-sitemap', {
          body: { trigger_source: 'weekly_refresh', timestamp: new Date().toISOString() },
        });
      } catch (e) {
        console.error('[WEEKLY-REFRESH] sitemap trigger failed:', e);
      }
    }

    const endTime = new Date();
    summary.endTime = endTime.toISOString();
    summary.duration = endTime.getTime() - startTime.getTime();

    console.log('[WEEKLY-REFRESH] done:', JSON.stringify(summary));

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        message: `Processed ${summary.attempted}/${summary.totalStale} tokens (scans ${summary.scanOk} ok, reports ${summary.reportOk} ok)${summary.truncatedByBudget ? ' — truncated by time budget, remainder picked up next run' : ''}`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[WEEKLY-REFRESH] fatal:', error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
