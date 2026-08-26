# Design-Token Audit + Cobalt Signal Remap Spec — token-health-radar

Date: 2026-08-25
Scope: `src/index.css`, `tailwind.config.ts`, `src/App.css`, `index.html` (audit only — nothing touched).
Targets: `token-health-scan/_context/style-guide.md` (Cobalt Signal, 2026-08-24 revision) + reference implementation `design/reference/ths4-homepage.html`.
Machine block: `token-audit.json` beside this file.

> Note on the style guide: the 2026-08-24 header block (Cobalt Signal palette, Archivo, near-neutral ground) supersedes the legacy sections further down that still cite Montserrat / Aqua `#1FB6FF` / Gold `#FFB800` / navy `#0A1628`. This spec follows the header + the shipped reference `:root`, which agree with each other.

---

## 1. Current token inventory (complete)

Source: `src/index.css` `@layer base`. Stock shadcn/Lovable slate scale, both themes. `darkMode: ["class"]` in `tailwind.config.ts`. No `--chart-*` vars exist. `--radius: 0.5rem` (`:root` only).

### 1a. `:root` (light, current default)

| Var | HSL (verbatim) | Hex |
|---|---|---|
| `--background` | `210 40% 98%` | `#F8FAFC` |
| `--foreground` | `222.2 84% 4.9%` | `#020817` |
| `--card` | `0 0% 100%` | `#FFFFFF` |
| `--card-foreground` | `222.2 84% 4.9%` | `#020817` |
| `--popover` | `0 0% 100%` | `#FFFFFF` |
| `--popover-foreground` | `222.2 84% 4.9%` | `#020817` |
| `--primary` | `221.2 83.2% 53.3%` | `#2563EB` |
| `--primary-foreground` | `210 40% 98%` | `#F8FAFC` |
| `--secondary` | `210 40% 96.1%` | `#F1F5F9` |
| `--secondary-foreground` | `222.2 47.4% 11.2%` | `#0F172A` |
| `--muted` | `210 40% 96.1%` | `#F1F5F9` |
| `--muted-foreground` | `215.4 16.3% 46.9%` | `#64748B` |
| `--accent` | `210 40% 96.1%` | `#F1F5F9` |
| `--accent-foreground` | `222.2 47.4% 11.2%` | `#0F172A` |
| `--destructive` | `0 84.2% 60.2%` | `#EF4444` |
| `--destructive-foreground` | `210 40% 98%` | `#F8FAFC` |
| `--border` | `214.3 31.8% 91.4%` | `#E2E8F0` |
| `--input` | `214.3 31.8% 91.4%` | `#E2E8F0` |
| `--ring` | `221.2 83.2% 53.3%` | `#2563EB` |
| `--radius` | `0.5rem` | — |
| `--sidebar-background` | `0 0% 98%` | `#FAFAFA` |
| `--sidebar-foreground` | `240 5.3% 26.1%` | `#3F3F46` |
| `--sidebar-primary` | `240 5.9% 10%` | `#18181B` |
| `--sidebar-primary-foreground` | `0 0% 98%` | `#FAFAFA` |
| `--sidebar-accent` | `240 4.8% 95.9%` | `#F4F4F5` |
| `--sidebar-accent-foreground` | `240 5.9% 10%` | `#18181B` |
| `--sidebar-border` | `220 13% 91%` | `#E5E7EB` |
| `--sidebar-ring` | `217.2 91.2% 59.8%` | `#3B82F6` |

### 1b. `.dark` (current)

