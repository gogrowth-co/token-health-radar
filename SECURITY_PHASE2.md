# Phase 2: Security Hardening - Implementation Guide

**Status:** ✅ COMPLETED
**Date:** October 30, 2025
**Priority:** 🟠 HIGH

---

## 📋 Overview

Phase 2 implements comprehensive security hardening across all edge functions:
- ✅ **Rate Limiting** - Prevent abuse and DDoS attacks
- ✅ **Input Validation** - Type-safe validation with Zod schemas
- ✅ **Centralized Error Handling** - Consistent error responses
- ✅ **Structured Logging** - Better observability and debugging

---

## 🚀 New Security Infrastructure

### 1. Rate Limiting (`_shared/rateLimit.ts`)

**Features:**
- Distributed rate limiting using Upstash Redis
- Token bucket algorithm for flexible limits
- Automatic fail-open if Redis is unavailable
- Per-user and per-IP rate limiting
- Standardized rate limit headers

**Predefined Limits:**
```typescript
RateLimits.STRICT          // 5 requests/hour
RateLimits.AUTHENTICATED   // 100 requests/hour
RateLimits.ANONYMOUS       // 10 requests/hour
RateLimits.TOKEN_SCAN      // 3 requests/hour
RateLimits.ADMIN           // 1000 requests/hour
RateLimits.WEBHOOK         // 100 requests/minute
```

**Usage Example:**
```typescript
import { checkRateLimit, getClientIdentifier } from '../_shared/rateLimit.ts';

const identifier = getClientIdentifier(req, userId);
const result = await checkRateLimit({
  maxRequests: 10,
  windowSeconds: 3600,
  identifier,
  namespace: 'token-scan',
});

if (!result.allowed) {
  return createRateLimitError(result, corsHeaders);
}
```

---

### 2. Input Validation (`_shared/validation.ts`)

**Features:**
- Type-safe validation with Zod
- Pre-built schemas for common inputs
- Automatic error formatting
- Input sanitization for XSS prevention

**Available Schemas:**
```typescript
// Address validation
ethereumAddressSchema    // 0x + 40 hex chars
solanaAddressSchema      // Base58, 32-44 chars
tokenAddressSchema       // Either Ethereum or Solana

// Chain validation
chainIdSchema            // Hex format (0x1, 0x89, etc.)
supportedChainIdSchema   // Only supported chains

// Common types
uuidSchema               // UUID v4
emailSchema              // Valid email
urlSchema                // Valid URL

// Request schemas
tokenScanRequestSchema
tokenReportRequestSchema
apiHealthCheckSchema
searchQuerySchema
paginationSchema
```

**Usage Example:**
```typescript
import { validate, tokenScanRequestSchema } from '../_shared/validation.ts';

const body = await req.json();
const validatedData = validate(tokenScanRequestSchema, body);
// validatedData is now type-safe!
```

---

### 3. Error Handling (`_shared/errorHandler.ts`)

**Features:**
- Centralized error management
- Prevents leaking sensitive information
- Structured error logging
- Request ID tracking
- Standardized error responses

**Error Types:**
```typescript
ErrorCode.UNAUTHORIZED          // 401
ErrorCode.FORBIDDEN            // 403
ErrorCode.VALIDATION_ERROR     // 400
ErrorCode.RATE_LIMIT_EXCEEDED  // 429
ErrorCode.NOT_FOUND            // 404
ErrorCode.EXTERNAL_API_ERROR   // 502
ErrorCode.DATABASE_ERROR       // 500
ErrorCode.INTERNAL_ERROR       // 500
```

**Usage Example:**
```typescript
import { Errors, createErrorResponse } from '../_shared/errorHandler.ts';

// Throw predefined errors
throw Errors.unauthorized('Invalid credentials');
throw Errors.validationError('Invalid input', { field: 'email' });
throw Errors.notFound('Token');

// Or create custom errors
throw new ApplicationError(
  ErrorCode.CUSTOM,
  'User-friendly message',
  400,
  { details: 'optional' },
  'Internal debugging message'
);
```

---

### 4. Secure Handler Wrapper (`_shared/secureHandler.ts`)

**Features:**
- Automatic rate limiting
- Authentication/authorization checks
- Error handling
- Request logging
- CORS handling

**Usage Example:**
```typescript
import { createSecureHandler, CommonRateLimits } from '../_shared/secureHandler.ts';

async function myHandler(req: Request, context: RequestContext) {
  // Access user info from context
  const { userId, isAdmin, requestId } = context;

  // Your logic here
  return successResponse({ data: 'success' });
}

const handler = createSecureHandler(myHandler, {
  functionName: 'my-function',
  requireAuth: true,           // Requires authentication
  requireAdmin: false,          // Doesn't require admin
  rateLimit: CommonRateLimits.authenticatedApi,
});

Deno.serve(handler);
```

