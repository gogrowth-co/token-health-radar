

# Update: Drop Netlify, Keep Lovable Hosting + Cloudflare + Supabase

Revising the previous SEO/AEO plan to remove all Netlify surface. The deployment target is Lovable's published URL (`tokenhealthscan.com` proxied through Cloudflare). Cloudflare Worker becomes the *only* edge bot router.

## Revised 3-layer architecture

```text
Layer            Implementation
──────────────── ────────────────────────────────────────────────
1. Generation    Supabase edge fn `regenerate-seo-snapshot` →
                 writes per-route HTML to `seo-snapshots` bucket
                 (triggered by run-token-scan, scan-agent, cron)
2. Serving       Supabase edge fn `seo-snapshot` →
                 reads bucket, falls back to live build on miss
3. Routing       Cloudflare Worker `bot-prerender` (workers/) →
                 bot UA → seo-snapshot fn; humans → Lovable SPA
```

## Netlify removal — files to delete

```text
DELETE  netlify.toml
DELETE  netlify/edge-functions/bot-prerender.ts
DELETE  netlify/                                  (whole directory)
DELETE  public/_redirects                         (Netlify-specific)
```

## Vercel cleanup (also vestigial on Lovable hosting)

```text
DELETE  vercel.json
DELETE  api/prerender.js
DELETE  api/sitemap.ts
DELETE  api/                                      (whole directory)
```

Sitemap serving moves entirely to the existing `serve-sitemap` / `generate-sitemap` Supabase edge functions, fronted by the Cloudflare Worker (rule: `/sitemap.xml` → proxy to `https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/serve-sitemap`).

## Cloudflare Worker — expanded responsibilities

`workers/bot-prerender.js` becomes the single edge entry point and must now handle:

1. **Bot detection** with expanded UA list (adds GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, anthropic-ai, Google-Extended, Gemini, OAI-SearchBot, Applebot-Extended, DuckAssistBot, Meta-ExternalAgent, CCBot, Cohere-ai, Bytespider, Amazonbot, MistralAI, xAI/Grok, Diffbot, PetalBot, YouBot, KagiBot, Lighthouse, Screaming Frog, Ahrefs, SEMrush, Moz, Sitebulb, plus all social unfurlers).
2. **Known-route allowlist** for: `/`, `/pricing`, `/token`, `/token/:symbol`, `/token-directory`, `/token-scan-guide`, `/token-sniffer-comparison`, `/solana-launchpads`, `/ethereum-launchpads`, `/ai-agents`, `/agent-directory`, `/agent-scan`, `/agent-scan/:chain/:agentId`, `/copilot`, `/privacy`, `/terms`, `/ltd`.
3. **Static file passthrough**: `/sitemap.xml`, `/robots.txt`, `/llms.txt`, `/rss.xml` → proxy to the matching Supabase edge function (or Lovable static hosting for the txt files).
4. **Canonical-host redirect**: `*.lovable.app` → `https://tokenhealthscan.com/...` (301).
5. **Bot + known route** → fetch from `https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/seo-snapshot?path=...`, return with `Cache-Control: public, max-age=300, s-maxage=86400, stale-while-revalidate=604800` and `X-Served-By: cf-worker-snapshot`.
6. **Everything else** → transparently `fetch(request)` to Lovable hosting (SPA shell), passing through headers/cookies.
7. **Edge cache** via `cf: { cacheTtl: 300, cacheEverything: true }` for snapshot responses.

`wrangler.toml` already binds the Worker to `tokenhealthscan.com/*` — no infra change needed beyond expanding the script.

## Supabase side — unchanged from prior plan