| Var | HSL (verbatim) | Hex |
|---|---|---|
| `--background` | `222.2 84% 4.9%` | `#020817` |
| `--foreground` | `210 40% 98%` | `#F8FAFC` |
| `--card` | `222.2 47.4% 11.2%` | `#0F172A` |
| `--card-foreground` | `210 40% 98%` | `#F8FAFC` |
| `--popover` | `222.2 47.4% 11.2%` | `#0F172A` |
| `--popover-foreground` | `210 40% 98%` | `#F8FAFC` |
| `--primary` | `217.2 91.2% 59.8%` | `#3B82F6` |
| `--primary-foreground` | `222.2 47.4% 11.2%` | `#0F172A` |
| `--secondary` | `217.2 32.6% 17.5%` | `#1E293B` |
| `--secondary-foreground` | `210 40% 98%` | `#F8FAFC` |
| `--muted` | `217.2 32.6% 17.5%` | `#1E293B` |
| `--muted-foreground` | `215 20.2% 65.1%` | `#94A3B8` |
| `--accent` | `217.2 32.6% 17.5%` | `#1E293B` |
| `--accent-foreground` | `210 40% 98%` | `#F8FAFC` |
| `--destructive` | `0 62.8% 30.6%` | `#7F1D1D` |
| `--destructive-foreground` | `210 40% 98%` | `#F8FAFC` |
| `--border` | `217.2 32.6% 17.5%` | `#1E293B` |
| `--input` | `217.2 32.6% 17.5%` | `#1E293B` |
| `--ring` | `224.3 76.3% 48%` | `#1D4ED8` |
| `--sidebar-background` | `240 5.9% 10%` | `#18181B` |
| `--sidebar-foreground` | `240 4.8% 95.9%` | `#F4F4F5` |
| `--sidebar-primary` | `224.3 76.3% 48%` | `#1D4ED8` |
| `--sidebar-primary-foreground` | `0 0% 100%` | `#FFFFFF` |
| `--sidebar-accent` | `240 3.7% 15.9%` | `#27272A` |
| `--sidebar-accent-foreground` | `240 4.8% 95.9%` | `#F4F4F5` |
| `--sidebar-border` | `240 3.7% 15.9%` | `#27272A` |
| `--sidebar-ring` | `217.2 91.2% 59.8%` | `#3B82F6` |

### 1c. Other color sources found under `src/` (off-token, must migrate or stay quarantined)

- `src/index.css` `.animated-gradient`: hardcoded `#3b82f6, #8b5cf6, #ec4899` gradient — violates "no gradients" rule; kill on Cobalt pages.
- `src/index.css` `.glass-card`: `bg-white/30 dark:bg-black/30 backdrop-blur` — replace with surface + hairline on Cobalt pages (no glassmorphism in the system).
- `tailwind.config.ts` hardcoded literals: `success: #10b981`, `warning: #f59e0b`, `danger: #ef4444`, `info: #3b82f6` — these are the de-facto score-semantic ramp today and are WRONG vs target (`#22C55E` / `#FFC53D` / `#EF4444`; "info" has no Cobalt Signal role — retire in favor of `primary`).
- `src/App.css`: Vite boilerplate (`#646cffaa`, `#61dafbaa`, `#888`) — dead demo styles, out of scope.

---

## 2. Remap table — shadcn var → Cobalt Signal

Two theme columns: **Cobalt dark** (primary theme, from the reference `:root`) and **Cobalt light** (derived; light ground, same Cobalt `#3B66FF`, deepened Ember `#E85A20` per the light-mark precedent). All HSL triples computed exactly, shadcn format (`H S% L%`, comma-free).

Note on hairlines: shadcn consumes `--border`/`--input` as `hsl(var(--border))` — opaque only. The Cobalt system's hairlines are white-alpha. Resolution: `--border`/`--input` get the **flattened-over-ground solid equivalents** (computed below), and the true alpha values live in new `--hairline`/`--hairline-2` vars (§3) for chrome drawn on `--background` itself.

