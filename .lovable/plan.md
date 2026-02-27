

## Problem

The "Sync Prices" button fails with a `404` because `import.meta.env.VITE_SUPABASE_URL` resolves to `undefined` in the preview environment. The resulting request goes to `undefined/functions/v1/sync-agent-tokens`.

## Root Cause

The `.env` file has `VITE_SUPABASE_URL` defined, but the Lovable preview environment auto-populates only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the connected Supabase project. The variable may not be available at runtime due to environment handling differences.

## Solution

Replace the manual `fetch()` call with `supabase.functions.invoke('sync-agent-tokens')` from the already-configured Supabase client. This client already knows the correct project URL and will attach the user's auth token automatically.

### Changes (single file: `src/pages/AIAgents.tsx`)

1. Remove the manual `fetch` + session token logic in `handleSyncPrices`
2. Replace with:
   ```ts
   const { data, error } = await supabase.functions.invoke('sync-agent-tokens', {
     method: 'POST',
   });
   ```
3. Handle `error` for the error toast, and `data` for the success toast (synced count, new tokens)
4. Remove the `supabase.auth.getSession()` call since the client handles auth headers automatically

This approach is simpler, more reliable, and follows the project's documented pattern for calling edge functions.

