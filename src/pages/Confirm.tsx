
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import TokenSearchForm from "@/components/token/TokenSearchForm";
import TokenSearchResults from "@/components/token/TokenSearchResults";
import useTokenSelection from "@/components/token/useTokenSelection";
import ScanLimitDialog from "@/components/token/ScanLimitDialog";

interface TokenResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  thumb: string;
  large?: string;
  platforms?: Record<string, string>;
  market_cap?: number;
  price_usd?: number;
  price_change_24h?: number;
  isErc20?: boolean;
}

// Used to prevent too many API calls in a short period
let lastApiCallTime = 0;
let lastDetailApiCallTime = 0;
const MIN_API_CALL_INTERVAL = 1000; // milliseconds between search calls
const MIN_DETAIL_API_CALL_INTERVAL = 600; // milliseconds between detail calls

// Cache for token detail responses to reduce API calls
const tokenDetailCache: Record<string, any> = {};

// Known ERC-20 tokens that might not be correctly identified by platform data
const KNOWN_ERC20_TOKENS = [
  'ethereum', 'uniswap', 'dai', 'chainlink', 'aave', 'compound', 
  'maker', 'wrapped-bitcoin', 'tether', 'usd-coin'
];

export default function Confirm() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("token") || "");
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  const { 
    handleSelectToken, 
    handleUpgrade, 
    showUpgradeDialog, 
    setShowUpgradeDialog,
    scanAccessData 
  } = useTokenSelection();

  // Helper function to properly determine if a token is ERC-20 compatible
  const isValidErc20Token = (token: any): boolean => {
    // Check if it's in our known ERC-20 whitelist
    if (KNOWN_ERC20_TOKENS.includes(token.id)) {
      return true;
    }
    
    // Check platforms data
    if (token.platforms) {
      const ethereumAddress = token.platforms.ethereum;
      
      // More lenient Ethereum address validation
      if (typeof ethereumAddress === "string" && ethereumAddress.trim().length > 0) {
        // Prefer correctly formatted addresses
        if (/^(0x)?[0-9a-fA-F]{40}$/i.test(ethereumAddress.trim())) {
          return true;
        }
        
        // If it has any ethereum address, it's likely ERC-20
        return true;
      }
    }
    
    // Fallback based on token naming
    const nameAndSymbol = (token.name + token.symbol).toLowerCase();
    if (nameAndSymbol.includes('erc20') || nameAndSymbol.includes('erc-20') || 
        nameAndSymbol.includes('eth') || nameAndSymbol.includes('ethereum')) {
      return true;
    }
    
    return false;
  }

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      if (searchTerm) {
        localStorage.setItem("pendingTokenSearch", searchTerm);
      }
      navigate("/auth");
    }
  }, [isAuthenticated, loading, navigate, searchTerm]);

  // Improved API call function with rate limiting and caching
  const callCoinGeckoAPI = async (url: string, isDetailRequest = false) => {
    const now = Date.now();
    const minInterval = isDetailRequest ? MIN_DETAIL_API_CALL_INTERVAL : MIN_API_CALL_INTERVAL;
    const lastTime = isDetailRequest ? lastDetailApiCallTime : lastApiCallTime;
    
    if (now - lastTime < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - (now - lastTime))
      );
    }
    
    if (isDetailRequest) {
      lastDetailApiCallTime = Date.now();
    } else {
      lastApiCallTime = Date.now();
    }
    
    // More robust headers
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // Add API key headers if available
    };

    try {
      const response = await fetch(url, { headers });
      
      // Handle rate limiting explicitly
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
        console.warn(`Rate limit hit, suggested wait time: ${waitTime}ms`);
        throw new Error("API rate limit reached. Please try again in a few moments.");
      }
      
      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  };

  // Search for tokens when the component loads
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
              // Check cache first to reduce API calls
              const cacheKey = `coin:${coin.id}`;
              let detailData;
              
              if (tokenDetailCache[cacheKey]) {
                console.log(`Using cached data for ${coin.id}`);
                detailData = tokenDetailCache[cacheKey];
              } else {
                // Get detailed coin data
                const detailUrl = `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`;
                
                try {
                  detailData = await callCoinGeckoAPI(detailUrl, true);
                  // Cache the successful response
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
              console.log(` - Ethereum address:`, platforms.ethereum || "none");
              console.log(` - Is valid ERC-20:`, isErc20Compatible);
              if (platforms.ethereum) {
                console.log(` - Address validation:`, {
                  isString: typeof platforms.ethereum === "string",
                  nonEmpty: platforms.ethereum.length > 0,
                  matchesFormat: /^(0x)?[0-9a-fA-F]{40}$/i.test(platforms.ethereum)
                });
              }
              
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

  const handleSearch = (newSearchTerm: string) => {
    if (!newSearchTerm.trim()) {
      toast.error("Empty search", {
        description: "Please enter a token name"
      });
      return;
    }
    
    // Update URL with new search term
    setSearchParams({ token: newSearchTerm });
    setSearchTerm(newSearchTerm);
  };

  // Show loading while auth is checking
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Checking authentication...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Only render the main content if authenticated
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              size="sm" 
              className="flex items-center gap-1.5 mb-4" 
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-4 w-4" /> Back to search
            </Button>
            
            <h1 className="text-3xl font-bold mb-4">Confirm Token Selection</h1>
            <p className="text-muted-foreground">
              Select the correct token from the results below to continue with your scan.
            </p>
          </div>
          
          <div className="mb-8">
            <TokenSearchForm 
              initialSearchTerm={searchTerm}
              onSearch={handleSearch}
            />
          </div>
          
          <TokenSearchResults
            isLoading={isLoading}
            error={error}
            results={results}
            searchTerm={searchTerm}
            onSelectToken={handleSelectToken}
          />
        </div>
      </main>
      
      {scanAccessData && (
        <ScanLimitDialog
          open={showUpgradeDialog}
          onOpenChange={setShowUpgradeDialog}
          onUpgrade={handleUpgrade}
          plan={scanAccessData.plan}
          scansUsed={scanAccessData.scansUsed}
          scanLimit={scanAccessData.scanLimit}
        />
      )}
      
      <Footer />
    </div>
  );
}
