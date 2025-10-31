# Phase 2 Implementation - Setup Guide

This guide covers the setup and configuration required to enable all Phase 2 security features.

## ✅ Already Implemented

Phase 2 infrastructure is **90% complete**. The following are fully implemented:

- ✅ Rate limiting infrastructure (needs Upstash credentials)
- ✅ Input validation framework with Zod
- ✅ Centralized error handling
- ✅ Parallel API call handling (Promise.all/allSettled)
- ✅ CORS handling
- ✅ Secure handler wrapper pattern

## 🔧 Configuration Required

### 1. Sentry Error Tracking

Sentry is now configured for both frontend and edge functions. You need to set up the following environment variables:

#### Frontend Environment Variables (.env)

Add these to your Vercel project environment variables or local `.env` file:

```bash
VITE_SENTRY_DSN=your_frontend_sentry_dsn_here
VITE_SENTRY_RELEASE=1.0.0
```

#### Edge Functions Environment Variables (Supabase)

Add these to your Supabase Edge Functions secrets:

```bash
SENTRY_DSN=your_backend_sentry_dsn_here
SENTRY_ENVIRONMENT=production
```

**How to get Sentry DSN:**

1. Create account at https://sentry.io
2. Create new project (select "React" for frontend, "Deno" for backend)
3. Copy the DSN from project settings
4. Add to your environment variables

**Frontend Configuration:** `src/main.tsx:8-35`
**Backend Configuration:** `supabase/functions/_shared/errorHandler.ts:36-95`

### 2. Upstash Redis (for Rate Limiting)

Rate limiting is implemented but requires Upstash Redis credentials.

#### Setup Steps:

1. **Create Upstash Account**
   - Go to https://upstash.com
   - Sign up for free account (includes 10,000 commands/day free)

2. **Create Redis Database**
   - Click "Create Database"
   - Choose a region close to your Supabase region
   - Select "Regional" for better latency
   - Click "Create"

3. **Get Credentials**
   - Navigate to your database dashboard
   - Find "REST API" section
   - Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

4. **Add to Supabase Edge Functions**

   Using Supabase CLI:
   ```bash
   supabase secrets set UPSTASH_REDIS_REST_URL="https://your-db.upstash.io"
   supabase secrets set UPSTASH_REDIS_REST_TOKEN="your_token_here"
   ```

   Or via Supabase Dashboard:
   - Go to Project Settings > Edge Functions > Secrets
   - Add both variables

#### Test Rate Limiting

After configuring Upstash, test the rate limiting:

```bash
# Test the reference implementation
curl -X POST https://your-project.supabase.co/functions/v1/check-scan-access-v2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Make multiple rapid requests to test rate limiting
for i in {1..10}; do
  curl -X POST https://your-project.supabase.co/functions/v1/check-scan-access-v2 \
    -H "Authorization: Bearer YOUR_JWT_TOKEN" \
    -H "Content-Type: application/json"
done
```

Expected response when rate limited:
```json
{
  "error": "ApplicationError",
  "code": "RATE_LIMIT_EXCEEDED",
  "message": "Rate limit exceeded. Please try again in 3600 seconds.",
  "timestamp": "2025-10-31T12:00:00.000Z",
  "requestId": "uuid-here"
}
```

### 3. Rate Limit Configurations

Available rate limit presets in `supabase/functions/_shared/rateLimit.ts:168-177`:

| Preset | Requests | Window | Use Case |
|--------|----------|--------|----------|
| `STRICT` | 5 | 1 hour | High-cost operations |
| `AUTHENTICATED` | 100 | 1 hour | Logged-in users |
| `ANONYMOUS` | 10 | 1 hour | Public endpoints |
| `TOKEN_SCAN` | 3 | 1 hour | Token scanning |
| `ADMIN` | 1000 | 1 hour | Admin operations |
| `WEBHOOK` | 100 | 1 minute | Webhook handlers |

## 📋 Migration Checklist

### High-Priority Endpoints (Needs Secure Handler)

These endpoints handle sensitive operations and should be migrated first:

- [ ] `create-checkout` - Payment processing (CRITICAL)
- [ ] `stripe-webhook` - Payment webhooks (CRITICAL)
- [ ] `run-token-scan` - High traffic endpoint
- [ ] `generate-token-report` - Expensive operation
- [ ] `moralis-token-search` - Public search endpoint

### Medium-Priority Endpoints

- [ ] `admin/*` - Admin operations
- [ ] `generate-hero-image` - Resource intensive
- [ ] `compose-hero` - Resource intensive

### Already Migrated

- ✅ `check-scan-access-v2` - Reference implementation

## 🔨 How to Apply Secure Handler Pattern

### Example: Migrating an Endpoint

**Before:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Business logic here
    const { data } = await req.json();

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
```

**After:**
```typescript
import { createSecureHandler, RequestContext } from '../_shared/secureHandler.ts';
import { RateLimits } from '../_shared/rateLimit.ts';
import { successResponse } from '../_shared/responses.ts';
import { parseJsonBody } from '../_shared/errorHandler.ts';
import { validate } from '../_shared/validation.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

