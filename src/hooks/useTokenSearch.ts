
import { useState, useEffect } from "react";
import { TokenResult } from "@/components/token/types";
import { TokenInfoEnriched } from "@/components/token/types";
import { 
  searchTokensByMoralis, 
  getTokenMetadata, 
  getTokenPrice 
} from "@/utils/moralisAPI";
import { 
  transformMoralisSearchResult,
  transformMoralisTokenInfo,
  determineMoralisErc20Compatibility,
  extractMoralisPlatformData,
  createMoralisDescription
} from "@/utils/moralisDataTransformers";
import { 
  getTokenFromCache, 
  createTokenInfoFromCache,
  callWithRetry
} from "@/utils/tokenCacheUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Helper function to detect generic/low-quality descriptions
const isGenericDescription = (description: string): boolean => {
  if (!description || description.trim().length === 0) return true;
  
  const genericPatterns = [
    /is a cryptocurrency token\.?$/i,
    /is a digital currency\.?$/i,
    /is a crypto token\.?$/i,
    /cryptocurrency token$/i,
    /digital asset$/i
  ];
  
  return genericPatterns.some(pattern => pattern.test(description.trim()));
};

// Helper function to save token address to database during search
const saveTokenAddressToDatabase = async (tokenAddress: string, chainId: string, tokenName: string, tokenSymbol: string) => {
  try {
    console.log(`[TOKEN-SEARCH] Saving token address ${tokenAddress} for ${tokenName}`);
    
    // Check if token exists in database
    const { data: existingToken } = await supabase
      .from('token_data_cache')
      .select('token_address')
      .eq('token_address', tokenAddress)
      .eq('chain_id', chainId)
      .single();

    if (existingToken) {
      // Update existing token
      const { error: updateError } = await supabase
        .from('token_data_cache')
        .update({
          name: tokenName,
          symbol: tokenSymbol
        })
        .eq('token_address', tokenAddress)
        .eq('chain_id', chainId);

      if (updateError) {
        console.error(`[TOKEN-SEARCH] Error updating token:`, updateError);
      } else {
        console.log(`[TOKEN-SEARCH] Successfully updated token for ${tokenAddress}`);
      }
    } else {
      // Insert new token
      const { error: insertError } = await supabase
        .from('token_data_cache')
        .insert({
          token_address: tokenAddress,
          chain_id: chainId,
          name: tokenName,
          symbol: tokenSymbol
        });

      if (insertError) {
        console.error(`[TOKEN-SEARCH] Error inserting token:`, insertError);
      } else {
        console.log(`[TOKEN-SEARCH] Successfully inserted new token for ${tokenAddress}`);
      }
    }
  } catch (error) {
    console.error(`[TOKEN-SEARCH] Exception saving token:`, error);
  }
};

