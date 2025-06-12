
import { supabase } from "@/integrations/supabase/client";
import { 
  validateScanRequestSecure, 
  createSecureErrorMessage, 
  scanRateLimiter,
  sanitizeForDisplay 
} from "./secureValidation";

/**
 * Secure token scanning utilities with enhanced validation and error handling
 */

interface ScanTokenParams {
  tokenAddress: string;
  proScan?: boolean;
}

/**
 * Get user identifier for rate limiting
 */
const getUserIdentifier = async (): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || 'anonymous';
};

/**
 * Securely scan a token with proper authentication and validation
 */
export const scanTokenSecurely = async ({ tokenAddress, proScan = false }: ScanTokenParams) => {
  try {
    // Rate limiting check
    const userIdentifier = await getUserIdentifier();
    if (!scanRateLimiter.isAllowed(userIdentifier)) {
      const remaining = scanRateLimiter.getRemainingRequests(userIdentifier);
      throw new Error(`Rate limit exceeded. Try again in a few minutes. Remaining requests: ${remaining}`);
    }

    // Enhanced input validation
    const validation = validateScanRequestSecure({ 
      token_address: tokenAddress, 
      pro_scan: proScan 
    });
    
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required for token scanning');
    }

    console.log('🔍 Starting secure token scan for:', sanitizeForDisplay(tokenAddress));

    // Use sanitized input
    const sanitizedRequest = validation.sanitizedInput!;

    // Call the secure edge function
    const { data, error } = await supabase.functions.invoke('run-token-scan', {
      body: {
        token_address: sanitizedRequest.token_address,
        pro_scan: sanitizedRequest.pro_scan,
        user_id: user.id
      }
    });

    if (error) {
      console.error('❌ Token scan error:', error);
      throw new Error(createSecureErrorMessage(error, 'Token scan failed'));
    }

    console.log('✅ Token scan completed successfully');
    return data;
  } catch (error) {
    console.error('💥 Secure token scan failed:', error);
    throw error;
  }
};

/**
 * Check if user has available scan credits using the improved function
 */
export const checkScanAccess = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log('⚠️ No authenticated user found');
      return {
        hasPro: false,
        proScanAvailable: false,
        plan: 'free',
        scansUsed: 0,
        scanLimit: 3,
        canScan: true,
        canSelectToken: true
      };
    }

    console.log('🔍 Checking scan access for user:', sanitizeForDisplay(user.id));

    const { data, error } = await supabase.functions.invoke('check-scan-access');
    
    if (error) {
      console.error('❌ Error checking scan access:', error);
      
      // Try to create subscriber record if missing
      try {
        console.log('🔄 Attempting to create subscriber record');
        const { error: insertError } = await supabase
          .from('subscribers')
          .insert({
            id: user.id,
            plan: 'free',
            scans_used: 0,
            pro_scan_limit: 3,
            source: 'auto-created'
          });
          
        if (!insertError) {
          console.log('✅ Subscriber record created, retrying access check');
          // Retry the access check after creating the record
          const { data: retryData, error: retryError } = await supabase.functions.invoke('check-scan-access');
          if (!retryError && retryData) {
            return {
              hasPro: retryData?.hasPro || false,
              proScanAvailable: retryData?.proScanAvailable || false,
              plan: retryData?.plan || 'free',
              scansUsed: retryData?.scansUsed || 0,
              scanLimit: retryData?.scanLimit || 3,
              canScan: retryData?.canScan !== false,
              canSelectToken: retryData?.canSelectToken !== false
            };
          }
        }
      } catch (createError) {
        console.error('❌ Failed to create subscriber record:', createError);
      }
      
      // Return safe defaults if everything fails
      return {
        hasPro: false,
        proScanAvailable: false,
        plan: 'free',
        scansUsed: 0,
        scanLimit: 3,
        canScan: true,
        canSelectToken: true
      };
    }

    console.log('✅ Scan access data received');

    return {
      hasPro: data?.hasPro || false,
      proScanAvailable: data?.proScanAvailable || false,
      plan: data?.plan || 'free',
      scansUsed: data?.scansUsed || 0,
      scanLimit: data?.scanLimit || 3,
      canScan: data?.canScan !== false, // Default to true
      canSelectToken: data?.canSelectToken !== false // Default to true
    };
  } catch (error) {
    console.error('💥 Failed to check scan access:', error);
    // Return safe defaults instead of throwing
    return {
      hasPro: false,
      proScanAvailable: false,
      plan: 'free',
      scansUsed: 0,
      scanLimit: 3,
      canScan: true,
      canSelectToken: true
    };
  }
};

/**
 * Record a token scan in the database securely
 */
export const recordTokenScan = async (tokenAddress: string, scoreTotal: number, proScan: boolean = false) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required to record scan');
    }

    // Validate input
    const validation = validateScanRequestSecure({
      token_address: tokenAddress,
      pro_scan: proScan,
      user_id: user.id
    });

    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    console.log('📝 Recording token scan for user:', sanitizeForDisplay(user.id));

    const sanitizedRequest = validation.sanitizedInput!;

    // Insert with RLS protection - user_id is automatically validated by RLS policies
    const { data, error } = await supabase
      .from('token_scans')
      .insert({
        user_id: user.id,
        token_address: sanitizedRequest.token_address,
        score_total: Math.max(0, Math.min(100, scoreTotal)), // Clamp score between 0-100
        pro_scan: sanitizedRequest.pro_scan
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error recording token scan:', error);
      throw new Error(createSecureErrorMessage(error, 'Failed to record scan'));
    }

    console.log('✅ Token scan recorded successfully');
    return data;
  } catch (error) {
    console.error('💥 Failed to record token scan:', error);
    throw error;
  }
};
