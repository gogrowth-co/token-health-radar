import { supabase } from "@/integrations/supabase/client";
import { TokenResult } from "@/components/token/types";
import { getFirstValidEvmAddress } from "./addressUtils";

/**
 * Utility functions for storing and retrieving token data
 */

interface TokenInfo {
  address: string;
  id: string;
  name: string;
  symbol: string;
  logo: string;
  price_usd: number;
  price_change_24h: number | undefined;
  market_cap_usd: number;
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

/**
 * EVM-compatible chains that we support for full scanning
 */
const SUPPORTED_EVM_CHAINS = [
  'ethereum', 'polygon-pos', 'binance-smart-chain', 'arbitrum-one', 
  'avalanche', 'optimistic-ethereum', 'base', 'fantom', 'cronos',
  'harmony-shard-0', 'moonbeam', 'aurora', 'celo', 'metis-andromeda'
];

/**
 * Check if a token's blockchain is supported for full scanning
 */
export const isChainSupported = (token: TokenResult): boolean => {
  console.log(`[CHAIN-SUPPORT] Checking support for ${token.name} (${token.id})`);
  console.log(`[CHAIN-SUPPORT] Platforms:`, token.platforms);
  
  // Check if token has EVM-compatible platforms with valid addresses
  if (token.platforms && Object.keys(token.platforms).length > 0) {
    const hasValidEvmPlatform = Object.entries(token.platforms).some(([platform, address]) => {
      const isEvmChain = SUPPORTED_EVM_CHAINS.includes(platform);
      const hasValidAddress = address && 
        typeof address === 'string' && 
        address.trim().toLowerCase().startsWith('0x') &&
        (address.length === 42 || address.length === 40);
      
      console.log(`[CHAIN-SUPPORT] Platform ${platform}: isEVM=${isEvmChain}, validAddress=${hasValidAddress}, address=${address}`);
      
      return isEvmChain && hasValidAddress;
    });
    
    if (hasValidEvmPlatform) {
      console.log(`[CHAIN-SUPPORT] ${token.name} has valid EVM platform`);
      return true;
    }
  }
  
  // Check if it's a well-known native token we support
  const wellKnownAddress = getWellKnownAddress(token.id);
  if (wellKnownAddress) {
    console.log(`[CHAIN-SUPPORT] ${token.name} is a well-known EVM token`);
    return true;
  }
  
  // Check if this token is marked as ERC-20 compatible
  if (token.isErc20) {
    console.log(`[CHAIN-SUPPORT] ${token.name} is marked as ERC-20 compatible`);
    return true;
  }
  
  console.log(`[CHAIN-SUPPORT] ${token.name} is not supported for full scanning`);
  return false;
};

/**
 * Check if a token is supported for full scanning based on its platforms
 */
export const isTokenScanSupported = (token: TokenResult): boolean => {
  const supported = isChainSupported(token);
  console.log(`[TOKEN-SCAN-SUPPORT] ${token.name} (${token.id}) is supported:`, supported);
  return supported;
};

export const saveTokenToDatabase = async (token: TokenResult): Promise<void> => {
  // Only save tokens that have valid addresses or are well-known
  let tokenAddress = getFirstValidEvmAddress(token.platforms);
  
  if (!tokenAddress) {
    tokenAddress = getWellKnownAddress(token.id);
  }
  
  if (!tokenAddress) {
    console.warn(`No valid address found for ${token.name} (${token.id}), skipping database storage`);
    return;
  }
  
  // Validate the address format before proceeding
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenAddress);
  const isSpecialAddress = tokenAddress === '0x0000000000000000000000000000000000000000' || 
                           tokenAddress === '0x0000000000000000000000000000000000001010';
  
  if (!isValidAddress && !isSpecialAddress) {
    console.warn(`Invalid address format for ${token.name}: ${tokenAddress}`);
    return;
  }
  
  // Format numbers for storage
  const formattedPrice = token.price_usd || 0;
  const marketCapNumber = typeof token.market_cap === 'number' ? 
    token.market_cap : 
    0;
  
  // Check if the token already exists in our database by address OR CoinGecko ID
  const { data: existingTokens } = await supabase
    .from("token_data_cache")
    .select("token_address")
    .or(`token_address.eq.${tokenAddress},coingecko_id.eq.${token.id}`)
    .limit(1);

  const existingToken = existingTokens && existingTokens.length > 0 ? existingTokens[0] : null;

  if (existingToken) {
    // Update existing token
    await supabase
      .from("token_data_cache")
      .update({
        token_address: tokenAddress,
        name: token.name,
        symbol: token.symbol,
        logo_url: token.large || token.thumb,
        coingecko_id: token.id,
        current_price_usd: formattedPrice,
        price_change_24h: token.price_change_24h,
        market_cap_usd: marketCapNumber
      })
      .eq("token_address", existingToken.token_address);
  } else {
    // Insert new token
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
  
  return;
};

export const saveTokenToLocalStorage = (token: TokenResult, tokenAddress: string): void => {
  const tokenInfo: TokenInfo = {
    address: tokenAddress,
    id: token.id,
    name: token.name,
    symbol: token.symbol,
    logo: token.large || token.thumb,
    price_usd: token.price_usd || 0,
    price_change_24h: token.price_change_24h,
    market_cap_usd: typeof token.market_cap === 'number' ? token.market_cap : 0
  };
  
  console.log("Saving selected token to localStorage:", tokenInfo);
  localStorage.setItem("selectedToken", JSON.stringify(tokenInfo));
};
