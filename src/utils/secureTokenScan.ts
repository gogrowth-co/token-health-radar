
import { supabase } from "@/integrations/supabase/client";
import { validateScanRequest, createSecureErrorMessage } from "./validation";

/**
 * Secure token scanning utilities with proper validation and error handling
 */

interface ScanTokenParams {
  tokenAddress: string;
  proScan?: boolean;
}

/**
 * Securely scan a token with proper authentication and validation
 */
export const scanTokenSecurely = async ({ tokenAddress, proScan = false }: ScanTokenParams) => {
  try {
    // Validate input
    const validation = validateScanRequest({ token_address: tokenAddress, pro_scan: proScan });
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required for token scanning');
    }

    console.log('🔍 Starting secure token scan for:', tokenAddress);

    // Call the secure edge function
    const { data, error } = await supabase.functions.invoke('run-token-scan', {
      body: {
        token_address: tokenAddress,
        pro_scan: proScan,
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
 * Check if user has available scan credits
 */
export const checkScanAccess = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Authentication required');
    }

    const { data, error } = await supabase.functions.invoke('check-scan-access');
    
    if (error) {
      console.error('❌ Error checking scan access:', error);
      throw new Error(createSecureErrorMessage(error, 'Unable to check scan access'));
    }

    return {
      hasPro: data?.hasPro || false,
      proScanAvailable: data?.proScanAvailable || false,
      plan: data?.plan,
      scansUsed: data?.scansUsed || 0,
      scanLimit: data?.scanLimit || 0
    };
  } catch (error) {
    console.error('💥 Failed to check scan access:', error);
    throw error;
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

    // Insert with RLS protection - user_id is automatically validated by RLS policies
    const { data, error } = await supabase
      .from('token_scans')
      .insert({
        user_id: user.id,
        token_address: tokenAddress,
        score_total: scoreTotal,
        pro_scan: proScan
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
