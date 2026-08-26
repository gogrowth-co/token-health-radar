# Route Reconciliation — tokenhealthscan.com
Generated 2026-08-26 (analysis of 2026-08-25 pull). Machine layer: `route-reconciliation.json` beside this file.

## Sources
| # | Source | Role | State |
|---|---|---|---|
| 1 | `token-health-radar/src/App.tsx` | Canonical route table | repo HEAD 9b2e06d (2026-08-07) |
| 2 | `token-health-scan/_context/product-info.md` "Live Routes" | Docs claim | mostly accurate, 8 omissions, 0 inventions |
| 3a | `token-health-radar/workers/bot-prerender.js` | CF worker, repo copy | header "v2.0 2026-08-05"; last sync commit 563c113 (2026-08-06, msg claims "deployed v2.2") |
| 3b | `token-health-scan/workers/tokenhealthscan-bot-prerender-v2/index.js` | CF worker, ops copy | header "v2.0 2026-08-05" + dated 2026-08-07 TTL edit — **live-truth** |
| 4 | `seo/research/link-intelligence-ths-2026-08-06.json` | 79 crawled live URLs | all 79 map to App.tsx routes |

## Route inventory (34 routes, all in App.tsx)
All eager-loaded except the four `/admin*` pages (lazy behind `AdminRoute` + Suspense).

| Path | Component | Type | Auth | ProdInfo | WorkerStatic | Live URLs | GSC impr |
|---|---|---|---|---|---|---|---|
| `/sitemap.xml` | StaticFileRoute | U | public | – | – (proxy path) | – | – |
| `/robots.txt` | StaticFileRoute | U | public | – | – | – | – |
| `/rss.xml` | RSSFeedRoute | U | public | – | – (proxy path) | – | – |
| `/feed.xml` | RSSFeedRoute | U | public | – | – | – | – |
| `/` | Landing | T1 | public | yes | yes | 1 | 114 |
| `/auth` | Auth | T6 | public | yes | – | 0 | 0 |
| `/confirm` | Confirm | T6 | public | yes | – | 0 | 0 |
| `/scan/:chain/:address` | ScanChain | T7 | public | yes | – | 0 | 0 |
| `/scan-loading` | ScanLoading | T7 | public | yes | – | 0 | 0 |
| `/scan-result` | ScanResult | T7 | public (pro-gated features) | yes | – | 0 | 0 |
| `/pricing` | Pricing | T1 | public | yes | yes | 1 | 0 (isMoney) |
| `/copilot` | Copilot | T10 | public (no guard found) | yes | yes | 1 | 2 |
| `/dashboard` | Dashboard | T10 | free (soft: empty state, no redirect) | yes | – | 0 | 0 |
| `/ltd` | LTD | T1 | public | yes | yes | 0 | 0 |
| `/ltd-thank-you` | LTDThankYou | T1 | public | yes | – | 0 | 0 |
| `/privacy` | Privacy | T5 | public | **no** | yes | 1 | 0 |
| `/terms` | Terms | T5 | public | **no** | yes | 1 | 0 |
| `/token-scan-guide` | TokenScanGuide | T2 | public | yes | yes | 1 | 82 |
| `/token-sniffer-vs-tokenhealthscan` | TokenSnifferComparison | T2 | public | yes | yes | 1 | 109 |
| `/solana-launchpads` | SolanaLaunchpads | T2 | public | yes | yes | 1 | 24 |
| `/ethereum-launchpads` | EthereumLaunchpads | T2 | public | yes | yes | 1 | 8 |
| `/ai-agents` | AIAgents | T2 | public (admin extra UI) | yes | yes | 1 | 1 |
| `/agent-scan` | AgentScan | T7 | public | yes | yes | 0 | 0 |
| `/agent-scan/search` | AgentScanSearch | T9 | public | **no** | – | 0 | 0 |
| `/agent-scan/:chain/:agentId` | AgentScanResult | T7 | public | yes | – (dynamic regex) | 0 | 0 |
| `/agent-directory` | AgentDirectory | T9 | public | yes | yes | 0 | 0 |
| `/token` | TokenDirectory | T9 | public | yes | yes | 1 | 32 |
| `/token/:symbol` | TokenReport | T8 | public | yes | – (dynamic regex) | 54 | 125 |
| `/publications` | Publications | T3 | public | yes | yes | 1 | 0 |
| `/publications/:slug` | DynamicPage | T4 | public | yes | – (dynamic regex) | 13 | 31 |
| `/admin` | Admin (lazy) | T11 | admin | yes (`/admin*`) | – | 0 | 0 |
| `/admin/new` | AdminNew (lazy) | T11 | admin | yes | – | 0 | 0 |
| `/admin/edit/:id` | AdminEdit (lazy) | T11 | admin | yes | – | 0 | 0 |
| `/admin/users` | AdminUsers (lazy) | T11 | admin | yes | – | 0 | 0 |
| `*` | NotFound | U | public | **no** | – | – | – |

