# T10 — App Dashboard & Copilot
> Status: spec derived from source + logged-out captures; authenticated-state verification pending credentials (P4).

## 1. Purpose, pages, auth tier

T10 covers the two authenticated app surfaces (dashboard + AI chat), inheriting all tokens,
type, space, motion, and theme rules from `00-foundation.md`.

| Page | Route | File | Auth tier |
|---|---|---|---|
| Dashboard | `/dashboard` | `src/pages/Dashboard.tsx` | **Gated in-component.** No route guard — `Dashboard` itself checks `useAuth().isAuthenticated` and renders an inline "Authentication Required" screen when false (lines 81-108). No redirect. |
| Token Copilot | `/copilot` | `src/pages/Copilot.tsx` | **Public.** No `useAuth` import, no gate. Anyone can search a token and chat; the `mcp-chat` edge function call (`CopilotPanel.tsx:180`) is invoked without an auth check in the client code. |

Both routes are declared un-lazy in `src/App.tsx:122-123` (unlike the Admin routes, which are
`lazy()`-loaded — App.tsx:42-45). Dashboard sets `<meta name="robots" content="noindex, nofollow">`
(Dashboard.tsx:116); Copilot does not (Copilot.tsx:42-45), consistent with it being public.

## 2. Surfaces enumerated

### Dashboard (`src/pages/Dashboard.tsx`)
- **Auth gate screen** (unauthenticated) — `Alert` (`@/components/ui/alert`) + centered H1/CTA, lines 81-108. **This is the state in the captured screenshots** (`dashboard-empty.*.json`).
- **User Profile panel** — `<UserProfile />`, `src/components/auth/UserProfile.tsx`, 1-col on desktop grid (Dashboard.tsx:136). Shows email, plan, scan usage/limits, subscription actions.
- **Recent Scans panel** — inline in `Dashboard.tsx:140-183`, 2-col on desktop grid. A `Card` with three states: loading, populated list, empty.
- **Admin Panel link** — conditional button (`isAdmin`), Dashboard.tsx:124-131, routes to `/admin/users`.

### Token Copilot (`src/pages/Copilot.tsx`)
- **Hero** — icon badge + H1 "Token Copilot" + subhead + "Powered by CoinGecko API" badge, lines 53-69. **Captured state** (`copilot-empty.*.json`).
- **Token search (pre-select)** — `Card` wrapping `<TokenSearchAutocomplete>` (`src/components/token/TokenSearchAutocomplete.tsx`), lines 72-89. This is the ask-bar entry idiom before a token is locked in.
- **Selected-token header** — logo, symbol, name, chain `Badge`, "Change token" link, lines 92-123. Code-derived, not captured (requires a search result to render).
- **Chat panel** — `<CopilotPanel>`, `src/components/copilot/CopilotPanel.tsx`, mounted only after token selection (Copilot.tsx:126-134). Code-derived.
- **Quick-tips row** — 3 static hint cards (Price/Trends/Liquidity), lines 139-152. Present in both empty and populated states.

### Copilot chat internals (`CopilotPanel.tsx`)
- **Header bar** — title + connection-status `Badge` (`connecting` / `connected` / `error`), lines 352-383.
- **Message list** — `ScrollArea` (h-96, or h-[500px] standalone), lines 388-393. Each bubble: avatar circle (User/Bot icon) + text bubble + optional data blocks + timestamp, `renderMessageBubble` lines 237-348.
- **Data blocks** (assistant messages only, intent-gated): `MetricCards`, `PriceSparkline`, `PoolsTable`, `CategoryTags`, `HoldersTable`, `ChangeCard`, `TokenomicsCard`, `CommunityCard`, `SecurityCard`, `DevelopmentCard` — all in `src/components/copilot/blocks/`. This is the ledger-idiom surface: numeric, tabular, per-token data.
- **Input bar** — `Textarea` + `Send` `Button`, lines 396-427, `Enter` to send / `Shift+Enter` newline (handleKeyDown, 230-235).
- **Rate-limit notice** — `Alert` shown inline in the message stream when `message.limited` is true (lines 261-268).

## 3. Element spec — current → target

