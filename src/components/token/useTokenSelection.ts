
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TokenResult } from "./types";
import { getFirstValidEvmAddress } from "@/utils/addressUtils";
import { saveTokenToDatabase, saveTokenToLocalStorage, isTokenScanSupported } from "@/utils/tokenStorage";

interface ScanAccessData {
  plan: string;
  scansUsed: number;
  scanLimit: number;
}

/**
 * Get a well-known contract address for native tokens
 */
const getWellKnownAddress = (tokenId: string): string | null => {
  const wellKnownAddresses: Record<string, string> = {
    'ethereum': '0x0000000000000000000000000000000000000000', // ETH native
    'binancecoin': '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // BNB on BSC
    'matic-network': '0x0000000000000000000000000000000000001010', // MATIC native
    'avalanche-2': '0x0000000000000000000000000000000000000000', // AVAX native
  };
  
  return wellKnownAddresses[tokenId] || null;
};

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
      console.log(`[TOKEN-SELECTION] Selected token: ${token.name} (${token.symbol}), CoinGecko ID: ${token.id}`);
      console.log(`[TOKEN-SELECTION] Token platforms:`, token.platforms);
      console.log(`[TOKEN-SELECTION] Token isErc20 property:`, token.isErc20);
      
      // Check if token is supported for full scanning
      const isSupported = isTokenScanSupported(token);
      console.log(`[TOKEN-SELECTION] Is token supported for full scan:`, isSupported);
      
      if (!isSupported) {
        // For unsupported tokens, show a toast and navigate to a limited info page
        console.log(`[TOKEN-SELECTION] Token ${token.name} not supported - showing limited info`);
        toast.info("Limited Support", {
          description: `${token.name} is not fully supported. Showing basic information only.`
        });
        
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
      
      // For supported tokens, proceed with normal flow
      console.log(`[TOKEN-SELECTION] Token ${token.name} is supported - proceeding with full scan`);
      
      // Get the first valid EVM address from any platform
      let tokenAddress = getFirstValidEvmAddress(token.platforms);
      console.log(`[TOKEN-SELECTION] EVM address from platforms:`, tokenAddress);
      
      // If no valid address found, try well-known addresses for native tokens
      if (!tokenAddress) {
        tokenAddress = getWellKnownAddress(token.id);
        console.log(`[TOKEN-SELECTION] Well-known address lookup:`, tokenAddress);
      }
      
      // If still no valid address, show error and don't proceed
      if (!tokenAddress) {
        console.error(`[TOKEN-SELECTION] No valid address found for ${token.name} (${token.id})`);
        toast.error("Token Not Supported", {
          description: `Unable to find a valid contract address for ${token.name}. This token may not be supported yet.`
        });
        return;
      }
      
      // Validate the address format before proceeding
      const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenAddress);
      const isSpecialAddress = tokenAddress === '0x0000000000000000000000000000000000000000' || 
                               tokenAddress === '0x0000000000000000000000000000000000001010';
      
      if (!isValidAddress && !isSpecialAddress) {
        console.error(`[TOKEN-SELECTION] Invalid address format for ${token.name}: ${tokenAddress}`);
        toast.error("Invalid Token Address", {
          description: `The contract address for ${token.name} appears to be invalid. Please try a different token.`
        });
        return;
      }
      
      console.log(`[TOKEN-SELECTION] Valid token address found: ${tokenAddress}`);
      
      // Check if user has access to perform a scan
      const hasAccess = await checkScanAccess();
      if (!hasAccess) {
        console.log(`[TOKEN-SELECTION] User does not have scan access`);
        return;
      }
      
      // Save token to database (only if we have a valid address)
      try {
        console.log(`[TOKEN-SELECTION] Saving token to database`);
        await saveTokenToDatabase(token);
      } catch (error) {
        console.error("Error saving token to database:", error);
        // Continue with scan even if database save fails
      }
      
      // Save token to localStorage
      saveTokenToLocalStorage(token, tokenAddress);
      
      console.log(`[TOKEN-SELECTION] Navigating to scan loading page`);
      // Navigate to scan loading page
      navigate(`/scan-loading?token=${encodeURIComponent(tokenAddress)}&id=${token.id}`);
      
    } catch (error) {
      console.error("Error in handleSelectToken:", error);
      toast.error("Error", {
        description: "Failed to process token selection. Please try again."
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