| shadcn var | Cobalt dark hex | Cobalt dark HSL | Cobalt light hex | Cobalt light HSL | Rationale |
|---|---|---|---|---|---|
| `--background` | `#0A0C10` | `220 23.1% 5.1%` | `#F5F6F8` | `220 17.6% 96.7%` | Ground. Near-neutral, not navy. |
| `--foreground` | `#F2F4F7` | `216 23.8% 95.9%` | `#14181F` | `218.2 21.6% 10%` | Ink. |
| `--card` | `#101318` | `217.5 20% 7.8%` | `#FFFFFF` | `0 0% 100%` | Surface (depth step 2). |
| `--card-foreground` | `#F2F4F7` | `216 23.8% 95.9%` | `#14181F` | `218.2 21.6% 10%` | |
| `--popover` | `#161A21` | `218.2 20% 10.8%` | `#FFFFFF` | `0 0% 100%` | Surface-2: popovers sit a depth step above cards. |
| `--popover-foreground` | `#F2F4F7` | `216 23.8% 95.9%` | `#14181F` | `218.2 21.6% 10%` | |
| `--primary` | `#3B66FF` | `226.8 100% 61.6%` | `#3B66FF` | `226.8 100% 61.6%` | Cobalt brand. Same in both themes. |
| `--primary-foreground` | `#FFFFFF` | `0 0% 100%` | `#FFFFFF` | `0 0% 100%` | Reference button is `color:#fff` on cobalt. |
| `--secondary` | `#161A21` | `218.2 20% 10.8%` | `#EDEFF3` | `220 20% 94.1%` | Surface-2 as the quiet fill. |
| `--secondary-foreground` | `#F2F4F7` | `216 23.8% 95.9%` | `#14181F` | `218.2 21.6% 10%` | |
| `--muted` | `#161A21` | `218.2 20% 10.8%` | `#EDEFF3` | `220 20% 94.1%` | |
| `--muted-foreground` | `#98A1AE` | `215.5 12% 63.9%` | `#465059` | `208.4 11.9% 31.2%` | Ink-2 (mid-grey); light variant darkened for contrast. |
| `--accent` | `#161A21` | `218.2 20% 10.8%` | `#EDEFF3` | `220 20% 94.1%` | shadcn "accent" = hover fill, NOT the data accent. Ember never lands here (Ember-vs-Red rule: ember is a deliberate data color, not a generic hover). |
| `--accent-foreground` | `#F2F4F7` | `216 23.8% 95.9%` | `#14181F` | `218.2 21.6% 10%` | |
| `--destructive` | `#EF4444` | `0 84.2% 60.2%` | `#EF4444` | `0 84.2% 60.2%` | Semantic Red, both themes. |
| `--destructive-foreground` | `#FFFFFF` | `0 0% 100%` | `#FFFFFF` | `0 0% 100%` | |
| `--border` | `#1F2124` | `216 7.5% 13.1%` | `#DEDFE1` | `220 4.8% 87.6%` | Hairline flattened: dark = `rgba(255,255,255,.085)` over `#0A0C10`; light = `rgba(10,12,16,.10)` over `#F5F6F8`. |
| `--input` | `#2C2E31` | `216 5.4% 18.2%` | `#CFD1D3` | `210 4.3% 82%` | Hairline-2 flattened (`.14` white-alpha dark / `.16` ink-alpha light) — reference inputs use hair-2 borders. |
| `--ring` | `#3B66FF` | `226.8 100% 61.6%` | `#3B66FF` | `226.8 100% 61.6%` | Reference focus: `outline: 2px rgba(59,102,255,.35)`. |
| `--sidebar-background` | `#0A0C10` | `220 23.1% 5.1%` | `#FBFCFD` | `210 33.3% 98.8%` | |
| `--sidebar-foreground` | `#F2F4F7` | `216 23.8% 95.9%` | `#14181F` | `218.2 21.6% 10%` | |
| `--sidebar-primary` | `#3B66FF` | `226.8 100% 61.6%` | `#3B66FF` | `226.8 100% 61.6%` | |
| `--sidebar-primary-foreground` | `#FFFFFF` | `0 0% 100%` | `#FFFFFF` | `0 0% 100%` | |
| `--sidebar-accent` | `#161A21` | `218.2 20% 10.8%` | `#EDEFF3` | `220 20% 94.1%` | |
| `--sidebar-accent-foreground` | `#F2F4F7` | `216 23.8% 95.9%` | `#14181F` | `218.2 21.6% 10%` | |
| `--sidebar-border` | `#1F2124` | `216 7.5% 13.1%` | `#DEDFE1` | `220 4.8% 87.6%` | |
| `--sidebar-ring` | `#3B66FF` | `226.8 100% 61.6%` | `#3B66FF` | `226.8 100% 61.6%` | |

`--radius`: keep `0.5rem` (8px) as container default — matches the guide's 8px container cards; `md`/`sm` derivations (6px/4px) already match the guide's table/badge radii exactly. No change.

---

## 3. New vars needed beyond shadcn's set

Naming follows the existing kebab-case `--noun(-modifier)` convention; consumed via `tailwind.config.ts` `extend.colors` the same way as the current set.

