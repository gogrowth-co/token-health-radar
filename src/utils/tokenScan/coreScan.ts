
import { supabase } from "@/integrations/supabase/client";
import { 
  validateScanRequestSecure, 
  createSecureErrorMessage, 
  scanRateLimiter,
  sanitizeForDisplay 
} from "../secureValidation";
import { getUserIdentifier } from "./userIdentification";

interface ScanTokenParams {
  tokenAddress: string;
  proScan?: boolean;
}

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

    // Call the secure edge function with enhanced timeout handling
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

    if (!data || !data.success) {
      console.error('❌ Token scan returned unsuccessful result:', data);
      throw new Error(data?.error_message || 'Token scan failed to complete successfully');
    }

    console.log('✅ Token scan completed successfully');
    return data;
  } catch (error) {
    console.error('💥 Secure token scan failed:', error);
    throw error;
  }
};