| Element | Current (code/capture) | Target token |
|---|---|---|
| Page ground | `bg-background` (shadcn var, unset by Cobalt) | `--ground` (`#0A0C10` dark / `#F5F6F8` light) |
| Auth-gate `Alert` box | default shadcn `Alert`, no border color override | Surface panel: `--surface` fill, `--hairline` 1px border, 4px radius |
| Auth-gate H1 "Welcome to..." | `text-3xl font-bold`, system sans | Archivo, weight 300-400, tight tracking (−0.035 to −0.04em); clamp per type doc |
| "Back to Home" CTA | shadcn `Button` default variant (brand-blue fill) | Cobalt fill (`#3B66FF`), never used for a score/verdict |
| Recent Scans row (populated) | `flex justify-between border-b pb-3` div per scan (Dashboard.tsx:153) | **Ledger idiom**: hairline row divider = `--hairline`, `tabular-nums` JetBrains Mono for score + date, semantic chip (see below) for score band |
| Score value `{score_total}/100` | plain `<p className="font-medium">` (Dashboard.tsx:163), no color coding at all today | JetBrains Mono, `tabular-nums`; number + word band (`Healthy`/`At Risk`/`Critical`) using score ramp — **never bare integer per foundation §1** |
| Scan row action | ghost `Button` + `ArrowRight` icon, links to `/scan-result` | Keep icon-only ghost action, hairline hover state, no shadow |
| Empty scans state | centered `p` + `Button` "Scan a Token Now" (Dashboard.tsx:174-180) | Same layout; CTA in Cobalt fill; copy unchanged |
| Loading state | `Loader2` spin, `text-muted-foreground` (Dashboard.tsx:147-149) | Same spinner mechanism; color → `--ink-2` |
| UserProfile card | shadcn `Card`, default border/shadow | `--surface` fill, `--hairline` border, **no box-shadow** (foundation §3) |
| Plan badges (`Lifetime`, `Active`, `Limit Reached`, `Admin`) | **hardcoded Tailwind literals**: `bg-purple-50 text-purple-700 border-purple-200`, `bg-green-50 text-green-700 border-green-200`, `bg-amber-50 text-amber-700 border-amber-200`, `bg-purple-100 dark:bg-purple-900 dark:text-purple-300` (`UserProfile.tsx:147,151,173,178`) | Replace with score-ramp / semantic chip tokens: `--score-healthy`/`--score-risk`/`--score-critical` tints for status, `--primary-hi` (Cobalt-hi) only for the plan-tier badge — **will not theme-flip under `.cobalt` as written; must be re-authored, not just re-skinned** |
| "Lifetime access" celebratory box | hardcoded `bg-purple-50 border-purple-200 text-purple-700/600` (`UserProfile.tsx:218-224`) | Surface-2 panel + Cobalt-hi text; drop the bespoke purple block |
| Copilot hero icon badge | `bg-gradient-to-tr from-blue-500 to-purple-500` (Copilot.tsx:55) | **Gradient — banned on data surfaces (foundation §3, "no gradients on data")**; flat Cobalt fill circle instead |
| "Powered by CoinGecko API" badge | shadcn `Badge variant="secondary"` + `Sparkles` icon (Copilot.tsx:65-68) | Surface-2 chip, JetBrains Mono caps label, Ink-2 |
| Token search input | `TokenSearchAutocomplete` wrapping shadcn `Input` | This is the **ask-bar idiom** per foundation — becomes the same input treatment as the Copilot chat's own Textarea: `--surface` fill, `--hairline-2` border, Cobalt focus ring |
| Quick-tip cards | `bg-muted/30 rounded-lg text-center` (Copilot.tsx:140-151) | `--surface-2`, 4px radius, JetBrains Mono label caps |
| Chat message bubble (assistant) | `bg-muted` rounded-lg (CopilotPanel.tsx:250-254) | `--surface-2` fill, Archivo body text |
| Chat message bubble (user) | `bg-primary text-primary-foreground` (shadcn var, Cobalt-adjacent already) | Cobalt fill — this is a legitimate "CTA-adjacent" use (an active user action), keep |
| Connection-status badge | `Badge variant="default"/"outline"` text swap (CopilotPanel.tsx:360-376) | Connected = Cobalt-hi text on Surface-2; connecting = Ink-3 + spin (decorative motion only, foundation §4); error = score-critical red |
| Data blocks (Metric/Pools/Holders/Tokenomics/etc.) | Individual card components, not audited line-by-line here | **Ledger idiom mandatory**: hairline row dividers, JetBrains Mono `tabular-nums` for every numeric column, semantic chips for risk/security fields (never bare color) |
| `PriceSparkline` series color | **hardcoded hex** `stroke={isPositive ? "#22c55e" : "#ef4444"}` / `fill: isPositive ? "#22c55e" : "#ef4444"` (`src/components/copilot/blocks/PriceSparkline.tsx`, flagged in `component-inventory.json` topOffenders, 4 hits) | `--score-healthy` / `--score-critical` — same fix pattern as T11's admin badges, does not theme-flip today |
| Input bar Send button | shadcn `Button` default (Cobalt-adjacent) | Cobalt fill, `--hairline` focus ring per foundation §6 |
| Rate-limit `Alert` | shadcn default `Alert` + `Clock` icon | Surface-2, Ink-2 text, amber/`--score-risk` accent icon only — not a full-alert color wash |

## 4. States

