
import { supabase } from "@/integrations/supabase/client";
import { 
  validateScanRequestSecure,
  createSecureErrorMessage,
  sanitizeForDisplay 
} from "../secureValidation";

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
