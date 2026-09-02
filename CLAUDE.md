# CLAUDE.md — token-health-radar
# Source code for tokenhealthscan.com

---

## WHAT THIS REPO IS

This is the **code layer** for tokenhealthscan.com.

- **Frontend:** Vite + React 18 + TypeScript, shadcn-ui, Tailwind CSS, react-router-dom v6
- **Backend:** Supabase (Postgres + Auth + Storage + 37 Edge Functions in Deno) — project ref `qaqebpcqespvzbfwawlp`
- **Build layer:** Lovable.dev — pushes directly to this repo's `main` branch as `gpt-engineer-app[bot]`
- **SEO/Bot rendering:** Cloudflare Worker at `workers/bot-prerender.js` — serves static snapshots to crawlers
- **Deploy:** A commit to `main` syncs to Lovable and rebuilds the preview at the editor URL. Publishing to the custom domain (`tokenhealthscan.com`) requires an explicit Lovable publish via the Lovable UI. Always verify the live site before claiming a change is live.

---

## THREE-LAYER ARCHITECTURE

This repo is one of three layers. Know which layer owns what.

| Layer | Path | Owns |
|---|---|---|
| **Code** (this repo) | `~/Documents/token-health-radar/` | Source code, edge functions, deployments, infra |
| **Marketing OS** | `~/Documents/Gabriel Mangabeira/token-health-scan/` | Campaigns, content, brand voice, product facts |
| **Orchestration** | `~/Documents/Gabriel Mangabeira/shared/` | Cross-project decisions, portfolio-wide rules |

**Before writing any UI copy or changing product framing:** read the context files in the marketing layer first.

**See also:** `~/Documents/Gabriel Mangabeira/shared/CONTEXT-MAP.md` — portfolio-wide topology index for all projects.

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

1. **No commits to main without verifying the change works.** A commit to `main` syncs to Lovable and rebuilds the preview; reaching the live domain needs an explicit Lovable publish (see Deploy, above). Verify on the live site before claiming a change shipped.

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
