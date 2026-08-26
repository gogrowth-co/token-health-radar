# Cobalt Signal — Design Foundation
> Source of truth for the THS redesign. Every per-type doc (`design/system/T*.md`) inherits
> from this file. Derived from `_context/style-guide.md` (marketing workspace),
> `design/blueprint/token-audit.{md,json}` (computed remap + WCAG), and the approved
> reference implementation `design/reference/ths4-homepage.html`. 2026-08-26.

## 1. Tokens (canonical hex → shadcn HSL in token-audit.json)

| Role | Dark (primary) | Light | Rule |
|---|---|---|---|
| Ground | `#0A0C10` | `#F5F6F8` | Page background. Near-neutral; never saturated navy. |
| Surface | `#101318` | `#FFFFFF` | Cards, panels, inputs. One step above ground. |
| Surface-2 | `#161A21` | `#EDEFF2` | Insets, nested panels, code blocks. |
| Hairline | `rgba(255,255,255,.085)` | `rgba(16,19,24,.10)` | ALL 1px dividers/card borders. **No box-shadows.** |
| Hairline-2 | `rgba(255,255,255,.14)` | `rgba(16,19,24,.16)` | Ghost-button borders, secondary rules. |
| Ink | `#F2F4F7` | `#13171D` | Primary text. |
| Ink-2 | `#98A1AE` | `#4A5462` | Secondary text, real labels. |
| Ink-3 | `#5D6673` | `#8A93A0` | **Placeholder/disabled/decorative ONLY** — 3.37:1 on ground fails body text (token-audit flag). Promote real labels to Ink-2. |
| Cobalt (brand) | `#3B66FF` | `#3B66FF` | CTAs, links-as-fills, focus rings, active nav, the score numeral's brand moments — as FILL or large type. 4.22:1 on dark ground → **never body-size text**. |
| Cobalt-hi | `#6E8CFF` | `#2B4ECC` | Cobalt as TEXT at body size (links, inline references). |
| Ember (data) | `#FF7A45` | `#E85A20` | Live values, selected series, active data callouts ONLY. **Never CTAs, never hover chrome.** Ember-vs-Red rule: never adjacent to Red at equal weight; a failing value's emphasis switches to White or Cobalt. |
| Score ramp | green `#22C55E` · amber `#FFC53D` · red `#EF4444` | `#15803D` · `#A16207` · `#DC2626` | Semantic ONLY (healthy/at-risk/critical). Scores NEVER render in brand Cobalt — brand-as-verdict collapses "good" into "our CTA" (census finding, style-guide rule). Raw dark-ramp values on light ground are fill/badge-tint only — light text uses the derived deep values. Always number + word band, never a bare integer. |

New CSS vars beyond shadcn's set: `--surface-2, --hairline, --hairline-2, --data-accent, --primary-hi, --score-healthy, --score-risk, --score-critical` (naming per token-audit.json).

## 2. Type
- **Archivo** — UI + headings. Display weight 300–400 with tight tracking (−0.035em to −0.04em); h1 clamps per type doc. Never Montserrat.
- **JetBrains Mono** — ALL data: numbers, addresses, scores, labels-in-caps (10–11px, letterspacing .12–.16em, Ink-2/Ink-3 per rules above), code, table numerics with `tabular-nums`.
- Load via Google Fonts `<link>` in index.html (audit §fonts). Body 16px/1.55–1.6.

## 3. Space, shape, elevation
- Radius: 4px controls/cards; 0 allowed on instrument panels; **never ≥12px on data components**.
- Elevation = hairline borders + surface steps. No shadows, no glassmorphism (32.5% measured FPS cost), no gradients on data.
- Density: 1px-rule grids for panels (hero instrument panel in the reference is the idiom).

## 4. Motion
- ONE orchestrated load moment per page (staggered fills via `animation-delay: calc(var(--i) * .07s)`); **no scroll-reveal anywhere** (Bushell/HN finding — negative signal).
- Blinking-cursor and pulse-sweep idioms belong to the brand mark and scanning states only.
- Everything inside `@supports` + fully killed under `prefers-reduced-motion` (Linear's kill-switch pattern, verbatim in the reference).
- Native `<details>`/`::details-content` for accordions; View Transitions only with the reduced-motion guard.

## 5. Theme mechanism (implementation contract)
Current app: class strategy, `.dark` on `<html>`, `localStorage('theme')`, default light (component-inventory §themeMechanism). Redesign lands as a **third theme class `.cobalt`** (+ `.cobalt.light` variant) in `src/index.css` — first commit adds vars only, default untouched, zero visible change (theme-flag strategy, token-audit §themeFlag). Per-page flips only after that page passes its type-doc verification.

## 6. Accessibility floor
- Body text ≥4.5:1, large/UI ≥3:1 — computed, not asserted (audit has the math; the four flagged combos above are law).
- Focus: 2px Cobalt ring, `:focus-visible`, never animated.
- State never by colour alone: icon/label + colour (score badges carry word bands).
- Auto-updating content needs a pause control (WCAG 2.2.2 Level A); scroll animation is only AAA — the ticker is the stricter obligation.

## 7. Logo
Pulse-sweep mark (`token-health-scan/_templates/brand-assets/`): `ths-mark.svg` (dark), `ths-mark-light.svg` (drawn, NOT colour-swapped — opacity-dim inverts on light), `ths-mark-mono.svg` (currentColor), alt-magenta variant. Curve must keep its overshoot + precursor bump (anti-`lucide/activity` rules — do not "clean up"). Nav lockup: 21px mark + Archivo 600 wordmark, sentence case (never all-caps: LT pair).
