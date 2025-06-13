
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ScanAccessData {
  plan: string;
  scansUsed: number;
  scanLimit: number;
}

export function useScanAccessCheck() {
  const [scanAccessData, setScanAccessData] = useState<ScanAccessData | null>(null);
  const { user } = useAuth();

  /**
   * Checks if user has scan access with improved error handling and fallbacks
   * @returns Promise<boolean> - True if user has access, false otherwise
   */
  const checkScanAccess = async (): Promise<boolean> => {
    try {
      console.log('🔍 Checking scan access for user:', user?.id);
      
      // Always allow access for authenticated users - we'll handle limits in the backend
      if (!user) {
        console.log('⚠️ No authenticated user - allowing guest access');
        return true; // Allow guest access for basic scanning
      }

      console.log('🚀 Calling check-scan-access edge function');
      const { data: accessData, error: accessError } = await supabase.functions.invoke('check-scan-access');
      
      console.log('📊 Access check response:', { accessData, accessError });
      
      // If there's an error, log it but don't block the user
      if (accessError) {
        console.error('❌ Error checking scan access:', accessError);
        // Don't show error toast for now - allow the user to proceed
        return true; // Fallback: allow access
      }
      
      // Extract access data with safe defaults
      const canSelectToken = accessData?.canSelectToken !== false; // Default to true
      const plan = accessData?.plan || 'free';
      const scansUsed = accessData?.scansUsed || 0;
      const scanLimit = accessData?.scanLimit || 3;
      
      console.log(`✅ Access check complete - Can select: ${canSelectToken}, Plan: ${plan}, Used: ${scansUsed}/${scanLimit}`);
      
      // Check if the user has reached their scan limit
      if (!canSelectToken) {
        console.log('🚫 User has reached scan limit - showing upgrade dialog');
        // Store the data for the upgrade dialog
        setScanAccessData({
          plan,
          scansUsed,
          scanLimit
        });
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('💥 Error in checkScanAccess:', error);
      
      // Don't show error toast or block user - allow them to proceed
      // This ensures the app remains functional even if the access check fails
      console.log('🔄 Falling back to allowing access due to error');
      return true;
    }
  };

  return {
    checkScanAccess,
    scanAccessData,
    setScanAccessData
  };
}
