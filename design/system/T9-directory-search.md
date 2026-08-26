# T9 — Directory / Search Surfaces

> Inherits `00-foundation.md`. Covers three pages: `TokenDirectory` (`/token`, `src/pages/
> TokenDirectory.tsx`), `AgentDirectory` (`/agent-directory`, `src/pages/AgentDirectory.tsx`),
> `AgentScanSearch` (`/agent-scan/search`, `src/pages/AgentScanSearch.tsx`). These are the
> closest surfaces in the app to the reference's ledger idiom (`design/reference/
> ths4-homepage.html` `.dirgrid`/`.dt` and `.dim` patterns) — element maps captured at
> 1440/768/375 x default.dark/light, plus loading states for all three and an error state for
> `token-directory` only (`design/element-maps/T9/`).

## 1. Purpose / pages

Three data-dense list surfaces, two different current idioms:
- **`/token` (TokenDirectory, 32 GSC impressions)** — card grid, 1–4 columns responsive,
  client-side search + category filter over all rows fetched at once (no pagination).
- **`/agent-directory` (AgentDirectory, 0 impressions, unindexed today)** — already a row-list
  (not a card grid), chain filter, server-side pagination (20/page), closest existing surface
  to the target ledger idiom.
- **`/agent-scan/search` (AgentScanSearch, 0 impressions, `noindex` by design)** — row-list
  search-results page, live + cached dual-source search, no pagination (capped at 20 results).

`TokenDirectory` is the one with real search-engine weight and the one furthest from the
target visual idiom (card grid vs. the reference's row grid) — prioritize it.

## 2. Layout grid — current → target

| | TokenDirectory (current) | AgentDirectory (current) | Target (all 3) |
|---|---|---|---|
| Container | `container mx-auto px-4 py-12` | `max-w-5xl mx-auto px-4 py-8` | Keep per-page container widths — directory doesn't need the report page's narrower measure |
| List structure | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6` — 4-col card grid, each `Card` a self-contained tile (logo, name, score, badges, CTA button, all centered/stacked) | `space-y-2` — single-column row stack, each row a horizontal `Card` (rank number, avatar, name+meta, action button) | **Single-column row grid with hairline separators** at all breakpoints, matching the reference's `.dt`/`.dim` row pattern — border-top/border-bottom hairlines between rows, not `gap`-separated floating cards. TokenDirectory needs the bigger structural change; AgentDirectory is already close, just needs hairline borders instead of `Card`-per-row with its own border+shadow+hover-scale chrome |
| Row content order | logo → name/symbol → score → category badges → CTA (vertical stack inside a tile) | rank# → avatar → name+chain badge+ID → CTA (horizontal) | Horizontal row: mono symbol/rank → logo → name+meta → semantic score chip → CTA, right-aligned. Mono-first left edge is the ledger idiom's signature (reference `.dt .sym` — `$CAKE` in mono leads the row) |
| Density | Card grid: ~220px min tile height x however many rows, `hover:scale-105` per-tile | Rows: `h-16`-ish (`py-4` content), consistent row height | Target row height ~56–64px consistent across all 3 pages — enough for avatar/logo + two text lines, no scale-on-hover (foundation §3: no shadows/glassmorphism; a `hover:scale-105` card-lift is exactly the kind of elevation-by-motion the foundation forbids — replace with a background-tint hover, which `AgentDirectory`/`AgentScanSearch` already do correctly: `hover:bg-accent/40`) |

## 3. Row grids with hairline separators

Direct application of the reference's `.dirgrid`/`.dt` pattern
(`ths4-homepage.html` L239–244):
```css
.dt{padding:14px 16px;border-right:1px solid var(--hair);border-bottom:1px solid var(--hair);display:flex;align-items:center;gap:12px}
```
Target for all 3 T9 pages: replace `Card`-wrapped rows/tiles with a flat row grid —
`border-top: 1px solid var(--hairline)` on every row after the first (or the reference's full
border-collapse grid technique, whichever survives responsive collapse better at 375). No
per-row `border-radius`, no per-row shadow, no per-row background unless hovered/selected.
This is the single biggest visual delta between current and target across the three pages —
`TokenDirectory` especially, since its `Card`s currently carry `hover:shadow-lg` (foundation
§3 forbids shadows outright).

