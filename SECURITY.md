# Security Documentation - Token Health Radar

**Last Updated:** October 30, 2025
**Status:** Phase 1 ✅ COMPLETED | Phase 2 ✅ COMPLETED

---

## 🔐 Overview

This document outlines the security measures implemented across multiple phases of our security hardening initiative and provides guidelines for maintaining a secure application environment.

**Security Phases:**
- ✅ **Phase 1:** Critical Security Fixes (COMPLETED)
- ✅ **Phase 2:** Security Hardening - Rate Limiting, Validation, Error Handling (COMPLETED)
- 🔄 **Phase 3:** Monitoring & Audit (Planned)
- 🔄 **Phase 4:** Advanced Security - MFA, CSP, Security Scanning (Planned)

---

## ✅ Phase 1: Critical Security Fixes (COMPLETED)

### 1. Service Role Key Exposure - FIXED ✅

**Issue:** Service role key was hardcoded in database migration file
**Location:** `supabase/migrations/20250911161353_c02351cb-ff46-40b9-b13d-f67c7f1821a7.sql:12`
**Severity:** 🔴 CRITICAL

**Fix Applied:**
- Created new migration `/supabase/migrations/20251030000001_fix_exposed_service_role_key.sql`
- Replaced hardcoded key with Supabase Vault integration
- Trigger function now retrieves key from vault at runtime

**Action Required:**
```bash
# Set up the service role key in Supabase Vault
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your_key_here

# Or via Supabase Dashboard:
# 1. Go to Project Settings > Vault
# 2. Create new secret: SUPABASE_SERVICE_ROLE_KEY
# 3. Paste your service role key value
```

**⚠️ IMPORTANT:** Rotate the exposed service role key immediately:
1. Generate new service role key in Supabase Dashboard
2. Update all edge functions with new key
3. Update vault with new key
4. Update CI/CD environment variables
5. Test all functions after rotation

---

### 2. Debug Functions Secured - FIXED ✅

**Issue:** Debug endpoints were publicly accessible without authentication
**Severity:** 🟠 HIGH

**Secured Functions:**
- ✅ `debug-api-health` - Now requires JWT + admin role
- ✅ `debug-airtable` - Now requires JWT + admin role
- ✅ `test-scan` - Requires admin in production (dev mode bypassed)

**How to Access:**
```bash
# Get your JWT token from the auth session
AUTH_TOKEN="your_jwt_token_here"

# Call debug endpoint
curl -X POST https://your-project.supabase.co/functions/v1/debug-api-health \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"testToken": "0x...", "testChain": "0x1"}'
```

**Response for Non-Admin Users:**
```json
{
  "error": "Forbidden - Admin access required",
  "message": "This endpoint is restricted to admin users only."
}
```

---

### 3. Internal API Functions Secured - FIXED ✅

**Issue:** Airtable sync functions had no authentication
**Severity:** 🟠 HIGH

**Secured Functions:**
- ✅ `airtable-sync` - Now requires service role key or internal secret
- ✅ `airtable-full-sync` - Now requires service role key or internal secret

**How to Call:**
```bash
# Option 1: Using service role key
curl -X POST https://your-project.supabase.co/functions/v1/airtable-sync \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"operation": "INSERT", "record": {...}}'

# Option 2: Using internal API secret (recommended)
curl -X POST https://your-project.supabase.co/functions/v1/airtable-sync \
  -H "Authorization: Bearer $INTERNAL_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"operation": "INSERT", "record": {...}}'
```

**Set up internal API secret:**
```bash
# Generate a secure random secret
openssl rand -base64 32

# Set as environment variable
supabase secrets set INTERNAL_API_SECRET=your_generated_secret
```

---

### 4. Stripe Webhook Enhanced Logging - FIXED ✅

**Issue:** Limited audit trail for payment events
**Severity:** 🟡 MEDIUM

**Improvements:**
- ✅ Request ID tracking for all webhook events
- ✅ Signature verification logging
- ✅ Detailed event processing logs
- ✅ Customer/subscription tracking in logs
- ✅ Error logging with context

