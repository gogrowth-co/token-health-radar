# T5 — Legal Doc

> Inherits `00-foundation.md` in full. Legal pages are typographic only — no cards,
> no data components, no motion beyond the standard load moment. Where this doc
> and §00 conflict, §00 wins.

## 1. Purpose & pages

Static Privacy Policy and Terms of Service. Two live routes: `/privacy`, `/terms`.
Both share the same component tree as T3/T4's chrome:

```
Privacy / Terms (page)
├── Navbar.tsx   (shared, usedByCount: 28)
└── Footer.tsx   (shared, usedByCount: 28)
```
No `cms/` component involved — page content is likely inline JSX or a local
markdown source, not the stored-HTML/`preserve_styles` pipeline that governs T4.
That means **no CMS constraint applies here** — text elements can take source-level
token classes directly, no prose-wrapper indirection needed. Both `Navbar` and
`Footer` show `hardcodedColors.count: 0` in the inventory.

## 2. Layout grid — current → target

| Aspect | Current (measured, `privacy`, 1440) | Target |
|---|---|---|
| Content column | `h1`/`h2`/`p` bbox width 848–896px, centered | Same 68ch column as T4 — legal text is prose, same measure applies |
| H1 | 36px/700 | Foundation h1 step (smaller than T3/T4's 48px hero — legal pages don't need hero-scale type) |
| H2 (numbered sections) | 24px/600 | Foundation h2 step |
| H3 (privacy only — sub-clauses) | 20px/500 | Foundation h3 step |
| Body / list items | 16px/400 | Unchanged size |
| 375 column | Full-width minus 32px gutter | Unchanged |

## 3. Element spec table

| Element | Current treatment | Target (foundation token) | Rendering component |
|---|---|---|---|
| H1 | `rgb(248,250,252)`, 36px/700 | `--ink`, Archivo | Page component |
| H2 (numbered sections) | `rgb(248,250,252)`, 24px/600 | `--ink`, Archivo | Page component |
| H3 (privacy sub-clauses) | `rgb(248,250,252)`, 20px/500 | `--ink`, Archivo | Page component |
| Body paragraph | `rgb(248,250,252)`, 16px/400 | `--ink` | Page component |
| Secondary/muted paragraph | `rgb(148,163,184)`, 16px/400 | `--ink-2` | Page component |
| List items (`li`) | `rgb(248,250,252)`, 16px/400 | `--ink` | Page component |
| **Inline body link** | `rgb(59,130,246)` — **raw Cobalt at 16px body size** | `--cobalt-hi` (`#6E8CFF` dark / `#2B4ECC` light) | Page component |
| `strong` | `rgb(248,250,252)`, 700 | `--ink` (bold weight, no color shift) | Page component |
| Header/nav/footer | Same as T3/T4 | Same as T3/T4 | `Navbar.tsx` / `Footer.tsx` |

**Finding:** the captured legal pages use raw Cobalt (`rgb(59,130,246)` = `#3B66FF`)
directly as body-size link text color. Foundation §1 is explicit: Cobalt is
"4.22:1 on dark ground → **never body-size text**" — that's exactly this case. This
is not a hypothetical risk, it's the current measured state, on both `privacy` and
`terms`, in dark theme. The token-audit's Cobalt-hi variant (`#6E8CFF`) exists
specifically for this — inline links at body size must switch to it.

## 4. States

None — static content pages, no loading/error/empty states apply.

## 5. Migration notes

- Fix the Cobalt-as-body-link-color issue (§3 finding) as part of this migration,
  not deferred — it's an existing WCAG risk on the live site today, not something
  the redesign introduces.
- Same shared-chrome blast radius as T3/T4 (`Navbar`/`Footer`, 28 pages) — no
  additional risk specific to legal pages.
- No stored-content/CMS constraint here (§1) — this is the simplest of the three
  T-types to migrate; a straight source-level class swap, verified visually.
- Confirm whether `privacy` and `terms` content is hand-authored JSX/markdown in
  the app repo (not the CMS) before starting — if it turns out to route through
  the same `preserve_styles` pipeline as T4 after all, the T4 §0 constraint
  applies here too and this doc's "direct restyle OK" guidance is void.

## 6. Verification checklist

- [ ] `surface-qa` rig run at 375 / 768 / 1440 × light / dark on `/privacy` and
      `/terms` — zero h-scroll, contrast pass on body/link text against new
      `--surface`.
- [ ] Inline body links confirmed rendering in `--cobalt-hi`, not raw Cobalt,
      in both themes — spot-check contrast ratio, don't assume the token swap
      alone catches every link instance.
- [ ] Confirm content source (JSX/markdown vs CMS) before implementation, per
      §5 — if CMS-backed, escalate to follow T4's prose-wrapper constraint instead.
