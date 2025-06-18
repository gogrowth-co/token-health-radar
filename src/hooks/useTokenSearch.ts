
import { useState, useEffect } from "react";
import { TokenResult } from "@/components/token/types";
import { TokenInfoEnriched } from "@/components/token/types";
import { callCoinGeckoAPI, tokenDetailCache, CACHE_VERSION, isValidErc20Token, KNOWN_ERC20_TOKENS } from "@/utils/tokenSearch";
import { 
  getTokenFromCache, 
  createTokenInfoFromCache, 
  createEnhancedMarketData,
  createMeaningfulDescription,
  callWithRetry
} from "@/utils/tokenCacheUtils";
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

        const apiBaseUrl = `https://api.coingecko.com/api/v3`;
        const searchUrl = `${apiBaseUrl}/search?query=${encodeURIComponent(searchTerm)}`;

        const data = await callCoinGeckoAPI(searchUrl);

        if (data && data.coins) {
          const sortedCoins = data.coins
            .filter((coin: any) => coin)
            .sort((a: any, b: any) => {
              const rankA = a.market_cap_rank || Infinity;
              const rankB = b.market_cap_rank || Infinity;
              return rankA - rankB;
            });
            
          const topCoins = sortedCoins.slice(0, 3);
          const enhancedResults: TokenResult[] = [];
          
          for (const coin of topCoins) {
            try {
              let tokenData = null;
              let platforms = {};
              let tokenInfo: TokenInfoEnriched | null = null;
              let description = '';

              // Phase 1: Try to get detailed data from CoinGecko API
              const cacheKey = `coin:${CACHE_VERSION}:${coin.id}`;
              
              if (tokenDetailCache[cacheKey]) {
                console.log(`[SEARCH] Using cached API data for ${coin.id}`);
                tokenData = tokenDetailCache[cacheKey];
              } else {
                console.log(`[SEARCH] Fetching fresh API data for ${coin.id}`);
                const detailUrl = `${apiBaseUrl}/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`;
                
                try {
                  tokenData = await callWithRetry(() => callCoinGeckoAPI(detailUrl, true));
                  tokenDetailCache[cacheKey] = tokenData;
                  console.log(`[SEARCH] Successfully fetched API data for ${coin.id}`);
                } catch (detailError: any) {
                  console.warn(`[SEARCH] API fetch failed for ${coin.id}:`, detailError.message);
                  
                  if (detailError.message.includes("rate limit")) {
                    setError("API rate limit reached. Please wait a moment and try again.");
                    break;
                  }
                }
              }

              // Phase 2: If API failed, try database cache
              if (!tokenData) {
                console.log(`[SEARCH] Trying database cache for ${coin.id}`);
                const cachedData = await getTokenFromCache(coin.id);
                if (cachedData) {
                  console.log(`[SEARCH] Found database cache for ${coin.id}`);
                  tokenInfo = createTokenInfoFromCache(cachedData);
                  platforms = {}; // We don't store platforms in cache currently
                }
              }

              // Phase 3: Process API data if available
              if (tokenData) {
                platforms = tokenData.platforms || {};
                description = createMeaningfulDescription(coin, tokenData.description?.en);

                tokenInfo = {
                  name: tokenData.name || coin.name,
                  symbol: (tokenData.symbol || coin.symbol || '').toUpperCase(),
                  description: description,
                  website_url: tokenData.links?.homepage?.[0] || '',
                  twitter_handle: tokenData.links?.twitter_screen_name || '',
                  github_url: tokenData.links?.repos_url?.github?.[0] || '',
                  logo_url: tokenData.image?.large || tokenData.image?.small || coin.large || coin.thumb || '',
                  coingecko_id: coin.id,
                  current_price_usd: 0, // Will be set by market data
                  price_change_24h: 0, // Will be set by market data
                  market_cap_usd: 0, // Will be set by market data
                  total_value_locked_usd: tokenData.market_data?.total_value_locked?.usd?.toString() || 'N/A'
                };
              }

              // Phase 4: Create fallback tokenInfo if not created yet
              if (!tokenInfo) {
                console.log(`[SEARCH] Creating fallback tokenInfo for ${coin.id}`);
                description = createMeaningfulDescription(coin);
                
                tokenInfo = {
                  name: coin.name,
                  symbol: (coin.symbol || '').toUpperCase(),
                  description: description,
                  website_url: '',
                  twitter_handle: '',
                  github_url: '',
                  logo_url: coin.large || coin.thumb || '',
                  coingecko_id: coin.id,
                  current_price_usd: 0,
                  price_change_24h: 0,
                  market_cap_usd: 0,
                  total_value_locked_usd: 'N/A'
                };
              }

              // Phase 5: Get enhanced market data with proper fallback chain
              const marketData = createEnhancedMarketData(coin, tokenData);
              
              // Update tokenInfo with market data
              tokenInfo.current_price_usd = marketData.price_usd;
              tokenInfo.price_change_24h = marketData.price_change_24h;
              tokenInfo.market_cap_usd = marketData.market_cap;

              // Determine if token is ERC-20 compatible
              const isErc20Compatible = isValidErc20Token({
                ...coin,
                platforms: platforms
              });

              console.log(`[SEARCH] Final data for ${coin.id}:`, {
                name: tokenInfo.name,
                price: marketData.price_usd,
                market_cap: marketData.market_cap,
                description: tokenInfo.description,
                isErc20: isErc20Compatible
              });

              // Add to results with complete data
              enhancedResults.push({
                ...coin,
                platforms: platforms,
                price_usd: marketData.price_usd,
                price_change_24h: marketData.price_change_24h,
                market_cap: marketData.market_cap,
                isErc20: isErc20Compatible,
                description: tokenInfo.description,
                tokenInfo
              });
              
              // Small delay between tokens
              if (topCoins.indexOf(coin) < topCoins.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
            } catch (err: any) {
              if (err.message.includes("rate limit")) {
                throw err;
              }
              
              console.error(`[SEARCH] Error processing ${coin.id}:`, err);
              
              // Add token with enhanced fallback data even if processing failed
              const fallbackMarketData = createEnhancedMarketData(coin);
              const fallbackDescription = createMeaningfulDescription(coin);
              
              enhancedResults.push({
                ...coin, 
                isErc20: KNOWN_ERC20_TOKENS.includes(coin.id),
                price_usd: fallbackMarketData.price_usd,
                price_change_24h: fallbackMarketData.price_change_24h,
                market_cap: fallbackMarketData.market_cap,
                platforms: {},
                description: fallbackDescription,
                tokenInfo: {
                  name: coin.name,
                  symbol: (coin.symbol || '').toUpperCase(),
                  description: fallbackDescription,
                  website_url: '',
                  twitter_handle: '',
                  github_url: '',
                  logo_url: coin.large || coin.thumb || '',
                  coingecko_id: coin.id,
                  current_price_usd: fallbackMarketData.price_usd,
                  price_change_24h: fallbackMarketData.price_change_24h,
                  market_cap_usd: fallbackMarketData.market_cap,
                  total_value_locked_usd: 'N/A'
                }
              });
            }
          }
          
          console.log("[SEARCH] Final enhanced results:", enhancedResults);
          setResults(enhancedResults);
        } else {
          setResults([]);
        }
      } catch (err: any) {
        console.error("Error fetching token data:", err);
        
        const errorMessage = err.message?.includes("rate limit") 
          ? "API rate limit reached. Please wait a moment and try again."
          : "Could not fetch token information. Please try again later.";
          
        setError(errorMessage);
        toast.error("Search Error", {
          description: errorMessage
        });
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchTokens, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, isAuthenticated]);

  return { results, isLoading, error };
}
