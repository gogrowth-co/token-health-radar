# Remediation Plan — Diagnosis Audit

Confirmed findings via spot-checks. Below is a prioritized fix plan grouped into three waves so you can stop after any wave and still have a measurably healthier system.

## Audit corrections (before we start)

- **`check-scan-access-v2` is NOT a duplicate live function.** Its own header says "This is an example of the check-scan-access function updated with..." — it's a reference template documented in `_shared/README.md`. Frontend correctly calls `check-scan-access`. Action: rename to `_examples/` or delete, but no live wiring conflict.
- **`fetchGeckoTerminalData` alias** is real (`_shared/apiClients.ts:39`) and is consumed by `debug-api-health` — so the API Health dashboard mislabels Moralis as GeckoTerminal. Confirmed.
- **Live API smoke tests still pending.** Sandbox blocks egress. After Wave 1, run `debug-api-health` from an admin session to get real uptime numbers.

---

## Wave 1 — Critical (do first)

Goal: stop silent failures and remove leaked secrets-in-code.

1. **Move Make.com webhook URL to a secret**
   - Add `MAKE_WEBHOOK_URL` secret. Replace hardcoded `https://hook.us2.make.com/6agypb...` in `supabase/functions/make-webhook/index.ts` (lines 67, 98) and `test-webhook-send/index.ts`.
   - Rotate the Make.com scenario URL (the old one is in git history forever).

2. **Decide & execute on the broken image generators**
   - `render-chart` (dead code after `return new Uint8Array()` at line 216), `compose-hero`, `ai-hero-background`, `render-score-snapshot` — all return empty bytes or are stubbed.
   - Recommend: **delete** `render-chart`, `compose-hero`, `ai-hero-background`, `render-score-snapshot` and consolidate any callers behind the working `generate-hero-image`. Faster than fixing `deno-canvas`.
   - Audit `orchestrate-visuals` and frontend `VisualsOrchestrator` / `ChartPreviewGrid` for dangling references and replace with placeholders or `generate-hero-image`.

3. **Fail-loud on missing required secrets**
   - `mcp-content`: if `MCP_CONTENT_SECRET` is unset, return 503 at boot (not silent 401 on every call).
   - Add the same pattern to `hubspot-sync`, `make-webhook`, `airtable-sync`, `stripe-webhook` — log once at cold start, return 503 on requests.

4. **Add timeouts to 8004scan.io calls**
   - `scan-agent` and `fetch-agent-directory`: wrap fetches in `AbortSignal.timeout(8000)` with a single retry, then graceful fallback (return cached data or empty registry — never hang).

5. **Fix `useTokenSearch` race condition**
   - `src/hooks/useTokenSearch.ts`: add `AbortController` per query, abort previous on new keystroke; only `setResults` if not aborted.

## Wave 2 — High-risk hardening

6. **Rate-limit `mcp-chat`**
   - It's public, hits OpenAI/Lovable AI gateway = real $$$. Add the same per-IP 60/h gate already used by `coingecko-mcp` and `token-health-mcp` (`_shared/rateLimit.ts`).

7. **Worker cleanup (`workers/bot-prerender.js` + `wrangler.toml`)**
   - Remove unused `nodejs_compat` flag.
   - Add `AbortSignal.timeout(5000)` to all Supabase storage/edge fetches.
   - Add `if (!upstream.ok) return new Response("upstream", { status: 502 })` on storage proxy responses.
   - Move hardcoded `qaqebpcqespvzbfwawlp` project ref into a Worker env var.

8. **Open-redirect hardening**
   - `GenerateReportButton.tsx:52`, `auth/UserProfile.tsx:83`, `Pricing.tsx:79`: validate that `data.url` / `reportUrl` is same-origin or on an allowlist (`tokenhealthscan.com`, `*.lovable.app`, `checkout.stripe.com`, `billing.stripe.com`) before assigning to `window.location.href`.

9. **Fix `apiClients.ts` mislabel**
   - Remove `export const fetchGeckoTerminalData = fetchMoralisPriceData;` and update `debug-api-health` to either call real GeckoTerminal or relabel the dashboard tile to "Moralis Price".

10. **Move Airtable base/table IDs to env**
    - `airtable-sync`, `airtable-full-sync`, `debug-airtable`: read `AIRTABLE_BASE_ID` / `AIRTABLE_TABLE_ID` from `Deno.env`.

11. **Resolve `check-scan-access-v2`**
    - Either move to `supabase/functions/_examples/check-scan-access-v2/` (won't deploy) or delete + keep doc snippet inline in `_shared/README.md`.

## Wave 3 — Cleanup

12. **Front-end micro-bugs**
    - `useToast` listener cleanup capturing stale state (`src/hooks/use-toast.ts:174-182`).
    - `useAdminUsers` mounted flag.
    - Bound module-level `tokenDetailCache` in `src/utils/tokenSearch.ts` (LRU, ~100 entries, 5-min TTL).
    - Replace hardcoded `https://tokenhealthscan.com/publications/${slug}` in `usePages.ts:63` with `window.location.origin`.

13. **Lint debt (215 problems)**
    - Bulk `no-explicit-any` (196) — defer unless a file is being touched anyway.
    - Real fixes worth doing: 7× `react-hooks/exhaustive-deps`, 5× `prefer-const`, 1× `no-require-imports` in `tailwind.config.ts:106`.

14. **Bundle size**
    - Main chunk 1.10 MB. Add manual chunks for `recharts`, route-level `React.lazy()` for admin/CMS pages.
    - `npx update-browserslist-db@latest`.

15. **Live API verification**
    - After Wave 1: run `debug-api-health` from admin session; capture uptime % per provider; convert into the first real "go/no-go" health snapshot.

---

## Out of scope (call out, don't auto-fix)

- **RLS audit of 91 migrations** — needs its own dedicated pass, not a sweep.
- **Replacing canvas-based image generation with proper server-side rendering** — only do if the OG/snapshot images are a product priority; otherwise deletion in Wave 1 step 2 is fine.
- **Consolidating duplicate APIs (Moralis vs GeckoTerminal vs CoinGecko)** — architectural decision, not a bug.

---

## Suggested execution order if you approve

Approve "Wave 1" → I implement steps 1–5 in one batch, then stop and report. You decide whether to continue to Wave 2.