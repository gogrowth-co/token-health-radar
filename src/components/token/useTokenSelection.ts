
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TokenResult, TokenInfoEnriched } from "./types";
import { getFirstValidEvmAddress, isSolanaAddress, getSolanaAddress } from "@/utils/addressUtils";
import { saveTokenToDatabase, saveTokenToLocalStorage, isTokenScanSupported } from "@/utils/tokenStorage";
import { checkUserHasProAccess } from "@/integrations/supabase/client";

interface ScanAccessData {
  plan: string;
  scansUsed: number;
  scanLimit: number;
  hasPro: boolean;
  proScanAvailable: boolean;
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
  const [showScanLimitModal, setShowScanLimitModal] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  /**
   * Helper - return completeTokenInfo (TokenInfoEnriched), fallback to base fields
   */
  const getComprehensiveTokenInfo = (token: TokenResult): TokenInfoEnriched => {
    if (token.tokenInfo) return token.tokenInfo;
    return {
      name: token.name,
      symbol: token.symbol,
      description: token.description,
      website_url: "",
      twitter_handle: "",
      github_url: "",
      logo_url: token.large || token.thumb,
      coingecko_id: token.id,
      current_price_usd: token.price_usd ?? 0,
      price_change_24h: token.price_change_24h ?? 0,
      market_cap_usd: typeof token.market_cap === 'number' ? token.market_cap : 0,
      total_value_locked_usd: "N/A"
    };
  };

