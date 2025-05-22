
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TokenResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  thumb: string;
  large?: string;
  platforms?: Record<string, string>;
  market_cap?: number;
  price_usd?: number;
  price_change_24h?: number;
  isErc20?: boolean;
}

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

  // Format number for display
  const formatNumber = (value: number | undefined): string => {
    if (value === undefined) return "N/A";
    
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } 
    else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    } 
    else {
      return `$${value.toFixed(2)}`;
    }
  };

  const handleSelectToken = useCallback(async (token: TokenResult) => {
    try {
      // Check if token is ERC-20 compatible
      if (!token.isErc20) {
        toast.error("Unsupported Token", {
          description: "This token is not ERC-20 compatible. We're adding support for more blockchains soon."
        });
        return;
      }
      
      // Get Ethereum address if available
      let tokenAddress = "";
      
      if (token.platforms && token.platforms.ethereum) {
        tokenAddress = token.platforms.ethereum;
        console.log(`Found Ethereum address: ${tokenAddress} for token ${token.name}`);
      }
      
      if (!tokenAddress) {
        console.warn(`No Ethereum address found for ${token.name}, using placeholder`);
        tokenAddress = `0x${token.id.replace(/-/g, '').substring(0, 38).padEnd(38, '0')}`;
      }
      
      console.log(`Selected token: ${token.name}, address: ${tokenAddress}, id: ${token.id}`);
      
      // Check if user has access to perform a scan
      const { data: accessData, error: accessError } = await supabase.functions.invoke('check-scan-access');
      
      if (accessError) {
        console.error("Error checking scan access:", accessError);
        toast.error("Could not check scan access. Please try again.");
        return;
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
        return;
      }
      
      // Check if the token already exists in our database
      const { data: existingToken } = await supabase
        .from("token_data_cache")
        .select("*")
        .eq("token_address", tokenAddress)
        .maybeSingle();

      // Format numbers for display and storage
      const formattedPrice = token.price_usd || 0;
      // Convert market cap to number
      const marketCapNumber = typeof token.market_cap === 'number' ? 
        token.market_cap : 
        0;
        
      // Save or update token info in token_data_cache
      if (existingToken) {
        // Update existing token with correct types
        await supabase
          .from("token_data_cache")
          .update({
            name: token.name,
            symbol: token.symbol,
            logo_url: token.large || token.thumb,
            coingecko_id: token.id,
            current_price_usd: formattedPrice,
            price_change_24h: token.price_change_24h,
            market_cap_usd: marketCapNumber
          })
          .eq("token_address", tokenAddress);
      } else {
        // Insert new token with correct types
        await supabase
          .from("token_data_cache")
          .insert({
            token_address: tokenAddress,
            name: token.name,
            symbol: token.symbol,
            logo_url: token.large || token.thumb,
            coingecko_id: token.id,
            current_price_usd: formattedPrice,
            market_cap_usd: marketCapNumber,
            price_change_24h: token.price_change_24h
          });
      }
      
      // Save token info to localStorage for persistence
      const tokenInfo = {
        address: tokenAddress,
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        logo: token.large || token.thumb,
        price_usd: formattedPrice,
        price_change_24h: token.price_change_24h,
        market_cap_usd: marketCapNumber
      };
      
      console.log("Saving selected token to localStorage:", tokenInfo);
      localStorage.setItem("selectedToken", JSON.stringify(tokenInfo));
      
      navigate(`/scan-loading?token=${encodeURIComponent(tokenAddress)}&id=${token.id}`);
      
    } catch (error) {
      console.error("Error saving token data:", error);
      toast.error("Error", {
        description: "Failed to save token data. Please try again."
      });
    }
  }, [navigate, user]);

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
