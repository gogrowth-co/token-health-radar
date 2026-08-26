# T3 — Content Index

> Inherits `00-foundation.md` in full (tokens, type, space, motion, theme mechanism,
> a11y floor). This doc adds only what's specific to index/listing surfaces. Do not
> restate or contradict foundation values here — if a number below conflicts with
> §00, §00 wins.

## 1. Purpose & pages

Grid-of-cards index page(s) that list content items with a filter/browse intent.
Currently one live route: **Publications** (`/publications`) — 22 publication cards
in a 3-column grid, backed by `src/components/cms/PublicationCard.tsx`. This is the
template for any future T3 surface (e.g. a Reports index) — same layout contract
applies.

Component tree (`component-inventory.json`):
```
Publications (page)
├── Navbar.tsx        (shared, usedByCount: 28)
│   ├── ui/button.tsx      (shadcn)
│   ├── ThemeToggle.tsx
│   ├── auth/AuthButton.tsx
│   └── MobileNav.tsx
├── Footer.tsx        (shared, usedByCount: 28)
└── cms/PublicationCard.tsx
    └── ui/badge.tsx       (shadcn)
```
None of these six components carry a `hardcodedColors` flag in the inventory
(`count: 0` on all). The card grid itself is clean — every offender in the repo
(`TokenProfile.tsx` 63 hits, `AgentIdentityCard.tsx`, `chart.tsx`, etc.) lives on
other page types, not here.

## 2. Layout grid — current → target