---

## 🔧 Setup Instructions

### 1. Set Up Upstash Redis

**Step 1:** Create Upstash Account
```bash
# Visit https://console.upstash.com
# Create a new Redis database (free tier available)
```

**Step 2:** Get Credentials
```bash
# From Upstash Console, copy:
# - REST URL
# - REST Token
```

**Step 3:** Set Environment Variables
```bash
# Via Supabase CLI
supabase secrets set UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
supabase secrets set UPSTASH_REDIS_REST_TOKEN=your_token_here

# Or via Supabase Dashboard:
# Project Settings > Edge Functions > Add Secret
```

**Step 4:** Verify Setup
```bash
# Test rate limiting endpoint
curl -X POST https://your-project.supabase.co/functions/v1/your-function \
  -H "Authorization: Bearer $TOKEN" \
  -v # Look for X-RateLimit-* headers
```

---

### 2. Deploy Updated Functions

**Deploy Shared Utilities:**
```bash
# Deploy all functions to get the new shared utilities
supabase functions deploy
```

**Verify Deployment:**
```bash
# Check function logs
supabase functions logs your-function --tail

# Should see logs like:
# [RATE-LIMIT] token-scan:user:xyz - 1/3 (ALLOWED)
# [your-function-abc123] Request started
```

---

## 📊 Migration Guide

### Updating Existing Functions

**Before (Old Pattern):**
```typescript
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    // Handle request
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
```

**After (New Pattern):**
```typescript
import { createSecureHandler, successResponse, CommonRateLimits } from '../_shared/secureHandler.ts';
import { validate, yourSchema } from '../_shared/validation.ts';
import { Errors } from '../_shared/errorHandler.ts';

async function handleRequest(req: Request, context: RequestContext) {
  // Validate input
  const body = await req.json();
  const validatedData = validate(yourSchema, body);

  // Your logic here
  const result = await processRequest(validatedData);

  // Return success
  return successResponse(result);
}

const handler = createSecureHandler(handleRequest, {
  functionName: 'your-function',
  requireAuth: true,
  rateLimit: CommonRateLimits.authenticatedApi,
});

Deno.serve(handler);
```

---

### Priority Functions to Update

**Critical (Update First):**
1. ✅ `check-scan-access-v2` - COMPLETED (example implementation)
2. `run-token-scan` - High traffic, needs rate limiting
3. `generate-token-report` - Expensive operation
4. `moralis-token-search` - Public search endpoint

**High Priority:**
5. `create-checkout` - Payment endpoint
6. `customer-portal` - User data endpoint
7. `mcp-chat` - AI endpoint
8. `weekly-token-refresh` - Automated task

**Medium Priority:**
9. All webhook handlers
10. Admin panel endpoints
11. Remaining public endpoints

---

## 🎯 Testing

### Test Rate Limiting

```bash
#!/bin/bash
# test-rate-limit.sh

# Make multiple requests quickly
for i in {1..15}; do
  echo "Request $i"
  curl -X POST https://your-project.supabase.co/functions/v1/your-function \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"test": true}' \
    -i | grep -E "HTTP|X-RateLimit"
  sleep 1
done
```

**Expected Output:**
```
Request 1: HTTP/2 200
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
...
Request 101: HTTP/2 429
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
Retry-After: 3540
```

---

### Test Input Validation

```bash
# Valid request
curl -X POST https://your-project.supabase.co/functions/v1/run-token-scan \
  -H "Content-Type: application/json" \
  -d '{
    "token_address": "0x808507121b80c02388fad14726482e061b8da827",
    "chain_id": "0x1"
  }'
# Should succeed

# Invalid address
curl -X POST https://your-project.supabase.co/functions/v1/run-token-scan \
  -H "Content-Type: application/json" \
  -d '{
    "token_address": "invalid",
    "chain_id": "0x1"
  }'
# Should return:
# {
#   "error": "Validation Error",
#   "code": "VALIDATION_ERROR",
#   "details": {
#     "errors": [{
#       "path": "token_address",
#       "message": "Invalid token address format"
#     }]
#   }
# }
```

---

### Test Error Handling

```bash
# Trigger an error
curl -X POST https://your-project.supabase.co/functions/v1/your-function \
  -H "Authorization: Bearer invalid_token"

# Should return:
# {
#   "error": "ApplicationError",
#   "code": "INVALID_TOKEN",
#   "message": "Invalid or expired authentication token",
#   "timestamp": "2025-10-30T12:00:00.000Z",
#   "requestId": "abc123-def456"
# }
```

