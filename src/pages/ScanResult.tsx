import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenProfile from "@/components/TokenProfile";
import CategoryTabs from "@/components/CategoryTabs";
import CategoryScoresGrid from "@/components/CategoryScoresGrid";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

enum ScanCategory {
  Security = "security",
  Tokenomics = "tokenomics",
  Liquidity = "liquidity",
  Community = "community",
  Development = "development"
}

export default function ScanResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [scanData, setScanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ScanCategory>(ScanCategory.Security);
  
  // Get parameters from URL
  const tokenAddress = searchParams.get("token") || "";
  const coinGeckoId = searchParams.get("id") || "";
  const isLimited = searchParams.get("limited") === "true";

  // Check if user is pro (simplified logic - could be enhanced with actual subscription check)
  const isPro = isAuthenticated && !isLimited;

  useEffect(() => {
    const loadScanData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("ScanResult: Loading data for token:", tokenAddress, "CoinGecko ID:", coinGeckoId);
        
        if (!tokenAddress) {
          setError("No token address provided");
          return;
        }

        // First, try to get data from localStorage (most recent scan)
        const localStorageData = localStorage.getItem("lastScanResult");
        if (localStorageData) {
          try {
            const parsedData = JSON.parse(localStorageData);
            if (parsedData.token_address === tokenAddress || parsedData.token_info?.coingecko_id === coinGeckoId) {
              console.log("ScanResult: Found recent scan data in localStorage");
              setScanData(parsedData);
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Error parsing localStorage data:", e);
          }
        }

        // If no localStorage data or different token, fetch from database
        console.log("ScanResult: Fetching data from database for token:", tokenAddress);
        
        // Use the actual token address, not the unsupported prefix
        const dbTokenAddress = tokenAddress.startsWith('unsupported-') 
          ? tokenAddress.replace('unsupported-', '') 
          : tokenAddress;

        // Fetch all data from cache tables
        const [
          { data: tokenData, error: tokenError },
          { data: securityData, error: securityError },
          { data: tokenomicsData, error: tokenomicsError },
          { data: liquidityData, error: liquidityError },
          { data: developmentData, error: developmentError },
          { data: communityData, error: communityError }
        ] = await Promise.all([
          supabase.from('token_data_cache').select('*').eq('token_address', dbTokenAddress).single(),
          supabase.from('token_security_cache').select('*').eq('token_address', dbTokenAddress).single(),
          supabase.from('token_tokenomics_cache').select('*').eq('token_address', dbTokenAddress).single(),
          supabase.from('token_liquidity_cache').select('*').eq('token_address', dbTokenAddress).single(),
          supabase.from('token_development_cache').select('*').eq('token_address', dbTokenAddress).single(),
          supabase.from('token_community_cache').select('*').eq('token_address', dbTokenAddress).single()
        ]);

        // Check for errors in critical data
        if (tokenError && tokenError.code !== 'PGRST116') {
          console.error("Error fetching token data:", tokenError);
          throw new Error("Failed to load token data");
        }

        if (!tokenData) {
          console.error("ScanResult: No token data found in database for:", dbTokenAddress);
          
          // Try to get basic info from selectedToken in localStorage
          const selectedTokenData = localStorage.getItem("selectedToken");
          if (selectedTokenData) {
            try {
              const selectedToken = JSON.parse(selectedTokenData);
              if (selectedToken.address === tokenAddress || selectedToken.id === coinGeckoId) {
                console.log("ScanResult: Using basic token info from localStorage");
                const basicScanData = {
                  success: true,
                  token_address: tokenAddress,
                  overall_score: 0,
                  token_info: {
                    name: selectedToken.name,
                    symbol: selectedToken.symbol,
                    logo_url: selectedToken.logo,
                    current_price_usd: selectedToken.price_usd || 0,
                    price_change_24h: selectedToken.price_change_24h || 0,
                    market_cap_usd: selectedToken.market_cap_usd || 0,
                    coingecko_id: selectedToken.id,
                    description: `${selectedToken.name} (${selectedToken.symbol})`,
                    website_url: "",
                    twitter_handle: "",
                    github_url: ""
                  },
                  security: { score: 0, token_address: tokenAddress },
                  tokenomics: { score: 0, token_address: tokenAddress },
                  liquidity: { score: 0, token_address: tokenAddress },
                  development: { score: 0, token_address: tokenAddress },
                  community: { score: 0, token_address: tokenAddress }
                };
                setScanData(basicScanData);
                setLoading(false);
                return;
              }
            } catch (e) {
              console.error("Error parsing selectedToken:", e);
            }
          }
          
          setError("Token not found in our database. Please try scanning the token again.");
          return;
        }

        // Build complete scan data from cache tables
        const completeScanData = {
          success: true,
          token_address: tokenAddress,
          overall_score: [
            securityData?.score || 0,
            tokenomicsData?.score || 0,
            liquidityData?.score || 0,
            developmentData?.score || 0
          ].reduce((acc, score) => acc + score, 0) / 4,
          token_info: tokenData,
          security: securityData || { score: 0, token_address: tokenAddress },
          tokenomics: tokenomicsData || { score: 0, token_address: tokenAddress },
          liquidity: liquidityData || { score: 0, token_address: tokenAddress },
          development: developmentData || { score: 0, token_address: tokenAddress },
          community: communityData || { score: 0, token_address: tokenAddress }
        };

        console.log("ScanResult: Successfully loaded scan data from database");
        setScanData(completeScanData);

      } catch (error) {
        console.error("ScanResult: Error loading scan data:", error);
        setError(error instanceof Error ? error.message : "Failed to load scan results");
      } finally {
        setLoading(false);
      }
    };

    loadScanData();
  }, [tokenAddress, coinGeckoId]);

  const handleCategoryChange = (category: ScanCategory) => {
    setActiveTab(category);
  };

  const handleCategoryClick = (categoryName: string) => {
    const category = categoryName as ScanCategory;
    setActiveTab(category);
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading scan results...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !scanData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold">Failed to load scan results</h1>
              <p className="text-muted-foreground mt-2">
                {error || "Token not found in our database."}
              </p>
              
              <div className="flex gap-4 mt-6">
                <Button variant="outline" onClick={() => navigate("/")}>
                  Back to Search
                </Button>
                <Button onClick={() => window.location.reload()}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tokenInfo = scanData.token_info;
  
  // Calculate overall score from category scores
  const overallScore = [
    scanData.security?.score || 0,
    scanData.tokenomics?.score || 0,
    scanData.liquidity?.score || 0,
    scanData.community?.score || 0,
    scanData.development?.score || 0
  ].reduce((acc, score) => acc + score, 0) / 5;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <TokenProfile 
            name={tokenInfo.name || "Unknown Token"}
            symbol={tokenInfo.symbol || "???"}
            logo={tokenInfo.logo_url || "/placeholder.svg"}
            address={tokenAddress}
            website={tokenInfo.website_url || ""}
            twitter={tokenInfo.twitter_handle ? `https://twitter.com/${tokenInfo.twitter_handle}` : ""}
            github={tokenInfo.github_url || ""}
            price={tokenInfo.current_price_usd || 0}
            priceChange={tokenInfo.price_change_24h || 0}
            marketCap={tokenInfo.market_cap_usd ? tokenInfo.market_cap_usd.toString() : "0"}
            overallScore={overallScore}
            description={tokenInfo.description}
            network="ETH"
          />
          
          <CategoryScoresGrid
            securityScore={scanData.security?.score || 0}
            tokenomicsScore={scanData.tokenomics?.score || 0}
            liquidityScore={scanData.liquidity?.score || 0}
            communityScore={scanData.community?.score || 0}
            developmentScore={scanData.development?.score || 0}
            onCategoryClick={handleCategoryClick}
          />
          
          <CategoryTabs 
            activeTab={activeTab}
            securityData={scanData.security}
            liquidityData={scanData.liquidity}
            tokenomicsData={scanData.tokenomics}
            communityData={scanData.community}
            developmentData={scanData.development}
            isPro={isPro}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
