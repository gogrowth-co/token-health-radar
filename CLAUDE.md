# CLAUDE.md — token-health-radar
# Source code for tokenhealthscan.com

---

## WHAT THIS REPO IS

This is the **code layer** for tokenhealthscan.com.

- **Frontend:** Vite + React 18 + TypeScript, shadcn-ui, Tailwind CSS, react-router-dom v6
- **Backend:** Supabase (Postgres + Auth + Storage + 40+ Edge Functions in Deno) — project ref `qaqebpcqespvzbfwawlp`
- **Build layer:** Lovable.dev — pushes directly to this repo's `main` branch as `gpt-engineer-app[bot]`
- **SEO/Bot rendering:** Cloudflare Worker at `workers/bot-prerender.js` — serves static snapshots to crawlers
- **Deploy:** Every commit to `main` triggers a Lovable deploy automatically. No staging branch.

---

## THREE-LAYER ARCHITECTURE

This repo is one of three layers. Know which layer owns what.

| Layer | Path | Owns |
|---|---|---|
| **Code** (this repo) | `~/Documents/token-health-radar/` | Source code, edge functions, deployments, infra |
| **Marketing OS** | `~/Documents/Gabriel Mangabeira/token-health-scan/` | Campaigns, content, brand voice, product facts |
| **Orchestration** | `~/Documents/Gabriel Mangabeira/shared/` | Cross-project decisions, portfolio-wide rules |

**Before writing any UI copy or changing product framing:** read the context files in the marketing layer first.

| Read this file | When... |
|---|---|
| `../Gabriel Mangabeira/token-health-scan/_context/product-info.md` | Verifying product capabilities, routes, data sources, pricing |
| `../Gabriel Mangabeira/token-health-scan/_context/positioning.md` | Writing any UI copy, labels, meta descriptions, OG tags |
| `../Gabriel Mangabeira/token-health-scan/_context/brand-voice.md` | Writing any user-facing text — tone, vocabulary, banned phrases |
| `../Gabriel Mangabeira/shared/decisions.md` | Infrastructure rules and cross-project standards |

---

## HOW LOVABLE AND LOCAL WORK COEXIST

Lovable commits to `main` as `gpt-engineer-app[bot]`. Local work also commits to `main`. They share one branch — no separate Lovable branch.

- **Before starting local work:** always `git pull origin main` first.
- **After local commits:** push to `main`. Lovable picks up changes in its next session.
- **Conflicts:** Lovable wins on visual/UI component files. Resolve manually on logic and edge function files.
- **Never force-push to main.** Lovable holds a reference to the latest commit — a force push breaks its sync.

---

## CORE RULES

1. **No commits to main without verifying the change works.** Lovable auto-deploys on every push — a bad commit goes live immediately.

2. **Edge function secrets go in Supabase dashboard AND `.env`.** Adding a key to `.env` does NOT deploy it to the live function. Set it in Supabase dashboard: `dashboard.supabase.com/project/qaqebpcqespvzbfwawlp/functions` → Secrets. (See `shared/decisions.md` — 2026-05-11.)

3. **Never hardcode product copy without checking positioning first.** All UI copy must align with `_context/positioning.md` and `brand-voice.md` in the marketing layer. The primary audience is protocol founders, not retail investors.

4. **No year in URL slugs.** `/token-health-2026/` can't be refreshed without losing ranking history. Use `/token-health/` always.

5. **`preserve_styles: true` on any CMS upsert with branded HTML.** Without this flag, Lovable's `DynamicPage.tsx` wraps content in Tailwind prose and overrides inline styles. (See `shared/decisions.md` — 2026-05-20.)

6. **No inline color on CMS article elements.** Never set `color` inline on `<article>`, `<h2>`, `<h3>`, `<h4>`, `<h5>` in publication HTML. `prose-invert` handles dark mode — inline color overrides it. Only set colors on structural/decorative elements (backgrounds, borders, buttons).

7. **Personal access token for deploys, not project keys.** `supabase functions deploy` requires `SUPABASE_ACCESS_TOKEN` (`sbp_` prefix) — not the anon key or service role key. (See `shared/decisions.md` — 2026-05-20.)

---

## AFTER YOU SHIP SOMETHING

If a code change affects what the product can do or how marketing describes it, log it in:

```
../Gabriel Mangabeira/token-health-scan/docs/product-changelog.md
```

**Log-worthy changes:**
- New feature or capability added
- Route added, changed, or removed
- Free vs. Pro tier limits changed
- Pricing changed
- Data source added or removed
- Scoring dimension or weight changed
- Edge function added or deprecated
- UI copy on landing page or pricing page changed

**Not log-worthy:** bug fixes, refactors with no user-facing impact, CI config, dependency updates, styling-only tweaks.

---

## SUPABASE EDGE FUNCTIONS

All functions live in `supabase/functions/`. Key ones:

| Function | What it does |
|---|---|
| `run-token-scan` | Main EVM token scan orchestrator |
| `scan-agent` | ERC-8004 AI agent scan |
| `moralis-token-search` | Resolves ticker → chain + address for homepage search |
| `mcp-content` | CMS content CRUD (publications/blog) |
| `generate-sitemap` | Sitemap generation |
| `stripe-webhook` | Stripe payment events |
| `kiwify-webhook` | Lifetime deal (Kiwify) events |
| `check-scan-access` | Free vs. Pro gating logic |

Deploy command: `supabase functions deploy <function-name> --project-ref qaqebpcqespvzbfwawlp`

---

## LIVE ROUTES

```
/                              Homepage (Landing.tsx)
/auth, /confirm                Auth
/scan/:chain/:address          Token scan → /scan-loading → /scan-result
/pricing                       Pricing (Stripe)
/ltd, /ltd-thank-you           Lifetime deal (Kiwify)
/dashboard                     User dashboard
/copilot                       AI Copilot (MCP chat)
/token                         Token directory
/token/:symbol                 Per-token SEO report page
/agent-scan                    AI Agent Trust Score
/agent-scan/:chain/:agentId    Per-agent scan
/agent-directory, /ai-agents   Agent directory
/publications, /publications/:slug  CMS / blog
/token-scan-guide              SEO guide
/token-sniffer-vs-tokenhealthscan  Comparison landing page
/solana-launchpads             SEO landing page
/ethereum-launchpads           SEO landing page
/admin*                        Admin console (gated)
```

Scan URL requires chain ID + contract address (not a ticker). Homepage uses `moralis-token-search` edge function to resolve ticker → chain + address before redirecting.

---

## SUPPORTED CHAINS

EVM: Ethereum (`0x1`), BSC (`0x38`), Polygon (`0x89`), Arbitrum (`0xa4b1`), Base (`0x2105`), Optimism.
Non-EVM: Solana (separate `solanaAPI.ts` scoring path).
