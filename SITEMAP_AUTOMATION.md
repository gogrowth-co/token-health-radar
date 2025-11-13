# Token Report & Sitemap Automation Flow

This document describes how token reports are created and how the sitemap is automatically updated.

## Token Report Creation Entry Points

There are **2 ways** a token report can be created:

### 1. Manual Creation (Admin/User Initiated)
**Trigger:** Admin or authorized user manually requests a token report
**Function:** `generate-token-report`
**Flow:**
```
User Request
  ↓
generate-token-report function
  ↓
1. Fetch cached analysis data (6 cache tables)
2. Calculate overall score
3. Generate report with GPT-4o-mini
4. Parse & validate JSON response
5. Upsert to token_reports table ✅
  ↓
6. Trigger sitemap regeneration ✅ (lines 422-439)
  ↓
7. Generate score snapshot (async, non-blocking)
  ↓
Response returned to user
```

**Sitemap Update:** ✅ **Automatic** (implemented at line 422-439)

---

### 2. Weekly Automated Creation (Scheduled)
**Trigger:** Cron job every Monday at 8 AM UTC
**Function:** `weekly-token-refresh`
**Flow:**
```
Monday 8 AM UTC (Cron)
  ↓
weekly-token-refresh function
  ↓
For each token:
  1. Run token scan (3-second delay between tokens)
  2. Update 6 cache tables with latest data
  ↓
For each token:
  3. Regenerate report via generate-token-report ✅ (lines 99-142)
  4. Upsert to token_reports table
  5. (5-second delay between reports)
  ↓
6. Trigger sitemap regeneration ✅ (lines 145-152)
  ↓
Summary returned
```

**Sitemap Update:** ✅ **Automatic** (implemented at lines 145-152)

---

## Sitemap Generation Function

**Function:** `generate-sitemap`
**Purpose:** Regenerates the entire sitemap with all token report URLs

**Triggered By:**
1. Manual token report creation (`generate-token-report`)
2. Weekly automated refresh (`weekly-token-refresh`)
3. Manual API calls (admin/authorized)

**Implementation:**
```typescript
// In generate-token-report (line 427)
await supabase.functions.invoke('generate-sitemap', {
  body: {}
});

// In weekly-token-refresh (line 147)
await supabase.functions.invoke('generate-sitemap', {
  body: {
    trigger_source: 'weekly_refresh',
    timestamp: new Date().toISOString(),
  }
});
```

---

## Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Token Report Creation                      │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
            Manual Creation      Weekly Refresh (Cron)
                    │                   │
                    ↓                   ↓
        ┌───────────────────┐  ┌────────────────────┐
        │ generate-token-   │  │ weekly-token-      │
        │ report function   │  │ refresh function   │
        └───────────────────┘  └────────────────────┘
                    │                   │
                    │                   ↓
                    │          ┌─────────────────┐
                    │          │ Scan all tokens │
                    │          │ (update cache)  │
                    │          └─────────────────┘
                    │                   │
                    │                   ↓
                    │          ┌──────────────────────┐
                    │          │ For each token:      │
                    │          │ Call generate-token- │
                    │          │ report (fetch)       │
                    │          └──────────────────────┘
                    │                   │
                    └───────────────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │ Fetch cached data  │
                    │ from 6 tables      │
                    └────────────────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │ Generate report    │
                    │ with GPT-4o-mini   │
                    └────────────────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │ Upsert to          │
                    │ token_reports      │
                    │ (NEW or UPDATE)    │
                    └────────────────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │ ✅ Trigger sitemap │
                    │ regeneration       │
                    │ (automatic)        │
                    └────────────────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │ generate-sitemap   │
                    │ function           │
                    └────────────────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │ Query all token    │
                    │ reports from DB    │
                    └────────────────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │ Generate XML       │
                    │ sitemap with all   │
                    │ /token/{symbol}    │
                    │ URLs               │
                    └────────────────────┘
                              │
                              ↓
                    ┌────────────────────┐
                    │ Save to storage    │
                    │ /sitemap.xml       │
                    └────────────────────┘
                              │
                              ↓
                    ✅ Sitemap Updated!
