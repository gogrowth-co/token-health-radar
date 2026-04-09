

## Agent Trust Score — Full Implementation Plan

### Overview
Add an "Agent Trust Score" product vertical that scans ERC-8004 AI agents and produces a 5-dimension trust score. Distinct from `/ai-agents` (which tracks agent tokens). Agent scans have their own independent quota: 3 free lifetime, 10/month for Pro — completely separate from token scan limits.

### Phase 1 — Foundation

**1. Database migration**
- `agent_scans` table: id, chain, agent_id, agent_name, raw_data (JSONB), scores (JSONB), user_id, ip_address, created_at. Index on (chain, agent_id, created_at DESC). RLS: public read/insert.
- `agent_directory_cache` table: id, agents_data (JSONB), chain_filter, updated_at. RLS: public read.
- Add `agent_scans_used` (integer, default 0) to `subscribers` table — independent counter from `scans_used`.

**2. Scoring engine** — `src/lib/agent-scoring.ts`
- Pure function, no side effects. 5 dimensions x 100 points each (Identity Verification, Financial Transparency, Operational Reliability, Reputation, Compliance), averaged to 0-100 overall.
- 5 trust levels: Highly Trusted (80+, green), Moderately Trusted (60-79, teal), Use Caution (40-59, amber), Low Trust (20-39, orange), Unverified (0-19, red).
- Exports types: `AgentScanData`, `AgentTrustResult`, `DimensionScore`, `CheckResult`.

**3. Edge Function: `scan-agent`**
- `createSecureHandler` pattern, no auth required.
- Input: `POST { chain, agentId }`.
- Fetches 8004scan.io agent page via `fetch()` + regex/string parsing (no Firecrawl). Searches toku.agency API (graceful failure). HEAD pings to service endpoints (5s timeout).
- Rate limit: `CommonRateLimits.publicTokenScan` (3/hour).

**4. Edge Function: `fetch-agent-directory`**
- Fetches/caches agent list from 8004scan.io. 24hr TTL in `agent_directory_cache`. Paginated (20/page). No auth required.

**5. Scan access: `check-scan-access` update**
- Return `agentScansUsed` and `agentScanLimit` alongside existing token scan fields.
- Free: 3 agent scans lifetime. Pro: 10/month. Admin: unlimited. Completely independent of `scans_used` / `pro_scan_limit`.
- New field in response: `canAgentScan: boolean`.

### Phase 2 — UI Components

**6. New components in `src/components/agent-scan/`**
- `AgentTrustScoreRing.tsx` — Large SVG ring with 5-level colors (new component, does NOT modify `OverallHealthScore`).
- `AgentDimensionCard.tsx` — Per-dimension card with mini-ring, expandable check list.
- `AgentDimensionGrid.tsx` — Grid of 5 dimension cards.
- `AgentIdentityCard.tsx` — Name, chain badge, owner address, service type badges, external links.
- `AgentActionPlan.tsx` — Ordered list of failed/partial checks with recommendations.
- `AgentSearchInput.tsx` — Text input + chain selector dropdown.
- `AgentCrossSell.tsx` — Cross-sell banner linking to token scans.
- `AgentScanLoading.tsx` — Sequential loading states.
- `AgentDirectoryTable.tsx` — Table/card list for directory page.

### Phase 3 — Pages & Routes

**7. Pages**
- `AgentScan.tsx` (`/agent-scan`) — Landing with hero, search input + chain selector, how-it-works, 5 dimension preview cards.
- `AgentScanResult.tsx` (`/agent-scan/:chain/:agentId`) — Checks cache (6hr TTL), calls edge function on miss, runs scoring engine, renders full result. Checks `agent_scans_used` before invoking; shows `UpgradeModal` if exceeded.
- `AgentScanSearch.tsx` (`/agent-scan/search`) — Searches `agent_directory_cache`, shows matching agents.
- `AgentDirectory.tsx` (`/agent-directory`) — Full directory with filters, pagination, trust score column.

**8. Route registration** in `App.tsx` — 4 new lazy routes.

### Phase 4 — Navigation & Cross-Sell

**9. Nav updates**
- `Navbar.tsx`: Add "Agent Scan" (Shield icon) after "AI Agents", before "Token Reports".
- `MobileNav.tsx`: Add "Agent Scan" after "AI Agents".

**10. Cross-sell**
- `AIAgents.tsx`: Dismissible banner → "Scan the agent behind the token".
- `HeroSection.tsx`: Tab toggle "Scan Token" / "Scan Agent" above search.

### Phase 5 — SEO

**11. Helmet + schema markup** on all new pages. Sitemap and robots.txt updates.

### Quota System Detail

| | Token Scans | Agent Scans |
|---|---|---|
| Free | 3 lifetime (`scans_used`) | 3 lifetime (`agent_scans_used`) |
| Pro | 10/mo (`pro_scan_limit`) | 10/mo (new `agent_scan_limit` or hardcoded) |
| Admin | Unlimited | Unlimited |
| DB Column | `subscribers.scans_used` | `subscribers.agent_scans_used` (new) |
| Edge Function | `check-scan-access` returns `scansUsed` | Same function returns `agentScansUsed` |

The two quotas are completely independent. Using a token scan does not decrement agent scans and vice versa.

### Files Summary

**New (17)**: Migration SQL, `agent-scoring.ts`, 2 edge functions, 9 components in `agent-scan/`, 4 pages.

**Modified (8)**: `App.tsx` (routes), `Navbar.tsx`, `MobileNav.tsx`, `AIAgents.tsx` (banner), `HeroSection.tsx` (tab toggle), `check-scan-access/index.ts` (agent quota), `sitemap.xml`, `robots.txt`.

### Execution Order
1. Scoring engine (pure logic, no deps)
2. DB migration (tables + `agent_scans_used` column)
3. `scan-agent` edge function
4. `fetch-agent-directory` edge function
5. Update `check-scan-access` for agent quota
6. Nav updates + route registration
7. UI components
8. Landing page → Search page → Results page → Directory page
9. Cross-sell integration
10. SEO markup

