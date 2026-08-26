# T8 — Token Report (SEO Money Page Template)

> Inherits `00-foundation.md`. This is ONE template — `src/pages/TokenReport.tsx` — rendering
> 54 live pages at `/token/:symbol`. Every rule below applies to the template, not to any
> single chain. Verified by diffing 5 element-map samples (ondo/eth, kaito/base, coai/bsc,
> arb/arbitrum, trump/solana) at 1440.default.dark: **the DOM selector sets are byte-identical
> across all 5 chains** — zero structural branching found (see §6). Element counts vary only
> 218–230 (analysis-text length differs per token), page height 6988–7482px.

## 1. Purpose / pages

`/token/:symbol` is the single highest-impression route on the whole site: **125 GSC
impressions**, ahead of `/token-scan-guide` (82) and every other indexed page
(`design/blueprint/site-blueprint.json`). 54 live symbols (`jup`, `pyth`, `usd1`, `chz`,
`trump`, `arb`, `ondo`, `kaito`, `coai`, … full list in `site-blueprint.json`
→ `routes[].liveUrls`). This is the SEO/AEO backbone of Token Health Scan: a stable, citable
URL per token that answers "is this token healthy" with a scored, sourced verdict. Every
redesign decision here compounds 54x.

## 2. Layout grid — current → target

| | Current | Target |
|---|---|---|
| Container | `container mx-auto px-4 py-8` (Tailwind default container, no explicit max-width token) | Same container discipline, but width capped to a reading measure for prose sections (`max-w-3xl` on analysis text) while score grid and hero stay full container width — current has no measure cap, `prose` class does the capping implicitly but inconsistently across sections |
| Hero | `TokenHeaderHero` — 224–288px tall gradient/image band, absolute-positioned logo+name+score overlay | Same component slot, restyle only: kill the `slate-900` gradient hardcode for `--ground`/`--surface` step, kill `bg-white/90` logo chip for `--surface-2` + hairline |
| Score grid | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`, 5 `Card` components (Security/Tokenomics/Liquidity/Community/Development) | Same 5-cell grid, becomes the `.dims` hairline-bordered instrument-panel pattern from the reference (`design/reference/ths4-homepage.html` `.dim` rows) — track-bar + tabular-nums value replaces the bare `Card` |
| Detail sections | 5x stacked `section` blocks (Info card + Analysis card), one per dimension | Unchanged structure — Info/Analysis two-card pattern is sound, only token/type swap |
| FAQ | shadcn `Accordion` (native, single-collapsible) | Keep — foundation §4 mandates native `<details>` semantics for accordions; shadcn Accordion already renders correctly, verify it doesn't fight the reduced-motion kill-switch |
| Resources grid | `grid grid-cols-1 md:grid-cols-2 gap-4`, bordered link tiles | Unchanged grid, hairline border swap only |

No breakpoint restructuring needed — the current grid collapses correctly at 375/768/1440
per the element maps (single column at 375, 2-col at 768, 3-col at 1440 for score cards).

## 3. Score presentation law

This is the highest-stakes surface in the app for the foundation's score rule (§1: *"Scores
NEVER render in brand Cobalt... Always number + word band, never a bare integer"*). Current
implementation violates both halves:

```tsx
// src/pages/TokenReport.tsx L211–225 — current
const getScoreColor = (score) => {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
};
const getScoreDescription = (score) => {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Moderate";
  return "High Risk";
};
```

- Colors are Tailwind palette classes (`green-600`/`yellow-600`/`red-600`), not the foundation
  ramp. They render close to `--score-healthy`/`--score-risk`/`--score-critical` by coincidence
  but aren't wired to the tokens — flip does nothing here today.
- Word bands exist (`Excellent`/`Moderate`/`High Risk`) but use different language than the
  foundation's canonical `healthy`/`at-risk`/`critical` bands, and different thresholds
  (80/60) than the semantic ramp implies — **decide once**: keep 80/60/0 as the score-band
  cutoffs (defensible, matches `getScoreDescription`) but rename the words to the canonical
  set so they read the same everywhere in the app (T9 score chips, hero, dimension cards).
- The overall score in `TokenHeaderHero.tsx` (`Overall score: {n}/100`) has **no color and no
  band at all** — plain white text. This is the single most prominent number on the page and
  is currently unstyled. Target: number + word band, `--score-*` semantic color, JetBrains
  Mono tabular-nums, matching the reference's `.score .n` treatment (display-size mono numeral).

Target spec (all 6 score instances: hero overall + 5 dimension cards):
- Numeral: JetBrains Mono, `font-variant-numeric: tabular-nums`, `--score-healthy`/
  `--score-risk`/`--score-critical` per band, never `--cobalt`.
- Word band beside or beneath the numeral, same color, uppercase 10–11px letterspaced per
  foundation §2 (Ink-2 tone for the label chrome, band color for the word itself — mirrors the
  reference's `.verdict` treatment: `font-family:mono; text-transform:uppercase;
  letter-spacing:.12em; color:var(--amber)` pattern, swapped to the actual band color).
- Icon (currently `CheckCircle`/`AlertTriangle`/`XCircle` from lucide) stays — state-by-icon-
  and-color is exactly what foundation §6 requires ("state never by colour alone").

## 4. Per-dimension sections

Five dimensions (Security/Tokenomics/Liquidity/Community/Development), each rendered twice:
once as a compact score card in the grid (§3), once as a full Info+Analysis section further
down the page. Keep this two-tier structure — it's a legitimate "summary then depth" pattern,
not redundancy. Target changes are token-only:

| Element | Current | Target token | Component file |
|---|---|---|---|
| Score card | `Card` (shadcn), no border-radius override | `--surface`, `--hairline` border, radius 4px per §3 foundation rule (never ≥12px on data components — current shadcn `Card` default is `rounded-lg` / 8px, borderline-compliant, tighten to 4px for consistency with the instrument-panel idiom) | `src/components/ui/card.tsx` (shared primitive — do not fork per-page) |
| Category icon | `text-muted-foreground` (Shield/DollarSign/TrendingUp/Users/Code) | Keep muted-foreground token, unaffected by flip | inline in `TokenReport.tsx` |
| "Why it matters" info card | `bg-muted/30` | `--surface-2` | `TokenReport.tsx` (inline, not extracted — candidate for extraction to `src/components/token/DimensionInfoCard.tsx` if the file's 871 lines get split) |
| Key indicator badges | shadcn `Badge` `variant="secondary"` | Unaffected — shadcn badge already token-driven | `src/components/ui/badge.tsx` |
| Analysis prose | `prose dark:prose-invert`, `text-muted-foreground` | Unaffected — already token-driven; verify `@tailwindcss/typography` prose vars don't reintroduce hardcoded grays under the new `.cobalt` class | `TokenReport.tsx` |

## 5. Permanent-URL / citable framing

The approved reference (`ths4-homepage.html` `#directory` section) already states the
positioning: *"Every token we scan gets a permanent page… Scores, checks and history for a
token, at a stable URL you can link, cite or send to your team."* T8 is that permanent page —
the template currently does nothing to *say* this on the page itself. Target additions:

