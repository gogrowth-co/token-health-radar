# Cobalt Signal Redesign — Implementation Plan
> The execution document. Inputs: `design/system/00-foundation.md` + 11 type docs,
> `design/blueprint/token-audit.{md,json}` (exact HSL remap + WCAG math),
> `design/blueprint/component-inventory.json`, `design/blueprint/route-reconciliation.json`,
> the element atlas (216 capture pairs), and the app-repo constraints in `CLAUDE.md`. 2026-08-26.

## Non-negotiable constraints (from CLAUDE.md, verified)
1. **Every push to `main` auto-deploys live. No staging.** → every commit must be locally verified before push (gate below), and each commit must be individually harmless.
2. **Lovable shares `main` and wins conflicts on visual/UI files.** → `git pull` before every work session; do NOT run Lovable UI sessions during a flip window; never force-push.
3. CMS articles: `preserve_styles: true`, no inline colors on article text — T4 restyles via prose wrapper + tokens only.
4. The repo's `workers/bot-prerender.js` copy is NOT live-truth (would break `/llms-full.txt` if redeployed) — the ops-workspace copy is. **Do not deploy the worker as part of this redesign.**

## Strategy: theme-flag-first (approved)
The new identity lands as a third theme class **`.cobalt`** (dark-primary) + **`.cobalt.light`**,
alongside the existing `:root`/`.dark`. Default resolution untouched → the first commit is
invisible to every user. Pages then opt in one type at a time after passing their type-doc
verification. Full cutover = flipping the default in ThemeToggle's resolution order (one-line
change, last step, trivially revertible).

## Commit sequence

**C0 — tokens (invisible).**
`src/index.css`: add `.cobalt` + `.cobalt.light` var blocks exactly per `token-audit.json`
remap tables (incl. new vars: --surface-2, --hairline, --hairline-2, --data-accent,
--primary-hi, --score-* ramp). `index.html`: add Archivo + JetBrains Mono Google-Fonts links
(preconnect + swap). `tailwind.config.ts`: extend fontFamily + map new vars. NO component changes.
Verify: build passes; default pages pixel-identical (QA rig diff = zero); `.cobalt` class
manually applied in devtools shows the new palette.

**C1 — theme plumbing.**
Extend ThemeToggle mechanism (localStorage 'theme' + class on <html>, per component-inventory
§themeMechanism) to accept `cobalt` / `cobalt-light` values behind a query-param or localStorage
opt-in ONLY (no UI change). Gives every subsequent verification a stable preview handle:
`?theme=cobalt`.
Verify: default unchanged; opt-in renders new tokens site-wide (ugly in places — expected).

**C2…C9 — per-type flips, this order:**
| # | Type | Why this order | Manual-work hotspots (from inventory) |
|---|---|---|---|
| C2 | T1 marketing | Reference implementation exists (`design/reference/ths4-homepage.html`); highest visibility; already spec'd 1:1 | Landing hero; PricingCard |
| C3 | T2+T5 | Long-form typographic, low component count | — |
| C4 | T3+T4 | CMS constraint isolated here; prose-wrapper work | DynamicPage prose config |
| C5 | T9 | Ledger idiom, feeds T7/T8 patterns | directory row components |
| C6 | T8 | 54 SEO money pages, one template | TokenReport + **TokenProfile.tsx (63 hardcoded hits — biggest single manual job)** |
| C7 | T7 | The product core; gated state + score law | Category*/OverallHealthScore/Blurred overlay |
| C8 | T10 | App surfaces; Copilot chat | chat components |
| C9 | T11 | Admin, utilitarian pass | AdminEdit editor |

Each flip = wrapping that type's routes in the `.cobalt` class scope (route-level theme
assignment in the layout, mechanism from C1) + the type doc's manual component work.

**C10 — default flip + toggle rename.** ThemeToggle default → cobalt (dark). Old themes remain
as fallback for one release, then C11 removes dead vars + old theme blocks.

## Known blind spot in the manual-work list
The component inventory's hardcoded-color scan matched hex/rgb/hsl literals and arbitrary
values only — **Tailwind palette classes (`bg-blue-500`, `text-green-600`, …) were not
counted** and do not theme-flip. Before each type's flip commit, run a supplementary grep
over that type's components for `-(red|green|blue|yellow|amber|emerald|indigo|violet|purple|slate|gray|zinc)-[0-9]{2,3}`
and add hits to that commit's manual list. (Found by the T10/T11 doc pass.)

## Per-commit verification gate (every commit, no exceptions)
1. `npm run build` clean.
2. QA rig (`design/tools/capture.mjs`) on the affected type's pages at 375/768/1440 ×
   (default + `.cobalt`): no h-scroll, element-count delta vs atlas baseline within ±10%,
   heights sane.
3. WCAG spot-check: the four flagged combos from token-audit (ink-3, cobalt-as-text,
   score colors on light) — automated contrast script.
4. Foundation law checks: no score in brand cobalt; Ember never adjacent Red at equal weight;
   no new box-shadows; no scroll-reveal.
5. Pixel look at 2-3 thumbnails (a human-judgment pass — pixels, not counts).
6. Only then: commit + push. One type per push. Log route/tier changes to
   `../Gabriel Mangabeira/token-health-scan/docs/product-changelog.md`.

## Out of scope here (tracked, not executed)
- Favicon set + lockup ladder (brand-assets job, separate).
- Marketing-site homepage replacement with the ths4 reference (belongs to C2 planning).
- Worker redeploy; sitemap regeneration; admin credential setup (P4 dependency for
  authenticated verification of C8/C9 — flips for T10/T11 wait on it).

## Rollback
Any regression: revert the single offending commit (types are isolated per commit);
`.cobalt` scope removal restores prior rendering instantly. C10 revert = one line.