**Log Format:**
```
[STRIPE-WEBHOOK-{requestId}] Webhook received at {timestamp}
[STRIPE-WEBHOOK-{requestId}] Signature verification successful
[STRIPE-WEBHOOK-{requestId}] Processing webhook event: {eventType}
[STRIPE-WEBHOOK-{requestId}] Event ID: {eventId}
[STRIPE] Processing checkout for email: user@example.com
[STRIPE] Successfully updated subscriber {userId} to plan: pro
```

---

### 5. JWT Verification Configuration - UPDATED ✅

**Config File:** `supabase/config.toml`

**Updated Functions:**
```toml
[functions.debug-api-health]
verify_jwt = true  # Changed from false

[functions.debug-airtable]
verify_jwt = true  # Changed from false

[functions.airtable-sync]
verify_jwt = true  # Changed from false

[functions.airtable-full-sync]
verify_jwt = true  # Changed from false
```

**Note:** `test-scan` remains `verify_jwt = false` but has application-level auth based on `ENVIRONMENT` variable.

---

## 🔒 Security Best Practices

### 1. Authentication & Authorization

**Admin-Only Functions:**
- Always check user role with `get_user_role()` RPC function
- Return 403 Forbidden for non-admin users
- Log unauthorized access attempts

**Example Implementation:**
```typescript
// Verify JWT
const authHeader = req.headers.get('Authorization');
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error } = await supabase.auth.getUser(token);

// Check admin role
const { data: roleData } = await supabase.rpc('get_user_role', {
  _user_id: user.id
});

if (roleData !== 'admin') {
  return new Response(JSON.stringify({
    error: 'Forbidden - Admin access required'
  }), { status: 403 });
}
```

---

### 2. API Key Management

**Never:**
- ❌ Hardcode API keys in source code
- ❌ Commit API keys to version control
- ❌ Share API keys via email or chat
- ❌ Use the same key across environments

**Always:**
- ✅ Store keys in environment variables
- ✅ Use Supabase Vault for sensitive keys
- ✅ Rotate keys regularly (every 90 days)
- ✅ Use different keys for dev/staging/production
- ✅ Monitor API key usage and set up alerts

**Rotating API Keys:**
```bash
# 1. Generate new key from provider
# 2. Set new key in environment
supabase secrets set NEW_API_KEY=new_key_value

# 3. Update application code to use new key
# 4. Test thoroughly

# 5. Revoke old key from provider
# 6. Document rotation in changelog
```

---

### 3. Logging & Monitoring

**What to Log:**
- ✅ Authentication attempts (success and failure)
- ✅ Authorization failures
- ✅ API calls to external services
- ✅ Database operations (create, update, delete)
- ✅ Payment events
- ✅ Admin actions

**What NOT to Log:**
- ❌ Passwords or password hashes
- ❌ Complete JWT tokens
- ❌ API keys or secrets
- ❌ Credit card numbers
- ❌ Personal identification numbers

**Log Format Best Practices:**
```typescript
// Good - Includes context, no sensitive data
console.log(`[FUNCTION-NAME] User ${user.id} accessed resource ${resourceId}`);

// Bad - Exposes sensitive information
console.log(`User token: ${token}, password: ${password}`);
```

---

### 4. Error Handling

**Public Error Messages:**
```typescript
// Good - Generic error
return new Response(JSON.stringify({
  error: 'Internal server error',
  message: 'An unexpected error occurred.'
}), { status: 500 });

// Bad - Exposes internals
return new Response(JSON.stringify({
  error: error.stack,
  dbQuery: 'SELECT * FROM users WHERE...'
}), { status: 500 });
```

**Internal Logging:**
```typescript
// Log detailed errors for debugging
console.error(`[ERROR] Failed to process request:`, {
  error: error.message,
  stack: error.stack,
  userId: user?.id,
  timestamp: new Date().toISOString()
});
```

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] Supabase Vault secrets set up
- [ ] JWT verification enabled for admin functions
- [ ] Stripe webhook secret configured
- [ ] Internal API secret generated and set
- [ ] Test all authenticated endpoints
- [ ] Test all error scenarios
- [ ] Review logs for any exposed secrets
- [ ] Backup database
- [ ] Document any new environment variables

