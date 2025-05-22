
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
        
        // Call CoinGecko API to search for tokens
        const response = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchTerm)}`
        );

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
          const enhancedResults = await Promise.all(
            topCoins.map(async (coin: any) => {
              try {
                // Get detailed coin data
                const detailResponse = await fetch(
                  `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`
                );
                
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  
                  // Check if token is ERC-20 (has Ethereum address)
                  const isErc20 = detailData.platforms && 
                                  detailData.platforms.ethereum && 
                                  detailData.platforms.ethereum.length > 0;
                  
                  console.log(`Token ${coin.id} ERC-20 status:`, isErc20 ? "Compatible" : "Not compatible");
                  
                  // Return enhanced coin data
                  return {
                    ...coin,
                    platforms: detailData.platforms || {},
                    price_usd: detailData.market_data?.current_price?.usd || 0,
                    price_change_24h: detailData.market_data?.price_change_percentage_24h || 0,
                    market_cap: detailData.market_data?.market_cap?.usd || 0,
                    isErc20: isErc20
                  };
                }
                return {...coin, isErc20: false};
              } catch (err) {
                console.error(`Error fetching details for ${coin.id}:`, err);
                return {...coin, isErc20: false};
              }
            })
          );
          console.log("Enhanced token results:", enhancedResults);
          setResults(enhancedResults);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Error fetching token data:", err);
        setError("Failed to fetch token data. Please try again later.");
        toast.error("Search Error", {
          description: "Could not fetch token information. Please try again later."
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
