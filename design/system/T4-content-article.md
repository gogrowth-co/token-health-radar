# T4 — Content Article

> Inherits `00-foundation.md` in full (tokens, type, space, motion, theme mechanism,
> a11y floor). This doc adds only what's specific to long-form article rendering.
> Where this doc and §00 conflict, §00 wins — except the CMS constraint in §0,
> which is a hard boundary this doc must never cross.

## 0. CRITICAL CONSTRAINT — read before touching anything

Article body HTML is **stored content**, upserted to the CMS with
`preserve_styles: true`, and rendered through `src/components/cms/BlogTemplate.tsx`
(route: `DynamicPage`). Per the app repo's CLAUDE.md rules 5–6:

- **Inline colors are BANNED on article text elements** (`<article>`, `<h2>`–`<h5>`,
  and by extension `<p>`, `<li>`, `<td>`, `<strong>`, `<figcaption>` inside the
  article body). `prose-invert` (Tailwind Typography) owns dark-mode color for
  stored content — not per-element inline styles, not per-article overrides.
- Every color change for T4 happens **in the prose wrapper's CSS/token layer**,
  never by touching stored article HTML. The three live articles captured for
  this pass (`pub-whale-moat`, `pub-collapse-patterns`, `pub-exploits-may`) must
  render correctly under the new theme **without a single byte of their stored
  HTML changing**.
- **Acceptance rule:** re-render one existing article post-change and diff its
  DOM/text content against a pre-change capture. If the diff shows anything
  beyond computed style values (color, font-family resolution) — any changed
  text, tag, attribute, or structure — the migration violated the constraint
  and must be reverted to a wrapper-only approach.

### What carries the redesign — token vars + prose classes only

| Layer | Mechanism | What it controls |
|---|---|---|
| CSS custom properties | `--ink`, `--ink-2`, `--surface`, `--surface-2`, `--hairline`, `--cobalt-hi`, `--data-accent` (see §00 table) defined on `.cobalt`/`.cobalt.light` root classes | Raw color values the prose classes resolve to |
| Tailwind Typography config | `prose-invert` variant + a **new `prose-cobalt` modifier** (or equivalent `@tailwindcss/typography` DEFAULT/invert override) mapping `--tw-prose-body`, `--tw-prose-headings`, `--tw-prose-links`, `--tw-prose-bold`, `--tw-prose-td-borders`, `--tw-prose-quote-borders` etc. to the CSS vars above | Which token each stored-HTML tag resolves to, per theme |
| `BlogTemplate.tsx` wrapper | The `<article className="prose ...">` wrapper element itself — its className list, max-width, and non-content chrome (byline, tag pills, hero image frame, TOC if any) | Layout, spacing, non-stored-content elements |

### What may NEVER be done

- Never add `style="color:..."` or a Tailwind color utility (`text-slate-400`,
  `text-[#...]`) directly on `<article>`, `<h2>`–`<h5>`, or any element inside
  the stored HTML body.