```text
NEW   supabase/functions/_shared/seoHtml.ts
NEW   supabase/functions/regenerate-seo-snapshot/
NEW   supabase/functions/seo-snapshot/
NEW   supabase/functions/regenerate-static-snapshots/   (cron entry)
NEW   supabase/migrations/<ts>_seo_snapshots_bucket.sql (public bucket + service-role-write policies)

EDIT  supabase/functions/run-token-scan/index.ts        invoke regenerate-seo-snapshot on success
EDIT  supabase/functions/scan-agent/index.ts            invoke regenerate-seo-snapshot on success
EDIT  supabase/config.toml                              register the 3 new functions
EDIT  index.html                                        add canonical, twitter title/desc, WebSite + Organization JSON-LD
```

Schema coverage in `_shared/seoHtml.ts`:
- Home: `WebSite` + `Organization` + `SearchAction`
- Token report: `FinancialProduct` + `BreadcrumbList` + `FAQPage` + `Review` (score → `aggregateRating`)
- Agent scan: `Thing` (AI Agent) + `BreadcrumbList`
- Guide / comparison: `Article` + `BreadcrumbList`
- Launchpad directories: `ItemList` + `BreadcrumbList`
- Pricing: `Product` + `Offer`

## QA harness

```text
NEW   scripts/seo-audit.mjs   curls each route with 6 representative bot UAs;
                              asserts route-specific <title>, canonical, ≥1 JSON-LD,
                              og:image, twitter:image. Pass/fail table.
```

## What I will NOT touch

- The just-shipped security hardening (auth guards, rate limits, RLS).
- `auth/storage/realtime/vault/supabase_functions` schemas.
- `src/integrations/supabase/types.ts`.
- React app routing or `SeoHead` (client-side hydration stays as-is).
- Existing `reports` and `sitemaps` storage buckets.

## Assumptions (flag if wrong)

1. Lovable published URL (`tokenhealthscan.com`, with `*.lovable.app` as fallback) is the only hosting target going forward — no Netlify, no Vercel.
2. Cloudflare proxy (orange cloud) IS enabled on `tokenhealthscan.com` so the Worker actually fires. If grey-cloud, the Worker won't run and we'd need to flip it on (one-click in CF dashboard).
3. `wrangler` deploy is owned by you — I'll update the script and you `wrangler deploy`. (I cannot push to Cloudflare from here.)
4. The `*.lovable.app` preview/published URL stays available as origin for the Worker's passthrough.
5. `robots.txt` / `llms.txt` continue to live in `public/` and are served by Lovable hosting — Worker just passes them through.

## Audit acceptance checklist

- [ ] `curl -A "GPTBot" https://tokenhealthscan.com/token/aave` → AAVE-specific `<title>` + JSON-LD on first byte
- [ ] Same for PerplexityBot, ClaudeBot, Googlebot, facebookexternalhit, Twitterbot, LinkedInBot
- [ ] Google Rich Results Test passes for `/`, `/token/aave`, `/token-scan-guide`
- [ ] Twitter / LinkedIn / Facebook validators render correct previews
- [ ] Lighthouse SEO ≥ 95 on home, token report, guide
- [ ] Screaming Frog: 0 duplicate titles, 0 missing canonicals across allowlisted routes
- [ ] `scripts/seo-audit.mjs` all green
- [ ] `https://tokenhealthscan.com/sitemap.xml` returns the dynamic sitemap (served via Worker → Supabase)

## Implementation order

1. Migration: create `seo-snapshots` bucket + service-role-only write policies
2. Build `_shared/seoHtml.ts` + 3 new edge functions
3. Wire `run-token-scan` and `scan-agent` to fire snapshot regeneration
4. Rewrite `workers/bot-prerender.js` for full coverage; you `wrangler deploy`
5. Delete `netlify/`, `netlify.toml`, `public/_redirects`, `api/`, `vercel.json`
6. Harden `index.html` (canonical, twitter meta, base JSON-LD)
7. Schedule daily cron for static snapshot regeneration
8. Backfill: one-off invocation that loops every existing `token_reports` row → `regenerate-seo-snapshot`
9. Run `scripts/seo-audit.mjs`; iterate until green

