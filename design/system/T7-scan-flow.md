# T7 — Scan Flow
> Inherits `00-foundation.md`. Captures: `element-maps/T7/{scan-loading,scan-result-gated,
> agent-scan-landing}.{375,768,1440}.default.{dark,light}.json`. Reference idiom:
> `design/reference/ths4-homepage.html` (hero instrument panel — `.panel`/`.sw`/`.dims`/`.stamp`).
> Pages: `ScanLoading` (`/scan/:chain/:address` in-flight), `ScanResult` (`/scan/:chain/:address`
> resolved, gated + unlocked), `AgentScan` / `AgentScanResult` (agent variant). 2026-08-26.

T7 is the heart of the product — the score is the entire deliverable, and everything in this doc
exists to make that number legible, trustworthy, and auditable in one glance, the way the reference
homepage's hero panel already does. Nothing here should look like a dashboard widget; it should look
like an instrument reading.

## 1. Purpose / pages

- **`ScanLoading`** — a real page (not a spinner), narrating the checks in flight against named data
  sources (GoPlus, GeckoTerminal, Etherscan…). It is the product's one credibility moment before the
  number appears: showing your work in real time.
- **`ScanResult`** — the score + five category dimensions + per-check detail + Copilot ask-bar. Ships
  in two states depending on auth: **gated** (no account — overall + category scores only, per-check
  detail blurred behind a CTA) and **unlocked** (free/Pro account — full detail visible). The gated
  state is captured live in this atlas and is a first-class design state, not an edge case.
- **`AgentScan` / `AgentScanResult`** — the ERC-8004 agent variant of the same instrument. Shares the
  score/ramp/band grammar with the token result; differs in cache semantics (§7) and card wiring.

## 2. Layout grid — current → target

| | Current | Target |
|---|---|---|
| `ScanLoading` | Single centered column, max-width ~720px: h1 → chain badge + truncated address → progress copy → `Progress` bar → "insight" callout card. Full `Navbar`/`Footer` chrome. | Structure holds. Reframe as an **instrument panel**, not a marketing card: the whole block sits on `var(--surface)` with a `1px solid var(--hairline)` top/bottom rule (matching `.panel`/`.prow` framing in the reference), not floating on bare `--ground`. Progress bar becomes the reference's `.tr`/`b` filled-rect idiom (3px hairline track, filled `--primary` bar), not shadcn `Progress`'s rounded pill. |
| `ScanResult` (gated) | Single column, max-width ~960–1100px: token header (logo/name/symbol/price/mcap) → circular score ring → social links/share row → Copilot chat card → 5-dimension score-card row → category tabs → per-check detail list → blur veil + CTA overlaid on the detail list. | Adopt the reference's **1px-rule cell grid**: token header becomes a `.prow`/`.cell` row (bordered cells, mono microlabels above values, exactly the `Scan target`/chain-chip row from the hero panel). Score presentation moves from a circular ring + `${price}` sparkline mashup to the reference's **numeral + word-band + 5-step scale** treatment (§4). Category cards (currently rounded `Card` tiles with colored numerals) become `.dc`-style bordered cells in a shared-border grid (`border-top + border-left` on the grid, `border-right + border-bottom` on each cell — zero double-borders). Gate treatment redesigned per §5. |
| `AgentScanResult` | Mirrors `ScanResult` structurally (`AgentDimensionGrid`, `AgentIdentityCard`, `AgentActionPlan`) but as its own component tree, not a shared one. | Same instrument-panel grammar as `ScanResult`; identity card adopts the reference's `.mini2`/`.m2r` key-value row idiom already used for the Agent Scan preview panel on the homepage — this is not new invention, it's applying an idiom the reference already established for exactly this content. |
| Breakpoints | 375/768/1440 captured for all three page types. Category grid: likely 1-col mobile → 2-col tablet → 5-col desktop (matches `.dimgrid` breakpoints in reference: 620px, 1080px). | Keep those breakpoints — they're already the reference's own `.dimgrid` breakpoints, don't reinvent. |

## 3. Element spec table

