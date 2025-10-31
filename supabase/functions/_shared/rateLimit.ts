/**
 * Rate Limiting Utility using Upstash Redis
 *
 * This module provides rate limiting functionality for edge functions.
 * It uses the token bucket algorithm for flexible rate limiting.
 *
 * Setup:
 * 1. Create Upstash Redis database at https://console.upstash.com
 * 2. Set environment variables:
 *    - UPSTASH_REDIS_REST_URL
 *    - UPSTASH_REDIS_REST_TOKEN
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in seconds */
  windowSeconds: number;
  /** Unique identifier for the rate limit (e.g., IP, user ID, endpoint) */
  identifier: string;
  /** Optional namespace for grouping limits */
  namespace?: string;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Number of requests remaining in current window */
  remaining: number;
  /** Number of requests made in current window */
  current: number;
  /** Maximum requests allowed */
  limit: number;
  /** Unix timestamp when the rate limit resets */
  resetAt: number;
  /** Time in seconds until reset */
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * Uses Redis for distributed rate limiting across edge function instances
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  const { maxRequests, windowSeconds, identifier, namespace = 'default' } = config;

  // Check if Upstash is configured
  const upstashUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const upstashToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

  if (!upstashUrl || !upstashToken) {
    console.warn('[RATE-LIMIT] Upstash not configured, allowing request (no rate limiting)');
    return {
      allowed: true,
      remaining: maxRequests,
      current: 0,
      limit: maxRequests,
      resetAt: Date.now() + windowSeconds * 1000,
    };
  }

  try {
    const key = `ratelimit:${namespace}:${identifier}`;
    const now = Date.now();
    const windowStart = Math.floor(now / 1000 / windowSeconds) * windowSeconds;
    const resetAt = (windowStart + windowSeconds) * 1000;

    // Use Redis pipeline for atomic operations
    const pipeline = [
      // Increment counter
      ['INCR', key],
      // Set expiry if key is new
      ['EXPIRE', key, windowSeconds, 'NX'],
      // Get TTL
      ['TTL', key],
    ];

    const response = await fetch(`${upstashUrl}/pipeline`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pipeline),
    });

    if (!response.ok) {
      console.error('[RATE-LIMIT] Redis request failed:', response.status);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: maxRequests,
        current: 0,
        limit: maxRequests,
        resetAt,
      };
    }

    const results = await response.json();
    const count = results[0]?.result || 0;
    const ttl = results[2]?.result || windowSeconds;

    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const retryAfter = allowed ? undefined : ttl;

    console.log(`[RATE-LIMIT] ${namespace}:${identifier} - ${count}/${maxRequests} (${allowed ? 'ALLOWED' : 'BLOCKED'})`);

    return {
      allowed,
      remaining,
      current: count,
      limit: maxRequests,
      resetAt: now + (ttl * 1000),
      retryAfter,
    };

  } catch (error) {
    console.error('[RATE-LIMIT] Error checking rate limit:', error);
    // Fail open - allow request on error
    return {
      allowed: true,
      remaining: maxRequests,
      current: 0,
      limit: maxRequests,
      resetAt: Date.now() + windowSeconds * 1000,
    };
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(headers: Headers, result: RateLimitResult): Headers {
  const newHeaders = new Headers(headers);

  newHeaders.set('X-RateLimit-Limit', result.limit.toString());
  newHeaders.set('X-RateLimit-Remaining', result.remaining.toString());
  newHeaders.set('X-RateLimit-Reset', result.resetAt.toString());

  if (result.retryAfter !== undefined) {
    newHeaders.set('Retry-After', result.retryAfter.toString());
  }

  return newHeaders;
}

/**
 * Create a rate limit error response
 */
export function createRateLimitError(result: RateLimitResult, corsHeaders: Record<string, string>): Response {
  const headers = addRateLimitHeaders(new Headers(corsHeaders), result);
  headers.set('Content-Type', 'application/json');

  return new Response(
    JSON.stringify({
      error: 'Rate limit exceeded',
      message: `Too many requests. Please try again in ${result.retryAfter} seconds.`,
      limit: result.limit,
      remaining: result.remaining,
      resetAt: result.resetAt,
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers,
    }
  );
}

/**
 * Predefined rate limit configurations
 */
export const RateLimits = {
  /** Very strict - for expensive operations */
  STRICT: { maxRequests: 5, windowSeconds: 3600 }, // 5 per hour

  /** Default for authenticated users */
  AUTHENTICATED: { maxRequests: 100, windowSeconds: 3600 }, // 100 per hour

  /** For anonymous/public endpoints */
  ANONYMOUS: { maxRequests: 10, windowSeconds: 3600 }, // 10 per hour

  /** For token scans */
  TOKEN_SCAN: { maxRequests: 3, windowSeconds: 3600 }, // 3 per hour for free users

  /** For admin operations */
  ADMIN: { maxRequests: 1000, windowSeconds: 3600 }, // 1000 per hour

  /** For webhook endpoints */
  WEBHOOK: { maxRequests: 100, windowSeconds: 60 }, // 100 per minute
} as const;

/**
 * Get client identifier from request
 * Tries to get user ID, then IP address
 */
export function getClientIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from various headers (Cloudflare, general proxy, etc.)
  const cfConnectingIp = req.headers.get('CF-Connecting-IP');
  const xForwardedFor = req.headers.get('X-Forwarded-For');
  const xRealIp = req.headers.get('X-Real-IP');

  const ip = cfConnectingIp ||
             xForwardedFor?.split(',')[0].trim() ||
             xRealIp ||
             'unknown';

  return `ip:${ip}`;
}