Auth notes (from code, not guessed): `AdminRoute` gates on `isAuthenticated && user.id && isAdmin`. `Dashboard` fetches nothing without a user but does NOT redirect. `ScanResult` checks `checkUserHasProAccess()` for feature gating. `Copilot.tsx` has no auth guard at all. Everything else is public.

## Worker diff (repo copy vs ops copy)
Identical: STATIC_ROUTES (17 entries), DYNAMIC_ROUTES (3 regexes), bot UA regex, noindex rules (unknown routes → `X-Robots-Tag: noindex`; dynamic-slug misses → hard 404 with meta noindex; snapshots → `index, follow`), redirects mechanism, og-image fix.

Ops copy only (= live-truth):
1. `STORAGE_PROXY_PATHS` includes `/llms-full.txt`.
2. Second redirect: `/publications/state-of-token-health-q3-2026` → `/publications/state-of-token-health`.
3. Snapshot cache TTLs cut (cacheTtl 300→120; s-maxage 86400→300; swr 604800→1800) with a dated 2026-08-07 rationale: no edge purge path (CF token lacks Zone.Cache Purge).

Live-truth verdict: **ops copy** — it carries the newest dated edit (2026-08-07) and is a superset of the repo copy. Anomalies: both headers still say "v2.0" while commits reference v2.1/v2.2 (version markers unreliable); the repo copy's 2026-08-06 "sync to deployed" REMOVED `/llms-full.txt` one day after eb56367 added and deployed it — redeploying the repo copy as-is would break `/llms-full.txt`.

## Dead static routes (worker knows them, App.tsx doesn't) — 2
Prior finding VERIFIED still true post-pull, in BOTH worker copies:
- `/token-directory` — real page lives at `/token` (TokenDirectory component)
- `/token-sniffer-comparison` — real page lives at `/token-sniffer-vs-tokenhealthscan`

Failure mode: bots get seo-snapshot attempt → on 404 fall through to SPA shell = index.html 200 rendering NotFound (soft 404, still bot-visible junk). Fix: either add 301s to the worker REDIRECTS map or drop them from STATIC_ROUTES.

## Other discrepancies worth acting on
- `/feed.xml` exists only in App.tsx (client-side redirect); neither worker proxies it — a bot on `/feed.xml` gets a noindexed SPA shell, never the feed.
- `src/pages/ApiHealth.tsx` declares canonical `/api-health` but has **no route** in App.tsx — unreachable component, falls to catch-all.
- product-info.md omits: `/privacy`, `/terms`, `/agent-scan/search`, the four file routes, and the catch-all. It invents nothing.
- `/ltd`, `/agent-scan`, `/agent-directory` are in worker STATIC_ROUTES yet absent from the 79-node crawl — no internal links reach them.

## Orphan live URLs — 0
All 79 crawled URLs (12 static + 54 `/token/:symbol` + 13 `/publications/:slug`) map to an App.tsx route.

## Counts
- Routes total: **34**
- Discrepancies found: **17**
- Orphan live URLs: **0**
- Dead static routes: **2** (`/token-directory`, `/token-sniffer-comparison` — confirmed still route-less post-pull)
