# T1 — Marketing Landing

> Inherits `00-foundation.md` in full. Cites foundation tokens by name; does not restate values.
> Target for this type is not theoretical — it EXISTS: `design/reference/ths4-homepage.html`, approved.
> This doc maps the four live T1 pages onto that reference, page by page.

## 1. Purpose & pages

T1 = `marketing-landing` (site-blueprint.json `pageTypes.T1`). Four routes, all `authTier: public`:

| Route | Component | isMoney | GSC impressions | Role |
|---|---|---|---|---|
| `/` | `Landing` | false | 114 | Primary acquisition surface, the only T1 page currently in the internal-link graph |
| `/pricing` | `Pricing` | **true** | 0 | Conversion page — 4-tier plan comparison + FAQ |
| `/ltd` | `LTD` | **true** | 0 | Lifetime-deal offer page. Flagged in `route-reconciliation`: in worker `STATIC_ROUTES` but **absent from the crawl** — no internal links reach it. Fix this alongside the redesign, not after. |
| `/ltd-thank-you` | `LTDThankYou` | false | 0 | Post-purchase confirmation, no SEO role |

SEO role for T1 is secondary to T2 — Landing carries some organic weight (114 impressions) but the type exists to convert, not to rank. No `pageType: T2` overlap.

## 2. Layout grid

### Current (measured, `Landing` 1440/768/375, `default`, dark)
Bootstrap-era shadcn pattern, not a shell: `.container` (max-width, centered, `px-4`/`px-6`), full-bleed section backgrounds alternate `bg-background` / `bg-slate-800` (`rgb(30,41,59)`) with **no vertical border between sections** — rhythm is via background-color banding, not hairlines. No left/right shell border at any breakpoint. Hero grid degrades from a two-tab centered layout (1440) to full-width single-column (375) — this is a centered, symmetric composition throughout, the opposite of the reference's asymmetric two-pane hero.

Nine stacked sections, uneven only by accident (whatever content required): nav (65px) → hero (732px) → report-screenshot band (1195px, `bg-slate-800`) → 3-step "sample scan output" (482px) → 3-card security-strip (324px, `bg-slate-800`) → 5-dim + remediation grid (638px) → trust bar (172px, `bg-slate-800`) → pricing 2-card (651px) → final CTA band (352px, solid Cobalt-equivalent `rgb(59,130,246)` bg with **dark text on it**, `rgb(15,23,42)`) → footer (199px). Total page height 4810px at 1440, 6282px at 375 (mobile is *taller*, not just narrower — no content is cut for mobile, everything reflows to single column).

### Target (per foundation + reference)
`.shell` — `max-width:1400px`, centered, `border-left`/`border-right: 1px solid var(--hair)`. Sections are `border-bottom: 1px solid var(--hair)` only, alternating `--ground`/`--surface` for the `.alt` class — never a background-color jump without a hairline marking the seam. Hero is the reference's asymmetric `47fr / 53fr` two-pane grid at ≥1040px (copy left, instrument panel right — NOT a centered tab switcher), collapsing to stacked single-column under 1040px. Section rhythm is **deliberately uneven** (reference: hero 732-ish px, dim grid ~500px, comparison table ~450px, pricing ~600px, FAQ variable) — do not normalize every section to the same padding rhythm; `clamp(46px,5.5vw,82px)` vertical padding on `.blk`, tighter on data-dense rows.

## 3. Element spec table

