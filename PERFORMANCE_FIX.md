# Performance Fix for run-token-scan Timeout

## Issue
The `run-token-scan` edge function is timing out after 50 seconds because it makes too many sequential API calls.

**Error:**
```
Edge function returned 408: Error
"Scan timeout - the operation took too long to complete"
timeout_ms: 50000
processing_time_ms: 50006
```

## Root Cause Analysis

### Current Problems:
1. **Sequential API calls** (lines 1388-1641): Social media and description fetching happens one after another
2. **No individual timeouts**: Each API call can hang indefinitely
3. **No graceful degradation**: All data is treated as required
4. **Slow fallback calls**: CoinMarketCap fallback calls add significant time

### Performance Breakdown:
```
Phase 1: Core APIs (parallel) ~5-10s ✅ Good
Phase 2: Enhanced APIs (parallel) ~5-10s ✅ Good
Phase 3: Social links (sequential) ~20-30s ❌ Problem
Phase 4: Descriptions (sequential) ~10-15s ❌ Problem
Total: 40-65s ⚠️ Exceeds 50s timeout
```

## Solution

### Short-term Fix (Immediate)
Add timeouts and parallelize optional API calls

### Files Created:
1. `_shared/performance.ts` - Performance utilities ✅
2. This guide - Implementation instructions

---

## Implementation Steps

### Step 1: Add Performance Utilities to run-token-scan

Add this import at the top of `run-token-scan/index.ts`:

```typescript
import {
  safeApiCall,
  parallelWithTimeouts,
  PerformanceTracker
} from '../_shared/performance.ts';
```

### Step 2: Wrap External API Calls with Timeouts

Find the social media fetching section (around line 1388-1580) and replace with:

```typescript
// OLD CODE (Sequential):
const cmcWebsiteUrl = await fetchCoinMarketCapWebsiteUrl(tokenAddress, chainId);
const cmcTwitterHandle = await fetchCoinMarketCapTwitterHandle(tokenAddress, chainId);
const cmcGithubUrl = await fetchCoinMarketCapGithubUrl(tokenAddress, chainId);
//... etc

// NEW CODE (Parallel with timeouts):
console.log(`[SCAN] Fetching social links in parallel...`);
const [
  cmcWebsiteUrl,
  cmcTwitterHandle,
  cmcGithubUrl,
  cmcDiscordUrl,
  cmcTelegramUrl
] = await parallelWithTimeouts([
  {
    call: () => fetchCoinMarketCapWebsiteUrl(tokenAddress, chainId),
    name: 'CMC Website',
    timeoutMs: 5000,
    fallback: ''
  },
  {
    call: () => fetchCoinMarketCapTwitterHandle(tokenAddress, chainId),
    name: 'CMC Twitter',
    timeoutMs: 5000,
    fallback: ''
  },
  {
    call: () => fetchCoinMarketCapGithubUrl(tokenAddress, chainId),
    name: 'CMC GitHub',
    timeoutMs: 5000,
    fallback: ''
  },
  {
    call: () => fetchCoinMarketCapDiscordUrl(tokenAddress, chainId),
    name: 'CMC Discord',
    timeoutMs: 5000,
    fallback: ''
  },
  {
    call: () => fetchCoinMarketCapTelegramUrl(tokenAddress, chainId),
    name: 'CMC Telegram',
    timeoutMs: 5000,
    fallback: ''
  }
]);
```

### Step 3: Parallelize Social Media Metrics

Replace the social media fetching (around line 1528-1575) with:

```typescript
// OLD CODE (Sequential):
const followerCount = await fetchTwitterFollowers(twitter_handle);
const memberCount = await fetchDiscordMemberCount(discord_url);
telegramData = await fetchTelegramMembers(telegram_url);

// NEW CODE (Parallel with timeouts):
console.log(`[SCAN] Fetching social metrics in parallel...`);
const [followerCount, discordMemberCount, telegramData] = await parallelWithTimeouts([
  {
    call: () => fetchTwitterFollowers(twitter_handle),
    name: 'Twitter Followers',
    timeoutMs: 8000,
    fallback: 0
  },
  {
    call: () => fetchDiscordMemberCount(discord_url),
    name: 'Discord Members',
    timeoutMs: 8000,
    fallback: 0
  },
  {
    call: () => fetchTelegramMembers(telegram_url),
    name: 'Telegram Members',
    timeoutMs: 8000,
    fallback: { members: 0, growth_7d: 0 }
  }
]);

const memberCount = discordMemberCount || 0;
```

### Step 4: Parallelize Description Fetching

Replace description fetching (around line 1611-1660) with:

