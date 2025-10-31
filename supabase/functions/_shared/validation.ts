/**
 * Input Validation with Zod
 *
 * Provides type-safe validation schemas for edge function inputs.
 * All validation errors are automatically formatted with helpful messages.
 *
 * Note: Zod is imported via esm.sh CDN for Deno compatibility
 */

import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { Errors } from './errorHandler.ts';

/**
 * Validate data against a Zod schema
 * Throws ApplicationError with validation details on failure
 */
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));

    throw Errors.validationError(
      'Validation failed',
      { errors }
    );
  }

  return result.data;
}

/**
 * Ethereum address validation (0x + 40 hex characters)
 */
export const ethereumAddressSchema = z.string()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')
  .transform((val) => val.toLowerCase());

/**
 * Solana address validation (base58, 32-44 characters)
 */
export const solanaAddressSchema = z.string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, 'Invalid Solana address format');

/**
 * Token address (supports both Ethereum and Solana)
 */
export const tokenAddressSchema = z.string()
  .refine(
    (val) => {
      const isEth = /^0x[a-fA-F0-9]{40}$/.test(val);
      const isSol = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(val);
      return isEth || isSol;
    },
    'Invalid token address format (must be Ethereum or Solana address)'
  );

/**
 * Chain ID validation (hex format for EVM chains)
 */
export const chainIdSchema = z.string()
  .regex(/^0x[a-fA-F0-9]+$/, 'Invalid chain ID format (must be hex string like 0x1)');

/**
 * Supported chain IDs
 */
export const supportedChainIds = [
  '0x1',     // Ethereum
  '0x38',    // BSC
  '0x89',    // Polygon
  '0xa4b1',  // Arbitrum
  '0xa',     // Optimism
  '0x2105',  // Base
  'solana',  // Solana
] as const;

export const supportedChainIdSchema = z.enum(supportedChainIds as [string, ...string[]]);

/**
 * UUID validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Email validation
 */
export const emailSchema = z.string().email('Invalid email address');

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL format');

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().optional(),
});

/**
 * Token scan request validation
 */
export const tokenScanRequestSchema = z.object({
  token_address: tokenAddressSchema,
  chain_id: supportedChainIdSchema,
  user_id: uuidSchema.optional().nullable(),
  force_refresh: z.boolean().optional().default(false),
});

export type TokenScanRequest = z.infer<typeof tokenScanRequestSchema>;

/**
 * Token report request validation
 */
export const tokenReportRequestSchema = z.object({
  tokenAddress: tokenAddressSchema,
  chainId: supportedChainIdSchema,
  userId: uuidSchema,
});

export type TokenReportRequest = z.infer<typeof tokenReportRequestSchema>;

/**
 * Stripe webhook validation
 */
export const stripeWebhookSchema = z.object({
  operation: z.enum(['INSERT', 'UPDATE']),
  record: z.object({
    id: z.string(),
    token_name: z.string(),
    token_symbol: z.string(),
    token_address: tokenAddressSchema,
    chain_id: supportedChainIdSchema,
    report_content: z.any(),
    generated_by: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
  }),
});

/**
 * Admin user data request
 */
export const adminUserDataSchema = z.object({
  userId: uuidSchema.optional(),
  limit: z.number().int().positive().max(1000).default(100),
});

/**
 * API health check request
 */
export const apiHealthCheckSchema = z.object({
  testToken: tokenAddressSchema.optional(),
  testChain: supportedChainIdSchema.optional(),
  testTokenAddress: tokenAddressSchema.optional(),
  testChainId: supportedChainIdSchema.optional(),
});

/**
 * Search query validation
 */
export const searchQuerySchema = z.object({
  query: z.string().min(1).max(100),
  chain: supportedChainIdSchema.optional(),
  limit: z.number().int().positive().max(50).default(10),
});

/**
 * Date range validation
 */
export const dateRangeSchema = z.object({
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
}).refine(
  (data) => new Date(data.startDate) <= new Date(data.endDate),
  'Start date must be before or equal to end date'
);

/**
 * Scan access check response validation
 */
export const scanAccessResponseSchema = z.object({
  canScan: z.boolean(),
  canSelectToken: z.boolean(),
  hasPro: z.boolean(),
  proScanAvailable: z.boolean(),
  plan: z.enum(['free', 'pro', 'admin']),
  scansUsed: z.number().int().nonnegative(),
  scanLimit: z.number().int().positive(),
});

/**
 * Boolean from string (for query parameters)
 */
export const booleanStringSchema = z.union([
  z.boolean(),
  z.enum(['true', 'false', '1', '0']).transform((val) => val === 'true' || val === '1'),
]);

/**
 * Positive integer from string (for query parameters)
 */
export const positiveIntStringSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform((val) => parseInt(val, 10)),
]);

/**
 * Helper to validate query parameters from URL
 */
export function validateQueryParams<T>(
  url: string,
  schema: z.ZodSchema<T>
): T {
  const urlObj = new URL(url);
  const params: Record<string, string> = {};

  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  return validate(schema, params);
}

/**
 * Helper to validate JSON body
 */
export async function validateJsonBody<T>(
  req: Request,
  schema: z.ZodSchema<T>
): Promise<T> {
  try {
    const body = await req.json();
    return validate(schema, body);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw Errors.invalidInput('Invalid JSON in request body');
    }
    throw error;
  }
}

/**
 * Sanitize string input (prevent XSS, SQL injection attempts)
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, ''); // Remove event handlers
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}
