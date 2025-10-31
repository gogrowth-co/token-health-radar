/**
 * Centralized Error Handling Utility
 *
 * Provides consistent error handling and response formatting across all edge functions.
 * Prevents leaking sensitive information while logging detailed errors for debugging.
 */

import { corsHeaders } from './cors.ts';

export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  // Validation
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Resources
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',

  // External Services
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  PAYMENT_ERROR = 'PAYMENT_ERROR',

  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
}

export interface AppError {
  code: ErrorCode;
  message: string;
  statusCode: number;
  details?: unknown;
  internalMessage?: string;
  stack?: string;
}

/**
 * Custom application error class
 */
export class ApplicationError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly internalMessage?: string;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    details?: unknown,
    internalMessage?: string
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.internalMessage = internalMessage;

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApplicationError);
    }
  }
}

/**
 * Error response interface
 */
interface ErrorResponse {
  error: string;
  code: ErrorCode;
  message: string;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}

/**
 * Log error with context
 */
function logError(error: Error | ApplicationError, context?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();

  if (error instanceof ApplicationError) {
    console.error(`[ERROR] ${timestamp} - ${error.code}:`, {
      message: error.message,
      internalMessage: error.internalMessage,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack,
      ...context,
    });
  } else {
    console.error(`[ERROR] ${timestamp} - Unexpected Error:`, {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...context,
    });
  }
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  error: Error | ApplicationError,
  context?: Record<string, unknown>
): Response {
  // Log the error with context
  logError(error, context);

  // Generate request ID for tracking
  const requestId = crypto.randomUUID();

  let errorResponse: ErrorResponse;
  let statusCode: number;

  if (error instanceof ApplicationError) {
    statusCode = error.statusCode;
    errorResponse = {
      error: error.name,
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: new Date().toISOString(),
      requestId,
    };
  } else {
    // For unexpected errors, don't expose internals
    statusCode = 500;
    errorResponse = {
      error: 'Internal Server Error',
      code: ErrorCode.INTERNAL_ERROR,
      message: 'An unexpected error occurred. Please try again later.',
      timestamp: new Date().toISOString(),
      requestId,
    };
  }

  return new Response(JSON.stringify(errorResponse), {
    status: statusCode,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      'X-Request-ID': requestId,
    },
  });
}

/**
 * Wrap async handler with error handling
 */
export function withErrorHandler(
  handler: (req: Request) => Promise<Response>,
  context?: Record<string, unknown>
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      return await handler(req);
    } catch (error) {
      if (error instanceof Error) {
        return createErrorResponse(error, {
          ...context,
          url: req.url,
          method: req.method,
        });
      }

      // Handle non-Error throws
      return createErrorResponse(
        new ApplicationError(
          ErrorCode.INTERNAL_ERROR,
          'An unexpected error occurred',
          500,
          undefined,
          String(error)
        ),
        context
      );
    }
  };
}

/**
 * Predefined error factories
 */
export const Errors = {
  unauthorized: (message: string = 'Authentication required') =>
    new ApplicationError(ErrorCode.UNAUTHORIZED, message, 401),

  forbidden: (message: string = 'You do not have permission to access this resource') =>
    new ApplicationError(ErrorCode.FORBIDDEN, message, 403),

  invalidToken: (message: string = 'Invalid or expired authentication token') =>
    new ApplicationError(ErrorCode.INVALID_TOKEN, message, 401),

  validationError: (message: string, details?: unknown) =>
    new ApplicationError(ErrorCode.VALIDATION_ERROR, message, 400, details),

  notFound: (resource: string = 'Resource') =>
    new ApplicationError(ErrorCode.NOT_FOUND, `${resource} not found`, 404),

  alreadyExists: (resource: string = 'Resource') =>
    new ApplicationError(ErrorCode.ALREADY_EXISTS, `${resource} already exists`, 409),

  rateLimitExceeded: (retryAfter?: number) =>
    new ApplicationError(
      ErrorCode.RATE_LIMIT_EXCEEDED,
      `Rate limit exceeded. Please try again ${retryAfter ? `in ${retryAfter} seconds` : 'later'}.`,
      429,
      { retryAfter }
    ),

  externalApiError: (service: string, internalMessage?: string) =>
    new ApplicationError(
      ErrorCode.EXTERNAL_API_ERROR,
      `Failed to communicate with ${service}. Please try again later.`,
      502,
      undefined,
      internalMessage
    ),

  databaseError: (internalMessage?: string) =>
    new ApplicationError(
      ErrorCode.DATABASE_ERROR,
      'A database error occurred. Please try again later.',
      500,
      undefined,
      internalMessage
    ),

  missingParameter: (paramName: string) =>
    new ApplicationError(
      ErrorCode.MISSING_PARAMETER,
      `Missing required parameter: ${paramName}`,
      400
    ),

  invalidInput: (message: string, details?: unknown) =>
    new ApplicationError(ErrorCode.INVALID_INPUT, message, 400, details),

  serviceUnavailable: (message: string = 'Service temporarily unavailable') =>
    new ApplicationError(ErrorCode.SERVICE_UNAVAILABLE, message, 503),

  internalError: (internalMessage?: string) =>
    new ApplicationError(
      ErrorCode.INTERNAL_ERROR,
      'An internal error occurred. Please try again later.',
      500,
      undefined,
      internalMessage
    ),
} as const;

/**
 * Parse and validate JSON body with error handling
 */
export async function parseJsonBody<T = unknown>(req: Request): Promise<T> {
  try {
    const body = await req.json();
    return body as T;
  } catch (error) {
    throw Errors.invalidInput(
      'Invalid JSON in request body',
      error instanceof Error ? error.message : undefined
    );
  }
}

/**
 * Assert condition or throw error
 */
export function assert(
  condition: boolean,
  error: ApplicationError
): asserts condition {
  if (!condition) {
    throw error;
  }
}

/**
 * Validate required parameters exist
 */
export function requireParams<T extends Record<string, unknown>>(
  obj: T,
  ...params: (keyof T)[]
): void {
  for (const param of params) {
    if (obj[param] === undefined || obj[param] === null) {
      throw Errors.missingParameter(String(param));
    }
  }
}