| Element | Current treatment (measured) | Target treatment (foundation tokens) | Renders in |
|---|---|---|---|
| Nav shell | `header.sticky`, `bg-rgba(2,8,23,.95)` (blur), 65px, `border-b` | `nav` 58px, `Ground`, `border-bottom: Hairline`, no blur/glass (foundation §3 kills glassmorphism) | `src/components/Navbar.tsx` |
| Nav wordmark | `span.font-bold` 20px/700 Ink, mark icon `svg.w-7` | Archivo 600, sentence case, 21px mark per foundation §7 — reference's pulse-sweep SVG, not the current generic circle-fill mark | `Navbar.tsx` |
| Nav links | `nav a.text-sm` 14px/500 Ink (no dim state — active/inactive identical color) | JetBrains Mono NOT used here (nav is UI chrome, Archivo per foundation §2) 13.5px `Ink-2`, hover `Ink` | `Navbar.tsx` |
| Nav primary CTA | `a.items-center` 150×36 `fg rgb(15,23,42) bg rgb(59,130,246)` ("Scan Your Token →") | `.ghost` "Sign in" link only in reference nav — Landing's persistent CTA duplicates the hero form; **decision needed**: keep a nav CTA (reference has none) or drop it, since the hero already has the primary scan action | `Navbar.tsx` |
| H1 | `h1.text-2xl/text-3xl` 24px→48px/700, Ink, centered, no clamp — hard breakpoint jump | Archivo 300-400 weight, `clamp(1.8rem,3.1vw,2.45rem)`, `letter-spacing:-.04em`, `text-wrap:balance`, left-aligned in copy pane, `<b>` for the emphasis word only (reference: "is **hiding**") | `landing/HeroSection.tsx` |
| Hero promise/subhead | `p.text-base` 20px/400 `Ink-2` (`rgb(148,163,184)`), centered, no max-width discipline | `.promise` 1.02rem `Ink-2`, `max-width:46ch`, inline `<b>` for the load-bearing claim in `Ink` | `HeroSection.tsx` |
| Hero badges/eyebrow | Two solid-fill pill badges "Built for protocol founders" / "Live data · Instant verdict" — `bg rgb(37,99,235)` and `bg rgb(30,58,138)`, white text, 14px/500, rounded-full — decorative, no data role | `.lab` mono eyebrow, 10px, letterspacing .16em, `Ink-3`, uppercase, no pill/fill at all — the current badges are the single loudest anti-pattern on the page relative to the reference's restraint | `HeroSection.tsx` |
| Search tabs (Token/Agent) | Two `button` triggers, active = `bg rgb(2,8,23)` fg Ink, inactive = transparent fg `Ink-2`, `radix` tabs | Reference has no tab switcher in the hero — token scan is the sole hero action; Agent Scan is demoted to its own two-column section (`#agents`) further down. **This is the single biggest structural delta** — decide whether to keep dual hero intent or follow the reference's split | `HeroSection.tsx` (imports `AgentSearchInput.tsx`) |
| Address input | `input.flex` 334×48, `bg rgb(2,8,23)`, 14px mono-less (font not monospace currently) | `.sf input` `Surface-2` bg, `Hairline-2` border, JetBrains Mono 13px (foundation §2: ALL data is mono — an address is data), `Ink-3` placeholder | `TokenSearchInput.tsx` |
| Chain select | Not present as a separate control — chain is inferred/searched, no explicit `<select>` | `.sf select` — reference's inline chain selector is a **net-new control** vs the current single-input search; carries over cleanly, `Surface-2`/mono | `TokenSearchInput.tsx` (needs a chain-select subcomponent) |
| Primary submit CTA | `button.inline-flex` "Scan Now" 138×44, `bg rgb(59,130,246)` fg `rgb(15,23,42)` (dark text on brand fill — inverted vs foundation) | `.sf button` Cobalt fill, `#fff` text (foundation: Cobalt "as FILL... never body-size text" governs the fill; text-on-fill is white, not dark) | `HeroSection.tsx` |
| Hero caveat line | Not present — no honesty/limitation copy in the current hero | `.caveat` — amber dot + `<b>` amber lead-in, "A clean score is not a guarantee" — **net-new element**, is the brand's evidence-not-verdict position and is absent from the current build entirely | `HeroSection.tsx` |
| Hero visual (right pane) | A static screenshot `<img>` of the report UI, 894×953 at 1440, alt text describes it — not a live instrument, just a picture | Reference `.panel` — a real instrument-panel markup (scan target row, score numeral, band, flags, 5-dim bars, stamp footer) built from the same tokens as the actual scan-result UI, not a screenshot. This is a full component build, not a restyle | new component, no current equivalent (screenshot lives in `landing/HeroSection.tsx` today) |
| Score numeral (in panel) | N/A (screenshot only) | `.score .n` JetBrains Mono weight 300, `clamp(3.6rem,8vw,5.4rem)`, color = Score ramp value (never Cobalt — foundation §1 verdict rule) | new: `HeroInstrumentPanel` component |
| Dimension bars (in panel) | N/A (screenshot only) | `.dim` grid rows, `.tr b` fill bar animated `scaleX` per foundation §4 motion, name in mono caps `Ink-2`, value mono `g`/`w`/`r` | new component |
| Section eyebrow labels | Some sections have a small blue label ("SAMPLE SCAN OUTPUT" 14px/500 `rgb(59,130,246)` — brand color as body text, violates foundation §1 Cobalt-hi rule), most sections have none | `.lab.eyebrow` mono 10px `Ink-3`, uppercase, every section gets one (reference pattern is universal, current is inconsistent) | per-section components |
| H2 (section headings) | `h2.text-2xl` 24-30px/700, Ink, centered | Archivo weight 300, `clamp(1.5rem,2.7vw,2.05rem)`, `letter-spacing:-.035em`, left-aligned, `<b>` for one emphasis phrase, `max-width:22ch` | per-section components |
| Body/lede paragraphs | `p.text-base`/`text-lg` 16-20px/400 `Ink-2`, centered, wide (no max-width cap → lines run 60-90ch at 1440) | `.lede` `Ink-2`, `max-width:46ch`, `.97rem` | per-section components |
| Numbered step cards (steps 1/2/3) | Filled circle `div.h-14` 56×56 `bg rgb(59,130,246)` fg white bold numeral, no border/hairline framing | Reframe as instrument-panel cells if kept — bordered cells with mono numeral, not a filled brand-color badge (badge-as-decoration is the same anti-pattern as the hero pills) | new/existing step components |
| Feature/dimension icon cards | `div.bg-card` rounded panel, `svg` icon in Cobalt-equivalent, `h3.font-medium` 16px/500, `p.text-sm` 14px `Ink-2` — Tailwind default card radius (likely `rounded-lg`, ≥8px) | `.dc` cells: 0-radius, `border-right`/`border-bottom: Hairline`, forming one `.dimgrid` (reference: 5-up at ≥1080px, hairline-ruled, no per-card rounded box) — **radius must drop to foundation's "never ≥12px on data components," ideally 0 for this grid** | per-section components |
| Comparison content | Not present as a table on Landing today (comparison table lives conceptually but isn't built here) | `.cmp table` — reference's "typical scanner vs Token Health Scan" comparison, `Surface-2` bg, mono th labels, `.us` column in `Cobalt-hi` | net-new, no current component |
| Pricing cards (on Landing) | 2-card (Free/Pro) `div.bg-card` rounded, "Most Popular" pill absolute-positioned, feature list with check/circle icons in `green`/`Ink-2` | `.pc` cells in a hairline `.price` grid, `.pc.feat` gets `Surface-2` bg not a pill badge, CTA `.btn`/`.btn-p` | shared with `/pricing` — see §6 per-page deltas |
| Trust bar | Single centered line, `span.text-base` 18px/500, small Cobalt-equivalent dot | `.live` liveness strip — reference repurposes this slot for *data* ("13 live sources," "6 chains," "Index updated") not social proof copy; **content strategy decision**, not just a style flip | `landing/BenefitsSection.tsx` or new |
| Final CTA band | `section.py-12` full Cobalt-equivalent fill (`bg rgb(59,130,246)`), **dark text directly on the brand fill** (`rgb(15,23,42)` h2/p/CTA-link all dark-on-blue) | `.band2` — `Surface` bg with `border-top: 2px solid rgba(59,102,255,.4)` (a cobalt top-rule, not a full fill), form re-entry (address input + button), never a solid brand-fill background per foundation (Cobalt is "CTAs, links-as-fills... never large background fields" is implied by the fill-vs-text-size rule; the reference itself never fills a whole section in Cobalt) | per-section component |
| Footer | 4-col grid, `h4` mono-ish caps label but NOT actually monospace font (`text-xs uppercase text-muted-foreground`, sans-serif), link list, no AEO block, no "systems operational" status line | `.fg` 4-col (`1.5fr` + 3×`1fr`), `.fc h4` genuinely JetBrains Mono 9.5px, `.aeo` block ("Ask an AI about...") is **net-new**, `.legal` status dot line is **net-new** | `src/components/Footer.tsx` |

## 4. States

Blueprint declares `default` and `loading` captures for Landing at all three breakpoints; `empty`/`error`/`gated` do not apply to T1 (no data-fetch on first paint, no auth gate on any T1 route per site-blueprint `authTier: public` across all four).

- **default** — the state fully mapped above.
- **loading** — **the atlas capture is byte-identical to default at every breakpoint checked (1440 confirmed via diff).** The Landing page has no real loading UI on first paint; whatever loading state exists (autocomplete debounce, submit-in-flight) requires interaction the static crawler didn't trigger. Do not treat the `loading.*.json` files as evidence of a designed loading state — there isn't one yet. Target must be authored fresh: on submit, the `.sf button` should show a mono-timer or pulse-sweep (foundation §7 — the brand's own scanning idiom) rather than a generic spinner, and the instrument panel should placeholder-fade its numerals rather than blank/unmount. This is new design work, not a restyle.
- **LTD/LTDThankYou** have no loading state captured or needed (static offer/confirmation pages).

## 5. Per-page deltas

### `/pricing`
- Structural skeleton (nav → hero H1/subhead → 4-card grid → FAQ accordion → "Need a custom plan" CTA band → footer) already loosely matches the reference's `.price` + `.faqwrap` pattern — this page is the **cheapest T1 migration**.
- 4 cards confirmed at 1440 dark: Free ($0), Pro Monthly ($20/mo, "Most Popular" badge), Pro Annual ($120/yr, "Save $120 (50%)" note), API ($99/mo, "API ACCESS" badge). Card shell is `div.rounded-lg` with visible corner radius and a `div.absolute` badge overlapping the card edge — target drops to `.pc` hairline cells, 0-radius, `.tbd2`-style inline badge instead of an absolute-positioned pill.
- FAQ uses `radix-*` accordion IDs (`#radix-:r0:` etc.) with `h3.flex` + a duplicate `button` — same DOM redundancy pattern as `<details>` should replace it per foundation §4 (native `<details>`/`::details-content`, not Radix Accordion, matching the reference's FAQ exactly).
- "Need a Custom Plan?" band is `bg rgb(30,41,59)` (slate, not brand-fill) — closer to target already than Landing's final CTA band; just needs hairline treatment and mono eyebrow.

### `/ltd`
- **Confirmed NOT theme-aware.** Captured under the `dark` filename but every color read as light-mode: body/heading fg `rgb(2,8,23)` (near-black, i.e. light-mode ink), section bands `rgb(241,245,249)` (light slate), icon accents raw Tailwind utility colors (`rgb(37,99,235)` blue-600, `rgb(22,163,74)` green-600, `rgb(147,51,234)` purple-600) with no CSS-var indirection. This page does not read `.dark` on `<html>` at all.
- Component-inventory confirms why: `LTD` imports only `ui/button`, `ui/card`, `ui/badge` — everything else (hero, feature-grid, how-it-works steps, dimension-icon grid, final CTA) is markup written **inline in the page file**, not in tracked components, so it never showed up as a "hardcoded color offender" in the inventory scan (which only walked imported component files).
- Emoji-as-icon convention throughout ("🚀 Limited Time Offer," "🚀 Unlock Lifetime Access - $97") — foundation has no emoji rule but this reads inconsistent with the reference's SVG-icon-only vocabulary; recommend dropping emoji in the redesign pass.
- Content structure: urgency badge → H1 w/ "Lifetime Access" in brand color as inline `<span>` → price comparison (`$240/year` struck vs `$97` one-time, arrow between) → primary CTA → "What You Get Forever" 3-benefit list → "How It Works" 3-step → report screenshot (same image asset as Landing) → 5-dimension icon grid (near-identical markup to Landing's, duplicated not shared).
- Not in the internal-link graph (route-reconciliation finding) — flag for the AM/marketing team once the redesign ships: a redesigned page nobody links to still converts nobody.

### `/ltd-thank-you`
- Same non-theme-aware finding as `/ltd` (fg `rgb(2,8,23)`, `div.bg-white`, `div.bg-blue-50` literal Tailwind light utilities) — same root cause, inline page markup, imports only `ui/card`, `ui/button`, `use-toast`.
- Shortest T1 page (31 elements, 1093px tall at 1440). Structure: success icon + H1 "Welcome to Lifetime Access!" → confirmation card ("🎉 Congratulations!") → blue info callout (`bg-blue-50`, access-your-account note) → 2-benefit row (Unlimited Scans / Full Analysis) → "Sign In" CTA → "What's Next?" 3-step numbered list (uses numeral emoji 1️⃣2️⃣3️⃣, `div.bg-white` cards) → support email link.
- No SEO role, no form, no data density — lowest priority for the flip; can lag `/ltd` and `/pricing`.

## 6. Migration notes

**Zero hardcoded-color offenders in the T1 component tree.** Cross-referencing `component-inventory.json`'s `hardcodedColorOffenders` (9 files, 91 hits — `TokenProfile.tsx` alone is 63) against every component imported by `Landing`, `Pricing`, `LTD`, `LTDThankYou` (direct + one-level-deep): **every one reports `count: 0`**. None of the 9 offending files (`TokenProfile.tsx`, `AgentIdentityCard.tsx`, `chart.tsx`, `PriceSparkline.tsx`, `TokenScore.tsx`, `OverallHealthScore.tsx`, `AgentDimensionCard.tsx`, `sidebar.tsx`, `AgentTrustScoreRing.tsx`) is reachable from a T1 page — they all belong to the scan-result / token-profile / agent-scan surfaces (T7/T8). This means:

- `Navbar.tsx`, `Footer.tsx`, `ThemeToggle.tsx`, `MobileNav.tsx`, `AuthButton.tsx`, `PricingCard.tsx`, `TokenSearchInput.tsx`, all `ui/*` primitives used here — **restyle free** once the `.cobalt` theme class lands per foundation §5. They already read CSS custom properties, not literal hex.
- **Exception, confirmed by direct measurement, not inventory:** `LTD.tsx` and `LTDThankYou.tsx` themselves (the page-level files, not their imports) do NOT restyle free. They're invisible to the inventory scan because it only walked *imported* component files, and these two pages write almost everything inline. Budget these two as manual rebuilds, not token flips — same effort class as building the reference hero panel from scratch.
- `Landing.tsx` and `Pricing.tsx` compose entirely from tracked, token-clean components — but "token-clean" only guarantees the *colors* flip free. The **structural** deltas in §3 (hero panel replacing a screenshot, dual-tab hero becoming single-intent, pill badges becoming mono eyebrows, filled CTA bands becoming hairline-bordered ones) are layout/markup rewrites regardless of token cleanliness. Do not read "0 hardcoded colors" as "0 work."

## 7. Verification checklist

Before any T1 page flips to `.cobalt`, the QA rig (`surface-qa` skill, or equivalent measured pass) must show, at 375/768/1440, both `.cobalt` and `.cobalt.light`:

1. **Shell border present** at 1440/768 (`.shell` hairline left/right), correctly absent or edge-flush at 375.
2. **Zero background-color-only section seams** — every section transition has a `border-bottom: Hairline` visible in the screenshot diff, not just a color jump.
3. **Hero is asymmetric two-pane at ≥1040px**, single-column stacked below it — confirm via bbox: right pane (instrument panel) width ≈ 53% of shell width at 1440, not a centered symmetric block.
4. **No pill-filled decorative badges remain** — grep the rendered DOM for any element with a fully-saturated Cobalt or ramp-color `background` behind body-size text; foundation §1 forbids Cobalt as body-size text and by extension as a loud decorative fill.
5. **All addresses/numbers/labels-in-caps render in JetBrains Mono** with `tabular-nums` — spot-check the hero input, the instrument-panel score, and every price ($0/$20/$120/$99 on Pricing).
6. **Score/verdict colors never render in Cobalt** — confirm the hero instrument panel's score numeral and dimension values use Score-ramp (`--score-healthy/-risk/-critical`), not `--primary`/Cobalt, at both themes.
7. **Focus rings** are 2px Cobalt, `:focus-visible` only, non-animated — tab through the hero form and both pricing-card CTAs.
8. **`/ltd` and `/ltd-thank-you` actually respond to the theme class** — this is the regression test for the confirmed bug: capture both under `.cobalt` and `.cobalt.light` and confirm the colors differ (today they don't, under `.dark`).
9. **Loading state is a designed state, not a no-op** — trigger a real hero-form submit in the QA rig and confirm the panel shows a pulse-sweep or mono-timer, not an identical-to-default frame (today's atlas capture proves this is currently unbuilt).
10. **Reduced-motion kill-switch verified** — `prefers-reduced-motion: reduce` emulation shows zero animation on the fill bars, score fade-in, and any accordion open/close, matching the reference's `@media` block verbatim.
11. **Contrast floor** — Ink-3 never carries real label/body text (foundation §1 flag); spot-check every element table row above that currently uses `Ink-2`-equivalent `rgb(148,163,184)` for anything more than decorative/placeholder text.
