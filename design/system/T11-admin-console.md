# T11 — Admin Console
> Status: spec derived from source + logged-out captures; authenticated-state verification pending credentials (P4).

**Priority: last.** This is internal tooling, not a customer surface. Spec it utilitarian —
foundation tokens applied plainly, no bespoke visual flourishes, no new components invented
beyond what already exists in code.

## 1. Purpose, pages, auth tier

| Page | Route | File | Auth tier |
|---|---|---|---|
| CMS Pages list | `/admin` | `src/pages/Admin.tsx` | Admin-only, route-guarded by `<AdminRoute>` (`src/components/admin/AdminRoute.tsx`), wrapped in `App.tsx:141-145`. Lazy-loaded (`App.tsx:42`). |
| New CMS page | `/admin/new` | `src/pages/AdminNew.tsx` | Same guard, `App.tsx:146-150`. Lazy-loaded (`App.tsx:43`). |
| Edit CMS page | `/admin/edit/:id` | `src/pages/AdminEdit.tsx` | Same guard, `App.tsx:151-155`. Lazy-loaded (`App.tsx:44`). |
| User Management | `/admin/users` | `src/pages/AdminUsers.tsx` | Same guard, `App.tsx:156-160`. Lazy-loaded (`App.tsx:45`). |

`AdminRoute.tsx` gates on `isAuthenticated && user?.id && isAdmin` (line 55), computed from
`useAuth()` + `useUserRole()` (`src/hooks/useUserRole.ts`, an RPC call `get_user_role`). It
renders its own loading and access-denied states inline — see §4.

No element-map captures exist for `/admin*` — these routes require an authenticated admin
session and were out of scope for the logged-out capture pass. Every row in §3 below is
code-derived.

## 2. Surfaces enumerated

### CMS Pages list (`src/pages/Admin.tsx`)
- Header row: `FileText` icon + H1 "CMS Pages" + subhead, action buttons (Users / Refresh outputs / New page), lines 20-30.
- Table: `<PageTable pages={pages} onDelete={...} />`, `src/components/cms/PageTable.tsx` — columns Title/Status/Category/Updated/Actions, `shadcn Table` primitives.
- Loading state: centered `Loader2` (Admin.tsx:31).