| State | Dashboard | Copilot |
|---|---|---|
| **Empty (captured, real)** | Auth-required screen — `dashboard-empty.{375,768,1440}.default.{dark,light}.json`. Real DOM: header/nav (65px sticky), `Alert` "Authentication Required", H1 + subhead + "Back to Home" CTA, footer. No scan data ever reaches this state (auth blocks the fetch). | Pre-token-selection hero — `copilot-empty.{375,768,1440}.default.{dark,light}.json`. Real DOM: hero, "Select a Token" card with search input, quick-tip row, footer. |
| **Loading** | `Loader2` spinner centered in Recent Scans card while `fetchScanHistory` runs (Dashboard.tsx:146-149) — only reachable once authenticated, so **not captured**, code-derived. | Chat: typing-indicator bubble ("Thinking...") pushed into `messages` while awaiting the edge function (CopilotPanel.tsx:161-169) — code-derived. Connection badge shows "Connecting CoinGecko..." for the first ~1s on mount (CopilotPanel.tsx:138-141) — code-derived, arguably decorative/fake since it's a hardcoded `setTimeout`, not a real connection check. |
| **Populated (code-derived)** | Scan history list with up to 10 rows (`.limit(10)`, Dashboard.tsx:53), each with token name/symbol, timestamp, score, jump-to-report action. UserProfile fully expanded with plan/usage/actions. | Token locked in: selected-token header + `CopilotPanel` chat thread with data blocks rendered per intent. |
| **Error** | Scan fetch failure: logged to console only (`console.error`, Dashboard.tsx:56,72) — **no user-facing error state exists in code today**. Flag as a gap, not a spec to preserve. | Two paths in code: (1) edge function returns `funcError` → assistant bubble reads `Request failed: {message}` (CopilotPanel.tsx:192-200); (2) thrown exception → assistant bubble reads the caught error message (CopilotPanel.tsx:217-224). Connection badge can also show "Connection Error" (CopilotPanel.tsx:373-375) but nothing in code currently sets `connectionStatus` to `'error'` — dead state, flag as a gap. |

## 5. Migration notes

- Neither Dashboard nor Copilot currently render score-band words next to numbers anywhere —
  `Dashboard.tsx:163` prints a bare `{scan.score_total}/100`. This is a foundation-rule violation
  (§1: "Always number + word band, never a bare integer") that predates this redesign and must be
  fixed as part of the T10 migration, not just re-skinned.
- `PriceSparkline`'s hardcoded `#22c55e`/`#ef4444` (already flagged in `component-inventory.json`)
  sits inside the Copilot chat's data-block surface — fix it in the same pass as the ledger-idiom
  rework, since both land on the score-ramp tokens.
- `UserProfile.tsx`'s purple/green/amber Tailwind-literal badges are the same class of bug as the
  T11 admin badges (see that doc §migration), just not caught by `component-inventory.json`'s
  hex-regex scan — its detector only flags `#xxxxxx` literals, not Tailwind palette classes like
  `bg-purple-50`. Both docs' offenders should be fixed together since they share one root cause.
- Copilot's gradient hero icon (`from-blue-500 to-purple-500`) is a second violation of the same
  scan gap — no hex color, so it slipped the audit, but it violates foundation §3 ("no gradients
  on data") outright.
- The `.cobalt` theme class does not exist yet in `src/index.css` (confirmed: only `--primary` is
  set under `:root` and `.dark`, no `.cobalt` block). Per foundation §5, land Dashboard/Copilot's
  var-only first commit before any visible flip; verify against these specs only once `.cobalt` is
  applied to these two routes specifically.
- Dashboard has no user-facing fetch-error UI; Copilot has an unreachable `'error'` connection
  status. Decide in implementation whether the redesign adds real error states or documents them
  as accepted gaps — do not silently invent copy for either.

## 6. Verification checklist

- [x] Empty-state layout matches captured DOM at 375/768/1440, dark + light — **done, captures exist**.
- [ ] Authenticated Dashboard: Recent Scans populated list, UserProfile full panel, admin-link
      visibility for an admin account — **requires credentials**.
- [ ] Authenticated Dashboard: loading spinner timing/placement on a real Supabase round-trip —
      **requires credentials**.
- [ ] Authenticated Dashboard: fetch-error path (force a Supabase error) — **requires credentials**,
      and note there is currently no UI for it to verify against.
- [ ] Copilot: token selection → selected-token header → `CopilotPanel` mount, all breakpoints —
      does not strictly require auth (page is public) but does require a live CoinGecko-backed
      search result; verify without credentials once environment is reachable.
- [ ] Copilot chat: real message send/receive round-trip through the `mcp-chat` edge function,
      including a rate-limited (`limited: true`) response — **requires credentials/live function**.
- [ ] Copilot chat: `connectionStatus === 'error'` — currently unreachable in code; confirm whether
      to leave as dead state or wire a real check.
- [ ] Score-band word + number pairing added to Dashboard scan rows — build-time check, no
      credentials needed.
- [ ] `PriceSparkline` and `UserProfile` hardcoded-color fixes verified under `.cobalt` in both
      themes — no credentials needed, but does require `.cobalt` to exist in `index.css` first.