- Never write a per-article CSS override (e.g. an article-specific class or
  `id`-scoped rule) to fix one piece's color. If an article's stored HTML has
  a rogue inline color (see §4 finding on `figcaption`), fix it at the content
  layer (re-upsert that article's HTML with the offending style stripped) —
  not by fighting it with a more specific CSS rule in the app.
- Never assume a stored-HTML color literal will "just inherit" the new theme —
  verify it, because `prose-invert` only overrides properties it explicitly
  maps; an inline `style="color:#6b7280"` on a `<figcaption>` wins over any
  prose class by CSS specificity and must be caught by the diff check in §6.

## 1. Purpose & pages

Single-article template for all CMS-driven long-form content — every publication,
guide, and comparison page routes through `DynamicPage` → `BlogTemplate.tsx`. Three
live articles captured this pass: `pub-whale-moat`, `pub-collapse-patterns`,
`pub-exploits-may`.

```
DynamicPage (route)
├── Navbar.tsx       (shared, usedByCount: 28 — same component as T3)
├── Footer.tsx       (shared, usedByCount: 28)
└── cms/BlogTemplate.tsx
    └── ui/badge.tsx      (shadcn, tag pills)
```
`BlogTemplate.tsx` shows `hardcodedColors.count: 0`, `usesTokens: true` — the
*wrapper* is clean. The risk is entirely in stored content, not this component.

## 2. Layout grid — current → target

| Aspect | Current (measured, `pub-whale-moat`) | Target |
|---|---|---|
| Content column, 1440 | `h1`/`p`/`table` bbox width 848–896px, `x` offset 288px (centered in 1440 viewport) | Foundation's 68ch content column — 848px at 16px/Archivo body is already close to 68ch; lock it explicitly as a `max-width: 68ch` on the prose wrapper rather than an implicit Tailwind `max-w-3xl` guess |
| Content column, 375 | Full-width minus 32px gutter (343px) | Unchanged — single column, 16px side padding |
| H1 | 48px/700, `h: 144px` (2-line wrap at 1440) | Foundation type ramp h1 clamp — reconcile the 700 weight against foundation's "300–400 display weight" guidance (same open flag as T3, resolve once in the type doc, not per-page) |
| H2 (section headers) | 25.6px/700 | Foundation h2 step, weight reconciled same as h1 |
| H3 (FAQ/sub-heads) | 19.2px/600 | Foundation h3 step |
| Body paragraph | 16px/400, `--tw-prose-body` | Unchanged size; color resolves via prose token, not literal |
| Table cells (`td`/`th`) | 15.2px/400 body, 14.4px/600 header | JetBrains Mono for numeric/threshold columns (data), Archivo for label columns — needs per-column `<th>`/`<td>` class distinction the current stored HTML doesn't make (flag, see §5) |
| Byline (`Token Health Scan · date`) | `rgb(148,163,184)`, 14px/400 | `--ink-2`, JetBrains Mono (it's a data/meta label, not prose) — lives in `BlogTemplate.tsx` wrapper, not stored content, so this one CAN change freely |
| Tag pills | `ui/badge.tsx`, same as T3 | Same target as T3 §3 |

## 3. Element spec table

Split by ownership — **wrapper elements** (safe to restyle directly) vs
**stored-content elements** (restyle only via prose token mapping, §0).

### Wrapper elements (BlogTemplate.tsx / Navbar / Footer — direct restyle OK)

| Element | Current | Target | Component |
|---|---|---|---|
| Byline / meta row | `rgb(148,163,184)`, 14px | `--ink-2`, JetBrains Mono | `BlogTemplate.tsx` |
| Tag pill row | `rgb(248,250,252)` on `rgb(30,41,59)`, radius 9999px, 12px/600 | `--ink` on `--surface-2`, JetBrains Mono caps | `ui/badge.tsx` |
| Hero image frame | border `rgb(30,41,59)`, radius 8px | `--hairline` border, radius 4px (data-component rule) | `BlogTemplate.tsx` |
| Header/nav/footer | Same as T3 §3 | Same as T3 §3 | `Navbar.tsx` / `Footer.tsx` |

### Stored-content elements (prose token mapping ONLY — never inline)

| Tag | Current measured color | Target prose var | Notes |
|---|---|---|---|
| `article` body text | `rgb(248,250,252)` | `--tw-prose-body: var(--ink)` | Base readable text |
| `h2`, `h3` | `rgb(248,250,252)` | `--tw-prose-headings: var(--ink)` | Weight conflict flagged in §2 applies here too |
| `p` | `rgb(248,250,252)` | inherits `--tw-prose-body` | — |
| `strong` (phase labels, key terms) | `rgb(248,250,252)`, 700 | `--tw-prose-bold: var(--ink)` | No color shift from body text currently — correct, keep |
| `table` / `th` / `td` | `rgb(248,250,252)` | `--tw-prose-th-borders`, `--tw-prose-td-borders: var(--hairline)`; text `var(--ink)` | Border color currently invisible in the map (no border value captured) — confirm table actually has visible row dividers pre- and post-change |
| `figcaption` | **`rgb(107,114,128)`** — does NOT match any other Ink token in this article (Ink-2 elsewhere measures `rgb(148,163,184)`) | `--tw-prose-captions: var(--ink-2)` | **Finding:** this is a different gray than the rest of the piece uses. Strongly suggests a Tailwind `text-gray-500` utility baked into the stored HTML rather than a semantic class. Must verify whether this is an inline literal (banned, needs content-layer fix) or a class the prose config can still target — check before assuming the token swap alone fixes it |
| `ol`/`li` | `rgb(248,250,252)` | `--tw-prose-body` | — |

## 4. States

No loading/error captures exist for T4 (article fetch is presumably server-rendered
or resolves before paint in the current build — not confirmed, just no evidence of
a client loading state in the maps). If `DynamicPage` does fetch client-side for
some content source, treat this as an open gap: no current treatment to inherit,
build one fresh, same idiom as T3's spinner (§T3 §4) for consistency.

## 5. Migration notes

- **The `figcaption` gray mismatch (§3) is the single most important finding in
  this pass.** If it's an inline `style` attribute in stored HTML, the prose-token
  swap will not touch it — it will sit as a visibly wrong gray against the new
  theme, and the temptation will be to "fix" it with a more specific CSS rule.
  That is explicitly banned (§0). The correct fix is re-upserting that article's
  stored HTML with the literal stripped, at the content layer, before or
  alongside the theme cutover.
- Table `<th>`/`<td>` currently make no typographic distinction between numeric/
  threshold data and descriptive text (both render in the same body font/size
  family per the capture). Foundation requires JetBrains Mono for "table numerics
  with tabular-nums." The stored HTML would need a semantic class per cell type
  to support this — likely not retrofittable to existing articles without a
  content-layer pass. Scope this as a **future-articles-only** improvement unless
  Gabriel wants a batch re-upsert of the three (or more) live pieces.
  the h1/h2/h3 weight-700-vs-foundation-300-400 conflict (also flagged in T3) is
  a wrapper concern for h1 but a **stored-content concern for h2/h3** — resolving
  it means changing the prose heading-weight token, not the article HTML, so it's
  low-risk once the type doc settles the ramp.
- `Navbar`/`Footer` blast radius note is identical to T3 §5 — same shared
  components, same 28-page reach.
- Zero `hardcodedColors` flags on `BlogTemplate.tsx` per the inventory — the
  wrapper component itself needs no source-code color hunt, only the prose-config
  and CSS-var layer change.

## 6. Verification checklist

- [ ] `surface-qa` rig run at 375 / 768 / 1440 × light / dark on all three captured
      articles (`pub-whale-moat`, `pub-collapse-patterns`, `pub-exploits-may`) —
      zero h-scroll, zero clipped content, contrast pass on body/heading/caption
      text against new `--surface`.
- [ ] **Content-integrity diff (required, T4-specific):** for one article
      (`pub-whale-moat` recommended — has the widest element variety: table, figures,
      FAQ, strong-tagged list), capture the full rendered DOM/text pre-change and
      post-change, diff them, and confirm the only differences are resolved CSS
      color/font values — no text, tag, attribute, or structural changes. Any
      other diff is a constraint violation per §0 and blocks ship.
- [ ] `figcaption` color source confirmed (inline literal vs class) and, if inline,
      a content-layer fix ticketed/applied separately from the theme cutover.
- [ ] Table border visibility confirmed in both themes (current map shows no
      captured border value — don't assume it renders correctly untested).
- [ ] Prose wrapper's 68ch column value locked as an explicit CSS value, verified
      against actual rendered width at 1440, not just the Tailwind class name.
