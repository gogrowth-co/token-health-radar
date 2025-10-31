# Shared Edge Function Utilities

This directory contains reusable utilities for Supabase Edge Functions that implement security best practices, input validation, error handling, and more.

## 📁 File Structure

```
_shared/
├── README.md              # This file
├── cors.ts               # CORS headers configuration
├── chainConfig.ts        # Blockchain chain configurations
├── rateLimit.ts          # Rate limiting with Upstash Redis
├── errorHandler.ts       # Centralized error handling
├── validation.ts         # Input validation with Zod
├── secureHandler.ts      # Secure handler wrapper
├── apiClients.ts         # API client utilities
├── moralisAPI.ts         # Moralis blockchain API
├── goplusAPI.ts          # GoPlus security API
├── webacyAPI.ts          # Webacy security API
├── githubAPI.ts          # GitHub API
├── defillama.ts          # DeFi Llama TVL data
├── discordAPI.ts         # Discord metrics
├── apifyAPI.ts           # Apify scraping
└── scoringUtils.ts       # Token scoring algorithms
```

## 🔐 Security Utilities (Phase 2)

### Rate Limiting (`rateLimit.ts`)

**Purpose:** Prevent API abuse and DDoS attacks using distributed rate limiting.

**Features:**
- Token bucket algorithm
- Distributed across edge function instances
- Automatic fail-open if Redis unavailable
- Per-user and per-IP limiting
- Standard rate limit headers

**Quick Start:**
```typescript
import { checkRateLimit, getClientIdentifier, RateLimits } from '../_shared/rateLimit.ts';

const identifier = getClientIdentifier(req, userId);
const result = await checkRateLimit({
  ...RateLimits.TOKEN_SCAN,
  identifier,
  namespace: 'token-scan',
});

if (!result.allowed) {
  return createRateLimitError(result, corsHeaders);
}
```

**Predefined Limits:**
- `RateLimits.STRICT` - 5 requests/hour
- `RateLimits.AUTHENTICATED` - 100 requests/hour
- `RateLimits.ANONYMOUS` - 10 requests/hour
- `RateLimits.TOKEN_SCAN` - 3 requests/hour
- `RateLimits.ADMIN` - 1000 requests/hour
- `RateLimits.WEBHOOK` - 100 requests/minute

**Requirements:**
- Upstash Redis account
- `UPSTASH_REDIS_REST_URL` environment variable
- `UPSTASH_REDIS_REST_TOKEN` environment variable

---

### Error Handling (`errorHandler.ts`)

**Purpose:** Consistent error handling and response formatting across all functions.

**Features:**
- Predefined error types with HTTP status codes
- Prevents leaking sensitive information
- Structured error logging
- Request ID tracking
- Type-safe error throwing

**Quick Start:**
```typescript
import { Errors, createErrorResponse, withErrorHandler } from '../_shared/errorHandler.ts';

// Throw predefined errors
throw Errors.unauthorized('Invalid credentials');
throw Errors.validationError('Invalid email', { field: 'email' });
throw Errors.notFound('Token');

// Create custom errors
throw new ApplicationError(
  ErrorCode.CUSTOM,
  'User message',
  400,
  { details: {} },
  'Internal message for logs'
);

// Wrap handler with automatic error handling
const handler = withErrorHandler(async (req) => {
  // Your logic - errors are caught automatically
  return new Response(JSON.stringify({ ok: true }));
});
```

**Error Codes:**
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `VALIDATION_ERROR` (400)
- `RATE_LIMIT_EXCEEDED` (429)
- `NOT_FOUND` (404)
- `EXTERNAL_API_ERROR` (502)
- `DATABASE_ERROR` (500)
- `INTERNAL_ERROR` (500)

---

### Input Validation (`validation.ts`)

**Purpose:** Type-safe input validation using Zod schemas.

**Features:**
- Pre-built schemas for common types
- Automatic error formatting
- Type inference
- XSS prevention (sanitization)
- Query parameter validation

**Quick Start:**
```typescript
import { validate, tokenScanRequestSchema, validateJsonBody } from '../_shared/validation.ts';

// Validate JSON body
const body = await req.json();
const data = validate(tokenScanRequestSchema, body);
// data is now type-safe: TokenScanRequest

// Or use helper
const data = await validateJsonBody(req, tokenScanRequestSchema);

// Validate individual fields
const address = validate(ethereumAddressSchema, userInput);
```

