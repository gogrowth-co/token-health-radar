
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenProfile from "@/components/TokenProfile";
import CategoryScoreCard from "@/components/CategoryScoreCard";
import CategoryTabs from "@/components/CategoryTabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// Define types for our scan data
interface TokenScan {
  id: string;
  user_id: string;
  token_address: string;
  score_total: number;
  pro_scan: boolean;
  scanned_at: string;
}

interface TokenData {
  name: string;
  symbol: string;
  logo_url: string;
  token_address: string;
  website_url: string;
  twitter_handle: string;
  github_url: string;
  coingecko_id: string;
  launch_date: string;
}

interface CategoryScore {
  score: number;
  level: "high" | "medium" | "low";
  color: "success" | "warning" | "danger" | "info";
}

interface ScanResult {
  tokenData: TokenData;
  securityData: any;
  liquidityData: any;
  tokenomicsData: any;
  communityData: any;
  developmentData: any;
  categoryScores: {
    security: CategoryScore;
    liquidity: CategoryScore;
    tokenomics: CategoryScore;
    community: CategoryScore;
    development: CategoryScore;
  };
  overallScore: number;
}

interface UserSubscription {
  id: string;
  scans_used: number;
  pro_scan_limit: number;
  plan: "free" | "pro";
}

export default function ScanResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("security");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [isProUser, setIsProUser] = useState(false);
  
  // Get token from URL params
  const tokenParam = searchParams.get("token") || "";
  
  useEffect(() => {
    const fetchUserSubscription = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsProUser(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('subscribers')
          .select('*')
          .eq('id', user.id)
          .single();
          
        if (error) {
          console.error("Error fetching user subscription:", error);
          return;
        }
        
        setUserSubscription(data);
        setIsProUser(data.plan === "pro");
      } catch (err) {
        console.error("Failed to fetch user subscription:", err);
      }
    };
    
    fetchUserSubscription();
  }, []);
  
  useEffect(() => {
    const fetchScanResult = async () => {
      if (!tokenParam) {
        setError("No token specified");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      
      try {
        // First check if token is an address or a symbol
        const isAddress = tokenParam.startsWith('0x');
        
        // Fetch token data
        const { data: tokenData, error: tokenError } = await supabase
          .from('token_data_cache')
          .select('*')
          .or(`token_address.eq.${isAddress ? tokenParam : ''},symbol.ilike.${!isAddress ? tokenParam : ''}`)
          .single();
          
        if (tokenError || !tokenData) {
          setError("Token not found");
          setIsLoading(false);
          return;
        }

        // Fetch security data
        const { data: securityData, error: securityError } = await supabase
          .from('token_security_cache')
          .select('*')
          .eq('token_address', tokenData.token_address)
          .maybeSingle();
          
        if (securityError) {
          console.error("Error fetching security data:", securityError);
        }
        
        // Fetch liquidity data
        const { data: liquidityData, error: liquidityError } = await supabase
          .from('token_liquidity_cache')
          .select('*')
          .eq('token_address', tokenData.token_address)
          .maybeSingle();
          
        if (liquidityError) {
          console.error("Error fetching liquidity data:", liquidityError);
        }
        
        // Fetch tokenomics data
        const { data: tokenomicsData, error: tokenomicsError } = await supabase
          .from('token_tokenomics_cache')
          .select('*')
          .eq('token_address', tokenData.token_address)
          .maybeSingle();
          
        if (tokenomicsError) {
          console.error("Error fetching tokenomics data:", tokenomicsError);
        }
        
        // Fetch community data
        const { data: communityData, error: communityError } = await supabase
          .from('token_community_cache')
          .select('*')
          .eq('token_address', tokenData.token_address)
          .maybeSingle();
          
        if (communityError) {
          console.error("Error fetching community data:", communityError);
        }
        
        // Fetch development data
        const { data: developmentData, error: developmentError } = await supabase
          .from('token_development_cache')
          .select('*')
          .eq('token_address', tokenData.token_address)
          .maybeSingle();
          
        if (developmentError) {
          console.error("Error fetching development data:", developmentError);
        }
        
        // Determine category scores
        const getScoreLevel = (score: number | null): "high" | "medium" | "low" => {
          if (!score && score !== 0) return "low";
          if (score >= 70) return "high";
          if (score >= 50) return "medium";
          return "low";
        };
        
        const getScoreColor = (level: "high" | "medium" | "low"): "success" | "warning" | "danger" | "info" => {
          if (level === "high") return "success";
          if (level === "medium") return "warning";
          return "danger";
        };
        
        const securityScore = securityData?.score || 0;
        const liquidityScore = liquidityData?.score || 0;
        const tokenomicsScore = tokenomicsData?.score || 0;
        const communityScore = communityData?.score || 0;
        const developmentScore = developmentData?.score || 0;
        
        const securityLevel = getScoreLevel(securityScore);
        const liquidityLevel = getScoreLevel(liquidityScore);
        const tokenomicsLevel = getScoreLevel(tokenomicsScore);
        const communityLevel = getScoreLevel(communityScore);
        const developmentLevel = getScoreLevel(developmentScore);
        
        const scores = [securityScore, liquidityScore, tokenomicsScore, communityScore, developmentScore]
          .filter(score => score !== null);
        
        const overallScore = scores.length > 0 
          ? Math.round(scores.reduce((sum, score) => sum + (score || 0), 0) / scores.length) 
          : 0;
        
        // Assemble the full result
        setScanResult({
          tokenData: {
            ...tokenData,
            // Simulate missing data for price, market cap, etc. from CoinGecko
            // In a real app, you would fetch this data from a price API
            price: 0,
            priceChange: 0,
            marketCap: "N/A",
            tvl: "N/A"
          },
          securityData: securityData || {},
          liquidityData: liquidityData || {},
          tokenomicsData: tokenomicsData || {},
          communityData: communityData || {},
          developmentData: developmentData || {},
          categoryScores: {
            security: {
              score: securityScore,
              level: securityLevel,
              color: getScoreColor(securityLevel)
            },
            liquidity: {
              score: liquidityScore,
              level: liquidityLevel,
              color: getScoreColor(liquidityLevel)
            },
            tokenomics: {
              score: tokenomicsScore,
              level: tokenomicsLevel,
              color: getScoreColor(tokenomicsLevel)
            },
            community: {
              score: communityScore,
              level: communityLevel,
              color: getScoreColor(communityLevel)
            },
            development: {
              score: developmentScore,
              level: developmentLevel,
              color: getScoreColor(developmentLevel)
            }
          },
          overallScore
        });
        
        setIsLoading(false);
      } catch (err: any) {
        console.error("Failed to fetch scan result:", err);
        setError(err.message || "Failed to load scan data");
        setIsLoading(false);
      }
    };
    
    fetchScanResult();
  }, [tokenParam]);

  // Handle category card click
  const handleCategoryClick = (category: string) => {
    setActiveTab(category);
    // Scroll to tab section
    document.getElementById("category-tabs")?.scrollIntoView({ behavior: "smooth" });
  };

  // Determine if user has access to detailed scan data
  const hasFullAccess = () => {
    if (!userSubscription) return true; // Default to full access if subscription data not loaded yet
    
    if (userSubscription.plan === "pro") return true;
    
    return userSubscription.scans_used < 3; // Free users get 3 scans
  };
  
  // If loading, show skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-1 container px-4 py-8">
          <section className="mb-12">
            <Skeleton className="h-32 w-full" />
          </section>
          
          <section className="mb-12">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </section>
          
          <section>
            <Skeleton className="h-8 w-64 mb-6" />
            <Skeleton className="h-96 w-full" />
          </section>
        </main>
        
        <Footer />
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <Alert className="max-w-lg">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error Loading Scan</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            <div className="mt-4">
              <Button onClick={() => navigate("/")}>Return to Home</Button>
            </div>
          </Alert>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        {scanResult && (
          <>
            {/* Token Profile */}
            <section className="mb-12">
              <TokenProfile 
                name={scanResult.tokenData.name || "Unknown Token"}
                symbol={scanResult.tokenData.symbol || "????"}
                logo={scanResult.tokenData.logo_url || "/placeholder.svg"}
                address={scanResult.tokenData.token_address}
                website={scanResult.tokenData.website_url || "#"}
                twitter={scanResult.tokenData.twitter_handle ? `https://twitter.com/${scanResult.tokenData.twitter_handle}` : "#"}
                github={scanResult.tokenData.github_url || "#"}
                price={0} // Would fetch from a price API
                priceChange={0}
                marketCap="N/A" // Would fetch from a price API
                tvl="N/A" // Would fetch from a DeFi API
                launchDate={scanResult.tokenData.launch_date || "Unknown"}
              />
            </section>
            
            {/* Category Score Overview */}
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6">Health Score Overview</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <CategoryScoreCard 
                  category="security" 
                  score={scanResult.categoryScores.security.score}
                  level={scanResult.categoryScores.security.level}
                  color={scanResult.categoryScores.security.color}
                  onClick={() => handleCategoryClick("security")}
                />
                <CategoryScoreCard 
                  category="liquidity" 
                  score={scanResult.categoryScores.liquidity.score}
                  level={scanResult.categoryScores.liquidity.level}
                  color={scanResult.categoryScores.liquidity.color}
                  onClick={() => handleCategoryClick("liquidity")}
                />
                <CategoryScoreCard 
                  category="tokenomics" 
                  score={scanResult.categoryScores.tokenomics.score}
                  level={scanResult.categoryScores.tokenomics.level}
                  color={scanResult.categoryScores.tokenomics.color}
                  onClick={() => handleCategoryClick("tokenomics")}
                />
                <CategoryScoreCard 
                  category="community" 
                  score={scanResult.categoryScores.community.score}
                  level={scanResult.categoryScores.community.level}
                  color={scanResult.categoryScores.community.color}
                  onClick={() => handleCategoryClick("community")}
                />
                <CategoryScoreCard 
                  category="development" 
                  score={scanResult.categoryScores.development.score}
                  level={scanResult.categoryScores.development.level}
                  color={scanResult.categoryScores.development.color}
                  onClick={() => handleCategoryClick("development")}
                />
              </div>
            </section>
            
            {/* Category Tabs */}
            <section id="category-tabs">
              <h2 className="text-2xl font-bold mb-6">Detailed Analysis</h2>
              <CategoryTabs 
                activeTab={activeTab} 
                isProUser={hasFullAccess()} 
                securityData={scanResult.securityData}
                liquidityData={scanResult.liquidityData}
                tokenomicsData={scanResult.tokenomicsData}
                communityData={scanResult.communityData}
                developmentData={scanResult.developmentData}
              />
            </section>
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
