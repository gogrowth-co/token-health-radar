import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TokenResult, TokenInfoEnriched } from "./types";
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
   * Handles token selection and initiates the scan process
   * @param token - The selected token
   */
  const handleSelectToken = useCallback(async (token: TokenResult) => {
    try {
      console.log(`[TOKEN-SELECTION] Selected token: ${token.name} (${token.symbol}), CoinGecko ID: ${token.id}`);
      console.log(`[TOKEN-SELECTION] Token platforms:`, token.platforms);
      console.log(`[TOKEN-SELECTION] Token info:`, token.tokenInfo);
      
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

      // Classic flow: navigate to /scan-loading with token and id as params, actual scan/fetching/database insert will happen there, using passed-in localStorage data as needed.
      navigate(`/scan-loading?token=${encodeURIComponent(tokenInfoToSave.address)}&id=${tokenInfoToSave.id}`);

    } catch (error) {
      console.error("Error in handleSelectToken:", error);
      toast.error("Error", {
        description: "Failed to process token selection. Please try again."
      });
    }
  }, [navigate, user, isAuthenticated]);

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
