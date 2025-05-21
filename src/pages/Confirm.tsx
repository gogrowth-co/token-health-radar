
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenCard from "@/components/TokenCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface TokenResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  thumb: string;
  large?: string;
  platforms?: Record<string, string>;
}

export default function Confirm() {
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get("token") || "");
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Store the search query in localStorage so we can use it after login
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
        // Call CoinGecko API to search for tokens
        const response = await fetch(
          `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(searchTerm)}`
        );

        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data && data.coins) {
          // Enhanced results with full token data
          const enhancedResults = await Promise.all(
            data.coins.slice(0, 5).map(async (coin: any) => {
              try {
                // Get detailed coin data including platform addresses
                const detailResponse = await fetch(
                  `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`
                );
                
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  return {
                    ...coin,
                    platforms: detailData.platforms || {}
                  };
                }
                return coin;
              } catch (err) {
                console.error(`Error fetching details for ${coin.id}:`, err);
                return coin;
              }
            })
          );
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error("Empty search", {
        description: "Please enter a token name"
      });
      return;
    }
    
    // Update URL with new search term
    navigate(`/confirm?token=${encodeURIComponent(searchTerm)}`);
  };

  const handleSelectToken = (token: TokenResult) => {
    // Get Ethereum address if available
    let tokenAddress = "";
    
    // Check if platforms is available and has Ethereum address
    if (token.platforms && token.platforms.ethereum) {
      tokenAddress = token.platforms.ethereum;
      console.log(`Found Ethereum address: ${tokenAddress} for token ${token.name}`);
    }
    
    // If no Ethereum address, use a placeholder derived from the token id
    if (!tokenAddress) {
      console.warn(`No Ethereum address found for ${token.name}, using placeholder`);
      // Create a more consistent placeholder format for testing
      tokenAddress = `0x${token.id.replace(/-/g, '').substring(0, 38).padEnd(38, '0')}`;
    }
    
    console.log(`Selected token: ${token.name}, address: ${tokenAddress}, id: ${token.id}`);
    
    // Save token info to localStorage for persistence
    localStorage.setItem("selectedToken", JSON.stringify({
      address: tokenAddress,
      id: token.id,
      name: token.name,
      symbol: token.symbol,
      logo: token.large || token.thumb
    }));
    
    navigate(`/scan-loading?token=${tokenAddress}&id=${token.id}`);
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
            <form onSubmit={handleSearch}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search token name"
                  className="pl-9"
                />
              </div>
            </form>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p>Searching for tokens...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">{error}</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/")}
              >
                Try a different search
              </Button>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-4">
              {results.map((token) => (
                <TokenCard
                  key={token.id}
                  name={token.name}
                  symbol={token.symbol.toUpperCase()}
                  logo={token.large || token.thumb}
                  marketCap={token.market_cap_rank ? `Rank #${token.market_cap_rank}` : "Unranked"}
                  price={undefined}
                  onClick={() => handleSelectToken(token)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              {searchTerm ? (
                <p className="text-muted-foreground">No tokens found matching "{searchTerm}"</p>
              ) : (
                <p className="text-muted-foreground">Enter a token name to search</p>
              )}
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/")}
              >
                Try a different search
              </Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
