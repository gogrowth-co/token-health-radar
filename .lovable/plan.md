

## Create Token Health MCP Server

Build a Streamable HTTP MCP server as a Supabase Edge Function exposing the existing `run-token-scan` engine to Claude Code users.

### What This Does
Any Claude Code user can add a single URL to their settings and ask natural language questions like "Is UNI safe?" — Claude will call the MCP tools to scan tokens and return health scores across 5 dimensions.

### Adjustments from Original Plan

1. **Cache table column names differ** — the original plan references `security_score`, `liquidity_score`, etc. but the actual columns are just `score` in each table (`token_security_cache.score`, `token_liquidity_cache.score`, etc.). The `get_cached_scores` handler must use the correct column name.

2. **`run-token-scan` response shape** — the function returns `token_name`, `token_symbol`, `overall_score`, and a `scores` object with `security`, `liquidity`, `tokenomics`, `community`, `development` keys. The `scan_token` handler can pass these through directly.

3. **Supabase inter-function invocation** — from within an edge function, we should call `run-token-scan` via direct HTTP fetch to the functions URL (using `SUPABASE_URL`) rather than `supabase.functions.invoke()`, since the SDK client is initialized with service role key, not anon key. We'll use a direct fetch with the service role key as Authorization.

4. **Solana address handling** — Solana addresses are case-sensitive (Base58). The `get_cached_scores` handler should NOT lowercase Solana addresses. We'll detect Solana chain and skip `.toLowerCase()`.

### Files Changed

| File | Action | Purpose |
|---|---|---|
| `supabase/functions/token-health-mcp/index.ts` | CREATE | MCP server (~200 lines) |
| `supabase/config.toml` | MODIFY | Add `[functions.token-health-mcp]` with `verify_jwt = false` |

### Implementation

**Single file: `supabase/functions/token-health-mcp/index.ts`**

Sections:
- CORS headers + MCP server info/capabilities constants
- 2 tool schemas (`scan_token`, `get_cached_scores`) returned by `tools/list`
- `normalizeChain()` helper (chain name to hex ID)
- `generateVerdict()` — produces a one-line summary from scores
- `handleScanToken()` — calls `run-token-scan` via fetch, returns structured result
- `handleGetCachedScores()` — parallel queries to all 5 `token_*_cache` tables using `.select("score, updated_at")`, computes average overall score
- Main `Deno.serve()` — JSON-RPC 2.0 router handling `initialize`, `notifications/initialized`, `tools/list`, `tools/call`

Key detail for `get_cached_scores`: query each cache table's `score` column (not `security_score`):
```
supabase.from("token_security_cache").select("score, updated_at").eq(...)
```

Key detail for `scan_token`: call run-token-scan via fetch:
```
const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/run-token-scan`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
  },
  body: JSON.stringify({ token_address: address, chain_id, user_id: null, force_refresh: false }),
});
```

### Verification After Deploy
1. Test `tools/list` via `curl_edge_functions`
2. Test `scan_token` with UNI on Ethereum
3. Test `get_cached_scores` for the same token afterward

### User Setup (one line)
```json
{
  "mcpServers": {
    "token-health": {
      "type": "http",
      "url": "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/token-health-mcp"
    }
  }
}
```

