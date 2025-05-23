import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase, handleSupabaseError } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenProfile from "@/components/TokenProfile";
import TokenCard from "@/components/TokenCard";
import CategoryScoreCard from "@/components/CategoryScoreCard";
import CategoryTabs from "@/components/CategoryTabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define the types for token data
interface TokenData {
  token_address: string;
  name: string;
  symbol: string;
  description: string;
  website_url: string;
  twitter_handle: string;
  github_url: string;
  logo_url: string;
  coingecko_id: string;
  launch_date: string;
  created_at: string;
  current_price_usd?: number;
  price_usd?: number;
  price_change_24h?: number;
  market_cap_usd?: number | string;
  total_value_locked_usd?: string;
}

// Define the types for security data
interface SecurityData {
  token_address: string;
  score: number | null;
  ownership_renounced: boolean | null;
  audit_status: string | null;
  multisig_status: string | null;
  honeypot_detected: boolean | null;
  freeze_authority: boolean | null;
  can_mint: boolean | null;
}

// Define the types for tokenomics data
interface TokenomicsData {
  token_address: string;
  score: number | null;
  circulating_supply: number | null;
  supply_cap: number | null;
  tvl_usd: number | null;
  vesting_schedule: string | null;
  distribution_score: string | null;
  treasury_usd: number | null;
  burn_mechanism: boolean | null;
}

// Define the types for liquidity data
interface LiquidityData {
  token_address: string;
  score: number | null;
  liquidity_locked_days: number | null;
  cex_listings: number | null;
  trading_volume_24h_usd: number | null;
  holder_distribution: string | null;
  dex_depth_status: string | null;
}

// Define the types for community data
interface CommunityData {
  token_address: string;
  score: number | null;
  twitter_followers: number | null;
  twitter_verified: boolean | null;
  twitter_growth_7d: number | null;
  telegram_members: number | null;
  discord_members: number | null;
  active_channels: string[] | null;
  team_visibility: string | null;
}

// Define the types for development data
interface DevelopmentData {
  token_address: string;
  score: number | null;
  github_repo: string | null;
  is_open_source: boolean | null;
  contributors_count: number | null;
  commits_30d: number | null;
  last_commit: string | null;
  roadmap_progress: string | null;
}

// Define the enum for scan category
enum ScanCategory {
  Security = "security",
  Tokenomics = "tokenomics",
  Liquidity = "liquidity",
  Community = "community",
  Development = "development"
}

// Helper function to determine score level
const getScoreLevel = (score: number): 'low' | 'medium' | 'high' => {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
};

// Helper function to determine score color
const getScoreColor = (score: number): 'red' | 'amber' | 'green' => {
  if (score >= 70) return 'green';
  if (score >= 40) return 'amber';
  return 'red';
};

