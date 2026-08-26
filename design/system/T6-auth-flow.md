# T6 — Auth Flow
> Inherits `00-foundation.md`. Captures: `element-maps/T6/{auth,confirm}.{375,768,1440}.default.{dark,light}.json`.
> Pages: `Auth` (`/auth`), `Confirm` (`/confirm`). 2026-08-26.

## 1. Purpose / pages

Two small, low-traffic forms that gate everything else in the product. `Auth` is the sign-in/sign-up
tab card; `Confirm` is the token-disambiguation search step between a symbol search and a scan
result. Neither carries brand storytelling — they inherit the instrument-panel restraint of the
reference (`ths4-homepage.html`) but at form-density, not hero-density. Scope: input idiom, error
states, and the `Confirm` no-token empty state. No score presentation here (that's T7).

## 2. Layout grid — current → target

| | Current | Target |
|---|---|---|
| `Auth` | Two-column at ≥1040px (left: marketing copy + 3 feature bullets, hidden below `lg`; right: centered `Card` with `Tabs`). Card uses shadcn `card.tsx` default (white/`--card`, rounded-lg, shadow). | Same two-column split. Card becomes a **hairline-bordered surface**, not a shadow-elevated one: `border: 1px solid var(--hairline)`, `background: var(--surface)`, `border-radius: 4px`, no `box-shadow` (foundation §3 — no shadows, no glassmorphism). Left-column marketing copy drops onto `--ground`, headline in Archivo 400 per foundation §2, feature bullets restyle as `.lab`-style mono icon rows matching the reference's `.caveat`/`.flag` idiom, not default Lucide-in-a-circle. |
| `Confirm` | Full app chrome (Navbar/Footer) + centered single-column search card, max-width ~640px. | Unchanged structure. Card becomes hairline surface-2 (`--surface-2`) to read as an inset step below the page, matching the reference `.sw`/`.dims` panel logic — this is a narrow instrument, not a marketing card. |
| Breakpoints | 375/768/1440 captured; left marketing column already `hidden` below `lg` (1040px) in current build — keep that collapse point. | Same collapse point. At 375/768 the form is single-column full-width with 20px page padding (`--pad` clamp per foundation, floor 20px). |

## 3. Element spec table

| Element | Current (captured) | Target token | Component |
|---|---|---|---|
| Page background | `rgb(2,8,23)` (`slate-950`, hardcoded, not `--background`) | `var(--ground)` → `--background: #0A0C10` (dark) | `src/pages/Auth.tsx` root |
| Auth card surface | shadcn `Card` default white/`--card` + `shadow` | `var(--surface)` → `--card: #101318`; **remove `shadow`**, add `border:1px solid var(--hairline)` | `src/components/ui/card.tsx` (as used by `Auth.tsx`) |
| Card border | none (shadow-only elevation) | `1px solid var(--hairline)` (`rgba(255,255,255,.085)` dark / `rgba(16,19,24,.10)` light) | `card.tsx` |
| Card radius | `rounded-lg` (8px, shadcn default) | `4px` — foundation §3 caps controls/cards at 4px, "never ≥12px on data components"; a form card is not a data component but should still align to the tighter radius scale used across T6/T7 | `card.tsx` override |
| Tab strip ("Sign In" / "Sign Up") | active: `bg:#F8FAFC` `fg:#020817` (inverted-white pill); inactive: `fg:#64748B` transparent | active: `background: var(--surface-2)`, `fg: var(--ink)`, hairline-2 bottom rule on the active tab (not a filled pill — filled pills read as buttons, not tabs); inactive: `fg: var(--ink-2)` | `src/components/ui/tabs.tsx` |
| Label ("Email", "Password") | `fg:#020817` size 14px weight 500, `ui-sans-serif` | `fg: var(--ink)`, Archivo 500, same 14px — labels are real content, not decorative, so **Ink not Ink-2** per foundation §1 | `src/components/ui/label.tsx` |
| Input field | `bg:#F8FAFC` (near-white on dark app — inverted glass panel), `border:#E2E8F0`, `radius:6px`, `fg:#020817` | `background: var(--surface-2)`, `border: 1px solid var(--hairline-2)`, `radius: 4px`, `fg: var(--ink)`, font switches to `var(--mono)` at 13px for the value (this is data-adjacent — email/password entries read as data rows in the reference's `.sf input` idiom) | `src/components/ui/input.tsx` |
| Input placeholder | inherited muted gray | `color: var(--ink-3)` — placeholder-only per foundation §1 (Ink-3 fails body-text contrast, placeholder is the one legal use) | `input.tsx` |
| Input focus | none captured (no focus-visible state in atlas) | `border-color: var(--primary)` (`#3B66FF`) + `2px` `var(--primary)` outline at `.35` alpha, `outline-offset:1px`, `:focus-visible` only, never animated — verbatim `.sf input:focus` rule from the reference | `input.tsx` |
| Primary submit ("Sign In") | `bg:rgb(37,99,235)` (`blue-600`, NOT `--primary` — a different blue than the brand Cobalt `#3B66FF`) | `background: var(--primary)` (`#3B66FF`), `fg:#fff`, hover `#5479FF` (`--primary-hover`) | `src/components/ui/button.tsx` variant `default`, used in `Auth.tsx` submit |
| Secondary link ("Create one") | `fg:rgb(37,99,235)` — same off-brand blue as above | `color: var(--primary-hi)` (`#6E8CFF` dark / `#2B4ECC` light) — Cobalt-as-text rule, never body-size raw `--primary` (foundation §1) | inline link in `Auth.tsx` |
| OAuth button ("Continue with Google") | `bg:#F8FAFC` `border:#E2E8F0` `radius:6px` | `background: var(--surface)`, `border: 1px solid var(--hairline-2)`, `radius: 4px`, `fg: var(--ink)` — ghost-button treatment, not a filled card | `button.tsx` variant `outline` |
| "Back to Home" button | same off-white ghost treatment, `radius:6px` | same ghost pattern as OAuth button, `radius:4px` | `button.tsx` variant `outline` |
| Confirm search input | `bg:rgb(2,8,23)` `border:rgb(30,41,59)` `radius:6px`, mono-adjacent already dark | `background: var(--surface-2)`, `border: 1px solid var(--hairline-2)`, `radius: 4px` — already close to target, mainly a hex-to-token swap | `src/components/token/TokenSearchForm.tsx` |
| Confirm helper text ("EVM tokens only") | `fg:rgb(148,163,184)` (`slate-400`) | `color: var(--ink-2)` (real label — not decorative) | `TokenSearchForm.tsx` |
| "Try a different search" button | ghost, `bg:rgb(2,8,23)` `border:rgb(30,41,59)` | ghost pattern, `border: var(--hairline-2)`, `radius:4px` | `TokenSearchResults.tsx` |

## 4. States

- **Default** — captured above. Tabs default to "Sign In."
- **Loading (submit)** — not present in the atlas (no in-flight capture). Spec forward: submit button
  swaps label for a mono `"Verifying…"` string, disables, keeps its Cobalt fill (no spinner icon —
  the product has no spinner idiom anywhere else; a disabled-Cobalt state communicates "working"
  consistently with how `scan-loading`'s progress bar communicates work, see T7 §Motion).
- **Error** — not present in the atlas (no error capture exists for `Auth`). Spec forward per
  foundation: inline error text sits directly under the offending field, `color: var(--score-critical)`
  (`#EF4444` dark / `#DC2626` light — semantic red, this is a state signal, not brand), field border
  switches to the same red at `1px`. State is never colour-only (§6): prefix the message with a
  filled 5px dot (matching `.flag em` idiom) so the signal survives colour-blindness and dark/light
  swaps. No toast-only errors — `use-toast.ts` is already wired but must not be the *only* surface for
  a field-level error.
- **`Confirm` — no-token state (captured)** — empty search box, helper copy `"Enter a token name to
  search"` in `var(--ink-2)` where the token list would render. This is not an error; treat it as the
  Confirm page's zero-state and keep it text-only, no icon/illustration (matches the product's
  general avoidance of decorative art — see foundation §3 density note).
- **`Confirm` — results present** — token list renders as selectable rows (not captured in this
  atlas pass; assume `TokenSearchResults.tsx` row treatment matches the `.m2r` key/value row idiom
  from the reference: `--surface-2` background, hairline row dividers, mono symbol + chain chip).

## 5. Migration notes

- **Off-brand blue in production.** Both the Auth submit button and the "Create one" link render
  `rgb(37,99,235)` (Tailwind `blue-600`), not the brand `--primary` (`#3B66FF`). This is a small but
  real drift — visually close enough to pass casual QA, wrong enough to fail a token diff. Confirmed
  hardcoded, not a token resolving to the wrong value (no `--primary` reference in this render).
- **Shadow-elevated cards contradict foundation §3.** `card.tsx`'s default `shadow` prop is active on
  the `Auth` card. Foundation is explicit: "No shadows, no glassmorphism." Any un-flagged shadcn
  default use of `Card` elsewhere will carry the same violation — worth a project-wide grep before
  this ships, not just T6.
- **No hardcoded-color offenders live inside the T6 page files themselves** — `component-inventory.json`'s
  `topOffenders` list (TokenProfile.tsx, AgentIdentityCard.tsx, chart.tsx, PriceSparkline.tsx,
  TokenScore.tsx, OverallHealthScore.tsx, AgentDimensionCard.tsx, sidebar.tsx,
  AgentTrustScoreRing.tsx) contains **zero** T6 files. Auth and Confirm's color drift is inherited from
  shadcn primitives (`button.tsx`, `input.tsx`, `card.tsx`, `tabs.tsx`) defaulting to their un-themed
  palette rather than resolving `--primary`/`--border` at all — a token-wiring gap, not a
  hardcoded-hex gap. Fix at the primitive level and every consuming page (28 pages share
  `AuthButton`/`Navbar`/`Footer`/`ThemeToggle` per `sharedChrome`) inherits it for free.
- `Confirm` imports `Navbar`/`Footer` (shared chrome, 28-page reuse) — no isolated fix needed there;
  chrome retheme happens once, globally.

## 6. Verification checklist

- [ ] Auth card: no `box-shadow` in computed styles; `border: 1px solid var(--hairline)` present.
- [ ] Auth card radius = 4px (not shadcn's 8px default).
- [ ] Submit button computed background resolves to `#3B66FF` (`--primary`), not `#2563EB`.
- [ ] "Create one" link computed color resolves to `--primary-hi`, not `#2563EB`.
- [ ] Input `:focus-visible` shows 2px Cobalt outline at `.35` alpha, offset 1px; never animated.
- [ ] Input placeholder contrast uses `--ink-3` (decorative-only, per foundation §1 flag).
- [ ] Real labels ("Email", "Password", helper copy) resolve to `--ink` / `--ink-2`, never `--ink-3`.
- [ ] Error state (once implemented): red is `--score-critical`, paired with a non-color icon/dot,
      never color-only.
- [ ] `Confirm` empty state renders text-only, no icon, matches `TokenSearchForm.tsx` no-results copy
      exactly as captured ("Enter a token name to search").
- [ ] `prefers-reduced-motion` kills any loading-state transition added to the submit button.
- [ ] 375/768/1440 breakpoints re-captured post-fix and diffed against this table.