```typescript
// OLD CODE (Sequential):
const cmcDescription = await fetchCoinMarketCapDescription(tokenAddress);
const siteDesc = await fetchWebsiteMetaDescription(website_url);
const cgDesc = await fetchCoinGeckoDescription(tokenAddress, chainId);

// NEW CODE (Parallel with timeouts):
console.log(`[SCAN] Fetching descriptions in parallel...`);
const [cmcDescription, siteDesc, cgDesc] = await parallelWithTimeouts([
  {
    call: () => fetchCoinMarketCapDescription(tokenAddress),
    name: 'CMC Description',
    timeoutMs: 5000,
    fallback: ''
  },
  {
    call: () => website_url ? fetchWebsiteMetaDescription(website_url) : Promise.resolve(''),
    name: 'Website Description',
    timeoutMs: 5000,
    fallback: ''
  },
  {
    call: () => fetchCoinGeckoDescription(tokenAddress, chainId),
    name: 'CoinGecko Description',
    timeoutMs: 5000,
    fallback: ''
  }
]);
```

### Step 5: Add Performance Tracking

Add at the start of `fetchTokenDataFromAPIs` function (after line 1062):

```typescript
const perfTracker = new PerformanceTracker(`Token Scan: ${tokenAddress}`);
```

Add checkpoints throughout:

```typescript
// After Phase 1
perfTracker.checkpoint('Phase 1: Core APIs');

// After Phase 2
perfTracker.checkpoint('Phase 2: Enhanced APIs');

// After social links
perfTracker.checkpoint('Social Links Extraction');

// After social metrics
perfTracker.checkpoint('Social Metrics');

// After descriptions
perfTracker.checkpoint('Descriptions');

// At the end of the function
perfTracker.finish();
```

### Step 6: Increase Edge Function Timeout (Optional)

In `supabase/functions/run-token-scan/index.ts`, if you're still hitting timeouts, consider:

**Option A:** Make some data optional and skip if slow
```typescript
// Skip expensive operations if running out of time
const REMAINING_TIME_THRESHOLD = 5000; // 5 seconds
const elapsed = Date.now() - scanStartTime;

if (elapsed > 45000) { // 45 seconds elapsed
  console.warn('[SCAN] Approaching timeout, skipping optional data');
  // Skip description fetching, use defaults
}
```

**Option B:** Reduce individual API timeouts
```typescript
// Reduce from 8000ms to 3000ms for social metrics
timeoutMs: 3000
```

---

## Expected Performance Improvement

### Before:
```
Core APIs (parallel): 10s
Social Links (sequential 5 calls): 15-25s
Social Metrics (sequential 3 calls): 15-20s
Descriptions (sequential 3 calls): 10-15s
Total: 50-70s ❌ Timeout
```

### After:
```
Core APIs (parallel): 10s
Social Links (parallel 5 calls, 5s timeout): 5-6s
Social Metrics (parallel 3 calls, 8s timeout): 8-9s
Descriptions (parallel 3 calls, 5s timeout): 5-6s
Total: 28-31s ✅ Under 50s limit
```

**Improvement: ~40% faster, reliable completion**

---

## Testing

### Test the Performance Fix:

```bash
# Test with a token
curl -X POST https://your-project.supabase.co/functions/v1/run-token-scan \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "token_address": "0x808507121b80c02388fad14726482e061b8da827",
    "chain_id": "0x1",
    "force_refresh": true
  }' \
  -v

# Check logs for performance metrics
supabase functions logs run-token-scan --tail
```

Look for logs like:
```
[PERF-CHECKPOINT] Token Scan - Phase 1: 8523ms
[PERF-CHECKPOINT] Token Scan - Social Links: 5234ms
[PERF-SUMMARY] Top 3 slowest operations:
```

---

## Alternative Solutions

### Option 1: Async Background Processing
Move slow operations (social metrics, descriptions) to background jobs:
- Store initial scan with basic data
- Update record asynchronously with social data
- Pros: Fast initial response
- Cons: More complex implementation

### Option 2: Caching Layer
Cache API responses for common tokens:
- Cache CMC, CoinGecko responses for 1 hour
- Cache social metrics for 24 hours
- Pros: Significantly faster for popular tokens
- Cons: Requires cache infrastructure (Redis)

### Option 3: Selective Data Fetching
Make expensive operations opt-in:
```typescript
{
  "include_social_metrics": false,  // Skip if not needed
  "include_descriptions": false      // Skip if not needed
}
```

---

## Monitoring

After deploying the fix, monitor these metrics:

1. **Function Duration**: Should be < 35s average
2. **Timeout Rate**: Should be < 1%
3. **API Failure Rate**: Individual APIs may fail, but scan completes
4. **User Experience**: Scans complete successfully

### Alerting:
```typescript
// Add to function
if (totalDuration > 40000) {
  console.error('[ALERT] Scan approaching timeout threshold');
  // Send to monitoring service
}
```

---

## Rollback Plan

If issues occur:
1. Revert the parallel changes
2. Keep individual timeouts
3. Increase overall function timeout to 60s
4. Investigate specific slow APIs

---

## Next Steps

1. ✅ Create performance utilities (`_shared/performance.ts`)
2. ⏳ Apply changes to `run-token-scan/index.ts`
3. ⏳ Test with real tokens
4. ⏳ Monitor performance metrics
5. ⏳ Optimize further if needed

**Status**: Performance utilities created, ready for implementation
**Priority**: 🔴 HIGH - Blocking production use
**Estimated Time**: 1-2 hours to implement and test
