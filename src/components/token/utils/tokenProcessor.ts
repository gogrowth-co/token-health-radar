
import { toast } from "sonner";
import { TokenResult } from "../types";
import { getFirstValidEvmAddress } from "@/utils/addressUtils";
import { saveTokenToDatabase, saveTokenToLocalStorage, isTokenScanSupported } from "@/utils/tokenStorage";

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

/**
 * Validate if a token address is properly formatted
 */
const validateTokenAddress = (tokenAddress: string): boolean => {
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenAddress);
  const isSpecialAddress = tokenAddress === '0x0000000000000000000000000000000000000000' || 
                           tokenAddress === '0x0000000000000000000000000000000000001010';
  
  return isValidAddress || isSpecialAddress;
};

/**
 * Process token for scanning - handles validation, address resolution, and storage
 */
export const processTokenForScanning = async (token: TokenResult): Promise<{ 
  isSupported: boolean; 
  tokenAddress?: string;
  shouldProceed: boolean;
}> => {
  console.log(`[TOKEN-SELECTION] Selected token: ${token.name} (${token.symbol}), CoinGecko ID: ${token.id}`);
  console.log(`[TOKEN-SELECTION] Token platforms:`, token.platforms);
  console.log(`[TOKEN-SELECTION] Token isErc20 property:`, token.isErc20);
  
  // Check if token is supported for full scanning
  const isSupported = isTokenScanSupported(token);
  console.log(`[TOKEN-SELECTION] Is token supported for full scan:`, isSupported);
  
  if (!isSupported) {
    console.log(`[TOKEN-SELECTION] Token ${token.name} not supported - showing limited info`);
    toast.info("Limited Support", {
      description: `${token.name} is not fully supported. Showing basic information only.`
    });
    
    return { isSupported: false, shouldProceed: true };
  }
  
  // For supported tokens, get address
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
    return { isSupported: true, shouldProceed: false };
  }
  
  // Validate the address format before proceeding
  if (!validateTokenAddress(tokenAddress)) {
    console.error(`[TOKEN-SELECTION] Invalid address format for ${token.name}: ${tokenAddress}`);
    toast.error("Invalid Token Address", {
      description: `The contract address for ${token.name} appears to be invalid. Please try a different token.`
    });
    return { isSupported: true, shouldProceed: false };
  }
  
  console.log(`[TOKEN-SELECTION] Valid token address found: ${tokenAddress}`);
  
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
  
  return { isSupported: true, tokenAddress, shouldProceed: true };
};
