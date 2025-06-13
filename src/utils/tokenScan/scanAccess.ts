
import { supabase } from "@/integrations/supabase/client";
import { sanitizeForDisplay } from "../secureValidation";
import { getCurrentUserSession } from "./userIdentification";

/**
 * Check if user has available scan credits with improved authentication
 */
export const checkScanAccess = async () => {
  try {
    // Get the current session to ensure we have a valid auth token
    const session = await getCurrentUserSession();
    
    if (!session) {
      console.log('⚠️ No active session found');
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

    const user = session.user;
    console.log('🔍 Checking scan access for authenticated user:', sanitizeForDisplay(user.id));

    // Call the edge function with explicit authentication
    const { data, error } = await supabase.functions.invoke('check-scan-access', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      }
    });
    
    if (error) {
      console.error('❌ Error checking scan access:', error);
      
      // Return safe defaults with access allowed to prevent blocking users
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

    console.log('✅ Scan access data received:', data);

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
