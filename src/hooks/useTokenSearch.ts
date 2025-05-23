
import { useState, useEffect } from "react";
import { TokenResult } from "@/components/token/types";
import { callCoinGeckoAPI, tokenDetailCache, CACHE_VERSION, isValidErc20Token, KNOWN_ERC20_TOKENS } from "@/utils/tokenSearch";
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
        
        // Call CoinGecko API with better rate limiting
        const searchUrl = `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchTerm)}`;
        const data = await callCoinGeckoAPI(searchUrl);
        
        if (data && data.coins) {
          // Sort results by market cap rank
          const sortedCoins = data.coins
            .filter((coin: any) => coin)
            .sort((a: any, b: any) => {
              const rankA = a.market_cap_rank || Infinity;
              const rankB = b.market_cap_rank || Infinity;
              return rankA - rankB;
            });
            
          // Take only top results
          const topCoins = sortedCoins.slice(0, 5);
          
          // Enhanced results with full token data and better error handling
          const enhancedResults = [];
          for (const coin of topCoins) {
            try {
              // Check cache first to reduce API calls - now with versioned cache key
              const cacheKey = `coin:${CACHE_VERSION}:${coin.id}`;
              let detailData;
              
              if (tokenDetailCache[cacheKey]) {
                console.log(`Using cached data for ${coin.id}`);
                detailData = tokenDetailCache[cacheKey];
              } else {
                // Get detailed coin data - OPTIMIZED to only request market_data
                const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`;
                
                try {
                  detailData = await callCoinGeckoAPI(detailUrl, true);
                  // Cache the successful response with version
                  tokenDetailCache[cacheKey] = detailData;
                } catch (detailError: any) {
                  console.warn(`Error fetching details for ${coin.id}:`, detailError.message);
                  
                  // For rate limiting, throw to retry later
                  if (detailError.message.includes("rate limit")) {
                    throw detailError; // Propagate rate limit errors up
                  }
                  
                  // Add basic data without details if other errors occur
                  enhancedResults.push({
                    ...coin,
                    isErc20: KNOWN_ERC20_TOKENS.includes(coin.id) // Check whitelist as fallback
                  });
                  continue;
                }
              }
              
              // Process the detail data
              const platforms = detailData.platforms || {};
              const isErc20Compatible = isValidErc20Token({
                ...coin,
                platforms: platforms
              });
              
              // Enhanced debugging
              console.log(`[Token Debug] ${coin.id} (${coin.symbol}):`);
              console.log(` - Platforms data:`, platforms);
              console.log(` - Is valid ERC-20:`, isErc20Compatible);
              console.log(` - Platform addresses:`, Object.values(platforms).filter(addr => 
                typeof addr === 'string' && addr.trim().toLowerCase().startsWith('0x')
              ));
              
              // Return enhanced coin data with explicit ERC-20 status
              enhancedResults.push({
                ...coin,
                platforms: platforms,
                price_usd: detailData.market_data?.current_price?.usd || 0,
                price_change_24h: detailData.market_data?.price_change_percentage_24h || 0,
                market_cap: detailData.market_data?.market_cap?.usd || 0,
                isErc20: isErc20Compatible
              });
            } catch (err: any) {
              // If it's a rate limit error, propagate it up
              if (err.message.includes("rate limit")) {
                throw err;
              }
              
              console.error(`Error processing ${coin.id}:`, err);
              enhancedResults.push({...coin, isErc20: KNOWN_ERC20_TOKENS.includes(coin.id)});
            }
          }
          
          console.log("Enhanced token results:", enhancedResults);
          setResults(enhancedResults);
        } else {
          setResults([]);
        }
      } catch (err: any) {
        console.error("Error fetching token data:", err);
        
        // Special handling for rate limiting errors
        const errorMessage = err.message?.includes("rate limit") 
          ? "API rate limit reached. Please try again in a few moments."
          : "Could not fetch token information. Please try again later.";
          
        setError(errorMessage);
        toast.error("Search Error", {
          description: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    };

    searchTokens();
  }, [searchTerm, isAuthenticated]);

  return { results, isLoading, error };
}
