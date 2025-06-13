
import { useState, useEffect } from "react";
import { TokenResult } from "@/components/token/types";
import { 
  callCoinGeckoAPI, 
  tokenDetailCache, 
  CACHE_VERSION, 
  isValidErc20Token, 
  KNOWN_ERC20_TOKENS,
  checkTokenCache,
  cacheTokenData
} from "@/utils/tokenSearch";
import { toast } from "sonner";

export default function useTokenSearch(searchTerm: string, isAuthenticated: boolean) {
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const searchTokens = async () => {
      if (!searchTerm || !isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Searching for token:", searchTerm);
        
        // First, check database cache
        const cachedResults = await checkTokenCache(searchTerm);
        if (cachedResults.length > 0) {
          console.log("Using cached token results");
          setResults(cachedResults);
          setIsLoading(false);
          return;
        }
        
        // Call CoinGecko API with enhanced error handling
        const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchTerm)}`;
        const data = await callCoinGeckoAPI(searchUrl);
        
        if (data && data.coins) {
          // Sort results by market cap rank and limit to top 3 to reduce API calls
          const sortedCoins = data.coins
            .filter((coin: any) => coin)
            .sort((a: any, b: any) => {
              const rankA = a.market_cap_rank || Infinity;
              const rankB = b.market_cap_rank || Infinity;
              return rankA - rankB;
            })
            .slice(0, 3); // Reduced from 5 to 3 to minimize API calls
          
          // Enhanced results with selective detail fetching
          const enhancedResults = [];
          for (const coin of sortedCoins) {
            try {
              // Check cache first
              const cacheKey = `coin:${CACHE_VERSION}:${coin.id}`;
              let detailData;
              
              if (tokenDetailCache[cacheKey]) {
                console.log(`Using cached data for ${coin.id}`);
                detailData = tokenDetailCache[cacheKey];
              } else {
                // Only fetch details for top-ranked tokens to avoid rate limits
                if (coin.market_cap_rank && coin.market_cap_rank <= 100) {
                  try {
                    const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
                    detailData = await callCoinGeckoAPI(detailUrl, true);
                    tokenDetailCache[cacheKey] = detailData;
                  } catch (detailError: any) {
                    console.warn(`Skipping details for ${coin.id}:`, detailError.message);
                    // Continue with basic data if detail fetch fails
                    detailData = null;
                  }
                } else {
                  console.log(`Skipping detail fetch for lower-ranked token: ${coin.id}`);
                  detailData = null;
                }
              }
              
              // Process the data with fallbacks
              let platforms = {};
              let description = '';
              let price_usd = 0;
              let price_change_24h = 0;
              let market_cap = 0;
              
              if (detailData) {
                platforms = detailData.platforms || {};
                price_usd = detailData.market_data?.current_price?.usd || 0;
                price_change_24h = detailData.market_data?.price_change_percentage_24h || 0;
                market_cap = detailData.market_data?.market_cap?.usd || 0;
                
                if (detailData.description && detailData.description.en) {
                  description = detailData.description.en
                    .replace(/<[^>]*>/g, '')
                    .split('.')[0] + '.';
                  
                  if (description.length > 150) {
                    description = description.substring(0, 150) + '...';
                  }
                }
              }
              
              const isErc20Compatible = isValidErc20Token({
                ...coin,
                platforms: platforms
              });
              
              console.log(`Processed ${coin.id}: ERC-20: ${isErc20Compatible}, Price: $${price_usd}`);
              
              enhancedResults.push({
                ...coin,
                platforms: platforms,
                price_usd: price_usd,
                price_change_24h: price_change_24h,
                market_cap: market_cap,
                isErc20: isErc20Compatible,
                description: description || `${coin.name} (${coin.symbol}) cryptocurrency token`
              });
            } catch (err: any) {
              console.error(`Error processing ${coin.id}:`, err);
              // Add basic data even if processing fails
              enhancedResults.push({
                ...coin, 
                isErc20: KNOWN_ERC20_TOKENS.includes(coin.id),
                price_usd: 0,
                price_change_24h: 0,
                market_cap: 0,
                description: `${coin.name} (${coin.symbol}) - Basic info only`
              });
            }
          }
          
          // Cache the successful results
          if (enhancedResults.length > 0) {
            cacheTokenData(enhancedResults);
          }
          
          console.log("Enhanced token results:", enhancedResults);
          setResults(enhancedResults);
        } else {
          setResults([]);
        }
      } catch (err: any) {
        console.error("Token search error:", err);
        
        // Provide more specific error messages
        let errorMessage = "Could not fetch token information. Please try again later.";
        
        if (err.message?.includes("rate limit")) {
          errorMessage = err.message; // Use the specific rate limit message
        } else if (err.message?.includes("network") || err.message?.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
          
        setError(errorMessage);
        toast.error("Search Error", {
          description: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce the search to avoid rapid API calls
    const timeoutId = setTimeout(searchTokens, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, isAuthenticated]);

  return { results, isLoading, error };
}