export default function useTokenSearch(searchTerm: string, isAuthenticated: boolean) {
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchTokens = async () => {
      if (!searchTerm || searchTerm.trim() === '') {
        setResults([]);
        setError(null);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`[TOKEN-SEARCH] Starting Moralis search for: "${searchTerm}"`);

        // Phase 1: Search tokens using Moralis API
        const moralisSearchResults = await callWithRetry(() => searchTokensByMoralis(searchTerm.trim(), 5));
        
        if (!moralisSearchResults || moralisSearchResults.length === 0) {
          console.log("[TOKEN-SEARCH] No tokens found");
          setResults([]);
          setError(`No tokens found matching "${searchTerm}". Please try a different search term.`);
          return;
        }

        // Take top 3 results for detailed processing
        const topTokens = moralisSearchResults.slice(0, 3);
        const enhancedResults: TokenResult[] = [];
        
        console.log(`[TOKEN-SEARCH] Processing ${topTokens.length} tokens from Moralis`);

        // Phase 2: Process each token with metadata and price data
        for (const moralisToken of topTokens) {
          try {
            console.log(`[TOKEN-SEARCH] Processing token ${moralisToken.name} (${moralisToken.symbol})`);

            // Create base token result
            let tokenResult = transformMoralisSearchResult(moralisToken);

            // Extract platform data
            const platformData = extractMoralisPlatformData(moralisToken);
            
            // Save token to database
            if (moralisToken.address && moralisToken.chain) {
              await saveTokenAddressToDatabase(
                moralisToken.address, 
                moralisToken.chain, 
                moralisToken.name, 
                moralisToken.symbol
              );
            }

            // Try to get cached data first
            let tokenInfo: TokenInfoEnriched | null = null;
            let meaningfulDescription = '';
            
            try {
              const cachedData = await getTokenFromCache(moralisToken.address);
              if (cachedData && cachedData.description && !isGenericDescription(cachedData.description)) {
                console.log(`[TOKEN-SEARCH] Found quality cached description for ${moralisToken.symbol}`);
                tokenInfo = createTokenInfoFromCache(cachedData);
                meaningfulDescription = cachedData.description;
              } else if (cachedData) {
                console.log(`[TOKEN-SEARCH] Found cached data for ${moralisToken.symbol} but description is generic`);
                tokenInfo = createTokenInfoFromCache(cachedData);
              }
            } catch (cacheError) {
              console.log(`[TOKEN-SEARCH] Cache lookup failed for ${moralisToken.symbol}:`, cacheError);
            }

            // If no meaningful cached description, try to get metadata and create description
            if (!meaningfulDescription) {
              console.log(`[TOKEN-SEARCH] Getting metadata from Moralis for ${moralisToken.name}`);
              
              try {
                // Get token metadata
                const metadata = await callWithRetry(() => getTokenMetadata(moralisToken.address, moralisToken.chain));
                
                // Create description from Moralis data
                const moralisDescription = createMoralisDescription(metadata, moralisToken);
                console.log(`[TOKEN-SEARCH] Moralis generated description: "${moralisDescription}"`);
                
                meaningfulDescription = moralisDescription;
              } catch (metadataError) {
                console.log(`[TOKEN-SEARCH] Metadata fetch failed, using basic description`);
                meaningfulDescription = `${moralisToken.name} (${moralisToken.symbol}) token on ${moralisToken.chain}`;
              }
            }

            // Create or update tokenInfo
            if (!tokenInfo) {
              tokenInfo = transformMoralisTokenInfo({}, moralisToken);
            }
            
            // Set the meaningful description
            tokenInfo.description = meaningfulDescription;

            // Try to get price data
            try {
              const priceData = await callWithRetry(() => getTokenPrice(moralisToken.address, moralisToken.chain));
              
              if (priceData && typeof priceData.usdPrice === 'number') {
                tokenInfo.current_price_usd = priceData.usdPrice;
                tokenInfo.price_change_24h = priceData.change24h || 0;
                tokenInfo.market_cap_usd = priceData.marketCap || 0;
              }
            } catch (priceError) {
              console.log(`[TOKEN-SEARCH] Price fetch failed for ${moralisToken.symbol}:`, priceError);
              // Price data is optional, continue without it
            }

            // Determine ERC-20 compatibility
            const isErc20Compatible = determineMoralisErc20Compatibility(moralisToken);

            // Update token result with all collected data
            tokenResult = {
              ...tokenResult,
              thumb: moralisToken.logo || '',
              large: moralisToken.logo || '',
              platforms: platformData,
              price_usd: tokenInfo.current_price_usd || 0,
              price_change_24h: tokenInfo.price_change_24h || 0,
              market_cap: tokenInfo.market_cap_usd || 0,
              isErc20: isErc20Compatible,
              description: meaningfulDescription,
              tokenInfo
            };

            console.log(`[TOKEN-SEARCH] Final data for ${moralisToken.name}:`, {
              name: tokenInfo.name,
              price: tokenInfo.current_price_usd,
              market_cap: tokenInfo.market_cap_usd,
              description: meaningfulDescription,
              isErc20: isErc20Compatible,
              verified: moralisToken.verified
            });

            enhancedResults.push(tokenResult);
            
            // Small delay between tokens
            if (topTokens.indexOf(moralisToken) < topTokens.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
          } catch (err: any) {
            console.error(`[TOKEN-SEARCH] Error processing ${moralisToken.name}:`, err);
            
            // Add token with fallback data even if processing failed
            const fallbackTokenInfo: TokenInfoEnriched = {
              name: moralisToken.name,
              symbol: moralisToken.symbol,
              description: `${moralisToken.name} (${moralisToken.symbol}) token on ${moralisToken.chain}`,
              website_url: '',
              twitter_handle: '',
              github_url: '',
              logo_url: moralisToken.logo || '',
              coingecko_id: '',
              current_price_usd: 0,
              price_change_24h: 0,
              market_cap_usd: 0,
              total_value_locked_usd: 'N/A'
            };
            
            const fallbackResult = transformMoralisSearchResult(moralisToken);
            
            enhancedResults.push({
              ...fallbackResult,
              description: `${moralisToken.name} (${moralisToken.symbol}) token on ${moralisToken.chain}`,
              tokenInfo: fallbackTokenInfo
            });
          }
        }
        
        console.log("[TOKEN-SEARCH] Final Moralis-based results:", enhancedResults);
        setResults(enhancedResults);
        
      } catch (err: any) {
        console.error("Token search failed:", err);
        
        // Provide more specific error messages
        let errorMessage = "Could not fetch token information. Please try again later.";
        
        if (err.message?.includes("rate limit")) {
          errorMessage = "Too many requests. Please wait a moment and try again.";
        } else if (err.message?.includes("API key") || err.message?.includes("configuration")) {
          errorMessage = "Search service temporarily unavailable. Please try again later.";
        } else if (err.message?.includes("connect") || err.message?.includes("network")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else if (err.message?.includes("enter a token")) {
          errorMessage = "Please enter a valid token name or symbol.";
        } else if (err.message?.includes("No tokens found")) {
          errorMessage = err.message;
        }
          
        setError(errorMessage);
        console.error("Search error details:", {
          originalError: err.message,
          userMessage: errorMessage,
          searchTerm
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchTokens, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return { results, isLoading, error };
}