---

## 📈 Monitoring & Observability

### Key Metrics to Monitor

**Rate Limiting:**
```bash
# Check Redis for rate limit stats
curl https://your-redis.upstash.io/keys/ratelimit:*
```

**Error Rates:**
```typescript
// Log aggregation queries
// Count errors by type
SELECT code, COUNT(*) FROM logs
WHERE message LIKE '%ERROR%'
GROUP BY code;
```

**Response Times:**
```bash
# Check function logs
supabase functions logs your-function | grep "duration"
```

---

### Setting Up Alerts

**Upstash Dashboard:**
- Set up alerts for high memory usage
- Monitor command count
- Track latency spikes

**Supabase Dashboard:**
- Monitor function invocation counts
- Track error rates
- Set up log alerts

---

## 🔐 Security Best Practices

### 1. Rate Limit Configuration

**Public Endpoints:**
```typescript
rateLimit: {
  maxRequests: 10,      // Low limit
  windowSeconds: 3600,  // Per hour
  namespace: 'public'
}
```

**Authenticated Endpoints:**
```typescript
rateLimit: {
  maxRequests: 100,     // Higher limit
  windowSeconds: 3600,
  namespace: 'auth'
}
```

**Expensive Operations:**
```typescript
rateLimit: {
  maxRequests: 5,       // Very low
  windowSeconds: 3600,
  namespace: 'expensive'
}
```

---

### 2. Input Validation Rules

**Always Validate:**
- ✅ User input (from request body)
- ✅ Query parameters
- ✅ Headers (when used for logic)
- ✅ File uploads
- ✅ External API responses

**Never Trust:**
- ❌ Client-side validation alone
- ❌ Data from external sources
- ❌ Previously validated data after transformation

---

### 3. Error Messages

**Good (Safe):**
```typescript
"Invalid email address"
"Resource not found"
"Unauthorized access"
```

**Bad (Unsafe):**
```typescript
"Database query failed: SELECT * FROM users WHERE email = 'user@email.com'"
"API key XYZ123 is invalid"
"Error: Cannot connect to internal service at 10.0.0.5"
```

---

## 🚨 Troubleshooting

### Rate Limiting Not Working

**Issue:** Requests not being rate limited

**Solutions:**
```bash
# 1. Check Upstash credentials
supabase secrets list | grep UPSTASH

# 2. Verify Redis connection
curl $UPSTASH_REDIS_REST_URL/ping \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# 3. Check function logs
supabase functions logs your-function | grep RATE-LIMIT
```

---

### Validation Errors

**Issue:** Valid data being rejected

**Solutions:**
1. Check schema definition
2. Verify input format
3. Check for whitespace or encoding issues
4. Review Zod error messages

```typescript
// Enable detailed validation logging
const result = schema.safeParse(data);
if (!result.success) {
  console.log('Validation errors:', result.error.errors);
}
```

---

### High Error Rates

**Issue:** Sudden increase in errors

**Checklist:**
- [ ] Check external API status
- [ ] Verify database connectivity
- [ ] Review recent deployments
- [ ] Check rate limit settings
- [ ] Examine error logs for patterns

---

## 📚 Additional Resources

### Documentation
- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [Zod Documentation](https://zod.dev)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Code Examples
- See `check-scan-access-v2/index.ts` for complete example
- Review `_shared/` directory for utilities
- Check `SECURITY.md` for Phase 1 details

---

## ✅ Completion Checklist

**Infrastructure:**
- [x] Rate limiting utility created
- [x] Input validation framework created
- [x] Error handling utilities created
- [x] Secure handler wrapper created
- [x] Example implementation completed

**Setup:**
- [ ] Upstash Redis configured
- [ ] Environment variables set
- [ ] Functions deployed
- [ ] Rate limits tested
- [ ] Validation tested

**Migration:**
- [ ] Priority functions updated
- [ ] All public endpoints secured
- [ ] All admin endpoints secured
- [ ] Documentation updated
- [ ] Team trained

---

## 🎯 Next Steps

**Immediate:**
1. Set up Upstash Redis account
2. Configure environment variables
3. Deploy updated functions
4. Test rate limiting

**Short Term (1-2 weeks):**
1. Update all high-priority functions
2. Monitor error rates and adjust limits
3. Set up alerting
4. Create migration runbook

**Long Term (1 month):**
1. Complete Phase 3 (Monitoring & Audit)
2. Implement MFA (Phase 4)
3. Regular security reviews
4. Performance optimization

---

**Remember:** Security is a continuous process. Regularly review and update these measures as threats evolve.
