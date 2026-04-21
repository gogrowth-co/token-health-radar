

## Lovable Pre-Nov-2025 Exposure Hardening Plan

Your project was created before Nov 2025 and is currently set to **public visibility**. The published code, chat history, and Supabase service role key (visible in 10 migration files) are likely already enumerated. This plan rotates everything that was exposed, locks down the backend, and makes the project private.

### Current State (verified)
- **Publish visibility**: `public` — anyone can read your project
- **Service role key**: hardcoded in **10 migration files** (`SUPABASE_SERVICE_ROLE_KEY` value visible in repo + git history)
- **6 unauthenticated edge functions** burn paid API quota: `run-token-scan`, `weekly-token-refresh`, `mcp-chat`, `coingecko-mcp`, `ai-hero-background`, `render-chart`
- **Privilege escalation**: `subscribers` table UPDATE policy lets users edit their own `plan`, `scans_used`, `pro_scan_limit` → free unlimited Pro
- **Data poisoning**: `agent_scans` INSERT policy allows anyone to insert rows with arbitrary `user_id`
- **`upsert_subscriber_by_email`** SECURITY DEFINER grants lifetime plan to any email with no caller check
- **Pro gating bypassed**: all 6 `token_*_cache` tables are public-readable; the blur is client-side only
- **`anonymous_scan_attempts`** accepts user-supplied IPs → rate-limit pollution

---

### Phase 1 — Rotate every exposed credential (USER ACTIONS, must do before code changes)

You must do these in the dashboards. I cannot rotate keys for you.

1. **Supabase Service Role Key** (highest priority — bypasses all RLS)
   - Dashboard → Settings → API → "Reset service_role secret"
   - The leaked value `…VQvbS4M6hd3A4QdKFHe-I9xQh9SJZ6xR7NCHCCQSqOY` will stop working
2. **Supabase anon / publishable key** — Dashboard → Settings → API → reset (less critical, but rotate)
3. **Database password** — Dashboard → Settings → Database → reset password; update any external connection strings
4. **All third-party API keys you ever pasted into Lovable chat or stored as secrets** — rotate at source, then update in Supabase Edge Function secrets:
   - Stripe (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
   - OpenAI (`OPENAI_API_KEY`)
   - Moralis, GoPlus (`GOPLUS_API_KEY`, `GOPLUS_APP_KEY`, `GOPLUS_APP_SECRET`), CoinGecko, CoinMarketCap, LunarCrush, Webacy, Helius, Etherscan, GitHub, Apify, Airtable, HubSpot
   - `INTERNAL_API_SECRET`, `MCP_AUTH_TOKEN`, `KV_TOKEN`
5. **Make project private** — Lovable → Project Settings → Publish → set visibility to **Private** (requires Pro plan). If you stay on Free, the published URL remains world-readable.

---

### Phase 2 — Code & DB changes I will implement after approval

**A. Purge service role key from migration files**
Create a single new migration `20260421_redact_service_role_keys.sql` with a comment noting redaction. Then rewrite the 10 affected migration files to use `current_setting('app.settings.service_role_key')` from Vault (matching the existing `20251030000001_fix_exposed_service_role_key.sql` pattern). Files to clean:
- `20250612125523*.sql`, `20250612130000*.sql`, `20250718191025*.sql`, `20250903031254*.sql`, `20250909201745*.sql`, `20250909203003*.sql`, `20250909205551*.sql`, `20250909211414*.sql`, `20250909211704*.sql`, `20250911161353*.sql`

(Note: git history still contains the old key — the rotation in Phase 1 is what actually neutralizes it.)

**B. Fix critical RLS / privilege escalation**

| Table / Function | Fix |
|---|---|
| `subscribers` UPDATE policy | Drop user UPDATE policy entirely; all writes go through service role / edge functions |
| `agent_scans` INSERT policy | Replace `WITH CHECK (true)` with `user_id IS NULL OR user_id = auth.uid()` |
| `anonymous_scan_attempts` INSERT | Restrict to service role only; remove anon INSERT |
| `upsert_subscriber_by_email()` | Add `IF auth.role() <> 'service_role' THEN RAISE EXCEPTION` guard |
| `kiwify-webhook` edge function | Add Kiwify signature validation before calling the RPC |

**C. Add authentication / shared secret to open edge functions**
- `run-token-scan` → require either valid Supabase JWT or `x-internal-secret: $INTERNAL_API_SECRET`; add IP rate limit for anonymous calls
- `weekly-token-refresh` → require `x-cron-secret: $CRON_SECRET` (new secret)
- `ai-hero-background`, `render-chart`, `render-score-snapshot`, `compose-hero`, `orchestrate-visuals` → require valid JWT (these cost OpenAI money)
- `mcp-chat`, `coingecko-mcp`, `token-health-mcp` → IP rate-limit via existing `_shared/rateLimit.ts` (keep public for MCP but cap abuse)

**D. Server-side Pro gating (optional but recommended)**
Create `get_token_scores(token_address, chain_id)` RPC that checks the caller's `subscribers.plan` + scan quota and returns nulled-out category scores for free users past their quota. Switch frontend to use this RPC instead of querying `token_*_cache` directly. Leaves the public tables readable for SEO/llms.txt but removes the trivial bypass.

**E. Minor Supabase linter fixes**
- Set `search_path` on the 4 functions still missing it
- Move extensions out of `public` schema (where safe)
- Enable Auth → Leaked Password Protection in dashboard (user action)
- Schedule Postgres minor version upgrade in dashboard (user action)

---

### Phase 3 — Audit (USER ACTIONS, after rotation)

Once Phase 1 + 2 are done, you should:

1. Open `https://token-health-radar.lovable.app` in incognito and confirm code/chat history is no longer accessible (after switching to Private).
2. **Supabase logs review** — Dashboard → Logs → Postgres logs for last 48 days, look for:
   - `SELECT … FROM subscribers` from unfamiliar IPs
   - `SELECT … FROM auth.users` — should be zero from anon
   - Bulk reads of `token_reports`, `agent_scans`, `user_roles`
   I can write the SQL queries against `supabase--analytics_query` for you in the next loop if you want.
3. **Edge function logs** — check `run-token-scan`, `kiwify-webhook`, `stripe-webhook`, `airtable-sync` for unexpected callers in the last 48 days.
4. **Stripe dashboard** — review Customers and Subscriptions for any accounts you didn't expect (someone may have used the `upsert_subscriber_by_email` bypass).

---

### Order of Execution

1. **You**: Rotate service role key in Supabase dashboard (Phase 1 #1) — do this first, everything else can wait
2. **You**: Approve this plan in Lovable
3. **Me**: Implement Phase 2 (migrations + edge function auth + RLS fixes) in build mode
4. **You**: Rotate remaining keys (Phase 1 #2-4), make project private (Phase 1 #5), enable Postgres upgrade + leaked-password protection
5. **You + Me**: Run audit queries from Phase 3

### What I will NOT touch
- `auth`, `storage`, `realtime`, `vault`, `supabase_functions` schemas
- `src/integrations/supabase/types.ts` (auto-generated)
- Any working RLS policy that just needs a `WITH CHECK` tightening will get a focused, minimal edit

