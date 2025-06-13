
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { TokenResult } from "./types";
import { useScanAccessCheck } from "./hooks/useScanAccessCheck";
import { useUpgradeDialog } from "./hooks/useUpgradeDialog";
import { processTokenForScanning } from "./utils/tokenProcessor";

export default function useTokenSelection() {
  const navigate = useNavigate();
  const { checkScanAccess, scanAccessData, setScanAccessData } = useScanAccessCheck();
  const { showUpgradeDialog, setShowUpgradeDialog, handleUpgrade } = useUpgradeDialog();

  /**
   * Handles token selection and initiates the scan process
   * @param token - The selected token
   */
  const handleSelectToken = useCallback(async (token: TokenResult) => {
    try {
      // Process the token (validation, address resolution, storage)
      const { isSupported, tokenAddress, shouldProceed } = await processTokenForScanning(token);
      
      if (!shouldProceed) {
        return;
      }

      // Handle unsupported tokens
      if (!isSupported) {
        // Save basic token info for display
        const tokenInfo = {
          address: `unsupported-${token.id}`, // Use a special identifier
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          logo: token.large || token.thumb,
          price_usd: token.price_usd || 0,
          price_change_24h: token.price_change_24h,
          market_cap_usd: typeof token.market_cap === 'number' ? token.market_cap : 0
        };
        
        localStorage.setItem("selectedToken", JSON.stringify(tokenInfo));
        
        // Navigate to scan result with limited support flag
        navigate(`/scan-result?token=unsupported-${token.id}&id=${token.id}&limited=true`);
        return;
      }

      // Check if user has access to perform a scan
      const hasAccess = await checkScanAccess();
      if (!hasAccess) {
        console.log(`[TOKEN-SELECTION] User does not have scan access`);
        // Set the upgrade dialog data and show it
        setShowUpgradeDialog(true);
        return;
      }
      
      console.log(`[TOKEN-SELECTION] Navigating to scan loading page`);
      // Navigate to scan loading page
      navigate(`/scan-loading?token=${encodeURIComponent(tokenAddress!)}&id=${token.id}`);
      
    } catch (error) {
      console.error("Error in handleSelectToken:", error);
      toast.error("Error", {
        description: "Failed to process token selection. Please try again."
      });
    }
  }, [navigate, checkScanAccess, setShowUpgradeDialog]);

  return {
    handleSelectToken,
    handleUpgrade,
    showUpgradeDialog,
    setShowUpgradeDialog,
    scanAccessData
  };
}
