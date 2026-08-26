# Component Inventory — token-health-radar

Generated 2026-08-26. Machine-readable source: `component-inventory.json` (same folder).
Method: static import analysis. Pages tracked to direct imports plus ONE level into composite components (Navbar, TokenResult, etc). Deeper nesting (e.g. shadcn primitives inside cards) is not counted, so `usedByCount: 0` means "not reachable within one hop from a page", not "dead code".

## Headline numbers

| Metric | Value |
|---|---|
| Total components (`src/components/**/*.tsx`) | 176 |
| shadcn primitives (`src/components/ui/`) | 49 |
| App components | 127 |
| Pages (`src/pages/`) | 32 |
| Components already consuming shadcn CSS-var tokens (`bg-background`, `text-foreground`, `hsl(var(--...))` etc.) | 134 (76%) — these restyle for free when tokens flip |
| Hardcoded-color offenders (hex / rgb( / hsl( / `bg-[#` in tsx) | 9 files, 91 hits total |

## Theme mechanism (from `src/components/ThemeToggle.tsx`, read in full)

- **Strategy: Tailwind `class` mode.** Theme is the presence/absence of the `dark` class on `document.documentElement`.
- **Storage key: `localStorage["theme"]`**, values `"light"` | `"dark"` (exact strings).
- **Resolution order on mount (useEffect):**
  1. `localStorage.getItem("theme")` — if set, wins and toggles `.dark` accordingly.
  2. else `window.matchMedia("(prefers-color-scheme: dark)")` — if it matches, adds `.dark`.
  3. else stays light.
- **Default React state is `"light"`** before the effect runs (potential first-paint flash if system/saved is dark; there is no inline head script doing early resolution — verify `index.html` before rollout if flash matters).
- No ThemeProvider / context / next-themes. State is component-local `useState` inside ThemeToggle; the toggle writes `localStorage` and calls `classList.toggle("dark", ...)` directly. Any theme-flag rollout can simply pre-set `localStorage.theme` + the root class and ThemeToggle will agree with it.

## Shared chrome (used by 28 of 32 pages, directly or via Navbar)

`Navbar`, `Footer`, `MobileNav`, `ThemeToggle`, `AuthButton` (the latter three arrive via Navbar). The 4 pages without chrome: `Confirm`, `NotFound`, `ScanLoading`, and `DynamicPage` (renders its own layout). Everything else in `src/components/` is page-specific or feature-scoped (subfolders: `admin/`, `agent-scan/`, `auth/`, `cms/`, `comparison/`, `copilot/`, `ethereum/`, `guide/`, `landing/`, `report/`, `seo/`, `solana/`, `token/`).

## Hardcoded-color offenders (manual-work list for the redesign, worst first)

| # | File | Hits | What it is |
|---|---|---|---|
| 1 | `src/components/TokenProfile.tsx` | **63** | The big one. Inline hex everywhere: SVG gauge strokes (`#232334`, `#F59E0B`), Tailwind arbitrary values `text-[#9CA3AF] dark:text-[#A3A3B3]`, per-mode hex pairs throughout. Owns ~70% of all hardcoded color in the app. |
| 2 | `src/components/agent-scan/AgentIdentityCard.tsx` | 5 | Chain brand colors (`#0052ff` Base, `#627eea` Ethereum, `#8247e5` Polygon) — semantically brand constants; probably keep, but centralize. |
| 3 | `src/components/ui/chart.tsx` | 5 | shadcn chart wrapper; mostly recharts selector CSS, low risk. |
| 4 | `src/components/copilot/blocks/PriceSparkline.tsx` | 4 | Green/red `#22c55e` / `#ef4444` for up/down. |
| 5 | `src/components/TokenScore.tsx` | 4 | Score traffic-light hexes (`#10b981` / `#f59e0b` / `#ef4444`). |
| 6 | `src/components/OverallHealthScore.tsx` | 4 | Same traffic-light pattern. |
| 7 | `src/components/agent-scan/AgentDimensionCard.tsx` | 3 | Score colors. |
| 8 | `src/components/ui/sidebar.tsx` | 2 | shadcn default, low risk. |
| 9 | `src/components/agent-scan/AgentTrustScoreRing.tsx` | 1 | Ring stroke. |

Pattern: outside TokenProfile, nearly all hardcoding is the **score traffic-light palette** (green/amber/red) and **chain brand colors** — two small shared constants would clear offenders 2 and 4–9. TokenProfile needs a real pass.

Caveat: this scan counts hex/rgb()/hsl()/arbitrary-hex only. Tailwind palette classes (`text-green-500` etc.) are not flagged; they also won't respond to token flips but are a separate, larger sweep if desired.

## Token-consuming components (restyle for free)

134 of 176 use shadcn CSS-var utilities (`bg-background`, `text-foreground`, `border-border`, `text-muted-foreground`, `hsl(var(--...))`). This includes 40 of the 49 shadcn primitives and 94 app components. The remaining 40 components with neither tokens nor hardcoded colors are mostly logic/wrapper components with no color styling at all — zero restyle work.

Full per-component detail (name, path, lines, usedBy pages, usedByCount, hardcoded samples, usesTokens flag) and full per-page import lists: `component-inventory.json`.