### CMS editor forms (`AdminNew.tsx` / `AdminEdit.tsx`)
Both pages share the same field set and components; `AdminEdit` adds a fetch-and-hydrate step
and a status readout.
- Form shell: back button, H1, subhead, `<form>` (AdminNew.tsx:30, AdminEdit.tsx:40).
- Metadata grid (2-col): Slug / Category / Read time / Tags — plain shadcn `Input` + `Label` (AdminNew.tsx:32, AdminEdit.tsx:42).
- `<HeroImageUpload>` — `src/components/cms/HeroImageUpload.tsx`. URL `Input` + file-upload `Button` (transparent file input overlaid), live preview `<img>` once a URL exists.
- `<EnglishContentSection>` — `src/components/cms/EnglishContentSection.tsx`. Title `Input`, meta-description `Textarea` (160-char cap), image-alt `Input`, and the rich-text editor.
- `<RichTextEditor>` — `src/components/cms/RichTextEditor.tsx`. **Tiptap** (`@tiptap/react` + `StarterKit` + `Image` + `Link` extensions). Toolbar: Bold/Italic/BulletList/OrderedList/Link/Image/Undo/Redo, all ghost icon buttons in a `bg-muted/30` strip. Editor surface class: `"min-h-[320px] prose prose-sm dark:prose-invert max-w-none rounded-md border border-input bg-background px-4 py-3 focus:outline-none"` (line 20) — **built entirely on shadcn CSS-var classes (`bg-background`, `border-input`) plus Tailwind's `prose`/`dark:prose-invert` typography plugin. No hardcoded hex or literal-palette classes found. This is the one component in the admin surface that should theme-flip cleanly under `.cobalt` with zero changes**, contingent on the `prose` plugin's own dark-mode variant tracking the same CSS vars (verify visually once `.cobalt` exists — Tailwind Typography's default palette is not guaranteed to follow custom theme vars without configuration).
- Featured-article `Switch` + `Label` (AdminNew.tsx:35, AdminEdit.tsx:45).
- `<SchemaEditor>` — `src/components/cms/SchemaEditor.tsx`. Single `Textarea` holding raw JSON-LD, parsed on change; no visual complexity.
- Submit row: Save/Save draft, Publish, (Edit only) Unpublish — shadcn `Button` variants only.

### User Management (`src/pages/AdminUsers.tsx`)
- Header: `Shield` icon + H1 + a **dev-only debug panel** (`process.env.NODE_ENV === 'development'`, lines 76-81) showing raw counts in a bordered box.
- `<TokenRefreshPanel>` — `src/components/admin/TokenRefreshPanel.tsx`. Card with a manual "Trigger Refresh Now" button that invokes the `weekly-token-refresh` edge function, plus a results summary block.
- `<UserSearchFilters>` — `src/components/admin/UserSearchFilters.tsx`. Search `Input` + status `Select` (All/Active/Admin/Banned).
- `<UsersTable>` → `<UserTableRow>` — `src/components/admin/UsersTable.tsx` / `UserTableRow.tsx`. Columns: Name (+ Crown icon if admin), Email, Total Scans, Status (`<AdminUserBadge>`), Last Login, Actions (Make Admin / Remove Admin buttons, gated by `isGmangabeiraEmail` and current role).
- `<AdminUserBadge>` — `src/components/admin/AdminUserBadge.tsx`. Status pill: admin/active/banned/default.
- `<AdminConfirmDialog>` — `src/components/admin/AdminConfirmDialog.tsx`. `AlertDialog` confirming make-admin / remove-admin actions.
- Loading state: centered `Loader2` (AdminUsers.tsx:91-93).

## 3. Element spec — current → target

| Element | Current (code) | Target token |
|---|---|---|
| Page shell | `container` + shadcn defaults, no card wrapper on `/admin` list page | `--ground` background; keep flat, no elevation needed at page level |
| `PageTable` wrapper | `overflow-hidden rounded-lg border bg-card` (PageTable.tsx:14) | `--surface` fill, `--hairline` border, 4px radius (foundation caps controls/cards at 4px) |
| Table rows | shadcn `Table` primitives, no custom row styling | Hairline row dividers per foundation's ledger idiom — same treatment as T10's Recent Scans list, since both are data tables |
| Status `Badge` (`published`/`draft`) | shadcn `Badge variant="default"/"secondary"` (PageTable.tsx:29) — already token-based, no hardcoded hex | No change needed; confirm it still reads correctly once `.cobalt` vars land |
| Form `Input`/`Label`/`Textarea`/`Switch` (AdminNew, AdminEdit) | Plain shadcn primitives throughout | No change needed — these already inherit CSS vars |
| `RichTextEditor` toolbar strip | `bg-muted/30` (RichTextEditor.tsx:41) | Token-based already (`muted` is a shadcn CSS var); becomes `--surface-2` equivalent automatically once `.cobalt` remaps `muted` |
| `RichTextEditor` editor surface | `bg-background border-input` + `prose dark:prose-invert` (RichTextEditor.tsx:20) | Already CSS-var-based — **verify `prose` typography plugin colors against Cobalt vars specifically**, it's the one open question in this component |
| `HeroImageUpload` preview `<img>` | `rounded-md border object-cover` (HeroImageUpload.tsx:37) | `--hairline` border, no radius change needed (under 4px cap already) |
| `SchemaEditor` textarea | Plain shadcn `Textarea` | No change needed |
| Dev debug panel (AdminUsers.tsx:76-81) | `text-xs text-muted-foreground border p-2 rounded` — token-based, but **only renders in dev builds**; harmless, no fix needed, just noting it exists so it isn't mistaken for a spec'd production element | Leave as-is; not part of the redesign surface |
| `TokenRefreshPanel` result icons | **hardcoded**: `text-green-500` (success, line ~99), `text-red-500` (failed, line ~106), `text-blue-500` (duration, line ~113) | `--score-healthy` for success, `--score-critical` for failed; the duration icon has no semantic meaning today — demote to `--ink-2`, drop the arbitrary blue |
| `AdminConfirmDialog` make-admin action button | **hardcoded**: `className={confirmAction.type === 'make_admin' ? 'bg-purple-600 hover:bg-purple-700' : ''}` (`AdminConfirmDialog.tsx:73`) | Drop the bespoke purple entirely — this is a destructive/elevating action, use the dialog's own semantic action styling (shadcn `AlertDialogAction` default) or, if a distinct color is wanted, `--primary-hi` (Cobalt-hi), never a literal palette class |
| `UserTableRow` Crown icon (admin indicator) | **hardcoded** `text-purple-600` (`UserTableRow.tsx:37`) | `--primary-hi` (Cobalt-hi) — icon-as-status-indicator should ride the brand token, not a literal purple |
| `UserTableRow` "(∞)" scan-count suffix | **hardcoded** `text-purple-600` (`UserTableRow.tsx:44`) | Same as above — `--primary-hi` |
| `UserTableRow` "Make Admin" button (gmangabeira-email fast path) | **hardcoded** `bg-purple-600 hover:bg-purple-700` (`UserTableRow.tsx:60`) | Drop literal purple; use shadcn `Button` default/secondary variant, which already rides CSS vars |
| `AdminUserBadge` — admin status | **hardcoded** `bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300` (`AdminUserBadge.tsx:12`) | Semantic chip on `--primary-hi` tint — this status isn't a health/risk verdict, so it should NOT borrow the score ramp; it needs its own low-emphasis brand tint per foundation's badge pattern |
| `AdminUserBadge` — active status | **hardcoded** `bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300` (`AdminUserBadge.tsx:18`) | `--score-healthy` tint — this genuinely is a health-style verdict (account in good standing) |
| `AdminUserBadge` — banned status | **hardcoded** `bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300` (`AdminUserBadge.tsx:24`) | `--score-critical` tint |
| `AdminRoute` access-denied debug block (dev only) | **hardcoded** `bg-red-50 border-red-200` (`AdminRoute.tsx:82`) | Dev-only, same as the AdminUsers debug panel — leave unless a token-based dev-panel convention gets standardized elsewhere |

**Hardcoded-color tally for this surface: 7 offending declarations across 4 files**
(`AdminConfirmDialog.tsx:73`, `UserTableRow.tsx:37,44,60`, `AdminUserBadge.tsx:12,18,24`, plus
`TokenRefreshPanel.tsx`'s 3 icon colors and `AdminRoute.tsx`'s dev-only block). **None of these
are caught by `design/blueprint/component-inventory.json`'s existing scan** — its
`hardcodedColorOffenders` list (9 files, 91 hits, e.g. `TokenProfile.tsx` at 63 hits) only
pattern-matches literal hex codes (`#22c55e` style). Every offender above is a Tailwind
*palette-class* literal (`bg-purple-600`, `text-green-500`, …), which resolves to a fixed hex at
build time via Tailwind's default color scale — not a CSS custom property — so it is exactly as
theme-immune as a hardcoded hex, just invisible to that regex. Recommend extending the audit
tool's pattern to also flag `\b(bg|text|border)-(red|green|blue|purple|amber|orange|yellow)-\d{2,3}\b`
before the next component pass, since this gap likely hides similar cases elsewhere in the app
(T10's `UserProfile.tsx` has the same class of bug — see that doc).

## 4. States

| State | Detail |
|---|---|
| **Loading (route guard)** | `AdminRoute.tsx:29-46` — full page shell (Navbar/Footer) + centered spinner + "Checking permissions..." / "Verifying admin access for {email}". Fires on every admin route while `authLoading || roleLoading`. Code-derived, not captured. |
| **Access denied** | `AdminRoute.tsx:69-101` — full page shell + `Shield` icon (destructive tint) + "Access Denied" + reason line + (dev only) a debug box with the exact denial reason (`Not authenticated` / `No user ID available` / `Not admin (role: ...)`). Reachable by any authenticated non-admin visiting `/admin/*` directly — this is the realistic "verify without full admin credentials" state, since it only needs a logged-in non-admin account. |
| **Loading (page-level)** | `Admin.tsx:31` (table), `AdminEdit.tsx:29` (form, waiting on `pages` + `form` hydration), `AdminUsers.tsx:91-93` (users table) — all a bare centered `Loader2`. Code-derived. |
| **Populated** | `PageTable` with rows (Admin.tsx); hydrated form fields (AdminEdit.tsx); `UsersTable` with filtered rows (AdminUsers.tsx). Code-derived. |
| **Empty** | `PageTable`: "No CMS pages yet." (PageTable.tsx:44) when `pages.length === 0`. No equivalent explicit empty state exists for `UsersTable` — an empty `users` array just renders a table with a header row and no body rows; flag as a gap rather than a spec to preserve. |
| **Error** | No client-visible error UI in any admin page for a failed `usePages`/`useAdminUsers` fetch — errors are not rendered (only `TokenRefreshPanel`'s refresh action has a real error path, via `toast.error`, lines 34-59). Flag as a gap. |

## 5. Migration notes

- This surface gets the foundation tokens applied directly — no new visual language. The only
  real design decision left is picking where `--primary-hi` vs the score ramp applies for the
  admin-role badge (recommended above: admin role is brand-tinted, active/banned ride the score
  ramp since they read as account-health verdicts).
- The 7 hardcoded-color offenders listed in §3 must be fixed as literal-class removals, not
  color-value substitutions — swapping `bg-purple-600` for `bg-[#3B66FF]` would still fail to
  theme-flip. They need to become Tailwind classes that resolve through the CSS custom properties
  (e.g. `bg-primary`, or new utility classes bound to `--primary-hi`/`--score-healthy`/`--score-critical`
  once those vars exist in `index.css`).
- `RichTextEditor`'s Tiptap surface is the one component in this doc that likely needs **no
  change** — confirm rather than assume, since the `prose`/`dark:prose-invert` Tailwind Typography
  classes carry their own internal color defaults that may not automatically follow a third theme
  class (`.cobalt`) the way `.dark` is handled by `dark:` variants. Check this specifically once
  `.cobalt` lands.
- `component-inventory.json`'s hardcoded-color detector has a real blind spot (Tailwind literal
  palette classes vs. raw hex) — worth a one-line regex extension before relying on it to certify
  "zero hardcoded colors remain" anywhere else in the app.
- Nothing in this surface uses gradients, shadows, or non-4px radii, so there's no foundation §3
  violation here beyond the color issue.

## 6. Verification checklist

- [ ] Route guard "loading" and "access denied" states, both themes, both breakpoints where
      relevant (admin console is desktop-primary but should not break at 768) — **requires
      credentials** (an authenticated non-admin account is enough for "access denied"; no
      credentials needed at all just to view the loading flash if reachable, but reliably
      triggering it needs a real auth round-trip).
- [ ] `PageTable` populated + empty states — **requires credentials** (admin session + CMS data).
- [ ] `AdminNew` / `AdminEdit` full form flow including `RichTextEditor` toolbar actions (bold,
      link, image insert) and the `HeroImageUpload` file-upload path — **requires credentials**.
- [ ] `RichTextEditor` prose colors under `.cobalt` specifically (the one open theme-flip question
      in this doc) — **requires `.cobalt` to exist in `index.css`**, does not require admin
      credentials once that lands (can be checked on any page using the same Tiptap component if
      reused elsewhere, otherwise needs the admin session).
- [ ] `AdminUsers` populated table, search/filter interaction, make-admin/remove-admin confirm
      dialog flow — **requires credentials**.
- [ ] `TokenRefreshPanel` full trigger → summary round-trip, including the failed-token error list
      rendering — **requires credentials** (admin session + a real or mocked edge function
      response).
- [ ] All 7 hardcoded-color fixes render correctly in both `.cobalt` and `.cobalt.light` — no
      credentials needed for the admin badge/button colors in isolation (can be checked via
      Storybook-style rendering or a throwaway route), but confirming them in the real `UsersTable`
      context needs an admin session with at least one admin, one active, and one banned user
      visible — **requires credentials** for that last part.
- [ ] Empty-`UsersTable` and fetch-error states — currently undefined in code; decide whether to
      spec real UI for these gaps before or during the `.cobalt` migration.
