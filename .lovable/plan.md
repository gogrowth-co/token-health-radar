

## Add AI Agent Badge to Scan Result Page

### Overview
When a scanned token exists in the `agent_tokens` table, display category and framework badges below the token name on the scan result page.

### Changes

**1. `src/pages/ScanResult.tsx`** — 3 small edits:

- **Add agent token query** (line 194): Add a new entry to the `cacheQueries` array:
  ```
  { name: 'agentToken', query: supabase.from('agent_tokens').select('category, agent_framework, coingecko_id').eq('token_address', tokenAddress).maybeSingle() }
  ```

- **Fix the pre-existing build error** (line 216): The `data.score` check fails because `descOverride` and the new `agentToken` results don't have a `score` field. Fix by changing:
  ```typescript
  if (data && data.score && data.score > 0)
  ```
  to:
  ```typescript
  if (data && 'score' in data && (data as any).score > 0)
  ```

- **Add agentToken to freshScanData** (around line 250): Add `agentToken: cacheData.agentToken || null` to the object.

- **Pass agentToken prop to TokenProfile** (line 498-513): Add `agentToken={scanData?.agentToken}` prop.

**2. `src/components/TokenProfile.tsx`** — 3 edits:

- **Extend `TokenProfileProps` interface**: Add `agentToken?: { category: string; agent_framework: string; coingecko_id: string } | null`.

- **Add to destructured props**: Add `agentToken = null` to the function parameters.

- **Render badge JSX** in both mobile and desktop layouts: After the name/symbol line, add a conditional block that shows:
  - A colored category badge (purple for AI Agent, blue for Infrastructure, green for Framework, amber for Launchpad) with a robot emoji
  - A framework badge if `agent_framework !== 'unknown'`
  - A "View all AI Agents" link to `/ai-agents`

### No other files modified

### Technical Notes
- The `agentToken` query uses `.maybeSingle()` so it returns `null` for non-agent tokens (no badge shown)
- The build error fix uses `'score' in data` to safely check for the score property, since `descOverride` and `agentToken` results don't have score fields
- Badge styling uses semi-transparent backgrounds consistent with the existing dark theme