```

---

## Key Benefits

### 1. **Automatic Sitemap Updates**
- **New token added manually:** Sitemap updates immediately ✅
- **New token added in weekly refresh:** Sitemap updates after all tokens processed ✅
- **Token report updated:** Sitemap regenerated (URLs don't change, but lastmod updated) ✅

### 2. **SEO Optimized**
- Search engines always have the latest sitemap
- New token pages are discoverable immediately
- No manual intervention required

### 3. **Failure Handling**
- Sitemap generation errors don't block report creation
- Errors are logged but don't fail the main operation
- Robust error handling with try-catch blocks

---

## Code Locations

| Component | File | Lines |
|-----------|------|-------|
| Manual report creation | `supabase/functions/generate-token-report/index.ts` | 394-407 (upsert) |
| Manual sitemap trigger | `supabase/functions/generate-token-report/index.ts` | 422-439 |
| Weekly refresh (scan) | `supabase/functions/weekly-token-refresh/index.ts` | 58-97 |
| Weekly refresh (reports) | `supabase/functions/weekly-token-refresh/index.ts` | 99-142 |
| Weekly sitemap trigger | `supabase/functions/weekly-token-refresh/index.ts` | 145-157 |
| Sitemap generation | `supabase/functions/generate-sitemap/index.ts` | Full file |

---

## Testing the Flow

### Test Manual Creation
```bash
# 1. Create a new token report (requires admin auth)
curl -X POST "https://your-project.supabase.co/functions/v1/generate-token-report" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenAddress": "0x...",
    "chainId": "0x1",
    "userId": "user-uuid"
  }'

# 2. Check if sitemap was updated
curl "https://your-domain.com/sitemap.xml" | grep "0x..."
```

### Test Weekly Refresh
```bash
# 1. Manually trigger weekly refresh (requires service role key)
curl -X POST "https://your-project.supabase.co/functions/v1/weekly-token-refresh" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"

# 2. Check logs for sitemap regeneration message
# Look for: "[WEEKLY-REFRESH] Sitemap regeneration triggered successfully"

# 3. Verify sitemap was updated
curl "https://your-domain.com/sitemap.xml"
```

### Monitor Logs
```bash
# Supabase Dashboard → Functions → Logs
# Look for:
# - "✅ generate-sitemap invoked successfully"
# - "[WEEKLY-REFRESH] Sitemap regeneration triggered successfully"
```

---

## Troubleshooting

### Sitemap not updating after new report

**Check:**
1. Function logs for errors in `generate-token-report`
2. Permissions on `generate-sitemap` function
3. Storage permissions for writing sitemap.xml

**Common Issues:**
- Missing service role key
- Function timeout (increase timeout)
- Storage bucket permissions

### Weekly refresh not triggering sitemap

**Check:**
1. Cron job is running (Monday 8 AM UTC)
2. `weekly-token-refresh` function logs
3. Reports were successfully generated

**Fix:**
- Verify cron schedule in Supabase Dashboard
- Check if `reportsRegenerated` > 0 in summary
- Ensure sitemap function is deployed

---

## Maintenance

### No maintenance required! ✅

The flow is fully automated:
- New tokens → Automatic sitemap update
- Weekly refresh → Automatic sitemap update
- No manual intervention needed
- Error handling prevents cascading failures

### Optional Monitoring

Set up alerts for:
- Failed sitemap regeneration (rare)
- Weekly refresh failures
- High error rates in report generation

---

## Summary

✅ **Sitemap automatically updates when:**
1. New token report is created manually
2. Token reports are regenerated weekly
3. Any changes to the token_reports table

✅ **No manual work required:**
- Everything is automated
- Errors are handled gracefully
- Search engines always have the latest sitemap

✅ **SEO optimized:**
- New pages are discoverable immediately
- Sitemap always reflects current state
- Proper lastmod dates for search engines