// Define input schema
const requestSchema = z.object({
  data: z.string(),
});

// Business logic handler
async function handleRequest(req: Request, context: RequestContext) {
  const { userId, isAdmin, requestId } = context;

  const body = await parseJsonBody(req);
  const validatedData = validate(requestSchema, body);

  // Your business logic here

  return successResponse({ success: true }, requestId);
}

// Create secure handler with configuration
export default createSecureHandler(handleRequest, {
  functionName: 'your-function-name',
  requireAuth: true, // Require authentication
  rateLimit: RateLimits.AUTHENTICATED, // Apply rate limiting
});
```

### Key Benefits:

1. **Automatic authentication** - `userId` and `isAdmin` provided in context
2. **Rate limiting** - Applied automatically based on configuration
3. **Error handling** - Centralized with Sentry integration
4. **CORS handling** - Automatic with secure defaults
5. **Request ID tracking** - Automatic for tracing
6. **Input validation** - Type-safe with Zod

## 🔍 Verification Steps

### 1. Verify Sentry Integration

**Frontend:**
```javascript
// In browser console
throw new Error('Test error');
// Should appear in Sentry dashboard
```

**Backend:**
```bash
# Trigger an error in an edge function
curl -X POST https://your-project.supabase.co/functions/v1/some-function \
  -H "Content-Type: application/json" \
  -d '{"invalid": "data"}'
# Check Sentry dashboard for error
```

### 2. Verify Rate Limiting

```bash
# Run rapid requests
for i in {1..20}; do
  curl -X POST https://your-project.supabase.co/functions/v1/check-scan-access-v2 \
    -H "Authorization: Bearer YOUR_JWT_TOKEN"
  echo "Request $i"
done
# Should see 429 status after limit reached
```

### 3. Verify Input Validation

```bash
# Send invalid data
curl -X POST https://your-project.supabase.co/functions/v1/check-scan-access-v2 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"invalid": "schema"}'
# Should return 400 with validation error
```

### 4. Verify Centralized Error Handling

Check logs for structured error format:
```
[ERROR] 2025-10-31T12:00:00.000Z - VALIDATION_ERROR: {
  message: "Invalid input",
  statusCode: 400,
  details: {...},
  requestId: "uuid-here"
}
```

## 📊 Monitoring

After setup, monitor:

1. **Sentry Dashboard**
   - Error frequency and types
   - Performance metrics
   - User impact

2. **Upstash Dashboard**
   - Rate limit hits
   - Redis command usage
   - Response times

3. **Supabase Logs**
   - Edge function logs
   - Error patterns
   - Request volumes

## 🚨 Troubleshooting

### Rate Limiting Not Working

1. Check Upstash credentials are set
2. Verify function is using `createSecureHandler`
3. Check Upstash dashboard for connection errors
4. Review logs for `[RATE-LIMIT]` prefix

### Sentry Not Receiving Errors

1. Verify DSN is correct
2. Check environment mode (only production by default)
3. Ensure error is actually thrown
4. Check Sentry project quotas

### Validation Errors Not Clear

1. Check Zod schema definition
2. Review error details in response
3. Enable development mode for full stack traces

## 📚 Reference Files

- **Rate Limiting**: `supabase/functions/_shared/rateLimit.ts`
- **Validation**: `supabase/functions/_shared/validation.ts`
- **Error Handling**: `supabase/functions/_shared/errorHandler.ts`
- **Secure Handler**: `supabase/functions/_shared/secureHandler.ts`
- **Reference Implementation**: `supabase/functions/check-scan-access-v2/index.ts`
- **Frontend Sentry**: `src/main.tsx:8-35`
- **Error Boundary**: `src/components/ErrorBoundary.tsx:33-49`

## 🎯 Next Steps

1. **Immediate** (Today):
   - Set up Sentry projects (30 mins)
   - Configure Upstash Redis (15 mins)
   - Test reference implementation (15 mins)

2. **Short Term** (This Week):
   - Migrate `create-checkout` endpoint (2 hours)
   - Migrate `stripe-webhook` endpoint (2 hours)
   - Migrate `run-token-scan` endpoint (3 hours)

3. **Medium Term** (This Month):
   - Migrate remaining high-priority endpoints
   - Set up Sentry alerts
   - Create monitoring dashboard

4. **Long Term**:
   - Phase 3: Advanced Monitoring & Audit Logging
   - Phase 4: MFA, CSP, Security Scanning
   - Regular security audits

## 💡 Best Practices

1. **Always validate input** - Use Zod schemas for all user input
2. **Use appropriate rate limits** - Match rate limit to endpoint cost
3. **Log with context** - Include request ID in all logs
4. **Test error scenarios** - Ensure errors are handled gracefully
5. **Monitor regularly** - Check Sentry and Upstash dashboards weekly
6. **Keep secrets secure** - Never commit credentials to git

## 📞 Support

If you encounter issues:

1. Check logs in Supabase Dashboard
2. Review Sentry error details
3. Check Upstash connection status
4. Review this documentation
5. Consult SECURITY_PHASE2.md for detailed implementation guide
