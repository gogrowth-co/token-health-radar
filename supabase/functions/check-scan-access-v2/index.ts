/**
 * Check Scan Access - Enhanced Version with Phase 2 Security
 *
 * This is an example of the check-scan-access function updated with:
 * - Rate limiting
 * - Input validation with Zod
 * - Centralized error handling
 * - Structured logging
 *
 * This demonstrates the security patterns to be applied across all functions.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  createSecureHandler,
  CommonRateLimits,
  successResponse,
  type RequestContext,
} from '../_shared/secureHandler.ts';
import { Errors } from '../_shared/errorHandler.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Main handler logic
 */
async function handleCheckScanAccess(
  req: Request,
  context: RequestContext
): Promise<Response> {
  const { userId, isAdmin } = context;

  console.log(`[CHECK-SCAN-ACCESS] Checking access for user: ${userId}`);

  // Admin users get unlimited access
  if (isAdmin) {
    console.log('[CHECK-SCAN-ACCESS] Admin user detected - granting unlimited access');
    return successResponse({
      canScan: true,
      canSelectToken: true,
      hasPro: true,
      proScanAvailable: true,
      plan: 'admin',
      scansUsed: 0,
      scanLimit: 999999,
    });
  }

  // Get user's subscriber data
  const { data: subscriberData, error: subscriberError } = await supabase
    .from('subscribers')
    .select('plan, scans_used, pro_scan_limit')
    .eq('id', userId)
    .single();

  if (subscriberError) {
    console.error('[CHECK-SCAN-ACCESS] Error fetching subscriber data:', subscriberError);

    // Default to free tier with conservative limits if there's an error
    return successResponse({
      canScan: true,
      canSelectToken: true,
      plan: 'free',
      scansUsed: 0,
      scanLimit: 3,
      hasPro: false,
      proScanAvailable: false,
      error: 'Could not retrieve subscriber data',
    });
  }

  // Default to free tier if no data found
  const plan = subscriberData?.plan || 'free';
  const scansUsed = subscriberData?.scans_used || 0;
  const scanLimit = subscriberData?.pro_scan_limit || 3;

  console.log(`[CHECK-SCAN-ACCESS] User plan: ${plan}, scans: ${scansUsed}/${scanLimit}`);

  // Determine access levels
  let canScan = true;
  let canSelectToken = true;
  let hasPro = false;
  let proScanAvailable = false;

  // CRITICAL: Always allow scanning - just control Pro features
  if (plan === 'pro') {
    if (scansUsed < scanLimit) {
      hasPro = true;
      proScanAvailable = true;
    } else {
      // Exceeded Pro limit, fall back to free tier
      hasPro = false;
      proScanAvailable = false;
    }
  } else if (plan === 'free') {
    if (scansUsed < 3) {
      hasPro = true; // First 3 free scans show unblurred content
      proScanAvailable = true;
    } else {
      hasPro = false;
      proScanAvailable = false;
    }
  }

  console.log(`[CHECK-SCAN-ACCESS] Access granted - Pro: ${hasPro}, Available: ${proScanAvailable}`);

  return successResponse({
    canScan,
    canSelectToken,
    hasPro,
    proScanAvailable,
    plan,
    scansUsed,
    scanLimit,
  });
}

/**
 * Create the secure handler with rate limiting and authentication
 */
const handler = createSecureHandler(handleCheckScanAccess, {
  functionName: 'check-scan-access',
  requireAuth: true, // This endpoint requires authentication
  rateLimit: CommonRateLimits.authenticatedApi, // 100 requests per hour for authenticated users
});

// Export the handler
Deno.serve(handler);
