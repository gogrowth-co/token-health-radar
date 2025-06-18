
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenProfile from "@/components/TokenProfile";
import OverallHealthScore from "@/components/OverallHealthScore";
import CategoryScoresGrid from "@/components/CategoryScoresGrid";
import CategoryTabs from "@/components/CategoryTabs";
import CategoryTabsErrorBoundary from "@/components/CategoryTabsErrorBoundary";
import { toast } from "sonner";

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
  const [scanResult, setScanResult] = useState<any>(null);
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ScanCategory>(ScanCategory.Security);
  const { isAuthenticated } = useAuth();

  const tokenAddress = searchParams.get("token");
  const coinGeckoId = searchParams.get("id");

  useEffect(() => {
    const loadScanResult = () => {
      try {
        const savedResult = localStorage.getItem("lastScanResult");
        const savedToken = localStorage.getItem("selectedToken");
        
        console.log("[SCAN-RESULT] Loading scan result from localStorage");
        console.log("[SCAN-RESULT] Saved result:", savedResult ? JSON.parse(savedResult) : null);
        console.log("[SCAN-RESULT] Saved token:", savedToken ? JSON.parse(savedToken) : null);
        
        if (savedResult) {
          const result = JSON.parse(savedResult);
          console.log("[SCAN-RESULT] Parsed scan result:", result);
          console.log("[SCAN-RESULT] Token info from result:", result.token_info);
          console.log("[SCAN-RESULT] Description from token_info:", result.token_info?.description);
          
          setScanResult(result);
          
          // Set token info with enhanced description handling
          if (result.token_info) {
            const tokenInfo = result.token_info;
            console.log("[SCAN-RESULT] Setting token info:", tokenInfo);
            
            // Enhanced description with fallback
            let description = tokenInfo.description;
            if (!description || description.trim() === '') {
              console.log("[SCAN-RESULT] No description found, creating fallback");
              description = `${tokenInfo.name} is a cryptocurrency token with market presence and active development.`;
            }
            console.log("[SCAN-RESULT] Final description:", description);
            
            setTokenInfo({
              name: tokenInfo.name || "Unknown Token",
              symbol: tokenInfo.symbol || "UNK",
              logo: tokenInfo.logo_url || "",
              address: tokenAddress || "",
              website: tokenInfo.website_url || "",
              twitter: tokenInfo.twitter_handle || "",
              github: tokenInfo.github_url || "",
              price: tokenInfo.current_price_usd || 0,
              priceChange: tokenInfo.price_change_24h || 0,
              marketCap: (tokenInfo.market_cap_usd || 0).toString(),
              description: description,
              network: "ETH"
            });
          }
        } else if (savedToken) {
          const parsedToken = JSON.parse(savedToken);
          console.log("[SCAN-RESULT] No scan result found, using saved token:", parsedToken);
          
          setTokenInfo({
            name: parsedToken.name || "Unknown Token",
            symbol: parsedToken.symbol || "UNK",
            logo: parsedToken.logo || "",
            address: parsedToken.address || "",
            website: "",
            twitter: "",
            github: "",
            price: parsedToken.price_usd || 0,
            priceChange: parsedToken.price_change_24h || 0,
            marketCap: (parsedToken.market_cap_usd || 0).toString(),
            description: "No detailed scan available for this token.",
            network: "ETH"
          });
        }
      } catch (error) {
        console.error("[SCAN-RESULT] Error loading scan result:", error);
        toast.error("Failed to load scan results");
        navigate("/");
      }
    };

    if (!tokenAddress || !coinGeckoId) {
      console.warn("[SCAN-RESULT] Token address or CoinGecko ID missing");
      toast.error("Token address or CoinGecko ID is missing");
      navigate("/");
      return;
    }

    loadScanResult();
  }, [tokenAddress, coinGeckoId, navigate]);

  const handleCategoryClick = (category: string) => {
    setActiveTab(category as ScanCategory);
  };

  // Extract scores from scan result
  const getScores = () => {
    if (!scanResult) {
      return {
        overall: 0,
        security: 0,
        tokenomics: 0,
        liquidity: 0,
        community: 0,
        development: 0
      };
    }

    return {
      overall: scanResult.score_total || 0,
      security: scanResult.security_data?.score || 0,
      tokenomics: scanResult.tokenomics_data?.score || 0,
      liquidity: scanResult.liquidity_data?.score || 0,
      community: scanResult.community_data?.score || 0,
      development: scanResult.development_data?.score || 0
    };
  };

  const scores = getScores();

  // Check if user has pro access (simplified for now)
  const isPro = false; // This should be determined by user's subscription status

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container px-4 py-8">
        {tokenInfo ? (
          <div className="space-y-8">
            {/* Token Profile Card */}
            <TokenProfile
              name={tokenInfo.name}
              symbol={tokenInfo.symbol}
              logo={tokenInfo.logo}
              address={tokenInfo.address}
              website={tokenInfo.website}
              twitter={tokenInfo.twitter}
              github={tokenInfo.github}
              price={tokenInfo.price}
              priceChange={tokenInfo.priceChange}
              marketCap={tokenInfo.marketCap}
              description={tokenInfo.description}
              network={tokenInfo.network}
              overallScore={scores.overall}
            />

            {/* Overall Health Score */}
            {scanResult && (
              <div className="flex justify-center">
                <OverallHealthScore score={scores.overall} />
              </div>
            )}

            {/* Category Scores Grid */}
            {scanResult && (
              <CategoryScoresGrid
                securityScore={scores.security}
                tokenomicsScore={scores.tokenomics}
                liquidityScore={scores.liquidity}
                communityScore={scores.community}
                developmentScore={scores.development}
                onCategoryClick={handleCategoryClick}
              />
            )}

            {/* Category Tabs with Error Boundary */}
            {scanResult && (
              <CategoryTabsErrorBoundary>
                <CategoryTabs
                  activeTab={activeTab}
                  securityData={scanResult.security_data}
                  tokenomicsData={scanResult.tokenomics_data}
                  liquidityData={scanResult.liquidity_data}
                  communityData={scanResult.community_data}
                  developmentData={scanResult.development_data}
                  isPro={isPro}
                  onCategoryChange={setActiveTab}
                />
              </CategoryTabsErrorBoundary>
            )}
          </div>
        ) : (
          <div className="text-center">Loading scan results...</div>
        )}
      </main>
      <Footer />
    </div>
  );
}