`AgentDirectory` and `AgentScanSearch` already use `Card` too (`border-border bg-card
hover:bg-accent/40`) but the effect reads closer to a hairline row because there's no
shadow/scale — mostly needs the border simplified to a shared top/bottom hairline instead of
each row being a fully-bordered independent card (currently 4 sides each; target 1–2 shared
edges so adjacent rows read as one ledger, not a stack of separate boxes).

## 4. Element spec table

| Element | Current (from element maps + source) | Target token | Component file |
|---|---|---|---|
| Row/card container | `Card` (shadcn, `border` default + `bg-card`) all 3 pages | `--surface` bg, `--hairline` top/bottom border only, radius 0 (per foundation §3: "0 allowed on instrument panels" — a ledger row is exactly that) | `src/components/ui/card.tsx` if kept, or a new lightweight `src/components/directory/ListRow.tsx` shared across all 3 pages (does not exist yet — the 3 pages currently duplicate the row markup independently) |
| Symbol / rank | TokenDirectory: none shown (only name+score); AgentDirectory: `text-xs text-muted-foreground font-mono` rank number, already mono | Mono symbol chip leading every row (`$SYM` per the reference `.dt .sym`), consistent across all 3 — TokenDirectory needs to add this, AgentDirectory keep its mono rank | `TokenLogo.tsx` neighbor markup, inline in each page currently |
| Score / status chip | TokenDirectory: `TokenScore` component, hardcoded hex (`#10b981`/`#f59e0b`/`#ef4444`, `component-inventory.json` → `TokenScore.tsx` L10–12, 4 hardcoded hits, `usesTokens: false`) | Semantic number+band chip: `--score-healthy`/`--score-risk`/`--score-critical`, JetBrains Mono `tabular-nums`, word band alongside per foundation §1 (mirrors T8 §3's score law — these two docs must agree on the same chip, this is the shared component) | `src/components/TokenScore.tsx` — rewrite in place, this is the actual migration target, not just a reference |
| Logo | `TokenLogo` (`src/components/TokenLogo.tsx`, 14 lines, `usesTokens: false` but 0 hardcoded hits — just an `<img>` wrapper, no color logic) | No change needed — verify the placeholder/fallback state (`/placeholder.svg`) reads correctly on both themes | `src/components/TokenLogo.tsx` |
| Chain/category badge | shadcn `Badge variant="secondary"`, both TokenDirectory (category tags) and AgentDirectory (chain tag) | Unaffected by token flip — shadcn badge already CSS-var driven | `src/components/ui/badge.tsx` |
| Search input | TokenDirectory: shadcn `Input` with a `Search` icon absolutely positioned inside, `pl-10 h-12` | `Input` bg `--surface-2`, border `--hairline-2`, `:focus-visible` → 2px Cobalt ring (foundation §6) — verify shadcn `Input`'s default focus ring maps to `--primary`/Cobalt correctly under the new theme class, not the shadcn default blue | `src/components/ui/input.tsx` |
| Agent search input | `AgentSearchInput` (`src/components/agent-scan/AgentSearchInput.tsx`) — shared across Landing, AgentScan, AgentDirectory, AgentScanSearch; already `usesTokens: true`, 0 hardcoded hits | No structural change; confirm it visually matches the TokenDirectory search input post-restyle since they're two different components doing the same job on sibling pages | `src/components/agent-scan/AgentSearchInput.tsx` |
| Category/chain filter | shadcn `Select` | Trigger bg `--surface-2`, border `--hairline-2`, matches search-input treatment | `src/components/ui/select.tsx` |
| Pagination | AgentDirectory: `Previous`/`Next` buttons + "Page N of M" text, page-number based, server `.limit(500)` then client-slices 20/page (not true server pagination — flag as a scale risk once agent count exceeds 500, but out of scope for a visual redesign doc) | Keep Previous/Next pattern — no infinite-scroll (foundation §4 bans scroll-reveal; infinite-scroll is adjacent enough to avoid without an explicit product decision to add it) | `AgentDirectory.tsx` inline |
| Empty/no-results state | All 3 pages: centered icon + message text, no card/border | Unaffected structurally; icon (`Search`, `opacity-50`) should use `--ink-3` (decorative-only tier per foundation §1) not a raw opacity hack | Inline per page |

## 5. States

### Loading
- **TokenDirectory**: single centered `Loader2` spinner + "Loading token reports..." text,
  full-page swap (the whole grid is replaced by one spinner — no skeleton rows). Element map
  confirms this (`token-directory.*.loading.*.json`, pageHeight collapses to ~900px, only nav
  chrome + spinner present).
- **AgentDirectory** / **AgentScanSearch**: proper skeleton rows — `Skeleton` (shadcn) x8 (or
  x4 for search), `h-16 w-full rounded-lg`, stacked with `space-y-3`. This is the better
  pattern of the two and should become the standard for all 3 pages.
- **Target**: row-count-matched skeleton list (per foundation §4's single-orchestrated-load-
  moment rule — a staggered fade-in of skeleton→real rows, `animation-delay: calc(var(--i) *
  .07s)`, killed under `prefers-reduced-motion`) for TokenDirectory too, replacing its bare
  spinner. Skeleton rows should already be the target row height/shape so there's no visual
  jump when real data lands.

### Error
- **Only `token-directory.*.error.*.json` was captured** — and it reveals a real gap, not a
  distinct error UI: when the Supabase fetch throws, `TokenDirectory.tsx`'s `catch` block only
  `console.error`s and falls through to `setIsLoading(false)` with an empty `tokens` array. The
  page renders **identically to the legitimate zero-results empty state** — "No token reports
  yet" / "Token reports will appear here as they are created" — with no indication anything
  failed. Verified directly against the captured element map: the error-state JSON's text
  content is byte-identical to the empty-state copy.
- **AgentDirectory** and **AgentScanSearch** have the same gap (`catch (err) {
  console.error(...) }` with no user-facing error path) — no error element map was captured
  for these two but the source confirms the same silent-failure shape.
- **Target**: a distinct error state — same row-list shell, replace the row area with a single
  message row: icon (not `Search`, use a warning/alert glyph consistent with T8's
  `AlertTriangle` usage) + "Couldn't load the directory right now" + a retry action. This is a
  net-new state, not a restyle of an existing one — flag to engineering, not just design,
  since the current code has no branch to hang the new UI on (needs an `error` state variable
  added to all 3 pages' `useState` alongside `loading`).

## 6. Search / filter input idiom

Per the brief: surface-2 + hairline-2 + Cobalt focus, applied consistently across all 3 search
surfaces (TokenDirectory's `Input`, AgentDirectory's `AgentSearchInput` + chain `Select`,
AgentScanSearch's `AgentSearchInput`). Today these are 2 different input components
(`ui/input.tsx` directly vs. the shared `AgentSearchInput` wrapper) styled independently with
no guarantee they match — the redesign should make them visually identical (same height,
same border/bg treatment, same focus ring) even though they stay separate components serving
different data (tokens vs. agents). `AgentSearchInput` already has an internal `Select`
(chain-scope) bundled in — TokenDirectory's category `Select` is separate/external. Keep that
structural difference (it reflects a real product difference: agent search is chain-scoped by
necessity, token search isn't) but unify the visual treatment.

## 7. Pagination / infinite treatment

No infinite scroll anywhere today and none is recommended (foundation §4 explicitly bans
scroll-reveal patterns as a negative signal; infinite-scroll directories are the same family
of pattern). Keep:
- TokenDirectory: currently **no pagination at all** — every row is fetched and client-
  filtered. This works today because the token count is small (54 reports) but is a scale
  risk once the directory grows well past a page or two — flag as a product question (not a
  visual-design fix) whether to add AgentDirectory-style Previous/Next pagination here too.
- AgentDirectory: keep Previous/Next, restyle buttons to the standard ghost-button treatment
  (`--hairline-2` border per foundation §1's hairline-2 role: "ghost-button borders").

## 8. Migration notes — hardcoded-color components

| File | Hits | Used by | Fix |
|---|---|---|---|
| `src/components/TokenScore.tsx` | 4 (`#10b981`/`#f59e0b`/`#ef4444`, `component-inventory.json` L10–12) | `TokenDirectory` only | Rewrite to `--score-healthy`/`--score-risk`/`--score-critical`, add the word-band text this component currently lacks entirely (it renders a bare colored number, no "Healthy"/"At Risk"/"Critical" label at all — worse than T8's card, which at least has a word) — **this is the shared score-chip component referenced in §4, prioritize it** |
| `TokenDirectory.tsx` inline `getTokenColor()` | Not counted by the hex/rgb scanner (uses Tailwind palette classes: `text-orange-500`, `text-blue-500`, etc, keyed by hardcoded symbol strings `'BTC'`, `'ETH'`...) | `TokenDirectory` only | This is dead-weight logic worth flagging: it's a per-symbol color map with a `'BTC'`/`'MATIC'`/`'UNI'` fallback list that doesn't even cover the 54 live symbols in the actual directory (no `'ONDO'`, `'ARB'`, `'KAITO'` entries — falls through to the `'text-blue-500'` default for most real rows). Simplify or remove rather than migrate — it's not doing its job today |
| `AgentIdentityCard.tsx` (chain brand colors, `#0052ff` Base etc) | 5 | `AgentScanResult` (T7, not T9) — not in scope here, noted only because `AgentDirectory`'s chain `Badge` is the T9 analog and should stay on `Badge variant="secondary"` (token-driven) rather than adopt per-chain brand hex, to avoid re-introducing the same hardcoding pattern on this surface |

`TokenLogo.tsx`, `AgentSearchInput.tsx` — both clean (0 hardcoded hits per the inventory), no
migration work needed beyond the shared visual pass in §4/§6.

## 9. Verification checklist

- [ ] QA rig at 375 / 768 / 1440, both themes (`default` + `.cobalt`/`.cobalt.light`) — element
  maps already exist at all 3 breakpoints x both themes for `default` state on all 3 pages;
  extend the same matrix to the restyled build (`surface-qa` for the 3-page surface set).
- [ ] Row grid renders as a single hairline-separated ledger at all 3 breakpoints — confirm
  TokenDirectory's card-grid-to-row-list change doesn't regress at 375 (card grids often
  collapse more gracefully than dense row layouts on narrow viewports; check text truncation
  on long token names).
- [ ] Score chip on `TokenScore.tsx` shows number + word band + `--score-*` color, matches the
  T8 score-chip treatment exactly (same component family, same law).
- [ ] Search/filter inputs visually match across TokenDirectory and the two agent pages
  (surface-2 bg, hairline-2 border, Cobalt `:focus-visible` ring).
- [ ] Loading state is a row-shaped skeleton list on all 3 pages (not TokenDirectory's current
  bare spinner) matched to the real row height.
- [ ] A distinct error state exists and is reachable (requires the `error` state-variable
  addition noted in §5 — confirm with engineering this landed, not just the visual design).
- [ ] Pagination buttons (AgentDirectory) use hairline-2 ghost-button styling, not shadcn
  default `outline` variant chrome.
- [ ] No `hover:scale-105` or `hover:shadow-lg` survives on any row (foundation §3 — no
  shadows, no scale-lift elevation).