- A stamp row at the foot of the score grid, matching the reference's `.stamp` idiom (dot +
  "Read at block N" + "As of <timestamp> UTC") — TokenReport has no data-freshness signal
  anywhere today. This is both a trust signal for AEO citation (LLMs citing the page can quote
  a timestamp) and the direct execution of foundation §6 (auto-updating/derived content needs
  a visible "as of" marker).
- Canonical URL is already correct (`generateCanonicalUrl` → `https://tokenhealthscan.com/
  token/{symbol}`, lowercase, stable) — no change needed, just confirm the visible page repeats
  what the `<link rel="canonical">` says (a small "Permanent report — cite this page" microcopy
  line near the hero, styled Ink-3 mono per foundation table, is a cheap SEO/AEO win here).

## 6. Chain-variance check (Solana badge concern — resolved)

The brief flagged "e.g. Solana badge component" as a possible template branch needing its own
row. Verified this is **not the case**: `SolanaBadge.tsx` exists in the codebase
(`src/components/SolanaBadge.tsx`) but is not imported by `TokenReport.tsx`, and the
element-map diff of all 5 chains' 1440.default.dark captures (including `token-trump-solana`)
shows **0 selectors unique to any chain** — identical DOM shape across EVM chains (Ethereum,
Base, BSC, Arbitrum) and Solana alike. `chainId` only drives the block-explorer link
(`etherscan.io/token/{address}` is hardcoded — **this is itself a bug worth flagging**: the
"View Contract" resource link in §"More Resources" always points to Etherscan regardless of
`chainId`, so it's wrong for `arb`, `coai` (BSC), `trump` (Solana), etc. Fix during the
redesign pass, not a template-branch issue but a real functional bug on 51 of 54 pages).
No other chain-conditional rendering exists in `TokenReport.tsx` — **zero rows needed** for
template branches.

## 7. Table treatment

No literal `<table>` element exists on the current template — flag this as a gap, not a
finding to preserve. All tabular data (5 dimension scores, price, market cap) renders as prose
or card grids. Target: no new `<table>` markup is required either — the instrument-panel `.dim`
row pattern from the reference (label / track-bar / tabular-nums value, three-column CSS grid)
is the correct idiom here, already specified in §3. Wherever a numeral appears anywhere on this
template (score, price, market cap, block number in the new stamp row) it uses JetBrains Mono
with `font-variant-numeric: tabular-nums` — this is the "table treatment" the brief refers to,
applied to numeric UI generally rather than to an HTML table structure that doesn't exist.