| New var | Dark value | Dark HSL | Light value | Purpose |
|---|---|---|---|---|
| `--surface-2` | `#161A21` | `218.2 20% 10.8%` | `#EDEFF3` | Third depth step: inset elements, nested panels, scan-result areas. |
| `--hairline` | `rgba(255,255,255,.085)` | — (keep alpha; expose as raw value, not HSL triple) | `rgba(10,12,16,.10)` | True 1px dividers/card outlines drawn over any depth step. No shadows, ever. |
| `--hairline-2` | `rgba(255,255,255,.14)` | — | `rgba(10,12,16,.16)` | Secondary dividers, ghost-button + input borders. |
| `--primary-hi` | `#6E8CFF` | `227.6 100% 71.6%` | `#2E50D9`* | Cobalt-hi: link text and small cobalt type on ground (the 4.5:1-safe cobalt, see §6). *Light needs a darkened cobalt for small text; `#2E50D9` = `227.2 69.9% 51.6%`, 5.58:1 on `#F5F6F8`. |
| `--primary-hover` | `#5479FF` | `227 100% 66.5%` | `#2E50D9` | Button hover (reference `.sf button:hover`). |
| `--data-accent` | `#FF7A45` | `17.1 100% 63.5%` | `#E85A20` (`17.4 81.3% 51.8%`) | Ember. Live values, selected series, active data callouts ONLY. **Ember-vs-Red rule:** never adjacent to Red at equal weight; if the value is failing, emphasis switches to White or Cobalt. Never a hover/brand color. |
| `--score-healthy` | `#22C55E` | `142.1 70.6% 45.3%` | `#15803D` (`145.3 71.7% 29.2%`) | Score ramp — healthy. Light value darkened (see §6). |
| `--score-risk` | `#FFC53D` | `42.1 100% 62%` | `#A16207` (`36.1 87.3% 32.4%`) | Score ramp — at-risk (Amber-signal). Light: amber text is illegible on light ground; use fill+badge or darkened amber for text. |
| `--score-critical` | `#EF4444` | `0 84.2% 60.2%` | `#DC2626` (`0 72.2% 50.6%`) | Score ramp — critical. |

**Score-semantic-ramp rule (2026-08-25 correction, binding):** the score numeral ALWAYS takes the semantic ramp (`--score-*`), never `--primary`. Pair with a 5-step band + word label; never a bare integer.

Migration of tailwind literals: `success`/`warning`/`danger` in `tailwind.config.ts` re-point to `hsl(var(--score-healthy))` etc. (current `#10b981`/`#f59e0b` literals retired); `info` retired → `primary`.

---

## 4. Font migration

**Current state:** `tailwind.config.ts` has **no `fontFamily` extension** — the app renders Tailwind's default `ui-sans-serif/system-ui` stack. `index.html` carries only `<link rel="dns-prefetch" href="//fonts.googleapis.com">`; **no font stylesheet is actually loaded** (no `<link rel="stylesheet">`, no `@import` in any CSS under `src/`). One inline body fallback uses `system-ui`.

**Target (from reference `ths4-homepage.html`):**
- Sans: `"Archivo","Helvetica Neue",Arial,sans-serif` — weights 300/400/500/600, tight tracking (-0.04em display, -0.035em H1).
- Mono: `"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace` — weights 400/500/700; carries section labels, tabular numerals, addresses, the score numeral (weight 300 in reference via fallback — request 300 too).

**Loading strategy — `index.html` `<link>`, not `@import`** (non-blocking with `display=swap`; `@import` inside the Vite CSS bundle serializes font fetch behind CSS parse). Changes required in `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500;700&display=swap">
```
(The existing `dns-prefetch` line becomes redundant — replace with the preconnect pair.)

**Tailwind wiring (additive, does not touch default `sans`):**
```ts
fontFamily: {
  archivo: ['"Archivo"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
  jbmono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
}
```
The `.cobalt` class itself sets `font-family` to the Archivo stack (§5), so opted-in pages flip wholesale; non-cobalt pages keep the system stack untouched.

---

## 5. Theme-flag strategy — the first invisible commit

Constraint: default `:root`/`.dark` stay byte-identical; Cobalt lands as a **third theme class**, activated per page later.

Mechanics: shadcn colors resolve through `hsl(var(--token))`, and CSS custom properties inherit — so a class that redefines the vars on any wrapper element retokens the whole subtree with zero component changes. Because `darkMode: ["class"]`, pairing `.cobalt` with `.dark` on the same wrapper also makes every `dark:` utility fire correctly inside it.

Exact structure to append to `src/index.css` inside the existing `@layer base` (after the `.dark` block):

