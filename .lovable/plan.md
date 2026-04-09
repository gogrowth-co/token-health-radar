
## Fix Agent Search and Name Extraction

### Root Cause (Two Problems)

**Problem 1 — Agent name extraction is broken.** 8004scan.io is a Next.js SPA. Individual agent pages have NO `<h1>` in the server-rendered HTML. The `<title>` tag does contain the name (e.g., `Clawdia | 8004scan`), but the current regex in `scan-agent` only looks for `<h1>` tags, so it falls back to "Agent #2290" every time.

**Problem 2 — Directory/search is fundamentally broken.** The agent listing page (`8004scan.io/agents?chain=base`) is also client-rendered — the HTML is an empty shell with no agent data. The regex parsing in `fetch-agent-directory` finds zero agents, the `agent_directory_cache` table stays empty, and name-based search always returns nothing.

### Solution

**Fix 1 — Extract name from `<title>` tag in `scan-agent`**

The title tag format is `AgentName | 8004scan`. Add a `<title>` regex as the first extraction attempt:

```
const titleMatch = html.match(/<title>([^|<]+)\|/i);
```

This gives us "Clawdia" reliably. Also update the `description` regex to parse the `<meta name="description">` tag instead of looking for in-page elements.

File: `supabase/functions/scan-agent/index.ts` — update the name/description extraction block (lines 69-80).

**Fix 2 — Pivot search to use `agent_scans` table instead of broken directory**

Since the directory scraping cannot work (SPA), change the search strategy:

1. **Search `agent_scans` table** — query previously scanned agents by `agent_name ILIKE '%query%'`. This builds a search index organically as more agents get scanned.
2. **Direct ID entry** — if the query is numeric, show a prominent "Scan Agent #X on {chain}" CTA that links directly to `/agent-scan/{chain}/{id}` instead of searching.
3. **Fallback message** — if no results and query is not numeric, show "This agent hasn't been scanned yet. Enter the agent ID to scan it directly."

Files:
- `src/pages/AgentScanSearch.tsx` — replace the `agent_directory_cache` lookup with an `agent_scans` query using `agent_name.ilike` and add the direct-ID-scan CTA.
- `src/components/agent-scan/AgentSearchInput.tsx` — update placeholder text to clarify that name search works for previously scanned agents, and ID always works.

**Fix 3 — Update `AgentDirectory.tsx` to show previously scanned agents**

Instead of calling the broken `fetch-agent-directory`, query `agent_scans` for distinct agents, grouped by `(chain, agent_id)`, showing the most recent scan for each. This way the directory grows organically with usage.

File: `src/pages/AgentDirectory.tsx` — replace the edge function call with a direct Supabase query on `agent_scans`.

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/scan-agent/index.ts` | Add `<title>` regex for name extraction |
| `src/pages/AgentScanSearch.tsx` | Search `agent_scans` table + direct ID CTA |
| `src/pages/AgentDirectory.tsx` | Query `agent_scans` instead of broken edge function |
| `src/components/agent-scan/AgentSearchInput.tsx` | Update placeholder text |

### Technical Details
- Title regex: `/<title>([^|<]+)\|/i` — captures everything before the `|` separator
- Description regex: `/<meta\s+name=["']description["']\s+content=["']([^"']+)/i`
- Agent scans search query: `.from("agent_scans").select("agent_id, agent_name, chain, created_at").ilike("agent_name", `%${query}%`).eq("chain", chain).order("created_at", { ascending: false })`
- Deduplication: use a `Map<string, AgentEntry>` keyed by `chain-agent_id` to show only the latest scan per agent
- The `fetch-agent-directory` edge function can remain deployed but won't be called from the frontend until 8004scan.io provides a proper API
