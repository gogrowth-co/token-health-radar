/**
 * Secure Handler Wrapper
 *
 * Wraps edge function handlers with security features:
 * - Rate limiting
 * - Input validation
 * - Error handling
 * - Request logging
 */

import { corsHeaders } from './cors.ts';
import {
  checkRateLimit,
  addRateLimitHeaders,
  createRateLimitError,
  getClientIdentifier,
  RateLimits,
} from './rateLimit.ts';
import { withErrorHandler, ApplicationError } from './errorHandler.ts';

export interface SecureHandlerOptions {
  /** Enable rate limiting */
  rateLimit?: {
    maxRequests: number;
    windowSeconds: number;
    namespace?: string;
  };
  /** Require authentication */
  requireAuth?: boolean;
  /** Require admin role */
  requireAdmin?: boolean;
  /** Function name for logging */
  functionName: string;
  /** Skip rate limiting for certain conditions */
  skipRateLimitIf?: (req: Request) => Promise<boolean>;
}

/**
 * Create a secure handler wrapper
 */
export function createSecureHandler(
  handler: (req: Request, context: RequestContext) => Promise<Response>,
  options: SecureHandlerOptions
): (req: Request) => Promise<Response> {
  const {
    rateLimit,
    requireAuth = false,
    requireAdmin = false,
    functionName,
    skipRateLimitIf,
  } = options;

  return withErrorHandler(async (req: Request): Promise<Response> => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    console.log(`[${functionName}-${requestId}] Request started`, {
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString(),
    });

    // Create request context
    const context: RequestContext = {
      requestId,
      startTime,
      user: null,
      userId: null,
      isAdmin: false,
    };

    // Authentication check (if required)
    if (requireAuth || requireAdmin) {
      const authResult = await checkAuthentication(req, requireAdmin);
      context.user = authResult.user;
      context.userId = authResult.userId;
      context.isAdmin = authResult.isAdmin;
    }

    // Rate limiting check
    if (rateLimit) {
      const shouldSkip = skipRateLimitIf ? await skipRateLimitIf(req) : false;

      if (!shouldSkip) {
        const identifier = getClientIdentifier(req, context.userId);
        const rateLimitResult = await checkRateLimit({
          ...rateLimit,
          identifier,
        });

        if (!rateLimitResult.allowed) {
          console.warn(`[${functionName}-${requestId}] Rate limit exceeded for ${identifier}`);
          return createRateLimitError(rateLimitResult, corsHeaders);
        }

        // Add rate limit headers to context for later use
        context.rateLimitResult = rateLimitResult;
      }
    }

    // Execute the actual handler
    const response = await handler(req, context);

    // Add rate limit headers if available
    if (context.rateLimitResult) {
      const headersWithRateLimit = addRateLimitHeaders(
        response.headers,
        context.rateLimitResult
      );
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headersWithRateLimit,
      });
    }

    // Log request completion
    const duration = Date.now() - startTime;
    console.log(`[${functionName}-${requestId}] Request completed`, {
      status: response.status,
      duration: `${duration}ms`,
    });

    return response;
  }, { functionName, requestId: 'pre-init' });
}

/**
 * Request context passed to handlers
 */
export interface RequestContext {
  requestId: string;
  startTime: number;
  user: any | null;
  userId: string | null;
  isAdmin: boolean;
  rateLimitResult?: {
    allowed: boolean;
    remaining: number;
    current: number;
    limit: number;
    resetAt: number;
  };
}

/**
 * Check authentication and authorization
 */
async function checkAuthentication(
  req: Request,
  requireAdmin: boolean
): Promise<{ user: any; userId: string; isAdmin: boolean }> {
  // Import dynamically to avoid circular dependency
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const { Errors } = await import('./errorHandler.ts');

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw Errors.unauthorized('Authorization header is required');
  }

  const token = authHeader.replace('Bearer ', '');

  // Verify JWT and get user
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    throw Errors.invalidToken('Invalid or expired authentication token');
  }

  // Check admin role if required
  let isAdmin = false;
  if (requireAdmin) {
    const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
      _user_id: user.id,
    });

    if (roleError) {
      throw Errors.internalError('Failed to verify user permissions');
    }

    isAdmin = roleData === 'admin';

    if (!isAdmin) {
      throw Errors.forbidden('This endpoint requires admin access');
    }
  }

  return {
    user,
    userId: user.id,
    isAdmin,
  };
}

/**
 * Create a simple success response
 */
export function successResponse(
  data: unknown,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...additionalHeaders,
    },
  });
}

/**
 * Predefined rate limit configurations for common use cases
 */
export const CommonRateLimits = {
  /** For public token scanning */
  publicTokenScan: {
    maxRequests: RateLimits.TOKEN_SCAN.maxRequests,
    windowSeconds: RateLimits.TOKEN_SCAN.windowSeconds,
    namespace: 'token-scan',
  },

  /** For authenticated API calls */
  authenticatedApi: {
    maxRequests: RateLimits.AUTHENTICATED.maxRequests,
    windowSeconds: RateLimits.AUTHENTICATED.windowSeconds,
    namespace: 'api',
  },

  /** For admin operations */
  adminOperation: {
    maxRequests: RateLimits.ADMIN.maxRequests,
    windowSeconds: RateLimits.ADMIN.windowSeconds,
    namespace: 'admin',
  },

  /** For webhook endpoints */
  webhook: {
    maxRequests: RateLimits.WEBHOOK.maxRequests,
    windowSeconds: RateLimits.WEBHOOK.windowSeconds,
    namespace: 'webhook',
  },
} as const;
