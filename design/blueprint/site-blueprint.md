# Token Health Scan — Site Blueprint

Generated 2026-08-26. 34 SPA routes + file routes, reconciled across App.tsx, product-info.md, both CF worker copies, and the 79-URL Googlebot crawl.

| Route | Component | Type | Auth | GSC impr. | Money | Flags |
|---|---|---|---|---|---|---|
| `/` | Landing | T1 | public | 114 | — | — |
| `/ltd` | LTD | T1 | public | 0 | ✓ | In worker STATIC_ROUTES but absent from the crawl — no inter |
| `/ltd-thank-you` | LTDThankYou | T1 | public | 0 | — | — |
| `/pricing` | Pricing | T1 | public | 0 | ✓ | — |
| `/ai-agents` | AIAgents | T2 | public | 1 | — | Admin-only UI section rendered conditionally via useUserRole |
| `/ethereum-launchpads` | EthereumLaunchpads | T2 | public | 8 | — | — |
| `/solana-launchpads` | SolanaLaunchpads | T2 | public | 24 | — | — |
| `/token-scan-guide` | TokenScanGuide | T2 | public | 82 | — | — |
| `/token-sniffer-vs-tokenhealthscan` | TokenSnifferComparison | T2 | public | 109 | — | Workers also list legacy alias /token-sniffer-comparison whi |
| `/publications` | Publications | T3 | public | 0 | — | — |
| `/publications/:slug` | DynamicPage | T4 | public | 31 | — | Worker REDIRECTS 301s renamed slugs: best-token-scanners-202 |
| `/privacy` | Privacy | T5 | public | 0 | — | Omitted from product-info.md Live Routes block |
| `/terms` | Terms | T5 | public | 0 | — | Omitted from product-info.md Live Routes block |
| `/auth` | Auth | T6 | public | 0 | — | — |
| `/confirm` | Confirm | T6 | public | 0 | — | — |
| `/agent-scan` | AgentScan | T7 | public | 0 | — | In worker STATIC_ROUTES but absent from the crawl |
| `/agent-scan/:chain/:agentId` | AgentScanResult | T7 | public | 0 | — | Covered by worker DYNAMIC_ROUTES regex (hard 404 propagation |
| `/scan-loading` | ScanLoading | T7 | public | 0 | — | Uses useAuth for optional user attribution; no guard |
| `/scan-result` | ScanResult | T7 | public | 0 | — | Public page; pro features gated inside via checkUserHasProAc |
| `/scan/:chain/:address` | ScanChain | T7 | public | 0 | — | — |
| `/token/:symbol` | TokenReport | T8 | public | 125 | — | — |
| `/agent-directory` | AgentDirectory | T9 | public | 0 | — | In worker STATIC_ROUTES but absent from the crawl |
| `/agent-scan/search` | AgentScanSearch | T9 | public | 0 | — | Omitted from product-info.md Live Routes block |
| `/token` | TokenDirectory | T9 | public | 32 | — | Workers also list legacy alias /token-directory which has no |
| `/copilot` | Copilot | T10 | public | 2 | — | No auth guard found in Copilot.tsx despite being an app surf |
| `/dashboard` | Dashboard | T10 | free | 0 | — | No hard redirect for logged-out users; renders empty state ( |
| `/admin` | Admin | T11 | admin | 0 | — | Guarded by AdminRoute (isAuthenticated + user.id + isAdmin) |
| `/admin/edit/:id` | AdminEdit | T11 | admin | 0 | — | — |
| `/admin/new` | AdminNew | T11 | admin | 0 | — | — |
| `/admin/users` | AdminUsers | T11 | admin | 0 | — | — |
| `*` | NotFound | U | public | 0 | — | Bots on unknown routes get X-Robots-Tag: noindex from both w |
| `/feed.xml` | RSSFeedRoute | U | public | 0 | — | Not in either worker's STORAGE_PROXY_PATHS or STATIC_ROUTES  |
| `/robots.txt` | StaticFileRoute | U | public | 0 | — | Not in worker STORAGE_PROXY_PATHS — served by origin static  |
| `/rss.xml` | RSSFeedRoute | U | public | 0 | — | Both worker copies proxy it to Supabase rss-feed edge functi |
| `/sitemap.xml` | StaticFileRoute | U | public | 0 | — | Worker STORAGE_PROXY_PATHS intercepts and serves from Supaba |

## Dead bot-visible routes (fix in worker)

- `/token-directory` — No App.tsx route, no redirect. Bot hit -> seo-snapshot; on snapshot 404 falls through to SPA shell = index.html 200 rendering NotFound (soft 404). TokenDirector
- `/token-sniffer-comparison` — Same failure mode. TokenSnifferComparison component actually mounts at /token-sniffer-vs-tokenhealthscan.