  /**
   * Check scan limits before allowing scan
   */
  const checkScanLimits = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated) {
      // Anonymous users can always scan (they get basic scans)
      return true;
    }

    try {
      const accessData = await checkUserHasProAccess();
      
      setScanAccessData({
        plan: accessData.plan || 'free',
        scansUsed: accessData.scansUsed || 0,
        scanLimit: accessData.scanLimit || 3,
        hasPro: accessData.hasPro,
        proScanAvailable: accessData.proScanAvailable
      });

      // If user has no Pro scans available, show the upgrade modal
      if (!accessData.proScanAvailable && accessData.scansUsed >= (accessData.scanLimit || 3)) {
        setShowScanLimitModal(true);
        return false; // Still allow scan but warn user
      }

      return true;
    } catch (error) {
      console.error("Error checking scan limits:", error);
      return true; // Allow scan on error
    }
  }, [isAuthenticated]);

  /**
   * Handles token selection and initiates the scan process
   * @param token - The selected token
   */
  const handleSelectToken = useCallback(async (token: TokenResult) => {
    try {
      console.log(`[TOKEN-SELECTION] Selected token: ${token.name} (${token.symbol}), Token ID: ${token.id}`);
      console.log(`[TOKEN-SELECTION] Token platforms:`, token.platforms);
      console.log(`[TOKEN-SELECTION] Token info:`, token.tokenInfo);
      
      // Check scan limits for authenticated users
      const canProceed = await checkScanLimits();
      
      // Check if token is supported for full scanning
      const isSupported = isTokenScanSupported(token);
      console.log(`[TOKEN-SELECTION] Is token supported for full scan:`, isSupported);
      
      if (!isSupported) {
        console.log(`[TOKEN-SELECTION] Token ${token.name} not supported - showing limited info`);
        toast.info("Limited Support", {
          description: `${token.name} is not fully supported. Showing basic information only.`
        });
        
        const tokenInfo = {
          address: `unsupported-${token.id}`,
          id: token.id,
          name: token.name,
          symbol: token.symbol,
          logo: token.large || token.thumb,
          price_usd: token.price_usd || 0,
          price_change_24h: token.price_change_24h,
          market_cap_usd: typeof token.market_cap === 'number' ? token.market_cap : 0
        };
        
        localStorage.setItem("selectedToken", JSON.stringify(tokenInfo));
        navigate(`/scan-result?token=unsupported-${token.id}&id=${token.id}&limited=true`);
        return;
      }
      
      // For supported tokens, proceed with normal flow
      console.log(`[TOKEN-SELECTION] Token ${token.name} is supported - proceeding with scan`);
      
      // Check for Solana address first
      const solanaAddress = getSolanaAddress(token.platforms);
      if (solanaAddress) {
        console.log(`[TOKEN-SELECTION] Detected Solana token with address: ${solanaAddress}`);
        
        const tokenInfoToSave = {
          address: solanaAddress,
          id: token.id,
          name: token.tokenInfo?.name || token.name,
          symbol: token.tokenInfo?.symbol || token.symbol,
          logo: token.tokenInfo?.logo_url || token.large || token.thumb,
          price_usd: token.tokenInfo?.current_price_usd ?? token.price_usd ?? 0,
          price_change_24h: token.tokenInfo?.price_change_24h ?? token.price_change_24h ?? 0,
          market_cap_usd: token.tokenInfo?.market_cap_usd ?? token.market_cap ?? 0,
          chain: 'solana',
          completeTokenInfo: token.tokenInfo || getComprehensiveTokenInfo(token)
        };

        localStorage.setItem("selectedToken", JSON.stringify(tokenInfoToSave));
        
        const urlParams = new URLSearchParams({
          chain: 'solana',
          address: solanaAddress,
          id: token.id,
          force_refresh: 'true'
        });
        
        navigate(`/scan-loading?${urlParams.toString()}`);
        return;
      }
      
      // EVM flow - get the first valid EVM address from any platform
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
      
      // Save comprehensive token info to localStorage including detailed tokenInfo
      const tokenInfoToSave = {
        address: getFirstValidEvmAddress(token.platforms) ||
          getWellKnownAddress(token.id) ||
          `unsupported-${token.id}`,
        id: token.id,
        name: token.tokenInfo?.name || token.name,
        symbol: token.tokenInfo?.symbol || token.symbol,
        logo: token.tokenInfo?.logo_url || token.large || token.thumb,
        price_usd: token.tokenInfo?.current_price_usd ?? token.price_usd ?? 0,
        price_change_24h: token.tokenInfo?.price_change_24h ?? token.price_change_24h ?? 0,
        market_cap_usd: token.tokenInfo?.market_cap_usd ?? token.market_cap ?? 0,
        // Save COMPLETE and consistently-structured token info directly for /scan-loading and /scan-result
        completeTokenInfo: token.tokenInfo || getComprehensiveTokenInfo(token)
      };

      console.log(`[TOKEN-SELECTION] Saving comprehensive token info to localStorage:`, tokenInfoToSave);
      localStorage.setItem("selectedToken", JSON.stringify(tokenInfoToSave));

      // Build URL with token ID
      const urlParams = new URLSearchParams({
        token: tokenInfoToSave.address,
        id: tokenInfoToSave.id
      });

      // Navigate to scan loading with force_refresh parameter for fresh scans
      urlParams.set('force_refresh', 'true');
      const scanUrl = `/scan-loading?${urlParams.toString()}`;
      console.log(`[TOKEN-SELECTION] Navigating to fresh scan: ${scanUrl}`);
      navigate(scanUrl);

    } catch (error) {
      console.error("Error in handleSelectToken:", error);
      toast.error("Error", {
        description: "Failed to process token selection. Please try again."
      });
    }
  }, [navigate, user, isAuthenticated, checkScanLimits]);

  /**
   * Handles upgrade button click
   */
  const handleUpgrade = useCallback(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else {
      navigate('/pricing');
    }
    setShowUpgradeDialog(false);
    setShowScanLimitModal(false);
  }, [navigate, isAuthenticated]);

  return {
    handleSelectToken,
    handleUpgrade,
    showUpgradeDialog,
    setShowUpgradeDialog,
    scanAccessData,
    showScanLimitModal,
    setShowScanLimitModal
  };
}