```css
  /* Cobalt Signal — THS brand theme. Opt-in per page: class="cobalt dark" (primary)
     or class="cobalt cobalt-light" (light variant). Default :root/.dark untouched. */
  .cobalt {
    --background: 220 23.1% 5.1%;        /* #0A0C10 ground */
    --foreground: 216 23.8% 95.9%;       /* #F2F4F7 ink */
    --card: 217.5 20% 7.8%;              /* #101318 surface */
    --card-foreground: 216 23.8% 95.9%;
    --popover: 218.2 20% 10.8%;          /* #161A21 surface-2 */
    --popover-foreground: 216 23.8% 95.9%;
    --primary: 226.8 100% 61.6%;         /* #3B66FF cobalt */
    --primary-foreground: 0 0% 100%;
    --secondary: 218.2 20% 10.8%;
    --secondary-foreground: 216 23.8% 95.9%;
    --muted: 218.2 20% 10.8%;
    --muted-foreground: 215.5 12% 63.9%; /* #98A1AE ink-2 */
    --accent: 218.2 20% 10.8%;
    --accent-foreground: 216 23.8% 95.9%;
    --destructive: 0 84.2% 60.2%;        /* #EF4444 */
    --destructive-foreground: 0 0% 100%;
    --border: 216 7.5% 13.1%;            /* #1F2124 = hairline flattened */
    --input: 216 5.4% 18.2%;             /* #2C2E31 = hairline-2 flattened */
    --ring: 226.8 100% 61.6%;
    --sidebar-background: 220 23.1% 5.1%;
    --sidebar-foreground: 216 23.8% 95.9%;
    --sidebar-primary: 226.8 100% 61.6%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 218.2 20% 10.8%;
    --sidebar-accent-foreground: 216 23.8% 95.9%;
    --sidebar-border: 216 7.5% 13.1%;
    --sidebar-ring: 226.8 100% 61.6%;
    /* beyond-shadcn */
    --surface-2: 218.2 20% 10.8%;
    --hairline: rgba(255, 255, 255, 0.085);
    --hairline-2: rgba(255, 255, 255, 0.14);
    --primary-hi: 227.6 100% 71.6%;      /* #6E8CFF */
    --primary-hover: 227 100% 66.5%;     /* #5479FF */
    --data-accent: 17.1 100% 63.5%;      /* #FF7A45 ember */
    --score-healthy: 142.1 70.6% 45.3%;  /* #22C55E */
    --score-risk: 42.1 100% 62%;         /* #FFC53D */
    --score-critical: 0 84.2% 60.2%;     /* #EF4444 */
    font-family: "Archivo", "Helvetica Neue", Arial, sans-serif;
  }

  .cobalt.cobalt-light {
    --background: 220 17.6% 96.7%;       /* #F5F6F8 */
    --foreground: 218.2 21.6% 10%;       /* #14181F */
    --card: 0 0% 100%;
    --card-foreground: 218.2 21.6% 10%;
    --popover: 0 0% 100%;
    --popover-foreground: 218.2 21.6% 10%;
    --secondary: 220 20% 94.1%;          /* #EDEFF3 */
    --secondary-foreground: 218.2 21.6% 10%;
    --muted: 220 20% 94.1%;
    --muted-foreground: 208.4 11.9% 31.2%; /* #465059 */
    --accent: 220 20% 94.1%;
    --accent-foreground: 218.2 21.6% 10%;
    --border: 220 4.8% 87.6%;            /* #DEDFE1 */
    --input: 210 4.3% 82%;               /* #CFD1D3 */
    --sidebar-background: 210 33.3% 98.8%;
    --sidebar-foreground: 218.2 21.6% 10%;
    --sidebar-accent: 220 20% 94.1%;
    --sidebar-accent-foreground: 218.2 21.6% 10%;
    --sidebar-border: 220 4.8% 87.6%;
    --hairline: rgba(10, 12, 16, 0.10);
    --hairline-2: rgba(10, 12, 16, 0.16);
    --primary-hi: 227.2 69.9% 51.6%;     /* #2E50D9 — darkened for small text on light */
    --primary-hover: 227.2 69.9% 51.6%;
    --data-accent: 17.4 81.3% 51.8%;     /* #E85A20 deepened ember (light-mark precedent) */
    --score-healthy: 145.3 71.7% 29.2%;  /* #15803D */
    --score-risk: 36.1 87.3% 32.4%;      /* #A16207 */
    --score-critical: 0 72.2% 50.6%;     /* #DC2626 */
  }
```