// The main component
export default function ScanResult() {
  // State management
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [tokenomicsData, setTokenomicsData] = useState<TokenomicsData | null>(null);
  const [liquidityData, setLiquidityData] = useState<LiquidityData | null>(null);
  const [communityData, setCommunityData] = useState<CommunityData | null>(null);
  const [developmentData, setDevelopmentData] = useState<DevelopmentData | null>(null);
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [coinGeckoId, setCoinGeckoId] = useState<string>("");  
  const [isPro, setIsPro] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ScanCategory>(ScanCategory.Security);
  const [isRescanning, setIsRescanning] = useState<boolean>(false);
  
  // Navigation and authentication
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Calculate the overall score
  const calculateOverallScore = (): number => {
    const scores = [
      securityData?.score, 
      tokenomicsData?.score,
      liquidityData?.score,
      communityData?.score,
      developmentData?.score
    ];
    
    // Filter out null and undefined scores
    const validScores = scores.filter(score => score !== null && score !== undefined) as number[];
    
    if (validScores.length === 0) return 0;
    
    // Calculate the average and round to the nearest integer
    return Math.round(validScores.reduce((acc, curr) => acc + curr, 0) / validScores.length);
  };

  // Check if scan access is allowed
  const checkScanAccess = async (tokenAddress: string): Promise<void> => {
    if (!isAuthenticated) {
      console.log("User not authenticated, setting isPro to false");
      setIsPro(false);
      return;
    }

    try {
      console.log("Checking scan access for token:", tokenAddress);
      const { data, error } = await supabase.functions.invoke("check-scan-access", {
        body: {
          token_address: tokenAddress
        }
      });

      if (error) {
        console.error("Error checking scan access:", error);
        throw error;
      }
      
      console.log("Scan access response:", data);
      setIsPro(data.hasPro);
      
      // New: Check if the user previously completed a Pro scan for this token
      if (user && tokenAddress && !data.hasPro) {
        console.log("Checking for previous Pro scans of this token");
        const { data: latestScan, error: scanError } = await supabase
          .from("token_scans")
          .select("pro_scan")
          .eq("token_address", tokenAddress)
          .eq("user_id", user.id)
          .order("scanned_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (scanError) {
          console.error("Error checking previous scans:", scanError);
        } else if (latestScan?.pro_scan) {
          console.log("Found previous Pro scan, granting Pro access to this result");
          setIsPro(true); // Override access control for previously completed Pro scans
        }
      }
    } catch (error) {
      console.error("Error checking scan access:", error);
      toast.error("Error checking access level", {
        description: "Unable to verify your subscription status. Some features might be limited."
      });
      setIsPro(false);
    }
  };

  // Fetch token scan data with improved error handling and debugging
  const fetchTokenScanData = async (tokenAddress: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("ScanResult: Fetching token scan data for:", tokenAddress);
      
      // Validate token address format
      const isValidAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(tokenAddress);
      if (!isValidAddress) {
        console.error("ScanResult: Invalid token address format:", tokenAddress);
        throw new Error("Invalid token address format");
      }
      
      // Try to get data from localStorage first
      const cachedData = localStorage.getItem("lastScanResult");
      let localCacheUsed = false;
      
      if (cachedData) {
        try {
          const parsedData = JSON.parse(cachedData);
          console.log("ScanResult: Found cached scan result:", parsedData);
          
          if (parsedData.token_address === tokenAddress) {
            // Use cached data if available
            setTokenData(parsedData);
            localCacheUsed = true;
            console.log("ScanResult: Using local cache for initial data");
          }
        } catch (err) {
          console.error("ScanResult: Error parsing cached data:", err);
          // Continue with database fetch if cache parsing fails
        }
      }
      
      // Fetch basic token data from the database
      console.log("ScanResult: Fetching token data from database for:", tokenAddress);
      const { data: basicData, error: basicError } = await supabase
        .from("token_data_cache")
        .select("*")
        .eq("token_address", tokenAddress)
        .maybeSingle();
        
      if (basicError) {
        console.error("ScanResult: Error fetching token data:", basicError);
        throw new Error(handleSupabaseError(basicError, "Failed to fetch token data"));
      }
      
      if (!basicData && !localCacheUsed) {
        console.log("ScanResult: Token not found in database, and no cache available");
        throw new Error("Token not found in our database");
      } 
      
      if (basicData) {
        console.log("ScanResult: Received token data from database:", basicData);
        
        // Create the enhanced TokenData with fallback values for potentially missing fields
        const enhancedTokenData: TokenData = {
          ...basicData,
          current_price_usd: basicData.current_price_usd || 0,
          price_usd: basicData.current_price_usd || 0,
          price_change_24h: basicData.price_change_24h || 0,
          market_cap_usd: basicData.market_cap_usd || "0",
          total_value_locked_usd: basicData.total_value_locked_usd || "N/A"
        };
        
        setTokenData(enhancedTokenData);
      }
      
      // Log fetch attempt for category data
      console.log("ScanResult: Fetching category data for token:", tokenAddress);
      
      // Fetch all category data in parallel with improved error handling
      const [
        securityResult,
        tokenomicsResult,
        liquidityResult,
        communityResult,
        developmentResult
      ] = await Promise.all([
        supabase.from("token_security_cache").select("*").eq("token_address", tokenAddress).maybeSingle(),
        supabase.from("token_tokenomics_cache").select("*").eq("token_address", tokenAddress).maybeSingle(),
        supabase.from("token_liquidity_cache").select("*").eq("token_address", tokenAddress).maybeSingle(),
        supabase.from("token_community_cache").select("*").eq("token_address", tokenAddress).maybeSingle(),
        supabase.from("token_development_cache").select("*").eq("token_address", tokenAddress).maybeSingle()
      ]);
      
      // Log each category result for debugging
      console.log("ScanResult: Security data result:", securityResult);
      console.log("ScanResult: Tokenomics data result:", tokenomicsResult);
      console.log("ScanResult: Liquidity data result:", liquidityResult);
      console.log("ScanResult: Community data result:", communityResult);
      console.log("ScanResult: Development data result:", developmentResult);
      
      // Handle potential errors in category data fetching
      if (securityResult.error) console.error("ScanResult: Error fetching security data:", securityResult.error);
      if (tokenomicsResult.error) console.error("ScanResult: Error fetching tokenomics data:", tokenomicsResult.error);
      if (liquidityResult.error) console.error("ScanResult: Error fetching liquidity data:", liquidityResult.error);
      if (communityResult.error) console.error("ScanResult: Error fetching community data:", communityResult.error);
      if (developmentResult.error) console.error("ScanResult: Error fetching development data:", developmentResult.error);
      
      // Set data with null fallbacks if there are errors
      if (securityResult.data) setSecurityData(securityResult.data);
      if (tokenomicsResult.data) setTokenomicsData(tokenomicsResult.data);
      if (liquidityResult.data) setLiquidityData(liquidityResult.data);
      if (communityResult.data) setCommunityData(communityResult.data);
      if (developmentResult.data) setDevelopmentData(developmentResult.data);
      
    } catch (err) {
      console.error("ScanResult: Error in fetchTokenScanData:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      toast.error("Failed to load scan results", {
        description: err instanceof Error ? err.message : "Please try again later"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle rescan action with improved error handling and debugging
  const handleRescan = async () => {
    if (!tokenAddress) {
      toast.error("No token address provided");
      return;
    }
    
    // Validate token address format before rescan
    const isValidAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(tokenAddress);
    if (!isValidAddress) {
      toast.error("Invalid token address format");
      return;
    }
    
    setIsRescanning(true);
    
    try {
      console.log("ScanResult: Rescanning token:", tokenAddress, "with CoinGecko ID:", coinGeckoId);
      
      const { data, error } = await supabase.functions.invoke("run-token-scan", {
        body: { 
          token_address: tokenAddress,
          user_id: user?.id,
          coingecko_id: coinGeckoId
        }
      });
      
      if (error) {
        console.error("ScanResult: Error in rescan function:", error);
        throw new Error(handleSupabaseError(error, "Failed to rescan token"));
      }
      
      console.log("ScanResult: Rescan result:", data);
      toast.success("Token rescanned successfully", {
        description: "The latest data has been loaded."
      });
      
      // Update localStorage with new scan result - handle different response formats
      if (data.token_info) {
        localStorage.setItem("lastScanResult", JSON.stringify(data.token_info));
      } else {
        localStorage.setItem("lastScanResult", JSON.stringify(data));
      }
      
      // Reload the data
      await fetchTokenScanData(tokenAddress);
    } catch (error) {
      console.error("ScanResult: Error rescanning token:", error);
      toast.error("Failed to rescan token", {
        description: error instanceof Error ? error.message : "Please try again later"
      });
    } finally {
      setIsRescanning(false);
    }
  };

  // Initialize component on load
  useEffect(() => {
    // Get the token parameter - consistent naming across the app
    const token = searchParams.get("token");
    const id = searchParams.get("id");
    
    console.log("ScanResult: Initializing with parameters:", { token, id });
    
    if (!token) {
      console.error("ScanResult: No token address provided");
      setError("No token address provided");
      setIsLoading(false);
      return;
    }
    
    // CRITICAL: Validate token address format early
    const isValidAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(token);
    if (!isValidAddress) {
      console.error("ScanResult: Invalid token address format:", token);
      setError("Invalid token address format");
      setIsLoading(false);
      return;
    }
    
    setTokenAddress(token);
    if (id) setCoinGeckoId(id);
    
    console.log("ScanResult: Starting scan for token:", token, "with CoinGecko ID:", id || "none");
    
    const loadData = async () => {
      try {
        await checkScanAccess(token);
        await fetchTokenScanData(token);
      } catch (error) {
        console.error("ScanResult: Failed to load token data:", error);
        setError("Failed to load token data");
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [searchParams]);

  // Return the JSX for the component
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          {isLoading ? (
            <div className="space-y-8">
              <Skeleton className="h-48 w-full" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </div>
              <Skeleton className="h-[500px]" />
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <Alert>
                <AlertDescription className="text-center text-lg">
                  {error}
                </AlertDescription>
              </Alert>
              <Button 
                variant="default" 
                className="mt-6" 
                onClick={() => navigate("/")}
              >
                Try Another Token
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold tracking-tight mb-4 md:mb-0">
                  Token Health Scan Results
                </h1>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={handleRescan}
                    disabled={isRescanning}
                  >
                    {isRescanning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Rescanning...
                      </>
                    ) : (
                      "Rescan Token"
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/")}
                  >
                    Scan Another Token
                  </Button>
                </div>
              </div>
              
              {tokenData && (
                <>
                  <div className="mb-8">
                    <TokenCard 
                      name={tokenData.name}
                      symbol={tokenData.symbol}
                      logo={tokenData.logo_url}
                      price={tokenData.price_usd || tokenData.current_price_usd || 0}
                      priceChange={tokenData.price_change_24h || 0}
                      marketCap={tokenData.market_cap_usd?.toString() || "0"}
                      score={calculateOverallScore()}
                      launchDate={tokenData.launch_date}
                      website={tokenData.website_url}
                      twitter={tokenData.twitter_handle}
                      github={tokenData.github_url}
                      description={tokenData.description}
                      address={tokenData.token_address}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
                    <CategoryScoreCard
                      category="Security"
                      score={securityData?.score ?? 0}
                      level={getScoreLevel(securityData?.score ?? 0)}
                      color={getScoreColor(securityData?.score ?? 0)}
                      onClick={() => setActiveTab(ScanCategory.Security)}
                    />
                    <CategoryScoreCard
                      category="Tokenomics"
                      score={tokenomicsData?.score ?? 0}
                      level={getScoreLevel(tokenomicsData?.score ?? 0)}
                      color={getScoreColor(tokenomicsData?.score ?? 0)}
                      onClick={() => setActiveTab(ScanCategory.Tokenomics)}
                    />
                    <CategoryScoreCard
                      category="Liquidity"
                      score={liquidityData?.score ?? 0}
                      level={getScoreLevel(liquidityData?.score ?? 0)}
                      color={getScoreColor(liquidityData?.score ?? 0)}
                      onClick={() => setActiveTab(ScanCategory.Liquidity)}
                    />
                    <CategoryScoreCard
                      category="Community"
                      score={communityData?.score ?? 0}
                      level={getScoreLevel(communityData?.score ?? 0)}
                      color={getScoreColor(communityData?.score ?? 0)}
                      onClick={() => setActiveTab(ScanCategory.Community)}
                    />
                    <CategoryScoreCard
                      category="Development"
                      score={developmentData?.score ?? 0}
                      level={getScoreLevel(developmentData?.score ?? 0)}
                      color={getScoreColor(developmentData?.score ?? 0)}
                      onClick={() => setActiveTab(ScanCategory.Development)}
                    />
                  </div>
                  
                  <CategoryTabs
                    activeTab={activeTab}
                    securityData={securityData}
                    tokenomicsData={tokenomicsData}
                    liquidityData={liquidityData}
                    communityData={communityData}
                    developmentData={developmentData}
                    isPro={isPro}
                    onCategoryChange={setActiveTab}
                  />
                </>
              )}
            </>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