**Available Schemas:**

**Addresses:**
- `ethereumAddressSchema` - 0x + 40 hex
- `solanaAddressSchema` - Base58, 32-44 chars
- `tokenAddressSchema` - Either format

**Common Types:**
- `uuidSchema`
- `emailSchema`
- `urlSchema`
- `chainIdSchema`
- `supportedChainIdSchema`

**Request Schemas:**
- `tokenScanRequestSchema`
- `tokenReportRequestSchema`
- `apiHealthCheckSchema`
- `searchQuerySchema`
- `paginationSchema`

**Helpers:**
- `sanitizeString(input)` - Remove XSS attempts
- `sanitizeObject(obj)` - Recursive sanitization

---

### Secure Handler (`secureHandler.ts`)

**Purpose:** Wrapper that adds security features to edge function handlers.

**Features:**
- Automatic rate limiting
- Authentication/authorization
- Error handling
- Request logging
- CORS handling
- Context passing

**Quick Start:**
```typescript
import { createSecureHandler, CommonRateLimits, successResponse } from '../_shared/secureHandler.ts';

async function handleRequest(req: Request, context: RequestContext) {
  const { userId, isAdmin, requestId } = context;

  // Your logic here
  const data = await processRequest();

  return successResponse(data);
}

const handler = createSecureHandler(handleRequest, {
  functionName: 'my-function',
  requireAuth: true,
  requireAdmin: false,
  rateLimit: CommonRateLimits.authenticatedApi,
});

Deno.serve(handler);
```

**Options:**
```typescript
interface SecureHandlerOptions {
  functionName: string;        // For logging
  requireAuth?: boolean;       // Require JWT token
  requireAdmin?: boolean;      // Require admin role
  rateLimit?: {                // Rate limit config
    maxRequests: number;
    windowSeconds: number;
    namespace?: string;
  };
  skipRateLimitIf?: (req) => Promise<boolean>; // Conditional skip
}
```

**Context Properties:**
```typescript
interface RequestContext {
  requestId: string;           // Unique request ID
  startTime: number;           // Request start timestamp
  user: any | null;            // Authenticated user
  userId: string | null;       // User ID
  isAdmin: boolean;            // Admin status
  rateLimitResult?: {          // Rate limit info
    allowed: boolean;
    remaining: number;
    current: number;
    limit: number;
    resetAt: number;
  };
}
```

---

## 🌐 API Client Utilities

### Blockchain APIs

**`moralisAPI.ts`** - Moralis blockchain data
```typescript
import { fetchMoralisMetadata, fetchMoralisPriceData } from '../_shared/moralisAPI.ts';

const metadata = await fetchMoralisMetadata(tokenAddress, chainId);
const priceData = await fetchMoralisPriceData(tokenAddress, chainId);
```

**`chainConfig.ts`** - Chain configurations
```typescript
import { normalizeChainId, getChainConfigByMoralisId } from '../_shared/chainConfig.ts';

const normalizedId = normalizeChainId('0x1'); // '0x1'
const config = getChainConfigByMoralisId('0x1'); // { name: 'Ethereum', ... }
```

### Security APIs

**`goplusAPI.ts`** - GoPlus security checks
```typescript
import { fetchGoPlusSecurity } from '../_shared/goplusAPI.ts';

const security = await fetchGoPlusSecurity(tokenAddress, chainId);
```

**`webacyAPI.ts`** - Webacy risk assessment
```typescript
import { fetchWebacySecurity } from '../_shared/webacyAPI.ts';

const riskData = await fetchWebacySecurity(tokenAddress, chainId);
```

### Social & Development APIs

**`githubAPI.ts`** - GitHub repository data
```typescript
import { fetchGitHubRepoData } from '../_shared/githubAPI.ts';

const repoData = await fetchGitHubRepoData('https://github.com/user/repo');
```

**`discordAPI.ts`** - Discord server metrics
```typescript
import { fetchDiscordMemberCount } from '../_shared/discordAPI.ts';

const members = await fetchDiscordMemberCount('discord.gg/invite');
```

**`apifyAPI.ts`** - Social media scraping
```typescript
import { fetchTwitterFollowers, fetchTelegramMembers } from '../_shared/apifyAPI.ts';

const followers = await fetchTwitterFollowers('@handle');
const members = await fetchTelegramMembers('t.me/channel');
```