Current numeral rendering to fix:
- `TokenHeaderHero.tsx`: price (`${currentPrice.toFixed(4)}`) and market cap use the default
  UI sans font (`ui-sans-serif`, per element-map typography capture) — not mono. Target: mono
  + tabular-nums.
- Dimension scores (`{score}/100`): currently `text-2xl font-bold`, default sans. Target: mono.

## 8. OG / meta consistency with the new brand

`SeoHead.tsx` + `seoUtils.ts` are solid and need no structural change — canonical URL,
Open Graph, Twitter Card, and 5 JSON-LD schemas (FinancialProduct, FAQ, HowTo, Breadcrumb,
Organization, SoftwareApplication) are all present and wired correctly. Only the OG **image**
needs a redesign pass:
- `getTokenImageUrl()` falls back to `https://tokenhealthscan.com/tokenhealthscan-og.png` when
  a token has no logo — that static fallback image needs to be regenerated in the new Cobalt
  Signal visual identity (navy/aqua/gold references in the old brand doc are superseded by the
  tokens in `00-foundation.md` §1 — verify the OG asset doesn't still ship the old palette).
- Per-token OG images (when `logo_url` exists) are the token's raw logo, not a branded card —
  out of scope for this doc (no OG-card generator currently exists for token pages; flag as a
  future opportunity, not a T8 template change).
- `og:site_name` / `twitter:site` (`@tokenhealthscan`) are correct, no change.

## 9. Migration notes — hardcoded-color components

Per `component-inventory.json`, **none of T8's actually-imported components carry hardcoded
hex** at the page level — `TokenReport.tsx`'s own score-color logic uses Tailwind palette
classes (`text-green-600` etc, §3), which the inventory's hex/rgb/hsl scanner doesn't flag but
which still won't respond to a token flip and need manual conversion. One adjacent component
to be aware of but NOT in scope for T8: `TokenProfile.tsx` (63 hardcoded hits, the app's worst
offender) is used by `ScanResult` (T7), not `TokenReport` (T8) — do not let T8 work bleed into
that file by mistake; they're visually similar (both show token scores) but are different
pages with different code.

Direct T8 migration checklist:
1. `TokenReport.tsx` `getScoreColor`/`getScoreIcon`/`getScoreDescription` (L211–225) → rewrite
   to consume `--score-healthy`/`--score-risk`/`--score-critical` and the canonical word bands.
2. `TokenHeaderHero.tsx` — `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`
   fallback background, `bg-white/90` logo chip, unstyled overall-score number — all need
   token conversion (this component has zero `usesTokens` signal in the inventory; it's a
   `src/components/token/` file not caught by the top-level app-components scan — verify by
   hand, it's small at ~110 lines).
3. Chain-aware block-explorer link bug (§6) — functional fix, unblocks correctness on 51/54
   pages regardless of visual redesign.
4. Disclaimer card — `border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/
   50` — Tailwind yellow palette, not tied to `--score-risk`; low priority (informational
   chrome, not a scored data element) but should still land on the token system for consistency.

## 10. Verification checklist

- [ ] QA rig at 375 / 768 / 1440, both themes (`default` + `.cobalt`/`.cobalt.light`), on the
  full template (`playwright-visual-qa` for one representative symbol, `surface-qa` if auditing
  the site-wide surface set that includes T8).
- [ ] **Chain spot-check**: render one page per distinct chain family post-flip — an EVM chain
  (e.g. `/token/arb`), BSC (`/token/coai`), and Solana (`/token/trump`) — confirm the identical-
  DOM finding in §6 holds after the token flip (i.e. confirm no chain-specific CSS path was
  introduced by the flip itself).
- [ ] Score numerals render in `--score-*` tokens, never `--cobalt`, at all 6 positions (hero +
  5 dimension cards).
- [ ] Word band present at every score instance, canonical vocabulary (healthy/at-risk/
  critical), not "Excellent/Moderate/High Risk".
- [ ] Block-explorer resource link resolves per-chain, not hardcoded to Etherscan.
- [ ] OG image (fallback + per-token) reviewed against the new visual identity.
- [ ] Canonical URL, JSON-LD schemas, meta description unchanged/still valid post-restyle
  (these are content, not visual — a pure CSS pass should not touch them; regression-check
  anyway since `SeoHead` sits inside the same component tree).
- [ ] Focus-visible ring (2px Cobalt, `:focus-visible`) present on every interactive element in
  the FAQ accordion and resource-link grid.
- [ ] `prefers-reduced-motion` kills the score-grid load stagger if one is added (foundation §4).
