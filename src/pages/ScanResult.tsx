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

        // Only use maybeSingle - never .single() (lets us check for DB results cleanly)
        const [
          { data: tokenData, error: tokenError },
          { data: securityData }, // error logging handled below
          { data: tokenomicsData },
          { data: liquidityData },
          { data: developmentData },
          { data: communityData }
        ] = await Promise.all([
          supabase.from('token_data_cache').select('*').eq('token_address', tokenAddress).maybeSingle(),
          supabase.from('token_security_cache').select('*').eq('token_address', tokenAddress).maybeSingle(),
          supabase.from('token_tokenomics_cache').select('*').eq('token_address', tokenAddress).maybeSingle(),
          supabase.from('token_liquidity_cache').select('*').eq('token_address', tokenAddress).maybeSingle(),
          supabase.from('token_development_cache').select('*').eq('token_address', tokenAddress).maybeSingle(),
          supabase.from('token_community_cache').select('*').eq('token_address', tokenAddress).maybeSingle(),
        ]);

        // Explicit logs for debugging
        console.log("[DB] token_data_cache result:", tokenData);
        console.log("[DB] token_security_cache result:", securityData);
        console.log("[DB] token_tokenomics_cache result:", tokenomicsData);
        console.log("[DB] token_liquidity_cache result:", liquidityData);
        console.log("[DB] token_development_cache result:", developmentData);
        console.log("[DB] token_community_cache result:", communityData);

        // If ANY critical field exists in tokenData, use DB; else fallback to localStorage
        if (tokenData && (tokenData.name || tokenData.symbol || tokenData.current_price_usd)) {
          setScanData({
            success: true,
            token_address: tokenAddress,
            overall_score: [
              securityData?.score || 0,
              tokenomicsData?.score || 0,
              liquidityData?.score || 0,
              communityData?.score || 0,
              developmentData?.score || 0
            ].reduce((acc, score) => acc + score, 0) / 5,
            token_info: tokenData,
            security: securityData || { score: 0, token_address: tokenAddress },
            tokenomics: tokenomicsData || { score: 0, token_address: tokenAddress },
            liquidity: liquidityData || { score: 0, token_address: tokenAddress },
            development: developmentData || { score: 0, token_address: tokenAddress },
            community: communityData || { score: 0, token_address: tokenAddress },
          });
          setLoading(false);
          return;
        }

        // Fallback: Try to get token info from localStorage (only if DB really has nothing)
        const selectedTokenData = localStorage.getItem("selectedToken");
        if (selectedTokenData) {
          try {
            const selectedToken = JSON.parse(selectedTokenData);
            if (selectedToken.address === tokenAddress || selectedToken.id === coinGeckoId) {
              setScanData({
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
              });
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error("Error parsing selectedToken from localStorage:", e);
          }
        }

        setError("Token not found in our database. Please try scanning the token again.");
        setLoading(false);
      } catch (error) {
        console.error("ScanResult: Error loading scan data:", error);
        setError(error instanceof Error ? error.message : "Failed to load scan results");
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

  if (!scanData) {
    // Should never happen - fallback
    return null;
  }

  const tokenInfo = scanData.token_info;

  // Display logic: use DB values, fallback to empty string/0 if not found
  const properName = tokenInfo?.name || "";
  const properSymbol = tokenInfo?.symbol || "";
  const properLogo = tokenInfo?.logo_url || "/placeholder.svg";
  const properWebsite = tokenInfo?.website_url || "";
  const properTwitter = tokenInfo?.twitter_handle
    ? `https://twitter.com/${tokenInfo.twitter_handle}`
    : "";
  const properGithub = tokenInfo?.github_url || "";
  const properPrice = typeof tokenInfo?.current_price_usd === "number"
    ? tokenInfo.current_price_usd : 0;
  const properPriceChange = typeof tokenInfo?.price_change_24h === "number"
    ? tokenInfo.price_change_24h : 0;
  const properMarketCap = typeof tokenInfo?.market_cap_usd === "number"
    ? tokenInfo.market_cap_usd.toString() : "0";
  const properDescription = tokenInfo?.description || "";
  const networkName = "ETH";

  // Calculate the overall score (use all categories, weighted equally)
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

      <main className="flex-1 container px-4 py-8 pb-24">
        <div className="max-w-6xl mx-auto space-y-8">
          <TokenProfile
            name={properName}
            symbol={properSymbol}
            logo={properLogo}
            address={tokenAddress}
            website={properWebsite}
            twitter={properTwitter}
            github={properGithub}
            price={properPrice}
            priceChange={properPriceChange}
            marketCap={properMarketCap}
            overallScore={overallScore}
            description={properDescription}
            network={networkName}
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

      {/* Sticky CTA at bottom for non-pro users */}
      {!isPro && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Want the full picture? Create a free account to unlock detailed risk insights.
                </p>
              </div>
              <Button 
                onClick={() => navigate('/auth')}
                className="ml-4"
              >
                Create Free Account
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