| Aspect | Current (measured) | Target |
|---|---|---|
| Card grid, 1440 | 3 columns, 440px cards, 24px gutter, `x` starts at 36px (page gutter ~36px, not the 68ch column) | Keep 3-col at 1440; card width becomes a computed `1fr` in a `grid-template-columns: repeat(3, minmax(0,1fr))` inside the standard 1200px page-max container so the gutter is consistent with other T-types, not a bespoke 36px |
| Card grid, 768 | Not yet captured this pass — treat as 2-col until next map run | 2 columns |
| Card grid, 375 | 1 column, full-width card (343px, i.e. viewport − 32px), card height 418px | 1 column, unchanged proportions |
| Card height | 472px (1440) fixed-ish, driven by 3-line title + excerpt + tag row | Let content set height (`h-auto`), remove any fixed-height assumption so long titles don't clip |
| Hero/heading block | `h1` 48px/700 (1440) → 36px/700 (375), intro `p` 18px/400 Ink-2 | Same scale — matches foundation type ramp already (Archivo weight 700 is heavier than foundation's 300–400 display recommendation; **flag for type-doc reconciliation**, not resolved by this doc alone) |
| Page container | `section.container` full-bleed, cards start y=354 (1440) | Unchanged structurally; only token/color swap |

## 3. Element spec table

| Element | Current treatment (measured) | Target (foundation token) | Rendering component |
|---|---|---|---|
| Page ground | `rgb(2,8,23)` header bg .95 / body implied near-black | `--ground` (`#0A0C10` dark / `#F5F6F8` light) | `index.html` body / layout shell |
| Card surface | `rgb(15,23,42)` bg, border `rgb(30,41,59)`, radius `8px` | `--surface` bg, `--hairline` border, radius stays 4px per foundation ("never ≥12px on data components" — 8px already complies, keep as-is or tighten to 4px for consistency with other card types) | `PublicationCard.tsx` |
| Card title (h2 in card) | `rgb(248,250,252)` fg, 20px/600 | `--ink`, same size/weight, font-family Archivo | `PublicationCard.tsx` |
| Card excerpt | `rgb(148,163,184)` fg, 14px/400 | `--ink-2` (passes 4.5:1 requirement — current slate-400 measured value is close but must be re-verified against `--ground`, not assumed) | `PublicationCard.tsx` |
| Tag pill (`div`, radius 9999px) | fg `rgb(248,250,252)` on bg `rgb(30,41,59)`, 12px/600 | `--ink` on `--surface-2`, JetBrains Mono, letterspacing .12em, uppercase | `ui/badge.tsx` |
| Card date/meta | `rgb(148,163,184)`, 12–14px/400 | `--ink-2`, JetBrains Mono (it's a label/data value, not prose) | `PublicationCard.tsx` |
| Page h1 | `rgb(248,250,252)`, 48px/700 (1440) / 36px/700 (375) | `--ink`, Archivo, clamp per type doc — flag weight 700 vs foundation's 300–400 display guidance | Page-level heading, `Publications.tsx` |
| Page intro paragraph | `rgb(148,163,184)`, 18px/400 | `--ink-2`, body font | `Publications.tsx` |
| Header/nav bar | bg `rgba(2,8,23,.95)`, fg `rgb(248,250,252)`, border on inactive links `rgb(148,163,184)` / active `rgb(248,250,252)` | `--surface` at .95 alpha (sticky blur), `--ink` / `--ink-2` split, active nav item uses **Cobalt fill for the active-state indicator**, not text-color-only (a11y floor: state never by colour alone) | `Navbar.tsx` |
| Primary CTA ("Scan Your Token →") | fg `rgb(15,23,42)` on bg `rgb(59,130,246)`, radius 6px | Cobalt fill, `--ink`-on-cobalt contrast recheck (foundation flags Cobalt as fill-only, never body text — this is correct usage as a filled button) | `Navbar.tsx` / `ui/button.tsx` |
| Secondary CTA ("Login") | fg `rgb(248,250,252)` on bg `rgb(2,8,23)`, border `rgb(30,41,59)` | `--ink` on `--surface`, `--hairline-2` border (ghost button) | `Navbar.tsx` |
| Footer | fg `rgb(248,250,252)` / `rgb(148,163,184)`, border-top `rgb(30,41,59)` | `--ink` / `--ink-2`, `--hairline` border-top | `Footer.tsx` |

## 4. States

### Loading (captured: `publications.{375,768,1440}.loading.{light,dark}.json`)
Current treatment: header/footer/nav chrome render immediately; the card grid region
(`main.flex-1 > section.container`) collapses to a single centered spinner —
one `<svg><path>` at Cobalt (`rgb(59,130,246)`), 24×24px, no skeleton cards, no
loading label text, `pageHeight` drops from 4499px to 900px (1440). This is a bare
spinner with no accessible status text.

Target: keep the single-spinner idiom (matches foundation's "no scroll-reveal,
one orchestrated moment" ethos — a skeleton grid would be a heavier build for
marginal gain) but:
- Recolor spinner stroke to Cobalt token, same as today (already correct usage).
- Add a visually-hidden `role="status"` / `aria-live="polite"` label ("Loading
  publications…") — currently absent, fails WCAG on assistive tech.
- Reserve the grid's min-height so the spinner doesn't cause layout shift when
  content resolves.

### Error (captured: `publications.{375,1440}.error.{light,dark}.json`)
**Finding:** the error-state capture is byte-for-byte identical to the loading-state
capture at every breakpoint/theme pair (same 24×24 Cobalt spinner, same 35–36
element count, same `pageHeight`). There is no distinct error UI in the current
build — the QA rig's error trigger either never resolved to a real error path, or
the app has no error boundary on this route and silently spins. **Treat this as
"no current treatment to preserve," not as a captured state to inherit.**

Target: build a real error state — icon (not the Cobalt spinner path reused),
message in `--ink`, a retry CTA (ghost button, `--hairline-2` border, not Cobalt
fill — this is a recovery action, not a primary conversion path), all inside the
same `section.container` region so layout doesn't jump. Confirm against a forced
network failure, not just visual inspection, since the current rig couldn't
produce one either.

### Default (empty-result edge case)
Not captured in this map pass (all 22 cards render). Flag for the next capture
cycle: what does zero-results look like? No current data to migrate from.

## 5. Migration notes

- **No hardcoded-color components on this page.** `Navbar`, `Footer`,
  `PublicationCard`, `ui/badge`, `ThemeToggle`, `ui/button` all show
  `hardcodedColors.count: 0` and `usesTokens: true` in `component-inventory.json`.
  This page is a clean token-swap migration — no source-level color literals to
  hunt down, only the token *values* change (current shadcn slate palette →
  Cobalt Signal palette).
- `Navbar` and `Footer` are shared by **28 of 32 pages**. Any change here is
  effectively a global chrome change, not scoped to T3 — sequence this work with
  awareness that it lands everywhere simultaneously (per foundation §5, land as
  the new `.cobalt` theme class first, flip per-page after verification, but the
  shared-chrome components themselves can only exist in one state at a time
  once the class is applied to `<html>`).
- Card radius (8px) already complies with foundation's "≤ typical, never ≥12px
  on data components" rule — no forced change needed, but confirm intent to
  tighten to 4px for cross-page consistency with T1/T2 data cards before locking.
- H1 weight is 700 across all captures; foundation type ramp specifies "Display
  weight 300–400." This is a direct conflict, not a migration nuance — resolve
  in the type doc before implementing T3, don't silently pick one.
- Tag pills currently render in `ui-sans-serif` at 12px/600 with no letterspacing;
  foundation requires JetBrains Mono + `.12–.16em` tracking for all caps-labels.
  This is a font-family change, not just a color swap — verify `ui/badge.tsx`
  doesn't hardcode a font-family override that fights the new base font stack.

## 6. Verification checklist

- [ ] `surface-qa` rig run at 375 / 768 / 1440 × light / dark on `/publications`
      — zero horizontal scroll, zero clipped card content, tap targets ≥44px on
      375 (card whole-card link + tag pills), contrast pass on card excerpt text
      against new `--surface` value.
- [ ] Loading state re-captured post-change: spinner recolors to Cobalt, `role="status"`
      present, no layout shift on resolve (compare `pageHeight` before/after spinner
      clears).
- [ ] Error state built and captured for real (force a fetch failure in dev, don't
      rely on the QA rig's trigger which previously produced a false loading-state
      duplicate) — confirm it renders distinct from loading, with retry CTA reachable
      by keyboard.
- [ ] Card grid at 768 captured for the first time (currently absent from element-maps/T3)
      before claiming the 2-col target is verified, not just assumed.
- [ ] `Navbar`/`Footer` token swap spot-checked on at least 2 other pages that share
      these components, confirming no regression from the shared-chrome blast radius.
