
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
 * Save token data to Supabase database
 * @param token - Token data to save
 * @returns Promise that resolves when the data is saved
 */
export const saveTokenToDatabase = async (token: TokenResult): Promise<void> => {
  // Get the token address from platforms or generate a placeholder
  let tokenAddress = getFirstValidEvmAddress(token.platforms);
  
  if (!tokenAddress) {
    console.warn(`No EVM address found for ${token.name}, using placeholder`);
    tokenAddress = `0x${token.id.replace(/-/g, '').substring(0, 38).padEnd(38, '0')}`;
  }
  
  // Format numbers for storage
  const formattedPrice = token.price_usd || 0;
  // Convert market cap to number
  const marketCapNumber = typeof token.market_cap === 'number' ? 
    token.market_cap : 
    0;
  
  // Check if the token already exists in our database
  const { data: existingToken } = await supabase
    .from("token_data_cache")
    .select("*")
    .eq("token_address", tokenAddress)
    .maybeSingle();

  if (existingToken) {
    // Update existing token
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

/**
 * Save token info to localStorage for persistence
 * @param token - Token data to save
 * @param tokenAddress - Token address to use as identifier
 */
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

