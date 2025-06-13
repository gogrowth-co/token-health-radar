
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { checkUserHasProAccess } from "@/integrations/supabase/client";
import { TokenResult } from "./types";
import { saveTokenToDatabase, saveTokenToLocalStorage, isTokenScanSupported, getTokenAddress } from "@/utils/tokenStorage";
import { toast } from "sonner";

interface ScanAccessData {
  hasPro: boolean;
  proScanAvailable: boolean;
  plan?: string;
  scansUsed?: number;
  scanLimit?: number;
}

export default function useTokenSelection() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [scanAccessData, setScanAccessData] = useState<ScanAccessData | null>(null);

  const handleSelectToken = async (token: TokenResult) => {
    console.log("Token selection started for:", token.name);
    
    // Check if token scanning is supported
    if (!isTokenScanSupported(token)) {
      toast.error("Unsupported Token", {
        description: `${token.name} is not supported for detailed scanning. We currently support EVM-compatible tokens only.`
      });
      return;
    }

    // Get token address using enhanced logic with fallbacks
    const tokenAddress = getTokenAddress(token);
    
    if (!tokenAddress) {
      console.error(`[TOKEN-SELECTION] Failed to get address for ${token.name}`, {
        platforms: token.platforms,
        id: token.id,
        isErc20: token.isErc20
      });
      
      toast.error("Address not found", {
        description: `Could not find a valid contract address for ${token.name}. Please try a different token or contact support.`
      });
      return;
    }

    console.log(`[TOKEN-SELECTION] Using address ${tokenAddress} for ${token.name}`);

    try {
      // Save token data
      await saveTokenToDatabase(token);
      saveTokenToLocalStorage(token, tokenAddress);
      
      console.log("Token data saved, proceeding to scan");
      
      // For authenticated users, check scan access after 3 scans
      if (isAuthenticated) {
        const accessData = await checkUserHasProAccess();
        console.log("User access data:", accessData);
        
        // If user has used 3+ scans and doesn't have pro access, show upgrade dialog
        if (accessData.scansUsed !== undefined && accessData.scansUsed >= 3 && !accessData.hasPro) {
          setScanAccessData(accessData);
          setShowUpgradeDialog(true);
          return;
        }
      }

      // Proceed with scan for anonymous users or users with remaining scans
      console.log("Navigating to scan loading...");
      navigate("/scan-loading");
      
    } catch (error) {
      console.error("Error in token selection:", error);
      toast.error("Something went wrong", {
        description: "Please try again or contact support if the issue persists."
      });
    }
  };

  const handleUpgrade = () => {
    navigate("/pricing");
  };

  return {
    handleSelectToken,
    handleUpgrade,
    showUpgradeDialog,
    setShowUpgradeDialog,
    scanAccessData
  };
}