---

## 🔧 Environment Variables

### Required Environment Variables

**Supabase:**
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Stripe:**
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Internal Security:**
```bash
INTERNAL_API_SECRET=your_generated_secret
ENVIRONMENT=production  # or development
```

**Third-Party APIs:**
```bash
MORALIS_API_KEY=your_moralis_key
COINMARKETCAP_API_KEY=your_cmc_key
OPENAI_API_KEY=sk-...
AIRTABLE_ACCESS_TOKEN=your_airtable_token
WEBACY_API_KEY=your_webacy_key
GITHUB_API_KEY=your_github_token
```

---

## 📋 Incident Response

### If Service Role Key is Compromised:

1. **Immediately rotate the key:**
   - Generate new key in Supabase Dashboard
   - Update all services and vault
   - Revoke old key

2. **Review access logs:**
   - Check for unauthorized database access
   - Look for unusual API calls
   - Review RLS policy bypass attempts

3. **Notify team:**
   - Alert all developers
   - Document the incident
   - Update security procedures

4. **Monitor:**
   - Watch for suspicious activity
   - Set up alerts for future incidents
   - Review security posture

---

### If Unauthorized Access Detected:

1. **Isolate the issue:**
   - Identify the affected endpoint
   - Review logs for attack pattern
   - Determine scope of breach

2. **Block the threat:**
   - Rate limit the IP if applicable
   - Disable compromised accounts
   - Patch the vulnerability

3. **Document:**
   - Record all details
   - Create incident report
   - Update security documentation

---

## ✅ Phase 2: Security Hardening (COMPLETED)

**📄 Full Documentation:** See [`SECURITY_PHASE2.md`](./SECURITY_PHASE2.md)

**Implemented Features:**
- [x] **Rate Limiting** - Distributed rate limiting with Upstash Redis
- [x] **Input Validation** - Type-safe validation with Zod schemas
- [x] **Centralized Error Handling** - Consistent error responses
- [x] **Secure Handler Wrapper** - Automatic security features
- [x] **Example Implementation** - check-scan-access-v2 function

**New Utilities Created:**
- `_shared/rateLimit.ts` - Rate limiting infrastructure
- `_shared/validation.ts` - Input validation schemas
- `_shared/errorHandler.ts` - Error handling utilities
- `_shared/secureHandler.ts` - Secure handler wrapper

**Action Required:**
1. Set up Upstash Redis account
2. Configure environment variables (UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
3. Update high-priority functions with new security utilities
4. Test rate limiting and validation

**See:** [`SECURITY_PHASE2.md`](./SECURITY_PHASE2.md) for complete setup guide and migration instructions.

---

## 🎯 Next Steps (Phase 3 & Beyond)

**Phase 3: Monitoring & Audit (Recommended Next)**
- [ ] Create admin audit log table
- [ ] Implement session management with timeouts
- [ ] Add admin action tracking
- [ ] Review and restrict RLS policies further
- [ ] Set up Sentry for error tracking
- [ ] Create monitoring dashboards

**Phase 4: Advanced Security**
- [ ] Implement Multi-Factor Authentication (MFA)
- [ ] Add Content Security Policy (CSP)
- [ ] Set up automated security scanning (Dependabot, SAST)
- [ ] Implement API key rotation mechanism
- [ ] Add security headers (via vercel.json)
- [ ] CSRF protection for state-changing operations

---

## 📞 Support & Questions

For security-related questions or to report vulnerabilities:

1. **Internal Team:** Contact the security team lead
2. **External Researchers:** Please report responsibly to security@yourcompany.com
3. **Documentation:** Refer to Supabase docs at https://supabase.com/docs

---

## 📝 Changelog

### [2025-10-30] Phase 1 Security Hardening
- Fixed exposed service role key in migration
- Secured debug functions with JWT + admin checks
- Added authentication to Airtable sync functions
- Enhanced Stripe webhook logging
- Updated JWT verification configuration
- Created comprehensive security documentation

---

**Remember:** Security is an ongoing process. Regularly review and update these practices as threats evolve.
