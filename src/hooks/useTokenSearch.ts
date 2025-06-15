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

        // Use API key for better rate limits and reliability (now supports key from Supabase edge if available)
        let coingeckoApiKey = '';
        if (window && 'SUPABASE_CG_API_KEY' in window) {
          coingeckoApiKey = (window as any).SUPABASE_CG_API_KEY;
        }
        // See if we can support key from env; fallback to public if not found
        const apiBaseUrl = coingeckoApiKey
          ? `https://pro-api.coingecko.com/api/v3`
          : `https://api.coingecko.com/api/v3`;

        const searchUrl = coingeckoApiKey
          ? `${apiBaseUrl}/search?query=${encodeURIComponent(searchTerm)}&x_cg_pro_api_key=${coingeckoApiKey}`
          : `${apiBaseUrl}/search?query=${encodeURIComponent(searchTerm)}`;

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
          const enhancedResults: TokenResult[] = [];
          for (const coin of topCoins) {
            try {
              // Check cache first to reduce API calls
              const cacheKey = `coin:${CACHE_VERSION}:${coin.id}`;
              let detailData;
              
              if (tokenDetailCache[cacheKey]) {
                console.log(`Using cached data for ${coin.id}`);
                detailData = tokenDetailCache[cacheKey];
              } else {
                // Get detailed coin data with all fields. Use API key if available.
                const detailUrl = coingeckoApiKey
                  ? `${apiBaseUrl}/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false&x_cg_pro_api_key=${coingeckoApiKey}`
                  : `${apiBaseUrl}/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=true&developer_data=true&sparkline=false`;
                
                try {
                  detailData = await callCoinGeckoAPI(detailUrl, true);
                  // Cache the successful response
                  tokenDetailCache[cacheKey] = detailData;
                  console.log(`Fetched and cached detailed data for ${coin.id}`);
                } catch (detailError: any) {
                  console.warn(`Error fetching details for ${coin.id}:`, detailError.message);
                  
                  // For rate limiting, throw to retry later
                  if (detailError.message.includes("rate limit")) {
                    throw detailError;
                  }
                  
                  // Add basic data without details if other errors occur
                  enhancedResults.push({
                    ...coin,
                    isErc20: KNOWN_ERC20_TOKENS.includes(coin.id),
                    price_usd: 0,
                    price_change_24h: 0,
                    market_cap: 0,
                    platforms: {}
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
              
              // Extract comprehensive token information
              const description = detailData.description?.en 
                ? detailData.description.en.replace(/<[^>]*>/g, '').split('.')[0] + '.'
                : '';
              
              const limitedDescription = description.length > 200 
                ? description.substring(0, 200) + '...' 
                : description;
              
              console.log(`[Token Debug] ${coin.id} (${coin.symbol}):`);
              console.log(` - Platforms data:`, platforms);
              console.log(` - Is valid ERC-20:`, isErc20Compatible);
              console.log(` - Market cap USD:`, detailData.market_data?.market_cap?.usd);
              console.log(` - Current price USD:`, detailData.market_data?.current_price?.usd);
              console.log(` - Links:`, detailData.links);
              
              // Compose the full enriched info structure
              const tokenInfo: TokenInfoEnriched = {
                name: detailData.name || coin.name,
                symbol: detailData.symbol?.toUpperCase() || coin.symbol?.toUpperCase(),
                description: limitedDescription,
                website_url: detailData.links?.homepage?.[0] || '',
                twitter_handle: detailData.links?.twitter_screen_name || '',
                github_url: detailData.links?.repos_url?.github?.[0] || '',
                logo_url: detailData.image?.large || detailData.image?.small || coin.large || coin.thumb || '',
                coingecko_id: coin.id,
                current_price_usd: detailData.market_data?.current_price?.usd || 0,
                price_change_24h: detailData.market_data?.price_change_percentage_24h || 0,
                market_cap_usd: detailData.market_data?.market_cap?.usd || 0,
                total_value_locked_usd: detailData.market_data?.total_value_locked?.usd?.toString() || 'N/A'
              };
              
              // Return enhanced coin data with all necessary fields for scanning
              enhancedResults.push({
                ...coin,
                platforms: platforms,
                price_usd: detailData.market_data?.current_price?.usd || 0,
                price_change_24h: detailData.market_data?.price_change_percentage_24h || 0,
                market_cap: detailData.market_data?.market_cap?.usd || 0,
                isErc20: isErc20Compatible,
                description: limitedDescription,
                tokenInfo // The magic: full tokenInfo is now on the object!
              });
            } catch (err: any) {
              // If it's a rate limit error, propagate it up
              if (err.message.includes("rate limit")) {
                throw err;
              }
              
              console.error(`Error processing ${coin.id}:`, err);
              enhancedResults.push({
                ...coin, 
                isErc20: KNOWN_ERC20_TOKENS.includes(coin.id),
                price_usd: 0,
                price_change_24h: 0,
                market_cap: 0,
                platforms: {}
              });
            }
          }
          
          console.log("Enhanced token results with full info:", enhancedResults);
          setResults(enhancedResults);
        } else {
          setResults([]);
        }
      } catch (err: any) {
        console.error("Error fetching token data:", err);
        
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
