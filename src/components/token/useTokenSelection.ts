
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TokenResult } from "./types";
import { getFirstValidEvmAddress } from "@/utils/addressUtils";
import { saveTokenToDatabase, saveTokenToLocalStorage } from "@/utils/tokenStorage";

interface ScanAccessData {
  plan: string;
  scansUsed: number;
  scanLimit: number;
}

export default function useTokenSelection() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [scanAccessData, setScanAccessData] = useState<ScanAccessData | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  /**
   * Checks if user has scan access and shows upgrade dialog if needed
   * @returns Promise<boolean> - True if user has access, false otherwise
   */
  const checkScanAccess = async (): Promise<boolean> => {
    try {
      const { data: accessData, error: accessError } = await supabase.functions.invoke('check-scan-access');
      
      if (accessError) {
        console.error("Error checking scan access:", accessError);
        toast.error("Could not check scan access. Please try again.");
        return false;
      }
      
      // Check if the user can select a token (this is the actual scan count check)
      if (!accessData.canSelectToken) {
        // Store the data for the upgrade dialog
        setScanAccessData({
          plan: accessData.plan,
          scansUsed: accessData.scansUsed,
          scanLimit: accessData.scanLimit
        });
        
        // Show upgrade dialog
        setShowUpgradeDialog(true);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in checkScanAccess:", error);
      toast.error("Error checking scan access. Please try again.");
      return false;
    }
  };

  /**
   * Handles token selection and initiates the scan process
   * @param token - The selected token
   */
  const handleSelectToken = useCallback(async (token: TokenResult) => {
    try {
      // Check if token is ERC-20 compatible
      if (!token.isErc20) {
        toast.error("Unsupported Token", {
          description: "This token is not ERC-20 compatible. We're adding support for more blockchains soon."
        });
        return;
      }
      
      // Get the first valid EVM address from any platform (not just Ethereum)
      let tokenAddress = getFirstValidEvmAddress(token.platforms);
      
      if (!tokenAddress) {
        console.warn(`No EVM address found for ${token.name}, using placeholder`);
        tokenAddress = `0x${token.id.replace(/-/g, '').substring(0, 38).padEnd(38, '0')}`;
      }
      
      console.log(`Selected token: ${token.name}, address: ${tokenAddress}, id: ${token.id}`);
      
      // Check if user has access to perform a scan
      const hasAccess = await checkScanAccess();
      if (!hasAccess) return;
      
      // Save token to database
      await saveTokenToDatabase(token);
      
      // Save token to localStorage
      saveTokenToLocalStorage(token, tokenAddress);
      
      // Navigate to scan loading page
      navigate(`/scan-loading?token=${encodeURIComponent(tokenAddress)}&id=${token.id}`);
      
    } catch (error) {
      console.error("Error saving token data:", error);
      toast.error("Error", {
        description: "Failed to save token data. Please try again."
      });
    }
  }, [navigate, user]);

  /**
   * Handles upgrade button click
   */
  const handleUpgrade = useCallback(() => {
    navigate('/pricing');
    setShowUpgradeDialog(false);
  }, [navigate]);

  return {
    handleSelectToken,
    handleUpgrade,
    showUpgradeDialog,
    setShowUpgradeDialog,
    scanAccessData
  };
}
