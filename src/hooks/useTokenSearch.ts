
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

export default function useTokenSearch(searchTerm: string, isAuthenticated: boolean) {
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchTokens = async () => {
      if (!searchTerm || searchTerm.trim() === '') {
        setResults([]);
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

              // Try database cache first
              let tokenInfo: TokenInfoEnriched | null = null;
              try {
                const cachedData = await getTokenFromCache(cmcToken.slug);
                if (cachedData) {
                  console.log(`[TOKEN-SEARCH] Found database cache for ${cmcToken.slug}`);
                  tokenInfo = createTokenInfoFromCache(cachedData);
                }
              } catch (cacheError) {
                console.log(`[TOKEN-SEARCH] Cache lookup failed for ${cmcToken.slug}:`, cacheError);
              }

              // If no cache, create from CMC data
              if (!tokenInfo) {
                console.log(`[TOKEN-SEARCH] Creating tokenInfo from CMC data for ${cmcToken.name}`);
                tokenInfo = transformCMCTokenInfo(tokenDetail, cmcToken);
                tokenInfo.description = createCMCDescription(tokenDetail, cmcToken);
              }

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
                description: tokenInfo.description,
                tokenInfo
              };

              console.log(`[TOKEN-SEARCH] Final data for ${cmcToken.name}:`, {
                name: tokenInfo.name,
                price: marketData.price_usd,
                market_cap: marketData.market_cap,
                description: tokenInfo.description,
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
                description: `${cmcToken.name} (${cmcToken.symbol}) cryptocurrency token`,
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
                description: fallbackTokenInfo.description,
                tokenInfo: fallbackTokenInfo
              });
            }
          }
          
        } catch (batchError: any) {
          console.error("[TOKEN-SEARCH] Batch API calls failed:", batchError);
          
          // Fallback: create basic results from search data only
          for (const cmcToken of topTokens) {
            const fallbackTokenInfo: TokenInfoEnriched = {
              name: cmcToken.name,
              symbol: cmcToken.symbol,
              description: `${cmcToken.name} (${cmcToken.symbol}) cryptocurrency token`,
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
              description: fallbackTokenInfo.description,
              tokenInfo: fallbackTokenInfo
            });
          }
        }
        
        console.log("[TOKEN-SEARCH] Final enhanced results:", enhancedResults);
        setResults(enhancedResults);
        
      } catch (err: any) {
        console.error("Token search failed:", err);
        
        const errorMessage = err.message?.includes("rate limit") 
          ? "CoinMarketCap API rate limit reached. Please wait a moment and try again."
          : err.message?.includes("API key")
          ? "There was an issue with the CoinMarketCap API. Please try again later."
          : err.message?.includes("Search term is required")
          ? "Please enter a valid token name or symbol."
          : "Could not fetch token information. Please try again later.";
          
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
