
import { useState, useEffect } from "react";
import { TokenResult } from "@/components/token/types";
import { TokenInfoEnriched } from "@/components/token/types";
import { 
  searchTokensByCMC, 
  getTokenDetails, 
  getTokenQuotes 
} from "@/utils/coinMarketCapAPI";
import { 
  transformCMCSearchResult,
  transformCMCTokenInfo,
  transformCMCQuoteData,
  determineCMCErc20Compatibility,
  extractCMCPlatformData,
  createCMCDescription
} from "@/utils/cmcDataTransformers";
import { 
  getTokenFromCache, 
  createTokenInfoFromCache,
  callWithRetry
} from "@/utils/tokenCacheUtils";
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
        console.log(`[TOKEN-SEARCH] Starting search for: "${searchTerm}"`);

        // Phase 1: Search tokens using CoinMarketCap edge function
        const cmcSearchResults = await callWithRetry(() => searchTokensByCMC(searchTerm.trim()));
        
        if (!cmcSearchResults || cmcSearchResults.length === 0) {
          console.log("[TOKEN-SEARCH] No tokens found");
          setResults([]);
          setError(`No tokens found matching "${searchTerm}". Please try a different search term.`);
          return;
        }

        // Take top 3 results
        const topTokens = cmcSearchResults.slice(0, 3);
        const enhancedResults: TokenResult[] = [];
        
        // Extract CMC IDs for batch requests
        const cmcIds = topTokens.map((token: any) => token.id);
        
        console.log(`[TOKEN-SEARCH] Processing ${topTokens.length} tokens:`, cmcIds);

        try {
          // Phase 2: Batch fetch token details and quotes
          const [detailsData, quotesData] = await Promise.allSettled([
            callWithRetry(() => getTokenDetails(cmcIds)),
            callWithRetry(() => getTokenQuotes(cmcIds))
          ]);

          const tokenDetails = detailsData.status === 'fulfilled' ? detailsData.value : {};
          const tokenQuotes = quotesData.status === 'fulfilled' ? quotesData.value : {};

          // Phase 3: Process each token with collected data
          for (const cmcToken of topTokens) {
            try {
              const cmcId = cmcToken.id;
              const tokenDetail = tokenDetails[cmcId] || {};
              const tokenQuote = tokenQuotes[cmcId] || {};

              console.log(`[TOKEN-SEARCH] Processing token ${cmcToken.name} (${cmcId})`);

              // Create base token result
              let tokenResult = transformCMCSearchResult(cmcToken);

              // Try database cache first for non-generic descriptions only
              let tokenInfo: TokenInfoEnriched | null = null;
              let meaningfulDescription = '';
              
              try {
                const cachedData = await getTokenFromCache(cmcToken.slug);
                if (cachedData && cachedData.description && !isGenericDescription(cachedData.description)) {
                  console.log(`[TOKEN-SEARCH] Found quality cached description for ${cmcToken.slug}`);
                  tokenInfo = createTokenInfoFromCache(cachedData);
                  meaningfulDescription = cachedData.description;
                } else if (cachedData) {
                  console.log(`[TOKEN-SEARCH] Found cached data for ${cmcToken.slug} but description is generic, will use CMC data`);
                  tokenInfo = createTokenInfoFromCache(cachedData);
                }
              } catch (cacheError) {
                console.log(`[TOKEN-SEARCH] Cache lookup failed for ${cmcToken.slug}:`, cacheError);
              }

              // If no meaningful cached description, try to create from CMC data
              if (!meaningfulDescription) {
                console.log(`[TOKEN-SEARCH] Creating description from CMC data for ${cmcToken.name}`);
                
                // Try CMC description first
                const cmcDescription = createCMCDescription(tokenDetail, cmcToken);
                console.log(`[TOKEN-SEARCH] CMC generated description: "${cmcDescription}"`);
                
                if (!isGenericDescription(cmcDescription)) {
                  meaningfulDescription = cmcDescription;
                  console.log(`[TOKEN-SEARCH] Using meaningful CMC description`);
                } else {
                  console.log(`[TOKEN-SEARCH] CMC description is generic, will use basic info`);
                  // Create basic informative description without "cryptocurrency token" suffix
                  if (cmcToken.rank && cmcToken.rank > 0) {
                    meaningfulDescription = `${cmcToken.name} (${cmcToken.symbol}) is ranked #${cmcToken.rank} by market capitalization`;
                  } else {
                    meaningfulDescription = `${cmcToken.name} (${cmcToken.symbol}) digital asset`;
                  }
                }
              }

              // Create or update tokenInfo
              if (!tokenInfo) {
                tokenInfo = transformCMCTokenInfo(tokenDetail, cmcToken);
              }
              
              // Set the meaningful description
              tokenInfo.description = meaningfulDescription;

              // Get market data from quotes
              const marketData = transformCMCQuoteData(tokenQuote);
              
              // Update tokenInfo with market data
              tokenInfo.current_price_usd = marketData.price_usd;
              tokenInfo.price_change_24h = marketData.price_change_24h;
              tokenInfo.market_cap_usd = marketData.market_cap;

              // Extract platform data
              const platformData = extractCMCPlatformData(tokenDetail);
              
              // Determine ERC-20 compatibility
              const isErc20Compatible = determineCMCErc20Compatibility(tokenDetail);

              // Update token result with all collected data
              tokenResult = {
                ...tokenResult,
                thumb: tokenDetail.logo || '',
                large: tokenDetail.logo || '',
                platforms: platformData,
                price_usd: marketData.price_usd,
                price_change_24h: marketData.price_change_24h,
                market_cap: marketData.market_cap,
                isErc20: isErc20Compatible,
                description: meaningfulDescription, // Use the meaningful description directly
                tokenInfo
              };

              console.log(`[TOKEN-SEARCH] Final data for ${cmcToken.name}:`, {
                name: tokenInfo.name,
                price: marketData.price_usd,
                market_cap: marketData.market_cap,
                description: meaningfulDescription,
                isErc20: isErc20Compatible
              });

              enhancedResults.push(tokenResult);
              
              // Small delay between tokens
              if (topTokens.indexOf(cmcToken) < topTokens.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
            } catch (err: any) {
              console.error(`[TOKEN-SEARCH] Error processing ${cmcToken.name}:`, err);
              
              // Add token with fallback data even if processing failed
              const fallbackTokenInfo: TokenInfoEnriched = {
                name: cmcToken.name,
                symbol: cmcToken.symbol,
                description: `${cmcToken.name} (${cmcToken.symbol}) digital asset`, // Avoid "cryptocurrency token"
                website_url: '',
                twitter_handle: '',
                github_url: '',
                logo_url: '',
                coingecko_id: '',
                current_price_usd: 0,
                price_change_24h: 0,
                market_cap_usd: 0,
                total_value_locked_usd: 'N/A'
              };
              
              enhancedResults.push({
                ...transformCMCSearchResult(cmcToken),
                description: `${cmcToken.name} (${cmcToken.symbol}) digital asset`, // Display fallback
                tokenInfo: fallbackTokenInfo
              });
            }
          }
          
        } catch (batchError: any) {
          console.error("[TOKEN-SEARCH] Batch API calls failed:", batchError);
          
          // Fallback: create basic results from search data only
          for (const cmcToken of topTokens) {
            const fallbackDescription = cmcToken.rank && cmcToken.rank > 0 
              ? `${cmcToken.name} (${cmcToken.symbol}) is ranked #${cmcToken.rank} by market capitalization`
              : `${cmcToken.name} (${cmcToken.symbol}) digital asset`;
              
            const fallbackTokenInfo: TokenInfoEnriched = {
              name: cmcToken.name,
              symbol: cmcToken.symbol,
              description: fallbackDescription,
              website_url: '',
              twitter_handle: '',
              github_url: '',
              logo_url: '',
              coingecko_id: '',
              current_price_usd: 0,
              price_change_24h: 0,
              market_cap_usd: 0,
              total_value_locked_usd: 'N/A'
            };
            
            enhancedResults.push({
              ...transformCMCSearchResult(cmcToken),
              description: fallbackDescription,
              tokenInfo: fallbackTokenInfo
            });
          }
        }
        
        console.log("[TOKEN-SEARCH] Final enhanced results:", enhancedResults);
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