| Element | Current (captured) | Target token | Component |
|---|---|---|---|
| Page background | app default (`--background`, correctly token-driven on these pages) | `var(--ground)` | — |
| Token header row | plain flex row, no borders, `h2` 20px `rgb(243,244,246)`, `$CAKE` chip `bg:rgb(37,37,52)` | Reference `.prow`/`.cell` treatment: bordered cell grid, mono `.lab` microlabel ("SCAN TARGET" / "SYMBOL") above the value, chip becomes `.chip` idiom (`border:1px solid rgba(59,102,255,.34)`, `bg:rgba(59,102,255,.1)`, `fg: var(--primary-hi)`, mono 10px, letterspacing .1em) | `TokenProfile.tsx` header block |
| Address/copy button | `bg:rgb(35,35,52)` `fg:rgb(163,163,179)` | `background: var(--surface-2)`, `fg: var(--ink-2)`, mono, truncated with ellipsis — matches `.cell .v` treatment exactly | `TokenProfile.tsx` |
| Price | `$1.75` at 28px, `fg:#fff` (hardcoded white, not `--foreground`) | `color: var(--ink)`, keep size, mono `tabular-nums` | `TokenProfile.tsx` |
| Price delta | `-0.12%` `fg:rgb(220,38,38)` (raw red-600, not the score ramp red) | `color: var(--data-accent)` (Ember `#FF7A45`) for a **live value**, not `--score-critical` — price delta is market data, not a health verdict; foundation §1 keeps Ember and the score ramp strictly separate roles | `TokenProfile.tsx` |
| Market cap | `$562.07M` `fg:#fff` size 20px | `color: var(--ink)`, label above in `.lab` mono style, `fg: var(--ink-2)` | `TokenProfile.tsx` |
| **Score numeral** | Circular SVG ring + centered number (svg `stroke`, colors hardcoded per §"hardcoded offender" below) | **Semantic ramp only, never brand Cobalt.** Numeral in `var(--mono)`, weight 300, `clamp(3.6rem,8vw,5.4rem)` per reference `.score .n`, color = `--score-healthy` / `--score-risk` / `--score-critical` by band. Ring geometry itself is optional-keep, but the numeral's color source must switch from raw hex to the score-ramp var | `OverallHealthScore.tsx` (4 hardcoded-color hits) |
| **Score denominator** ("/100") | not distinctly styled in capture | `color: var(--ink-3)`, `.score .d` treatment (decorative-only use of Ink-3, legal per §1) | `OverallHealthScore.tsx` |
| **5-step band + word label** | **absent** — current build shows numeral + a text badge ("Excellent"/"Good") per category card, no continuous 5-step scale anywhere | **Add** the reference `.band`/`.bandlab` pair: 5 flush segments, the active one filled with the score-ramp color, flanked by `CRITICAL`/`HEALTHY` mono endpoint labels. This is a foundation-law requirement ("Always number + word band, never a bare integer") the current build does not satisfy at the overall-score level — category cards get a word badge but the *overall* score does not get a band at all in this capture | new sub-component under `TokenProfile.tsx` or promoted into `OverallHealthScore.tsx` |
| Category score cards | Rounded `Card` tiles, numeral color inline per band (`rgb(16,185,129)` green / `rgb(245,158,11)` amber — Tailwind `emerald-500`/`amber-500`, **not** the foundation's `--score-healthy`/`--score-risk` hex values `#22C55E`/`#FFC53D`) | `.dc`-style bordered cell in a shared-grid, numeral resolves to `--score-healthy`/`--score-risk`/`--score-critical`, word badge stays (`Excellent`/`Good`/etc.) as the required word-band pairing, mono uppercase category name above | `CategoryScoresGrid.tsx` |
| Category tabs | pill-style `button`, active `bg:rgb(2,8,23)` inverted, inactive `fg:rgb(148,163,184)` with a leading `circle` dot | Active tab: `border-bottom: 2px solid var(--primary)`, `fg: var(--ink)`; inactive: `fg: var(--ink-2)`; drop the filled-pill treatment (reads as a button, competes with the CTA) | `CategoryTabs.tsx` |
| Per-check row | `Card`-in-list with icon, `h3` 18px white, description `rgb(156,163,175)`, status pill (`bg:rgb(20,83,45)` green / `rgb(127,29,29)` red, `fg:rgb(134,239,172)`/`rgb(252,165,165)`) | Row becomes `.m2r`-style key/value line: `border-bottom:1px solid var(--hairline)`, no card-in-card nesting. Status pill recolors to `--score-healthy`/`--score-critical` tint pair (dark-mode tint = 15% alpha fill of the ramp color, not the current fixed emerald-900/red-900 backgrounds) | new list row under `TokenProfile.tsx`'s security/tokenomics/etc. sections |
| Stamp row | `"Generated on 12/10/2025 \| Updated Weekly \| Last Updated: Dec…"` — plain `p`, `fg:rgb(148,163,184)`, no visual separation from content above it | Reference `.stamp` treatment: its own bordered strip, `background: rgba(255,255,255,.018)` (dark) / equivalent light tint, `border-top:1px solid var(--hairline)`, live-dot (`.dot`, `--score-healthy`) + mono "Read at block N" / "As of TIMESTAMP" pair — see §7 for the as-of-stamp pattern shared with `DataFreshnessIndicator` | `TokenProfile.tsx` footer row, wired to `DataFreshnessIndicator.tsx` |
| Copilot header | `h3` "Copilot (CoinGecko MCP)" 18px + `"Live via MCP"` pill (`bg:rgb(59,130,246)`) | Pill becomes `.prodtag`-style: `border:1px solid rgba(110,140,255,.35)`, `background:rgba(59,102,255,.09)`, `fg: var(--primary-hi)`, mono 9px uppercase | `copilot/CopilotPanel.tsx` |
| Copilot message (question) | plain text, no visual distinction from answer besides layout | `.msg.q` idiom: mono 12px, `fg: var(--ink)`, prefixed `"> "` in `--primary-hi` — makes the user's question read as a terminal-style query, matching the reference's ask-bar aesthetic | `CopilotPanel.tsx` |
| Copilot message (answer) | plain text | `.msg.a` idiom: sans, `fg: var(--ink-2)`, inline emphasis (`b`) in `--ink` | `CopilotPanel.tsx` |
| **Copilot ask-bar** | `textarea` `bg:rgb(2,8,23)` `border` unspecified, helper copy `"Shift+Enter for new line, Enter to send"` `fg:rgb(148,163,184)`, `Ask` button `bg:rgb(59,130,246)` | Reference `.askbar` mono input idiom: single-line-presenting bar (`background:rgba(255,255,255,.02)`, `border-top:1px solid var(--hairline)`), placeholder in mono 11.5px `var(--ink-3)` ("Ask about price, 7d trend, or top pools…" — task-specific copy per token), `Ask` as a small filled `em`-style Cobalt chip (`padding:5px 12px`, `radius:3px`), not a full-height bordered `button`. Multi-line `Shift+Enter` affordance can stay functionally but the *idle* visual state should read as the reference's single-row ask-bar, expanding only on focus/multi-line content | `CopilotPanel.tsx` input row |
| Copy Link / Share buttons | ghost `bg:rgb(2,8,23)` `border` `rgb(30,41,59)` | ghost pattern: `border: var(--hairline-2)`, `radius:4px`, `fg: var(--ink)` | `ShareScanResult.tsx` |

## 4. Score presentation — LAW

Directly from `00-foundation.md` §1, restated as the T7 contract because this is the page it governs:

1. **Semantic ramp only, never brand Cobalt.** The score numeral, band, and category-card numerals
   always resolve to `--score-healthy` / `--score-risk` / `--score-critical`. Cobalt (`--primary`) is
   reserved for CTAs, links, focus rings, and active nav — never a verdict. Brand-as-verdict collapses
   "this is good" into "this is our product," which the census/style-guide finding explicitly flags.
2. **Number + word band, never a bare integer.** Every score render — overall and per-category —
   pairs the numeral with a plain-language word (`Healthy` / `At risk` / `Critical`, or the current
   build's `Excellent`/`Good`/`Poor` ladder, which should collapse onto the same 3-band semantic set
   so overall and category scores speak one vocabulary).
3. **5-step scale.** The reference's `.band`/`.bandlab` component — five flush segments, one lit —
   is the canonical visual. It is currently **missing at the overall-score level** in the live build
   (category cards get a word badge but no band); this is the single biggest gap this doc identifies
   in the score presentation and should be treated as a defect, not a nice-to-have.
4. **Category cards on the semantic ramp.** Each of the five dimension cards (Security, Liquidity,
   Tokenomics, Community, Development) independently resolves its numeral color to the ramp — never
   inherit a single "overall" color across all five.
5. State is never color alone (foundation §6): every ramp-colored numeral ships with its word label
   in the same view; a colorblind or grayscale render must still communicate the verdict.

## 5. The gated state — first-class design state

**Current (captured, `scan-result-gated.1440.default.dark.json`):** the per-check detail list (Security
Analysis rows: "Contract Verified," "Honeypot Detection," etc.) renders in full underneath an overlay:
a centered block reading `🔒 Sign up or log in to view full results`, a `Create Free Account` button
(`bg:rgb(59,130,246)` `fg:rgb(15,23,42)`), and a second identical CTA lower in the same overlay
(duplicated button — two `Create Free Account` buttons captured in the same gate). The visible rows
above the gate (Security's first several checks) appear **unblurred** and fully legible in this
capture, meaning the current blur treatment is either partial, inconsistently applied, or the capture
caught it mid-scroll relative to the veil's actual coverage — flag for a follow-up capture at the
exact veil boundary before implementation.

**Target, per foundation:**

- **`surface-2` veil.** The blurred/obscured region sits on `var(--surface-2)`, not a raw
  `backdrop-filter: blur()` over live content (glassmorphism is explicitly banned, foundation §3 —
  "no glassmorphism, 32.5% measured FPS cost"). Replace blur with a **solid surface-2 scrim**: the
  underlying check rows are not rendered at all (or rendered as skeleton placeholders using
  `--surface-2` fill blocks), not styled-and-then-blurred. This is cheaper and compliant.
- **Hairline card.** The CTA lives inside a single bordered card — `border:1px solid var(--hairline)`,
  `background: var(--surface)`, `radius:4px` — centered over the scrim, not floating text.
- **One Cobalt CTA.** Exactly one `Create Free Account` button, `background: var(--primary)`,
  `fg:#fff`. The current build's **duplicate CTA** (two identical buttons in one gate) should collapse
  to one — a second CTA in the same view dilutes the single action and reads as a bug, not emphasis.
- **Copy stays functional, not alarming.** Drop the lock emoji (`🔒`) — it reads as a browser chrome
  affordance, not brand voice, and the reference never uses emoji in UI copy. Replace with a mono
  `.lab`-style eyebrow, e.g. `LOCKED · FREE ACCOUNT UNLOCKS THIS`, consistent with the reference's
  eyebrow-label pattern used everywhere else on the site (`.lab.eyebrow`).
- **What stays visible above the gate.** The overall score, the 5-step band, and all five category
  scores are **never gated** — foundation and the product's own pricing copy (reference FAQ: "With no
  account you get the overall score and all five category scores") both confirm this. Only the
  per-check detail list is gated. The captured build appears to honor this (category grid renders
  above the gate; only the expanded check-row detail sits behind it) — preserve that boundary exactly.

## 6. `scan-loading` — Cobalt Signal treatment

Captured copy: `h1` "Comprehensive Token Health Analysis", chain badge + truncated address, progress
label `"Performing comprehensive analysis using GoPlus, GeckoTerminal, and Etherscan APIs"`,
`"Analysis Progress" / "6%"`, a filled progress bar (`bg:rgb(59,130,246)` — already correct Cobalt),
step copy `"Initializing comprehensive scan..."`, and a `💡 Analysis Insights` trivia callout.

- **Named-source narrative is already correct and should be kept as-is structurally.** Naming
  GoPlus/GeckoTerminal/Etherscan mid-scan is the product's credibility move — it is showing its work
  before the number appears, exactly the way the reference's `.srcs` row ("GoPlus · Moralis ·
  DefiLlama · Webacy · LunarCrush…") does at rest. Do not generalize this copy into a vaguer
  "Analyzing…" — specificity is the point.
- **Progress bar geometry.** Swap shadcn `Progress`'s rounded pill for the reference's `.tr`/`b` flat
  bar: `height:3px`, track `background:rgba(255,255,255,.07)`, fill `background: var(--primary)`,
  `border-radius:0`. This matches the dimension-bar idiom used on the result page itself, so the
  loading state visually previews the result state's own vocabulary.
- **One-orchestrated-load rule.** Foundation §4: "ONE orchestrated load moment per page." On
  `scan-loading` this means the progress-bar fill, the step-copy swap, and the percentage counter are
  driven by a single animation/update cadence, not three independently-timed transitions competing
  for attention. Treat the whole progress block as one motion unit: `animation-delay: calc(var(--i) *
  .07s)` stagger only applies to the *initial* paint of the block's static chrome (label, badge), not
  to the live-updating percentage itself, which ticks on real backend progress events, not CSS timing.
- **WCAG 2.2.2 pause obligation.** The percentage and step-copy are auto-updating text (foundation
  §6: "Auto-updating content needs a pause control, WCAG 2.2.2 Level A"). Because this is a short-lived
  page (~60 seconds, per the reference's own promise copy: "in about 60 seconds"), the pragmatic
  compliant path is **not** a visible pause button but ensuring: (a) the update interval is slow enough
  to not qualify as a "blinking" hazard, (b) the whole block is wrapped in
  `prefers-reduced-motion: reduce` guard that freezes percentage updates to discrete jumps rather than
  animated counting, and (c) a screen reader gets a single polite `aria-live` region for the
  percentage, not a rapid-fire stream of individual updates. Flag for engineering: if the scan can ever
  run materially longer than ~60s (rate-limited chain, cold cache), a real pause control becomes
  mandatory, not optional — this is a length-of-exposure threshold call, not a one-time decision.
- **Insight callout.** `"💡 Analysis Insights"` trivia block: keep as `var(--surface-2)` inset card,
  drop the emoji per the same rationale as §5's gate copy — mono `.lab` eyebrow instead.

## 7. Agent-scan variants — shared vs. different

**Shared with token results (same T7 grammar):**
- Score numeral + band + word-label triad (§4) — the agent trust score is a 0–100 number across 5
  dimensions exactly like the token score, and must use the identical semantic-ramp rule, not a
  separate agent-specific palette.
- The bordered-cell instrument-panel grid for identity/metadata (reference's `.mini2`/`.m2r` idiom,
  already used for the homepage's Agent Scan preview panel — this doc extends an existing pattern,
  not inventing one).
- Copilot ask-bar treatment (§3) where present on agent results.
- Gate treatment (§5), if agent results ever ship a gated/ungated split — confirm with product; the
  captured `agent-scan-landing` atlas shows only the pre-scan landing form, not a result state, so the
  gate behavior for agent results is unconfirmed in this pass and should be captured separately before
  implementation.

**Differs:**
- **Cache stamp, not block stamp.** Token results stamp `"Read at block N"` + `"As of TIMESTAMP"`
  (reference `.stamp` row — live, block-speed data). Agent results stamp a **6-hour cache window**
  instead: reference homepage's Agent Scan preview panel shows `"Cache window" / "6 HOURS"` as a
  `.m2r` key-value row, and the FAQ confirms why — "agent registry data does not move at block speed."
  Target: agent result's stamp row swaps the block-number half for a cache-age readout (e.g. `"Cached
  · 3h 12m old"` or `"Refreshed <TIMESTAMP>, next in 6h"`), keeping the same mono `.lab` styling and
  live-dot idiom, but the dot's color/state should reflect cache freshness (green when fresh, amber
  approaching the 6h boundary) rather than always-green (which the token stamp's live-dot correctly is,
  since token data has no cache staleness to signal).
- **Identity fields differ from token fields.** Agent card rows are registry-shaped (`Registry
  record: RESOLVED`, `Onchain identity: VERIFIED`, `Declared capabilities: 4`, `Funds custody:
  DELEGATED`, `Registry age: 118 DAYS`) rather than market-shaped (price, market cap, chain). Both use
  the same `.m2r` row component; only the field set changes per product.
- **Hardcoded-color surface area is larger on the agent side per-component.** `AgentIdentityCard.tsx`
  (5 hits) and `AgentDimensionCard.tsx` (3 hits) both carry their own hardcoded colors independent of
  `TokenProfile.tsx` — meaning the agent variant needs its own token-migration pass, not a free ride
  off the token-result fix (see §8).

## 8. Component target rows

| Component | Current behavior (captured/inventory) | Target |
|---|---|---|
| **ScanLimitIndicator** (`src/components/ScanLimitIndicator.tsx`, 74 lines, used by `ScanResult`) | Already token-driven (`usesTokens:true`, 0 hardcoded-color hits per inventory) — the cleanest component touching this page. Shows remaining free/Pro scan count. | No color migration needed. Restyle only for grammar consistency: mono `.lab` label, numeral in `var(--mono)` `tabular-nums`, sits in the stamp/utility row rather than as a standalone badge, so it reads as part of the instrument's status strip rather than a separate marketing nudge. |
| **ShareScanResult** (`src/components/ShareScanResult.tsx`, 180 lines, reached via `TokenProfile` → `ScanResult`) | 0 hardcoded-color hits; not token-driven (`usesTokens:false`) — likely inherits from parent context rather than declaring its own colors, so it rides whatever `TokenProfile.tsx` resolves around it. | Buttons ("Copy Link", "Share") move to the ghost-button pattern from §3 (`var(--hairline-2)` border, `var(--ink)` fg, `4px` radius). Verify independently once `TokenProfile.tsx`'s own fixes land, since this component's correctness is currently contingent on its parent. |
| **RefreshScanButton** (`src/components/RefreshScanButton.tsx`, 92 lines, reached via `TokenProfile` → `ScanResult`) | 0 hardcoded-color hits, not token-driven — same inherited-context situation as `ShareScanResult`. | Ghost-button treatment matching §3. Icon (refresh glyph) should sit at `var(--ink-2)`, not full `--ink`, so it doesn't compete with the primary CTA hierarchy on a page that already has one Cobalt action (the gate CTA, when gated) or none (when unlocked). |
| **DataFreshnessIndicator** (`src/components/DataFreshnessIndicator.tsx`, 57 lines, reached via `TokenProfile` → `ScanResult`) | 0 hardcoded-color hits, not token-driven. Not visually distinguished in this capture pass (no standalone text/color entry surfaced separately from the stamp copy captured under `TokenProfile.tsx` — likely the source of the `"Generated on… \| Updated Weekly \| Last Updated:…"` string). | This **is** the as-of-stamp component and should be rebuilt to match §3's `.stamp` target directly: live-dot + mono "As of TIMESTAMP" pairing, matching the reference's `.stamp` row verbatim. On the agent variant, this same component (or a sibling using identical styling) renders the 6-hour cache stamp per §7 instead of the live block stamp — one component, two data modes, same visual grammar. |

## 9. Migration notes — hardcoded-color blast radius

`component-inventory.json` `stats.topOffenders` (91 total hardcoded-color hits across 9 files) is
almost entirely a **T7 problem**:

| Component | Hits | Renders on |
|---|---|---|
| `TokenProfile.tsx` | **63** (worst offender, 69% of all hardcoded-color hits in the app) | `ScanResult` only (`usedBy: ["ScanResult"]`, `usedByCount: 1`) |
| `agent-scan/AgentIdentityCard.tsx` | 5 | `AgentScanResult` |
| `ui/chart.tsx` | 5 | shared shadcn primitive — wherever a chart renders (Copilot sparklines, potentially `Dashboard`) |
| `copilot/blocks/PriceSparkline.tsx` | 4 | Copilot embed, reached from `ScanResult` |
| `TokenScore.tsx` | 4 | likely a `TokenProfile.tsx` sub-render or `TokenDirectory` card — confirm exact call site before fixing |
| `OverallHealthScore.tsx` | 4 | `TokenProfile.tsx` → `ScanResult` (this is the score-numeral component — see §3/§4, the ring/numeral color source) |
| `agent-scan/AgentDimensionCard.tsx` | 3 | `AgentScanResult` |
| `ui/sidebar.tsx` | 2 | admin surfaces, not T7 |
| `agent-scan/AgentTrustScoreRing.tsx` | 1 | `AgentScanResult` (agent equivalent of `OverallHealthScore.tsx`) |

**Blast radius: `TokenProfile.tsx`'s 63 hits are contained to a single page.** Because `TokenProfile`
has exactly one consumer (`ScanResult`, `usedByCount: 1`, no indirect consumers), fixing it is a
one-page migration, not a portfolio-wide one — the highest-value, lowest-risk fix in the whole T6/T7
scope. Sample offenses confirmed in the inventory: `stroke="#232334"` and `stroke="#F59E0B"` (raw SVG
stroke attributes on the score ring, bypassing CSS custom properties entirely — these won't respond to
a `.cobalt` theme-class flip at all, since they're element attributes not computed styles) and inline
Tailwind arbitrary-value classes like `text-[#9CA3AF] dark:text-[#A3A3B3]` (a **manually
dark-mode-forked hardcoded hex pair**, meaning this single line alone needs two token substitutions,
not one, and is a preview of how much of the 63 is likely to be this same doubled pattern).

**Agent-side components (`AgentIdentityCard`, `AgentDimensionCard`, `AgentTrustScoreRing` — 9 hits
combined) do not share a parent with `TokenProfile.tsx`.** They must be migrated as their own pass;
fixing `TokenProfile.tsx` alone leaves the agent result page's score presentation still off-ramp.

**`chart.tsx` and `PriceSparkline.tsx` (9 hits combined) are shared/embedded** — `chart.tsx` is a
shadcn primitive whose blast radius extends beyond T7 to anywhere charts are used; confirm all call
sites before touching it. `PriceSparkline.tsx` is scoped to the Copilot embed and is T7-local.

**Fix priority for this doc's scope:** `OverallHealthScore.tsx` first (it *is* the score-ramp law from
§4 — an SVG stroke color that bypasses CSS variables cannot satisfy "semantic ramp only, never brand
Cobalt" as a *system*, only as a one-off render), then `TokenProfile.tsx` in full, then the agent-side
trio, then the shared `chart.tsx`/`PriceSparkline.tsx` pair last (widest blast radius, needs the most
cross-page verification).

## 10. Verification checklist

- [ ] Overall score numeral resolves to `--score-healthy`/`--score-risk`/`--score-critical` — never a
      raw hex, never `--primary`.
- [ ] Overall score ships with a 5-step band (`.band`/`.bandlab`) — currently **absent**, this is a
      net-new element, not a restyle. Verify it exists before verifying its colors.
- [ ] Category score cards: each numeral independently resolves to the ramp per its own band; word
      label present on every card, never numeral-only.
- [ ] `OverallHealthScore.tsx`'s SVG `stroke` attributes are replaced with values driven by CSS custom
      properties (or the ring is rebuilt so stroke color can respond to the `.cobalt` theme class and
      light/dark swap at all).
- [ ] Gate: exactly one `Create Free Account` CTA per gated view (duplicate CTA from the current
      capture is resolved).
- [ ] Gate: veil uses `--surface-2` fill / skeleton blocks, no `backdrop-filter: blur()`.
- [ ] Gate: overall score, band, and all five category scores remain visible above the gate; only
      per-check detail is obscured.
- [ ] `scan-loading`: progress bar is the flat `.tr`/`b` idiom (3px, square corners, `--primary` fill),
      not shadcn's rounded `Progress`.
- [ ] `scan-loading`: named-source copy (GoPlus/GeckoTerminal/Etherscan) preserved verbatim per scan
      type, not genericized.
- [ ] `scan-loading`: percentage/step-copy updates sit behind a single `aria-live="polite"` region;
      `prefers-reduced-motion` freezes counting animation to discrete jumps.
- [ ] Stamp row (`DataFreshnessIndicator`): token results show live-dot + block number + "As of
      TIMESTAMP"; agent results show cache-age readout instead, same component grammar.
- [ ] Copilot ask-bar: idle state matches the reference's single-row mono placeholder + Cobalt `Ask`
      chip, not a full bordered `textarea` + full-height button.
- [ ] Emoji removed from gate copy and loading-page insight callout; replaced with mono `.lab`
      eyebrows.
- [ ] `TokenProfile.tsx`'s 63 hardcoded-color hits fixed to zero (`hardcodedColors.count: 0` on a
      re-run of the inventory script).
- [ ] Agent-side trio (`AgentIdentityCard`, `AgentDimensionCard`, `AgentTrustScoreRing`) fixed
      independently — confirmed not to inherit `TokenProfile.tsx`'s fix for free.
- [ ] `chart.tsx`/`PriceSparkline.tsx` fixed last, with every call site (not just T7) re-verified.
- [ ] 375/768/1440 breakpoints re-captured for `scan-loading`, `scan-result-gated` (and an unlocked
      capture, not yet in this atlas), and `agent-scan-landing`/agent result, diffed against this table.
