

## Fix Agent Search — Two Root Causes

### Problem 1: `scan-agent` edge function not extracting names
The `<title>Clawdia | 8004scan</title>` tag IS present in the HTML from 8004scan.io, and the regex in the code looks correct. Most likely the edge function wasn't redeployed after the title fix was added. All 3 agents in the DB have fallback names ("Agent #2290", etc.).

**Fix**: Redeploy `scan-agent` with the existing title regex code. Add a `console.log` of the first 500 chars of fetched HTML so we can verify the title tag is actually present when fetched server-side (Deno fetch may get different HTML than a browser). If the title tag isn't present in the server-side response, fall back to extracting from `<next-route-announcer>` or OG meta tags.

### Problem 2: Search filters out all "Agent #" entries
Line 46 of `AgentScanSearch.tsx` explicitly skips entries where `agent_name.startsWith("Agent #")`. Since ALL entries currently have that format, search always returns 0 results.

**Fix**: Remove the `Agent #` filter. Show all matched agents. If the name is "Agent #2290", that's still useful — the user can recognize the ID. Additionally, when the query is non-numeric text, also search `raw_data` JSONB for the agent name stored inside the scan result (the `raw_data->agent->name` path may contain the real name even if `agent_name` column has the fallback).

### Files Changed

| File | Change |
|---|---|
| `supabase/functions/scan-agent/index.ts` | Add debug logging of HTML snippet; ensure title regex works; redeploy |
| `src/pages/AgentScanSearch.tsx` | Remove "Agent #" filter; add fallback search on `raw_data` JSONB |

### Implementation Details

**scan-agent** — after `const html = await res.text()`, add:
```ts
console.log(`[scan-agent] HTML preview: ${html.substring(0, 500)}`);
console.log(`[scan-agent] Title match: ${html.match(/<title>([^|<]+)\|/i)}`);
```

**AgentScanSearch.tsx** — change the deduplication loop:
```ts
// Remove the "Agent #" exclusion filter
if (!seen.has(key)) {
  // Try to get real name from raw_data if agent_name is fallback
  const realName = row.agent_name?.startsWith("Agent #")
    ? (row.raw_data as any)?.agent?.name || row.agent_name
    : row.agent_name;
  seen.set(key, {
    agentId: row.agent_id,
    chain: row.chain,
    name: realName || `Agent #${row.agent_id}`,
  });
}
```

Also update the query to include `raw_data` in the select, and add a secondary search path: if the `agent_name` ILIKE returns 0 results, try searching within `raw_data` using a text cast.