### DeFi Data

**`defillama.ts`** - Total Value Locked (TVL)
```typescript
import { fetchDeFiLlamaTVL } from '../_shared/defillama.ts';

const tvl = await fetchDeFiLlamaTVL(protocolName);
```

---

## 🎯 Usage Patterns

### Pattern 1: Simple Public Endpoint

```typescript
import { createSecureHandler, successResponse } from '../_shared/secureHandler.ts';

async function handler(req: Request, context: RequestContext) {
  const data = { message: 'Hello World' };
  return successResponse(data);
}

Deno.serve(createSecureHandler(handler, {
  functionName: 'hello-world',
  rateLimit: { maxRequests: 10, windowSeconds: 60, namespace: 'public' },
}));
```

### Pattern 2: Authenticated Endpoint with Validation

```typescript
import { createSecureHandler, successResponse, CommonRateLimits } from '../_shared/secureHandler.ts';
import { validateJsonBody, tokenScanRequestSchema } from '../_shared/validation.ts';
import { Errors } from '../_shared/errorHandler.ts';

async function handler(req: Request, context: RequestContext) {
  // Validate input
  const data = await validateJsonBody(req, tokenScanRequestSchema);

  // Process request
  const result = await scanToken(data);

  if (!result) {
    throw Errors.notFound('Token');
  }

  return successResponse(result);
}

Deno.serve(createSecureHandler(handler, {
  functionName: 'token-scan',
  requireAuth: true,
  rateLimit: CommonRateLimits.authenticatedApi,
}));
```

### Pattern 3: Admin-Only Endpoint

```typescript
import { createSecureHandler, successResponse, CommonRateLimits } from '../_shared/secureHandler.ts';

async function handler(req: Request, context: RequestContext) {
  // context.isAdmin is guaranteed to be true
  const adminData = await getAdminData();
  return successResponse(adminData);
}

Deno.serve(createSecureHandler(handler, {
  functionName: 'admin-panel',
  requireAuth: true,
  requireAdmin: true, // Only admins can access
  rateLimit: CommonRateLimits.adminOperation,
}));
```

---

## 🧪 Testing Utilities

```typescript
// Mock rate limit (for testing without Redis)
process.env.UPSTASH_REDIS_REST_URL = '';
process.env.UPSTASH_REDIS_REST_TOKEN = '';
// Rate limiting will auto-disable

// Test error handling
try {
  throw Errors.validationError('Test error');
} catch (error) {
  const response = createErrorResponse(error);
  console.log(await response.json());
}

// Test validation
const result = validate(emailSchema, 'test@example.com');
console.log(result); // 'test@example.com'
```

---

## 📚 Migration Guide

See [`SECURITY_PHASE2.md`](../../SECURITY_PHASE2.md) for:
- Complete migration guide
- Before/after code examples
- Priority update list
- Testing procedures
- Troubleshooting

---

## 🚀 Quick Reference

**Imports:**
```typescript
// Rate limiting
import { checkRateLimit, RateLimits } from '../_shared/rateLimit.ts';

// Error handling
import { Errors, createErrorResponse } from '../_shared/errorHandler.ts';

// Validation
import { validate, tokenScanRequestSchema } from '../_shared/validation.ts';

// Secure handler
import { createSecureHandler, CommonRateLimits } from '../_shared/secureHandler.ts';

// CORS
import { corsHeaders } from '../_shared/cors.ts';
```

**Common Operations:**
```typescript
// Rate limit check
const identifier = getClientIdentifier(req, userId);
const result = await checkRateLimit({ ...RateLimits.AUTHENTICATED, identifier });

// Validate input
const data = validate(schema, input);

// Throw error
throw Errors.unauthorized('Invalid token');

// Success response
return successResponse({ data: 'success' });
```

---

## 📖 Additional Documentation

- [SECURITY.md](../../SECURITY.md) - Phase 1 security fixes
- [SECURITY_PHASE2.md](../../SECURITY_PHASE2.md) - Phase 2 implementation guide
- [Example: check-scan-access-v2](../check-scan-access-v2/index.ts) - Complete example

---

**Last Updated:** October 30, 2025
**Version:** 2.0.0