Plus in `tailwind.config.ts` `extend.colors` (additive): `"surface-2": "hsl(var(--surface-2))"`, `"primary-hi": "hsl(var(--primary-hi))"`, `"primary-hover": "hsl(var(--primary-hover))"`, `"data-accent": "hsl(var(--data-accent))"`, `score: { healthy/risk/critical: "hsl(var(--score-*))" }`, `hairline`/`hairline-2` as raw `var(--hairline)` (they carry their own alpha, so no `hsl()` wrapper), and the `fontFamily` block from §4. Re-point `success`/`warning`/`danger` at the score vars; delete `info`.

Activation contract (later commits, per page): page root gets `className="cobalt dark"` (primary) or `"cobalt cobalt-light"` — nothing global. `.cobalt` without `.dark` on a page that uses `dark:` utilities is a bug (vars flip, utilities don't); lint for the pair.

Why this commit is invisible: it only *adds* two unused class blocks, additive tailwind keys, and the font `<link>`. Zero selectors match existing markup. (The font `<link>` does add two network requests site-wide; if even that is too visible, split it into the first activation commit.)

---

## 6. Sanity checks — WCAG 2.x contrast (computed, relative-luminance method)

Thresholds: 4.5:1 body text, 3:1 large text (≥24px / ≥18.7px bold) and UI components.

### Cobalt dark

| Pair | Ratio | Verdict |
|---|---|---|
| ink `#F2F4F7` on ground `#0A0C10` | **17.76** | Pass (AAA) |
| ink on surface `#101318` | **16.89** | Pass (AAA) |
| ink-2 `#98A1AE` on ground | **7.50** | Pass (AAA body) |
| ink-2 on surface-2 `#161A21` | **6.68** | Pass |
| ink-3 `#5D6673` on ground | **3.37** | **FLAG** — under 4.5:1. Passes 3:1 large only. Reference uses ink-3 for 9–11px uppercase labels and placeholders: technically non-conformant for text of any size at that ratio's small sizes. Restrict ink-3 to placeholder/disabled/decorative roles; promote real labels to ink-2. |
| cobalt `#3B66FF` on ground | **4.22** | **FLAG** — under 4.5:1 body; passes 3:1 large/UI. Rule: cobalt as *text* at body size must use `--primary-hi`; cobalt itself is for fills, large type, borders, focus rings. The reference already does this (`.egs a` links are cobalt-hi). |
| cobalt-hi `#6E8CFF` on ground | **6.39** | Pass |
| white on cobalt (button) | **4.64** | Pass body (fails AAA 7:1 — fine for AA) |
| amber `#FFC53D` on ground | **12.40** | Pass |
| ember `#FF7A45` on ground | **7.57** | Pass |
| green `#22C55E` on ground | **8.59** | Pass |
| red `#EF4444` on ground | **5.20** | Pass |

### Cobalt light

| Pair | Ratio | Verdict |
|---|---|---|
| ink `#14181F` on ground `#F5F6F8` | **16.46** | Pass |
| ink-2 `#465059` on ground | **7.61** | Pass (this is why light muted-fg is `#465059`, not `#98A1AE` — `#98A1AE` would be ~2.3:1) |
| cobalt `#3B66FF` on ground | **4.29** | **FLAG** — same rule as dark: large/UI only; small cobalt text uses light `--primary-hi` `#2E50D9` (5.58:1). |
| white on cobalt | **4.64** | Pass |
| ember `#E85A20` on ground | **3.28** | **FLAG** — large text/UI only, never body-size live values on light. (Undeepened `#FF7A45` is 2.39 — this is the measured proof of the deepen-on-light rule.) |
| green `#22C55E` on white | **2.28** | **FAIL as text** — hence `--score-healthy` light = `#15803D` (5.02:1 on `#F5F6F8`). Raw `#22C55E` on light is fill/badge-tint only. |
| amber `#FFC53D` on ground | **1.46** | **FAIL as text** — hence `--score-risk` light = `#A16207` (5.09:1). Raw amber on light is fill only. |
| red `#EF4444` on ground | **3.48** | **FLAG** — large only; `--score-critical` light = `#DC2626` (4.5:1 threshold-exact; verified 4.50 on white, 4.28 on `#F5F6F8` — prefer white card backing for critical body text, or drop to `#B91C1C`). |

Summary of hard rules the flags produce: (1) cobalt is never body-size text — `primary-hi` is; (2) ink-3 is decorative only; (3) on light ground every semantic color swaps to its darkened twin for text; (4) the light theme is for future non-branded surfaces only — THS-branded output remains dark-locked per the style guide.
