
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenProfile from "@/components/TokenProfile";
import CategoryTabs from "@/components/CategoryTabs";
import CategoryScoresGrid from "@/components/CategoryScoresGrid";
import ScanLimitIndicator from "@/components/ScanLimitIndicator";
import UpgradeModal from "@/components/UpgradeModal";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkUserHasProAccess } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchCoinGeckoTokenByAddress, fetchCoinGeckoTokenById, formatCoinGeckoDescription } from "@/utils/coinGeckoAPI";

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
  const isMobile = useIsMobile();
  const [scanData, setScanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ScanCategory>(ScanCategory.Security);
  const [scanLimitData, setScanLimitData] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [coinGeckoDescription, setCoinGeckoDescription] = useState<string>('');
  
  // Get parameters from URL
  const tokenAddress = searchParams.get("token") || "";
  const coinGeckoId = searchParams.get("id") || "";
  const isLimited = searchParams.get("limited") === "true";

  // Check user's scan access status
  useEffect(() => {
    const checkScanAccess = async () => {
      if (isAuthenticated) {
        try {
          const accessData = await checkUserHasProAccess();
          setScanLimitData(accessData);
        } catch (error) {
          console.error("Error checking scan access:", error);
        }
      }
    };

    checkScanAccess();
  }, [isAuthenticated]);

  // Fetch CoinGecko description for TokenProfile override
  useEffect(() => {
    const fetchCoinGeckoDescription = async () => {
      if (!tokenAddress && !coinGeckoId) return;
      
      try {
        console.log('[SCAN-RESULT] Fetching CoinGecko description for TokenProfile override');
        
        let coinGeckoData = null;
        
        // Try by CoinGecko ID first, then by token address
        if (coinGeckoId) {
          coinGeckoData = await fetchCoinGeckoTokenById(coinGeckoId);
        }
        
        if (!coinGeckoData && tokenAddress) {
          coinGeckoData = await fetchCoinGeckoTokenByAddress(tokenAddress);
        }
        
        if (coinGeckoData && coinGeckoData.description?.en) {
          const formattedDesc = formatCoinGeckoDescription(coinGeckoData.description.en);
          if (formattedDesc) {
            console.log('[SCAN-RESULT] Successfully fetched CoinGecko description:', formattedDesc.substring(0, 100) + '...');
            setCoinGeckoDescription(formattedDesc);
          }
        }
        
      } catch (error) {
        console.error('[SCAN-RESULT] Error fetching CoinGecko description:', error);
        // Silently fail - will use database description as fallback
      }
    };

    fetchCoinGeckoDescription();
  }, [tokenAddress, coinGeckoId]);

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

        console.log("ScanResult: User authenticated:", isAuthenticated, "User ID:", user?.id);

        // Load scan data from database with better error handling
        try {
          // First try to get token data - this is the primary table
          const { data: tokenData, error: tokenError } = await supabase
            .from('token_data_cache')
            .select('*')
            .eq('token_address', tokenAddress)
            .maybeSingle();

          if (tokenError) {
            console.error("[DB] token_data_cache query failed:", tokenError);
            throw new Error(`Failed to load token data: ${tokenError.message}`);
          }

          if (!tokenData) {
            console.warn("[DB] No token data found for address:", tokenAddress);
            
            // Try fallback to localStorage
            const selectedTokenData = localStorage.getItem("selectedToken");
            if (selectedTokenData) {
              try {
                const selectedToken = JSON.parse(selectedTokenData);
                if (selectedToken.address === tokenAddress || selectedToken.id === coinGeckoId) {
                  console.log("ScanResult: Using fallback data from localStorage");
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
            
            setError("Token not found. Please try scanning the token again.");
            setLoading(false);
            return;
          }

          console.log("[DB] Token data found:", tokenData);

          // Now load all cache data
          const cacheQueries = [
            { name: 'security', query: supabase.from('token_security_cache').select('*').eq('token_address', tokenAddress).maybeSingle() },
            { name: 'tokenomics', query: supabase.from('token_tokenomics_cache').select('*').eq('token_address', tokenAddress).maybeSingle() },
            { name: 'liquidity', query: supabase.from('token_liquidity_cache').select('*').eq('token_address', tokenAddress).maybeSingle() },
            { name: 'development', query: supabase.from('token_development_cache').select('*').eq('token_address', tokenAddress).maybeSingle() },
            { name: 'community', query: supabase.from('token_community_cache').select('*').eq('token_address', tokenAddress).maybeSingle() }
          ];

          const cacheResults = await Promise.allSettled(cacheQueries.map(q => q.query));
          
          // Process cache results with proper error handling
          const cacheData: any = {};
          let hasValidScores = false;
          
          cacheResults.forEach((result, index) => {
            const cacheName = cacheQueries[index].name;
            
            if (result.status === 'rejected') {
              console.error(`[DB] ${cacheName} cache query failed:`, result.reason);
              cacheData[cacheName] = { score: 0, token_address: tokenAddress };
            } else {
              const { data, error } = result.value;
              if (error) {
                console.error(`[DB] ${cacheName} cache error:`, error);
                cacheData[cacheName] = { score: 0, token_address: tokenAddress };
              } else {
                cacheData[cacheName] = data || { score: 0, token_address: tokenAddress };
                if (data && data.score && data.score > 0) {
                  hasValidScores = true;
                }
              }
            }
          });

          // Calculate overall score from valid scores only
          const scores = [
            cacheData.security?.score || 0,
            cacheData.tokenomics?.score || 0,
            cacheData.liquidity?.score || 0,
            cacheData.development?.score || 0,
            cacheData.community?.score || 0
          ].filter(score => score > 0);
          
          const overallScore = scores.length > 0 
            ? Math.round(scores.reduce((acc, curr) => acc + curr, 0) / scores.length)
            : 0;

          console.log("ScanResult: Calculated overall score:", overallScore, "from scores:", scores);
          
          setScanData({
            success: true,
            token_address: tokenAddress,
            overall_score: overallScore,
            token_info: tokenData,
            security: cacheData.security,
            tokenomics: cacheData.tokenomics,
            liquidity: cacheData.liquidity,
            development: cacheData.development,
            community: cacheData.community,
          });
          
        } catch (dbError) {
          console.error("ScanResult: Database query error:", dbError);
          setError(dbError instanceof Error ? dbError.message : "Failed to load scan data from database");
        }

        setLoading(false);
      } catch (error) {
        console.error("ScanResult: Error loading scan data:", error);
        setError(error instanceof Error ? error.message : "Failed to load scan results");
        setLoading(false);
      }
    };

    loadScanData();
  }, [tokenAddress, coinGeckoId, user, isAuthenticated]);

  const handleCategoryChange = (category: ScanCategory) => {
    setActiveTab(category);
  };

  const handleCategoryClick = (categoryName: string) => {
    const category = categoryName as ScanCategory;
    setActiveTab(category);
  };

  // Determine isPro based on user status and scan limits
  const isPro = () => {
    if (!isAuthenticated) return false; // Anonymous users never get Pro view
    if (isLimited) return false; // Explicitly limited
    if (!scanLimitData) return true; // Default to Pro if no limit data (safety)
    return scanLimitData.hasPro; // Use the actual check result
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className={isMobile ? "text-sm" : "text-base"}>Loading scan results...</p>
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
          <div className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'} text-center space-y-6`}>
            <div className="flex flex-col items-center">
              <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4`}>
                <AlertCircle className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-red-500`} />
              </div>
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>Failed to load scan results</h1>
              <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                {error || "Token scan data not available."}
              </p>
              
              <div className={`flex ${isMobile ? 'flex-col w-full' : 'flex-row'} gap-4 mt-6`}>
                <Button variant="outline" onClick={() => navigate("/")} className={isMobile ? 'w-full' : ''}>
                  Back to Search
                </Button>
                <Button onClick={() => window.location.reload()} className={isMobile ? 'w-full' : ''}>
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
  
  // Use CoinGecko description if available, otherwise fallback to database description
  const properDescription = coinGeckoDescription || tokenInfo?.description || "";
  const networkName = "ETH";

  // Use the calculated overall score from the scan data
  const overallScore = scanData.overall_score || 0;

  console.log("ScanResult: Displaying scores:", {
    overall: overallScore,
    security: scanData.security?.score,
    tokenomics: scanData.tokenomics?.score,
    liquidity: scanData.liquidity?.score,
    community: scanData.community?.score,
    development: scanData.development?.score
  });

  console.log("ScanResult: Using description source:", coinGeckoDescription ? 'CoinGecko' : 'Database');

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className={`flex-1 container px-4 ${isMobile ? 'py-4 pb-32' : 'py-8 pb-24'}`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-6xl'} mx-auto space-y-${isMobile ? '6' : '8'}`}>
          {/* Show scan limit indicator for authenticated users */}
          {isAuthenticated && scanLimitData && (
            <ScanLimitIndicator
              scansUsed={scanLimitData.scansUsed || 0}
              scanLimit={scanLimitData.scanLimit || 3}
              plan={scanLimitData.plan || 'free'}
              className="mb-4"
            />
          )}

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
            isPro={isPro()}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </main>

      {/* Sticky CTA at bottom for non-pro users */}
      {!isPro() && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="container mx-auto max-w-6xl">
            <div className={`flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
              <div className={`${isMobile ? 'text-center' : 'flex-1'}`}>
                <p className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium text-gray-900 dark:text-white`}>
                  {!isAuthenticated 
                    ? "Want the full picture? Create a free account to unlock detailed risk insights."
                    : "Upgrade to Pro for unlimited detailed scans and advanced features."
                  }
                </p>
              </div>
              <Button 
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/auth');
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className={`${isMobile ? 'w-full' : 'ml-4'}`}
                size={isMobile ? 'lg' : 'default'}
              >
                {!isAuthenticated ? 'Create Free Account' : 'Upgrade to Pro'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        scansUsed={scanLimitData?.scansUsed || 0}
        scanLimit={scanLimitData?.scanLimit || 3}
        plan={scanLimitData?.plan || 'free'}
        isAnonymous={!isAuthenticated}
      />

      <Footer />
    </div>
  );
}
