
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
const MIN_API_CALL_INTERVAL = 500; // milliseconds between calls

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
  const isValidErc20Token = (platforms: Record<string, string> | undefined): boolean => {
    // Check if platforms exists and has an ethereum property with a valid address format
    if (!platforms) return false;
    
    const ethereumAddress = platforms.ethereum;
    
    // Valid Ethereum address must be a string and match the general address format (0x followed by 40 hex characters)
    const isValid = typeof ethereumAddress === "string" && 
                   ethereumAddress.length > 0 && 
                   /^(0x)?[0-9a-fA-F]{40}$/i.test(ethereumAddress.trim());
    
    return isValid;
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

  // Search for tokens when the component loads
  useEffect(() => {
    const searchTokens = async () => {
      if (!searchTerm || !isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log("Searching for token:", searchTerm);
        
        // Simple client-side rate limiting to prevent API overload
        const now = Date.now();
        if (now - lastApiCallTime < MIN_API_CALL_INTERVAL) {
          await new Promise(resolve => 
            setTimeout(resolve, MIN_API_CALL_INTERVAL - (now - lastApiCallTime))
          );
        }
        lastApiCallTime = Date.now();
        
        // Call CoinGecko API to search for tokens with proper headers
        const response = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchTerm)}`,
          {
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            }
          }
        );

        if (response.status === 429) {
          throw new Error("API rate limit reached. Please try again in a few moments.");
        }

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        
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
          
          // Enhanced results with full token data
          // Add delay between requests to avoid rate limiting
          const enhancedResults = [];
          for (const coin of topCoins) {
            try {
              // Add delay between detail requests
              if (enhancedResults.length > 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              // Get detailed coin data with proper headers
              const detailResponse = await fetch(
                `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`,
                {
                  headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  }
                }
              );
              
              if (detailResponse.status === 429) {
                console.warn(`Rate limit hit for ${coin.id}, skipping details`);
                // Add basic data without details
                enhancedResults.push({
                  ...coin,
                  isErc20: false // Default to false without details
                });
                continue;
              }
              
              if (detailResponse.ok) {
                const detailData = await detailResponse.json();
                
                // Extract platforms data safely
                const platforms = detailData.platforms || {};
                
                // Use the helper function to determine ERC-20 compatibility
                const isErc20Compatible = isValidErc20Token(platforms);
                
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
              } else {
                // If details request fails, add basic data
                enhancedResults.push({...coin, isErc20: false});
              }
            } catch (err) {
              console.error(`Error fetching details for ${coin.id}:`, err);
              enhancedResults.push({...coin, isErc20: false});
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
          : "Failed to fetch token data. Please try again later.";
          
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
