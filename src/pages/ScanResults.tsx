import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertTriangle, TrendingDown, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenInfo from "@/components/TokenInfo";
import CategoryTabs from "@/components/CategoryTabs";
import BlurredCategory from "@/components/BlurredCategory";
import { useAuth } from "@/contexts/AuthContext";
import { checkUserHasProAccess } from "@/integrations/supabase/client";
import { supabase } from "@/integrations/supabase/client";

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  price_usd: number;
  price_change_24h?: number;
  market_cap_usd: number;
}

interface ScanData {
  security: any;
  liquidity: any;
  tokenomics: any;
  community: any;
  development: any;
  overallScore: number;
  redFlags: number;
}

export default function ScanResults() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [scanData, setScanData] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProLimitReached, setIsProLimitReached] = useState(false);

  useEffect(() => {
    const loadScanResults = async () => {
      try {
        // Get token data from localStorage
        const storedToken = localStorage.getItem("selectedToken");
        if (!storedToken) {
          navigate("/");
          return;
        }

        const token = JSON.parse(storedToken);
        setTokenData(token);

        // Fetch scan results from database
        const { data: scanResults, error } = await supabase
          .from("token_data_cache")
          .select(`
            *,
            token_security_cache(*),
            token_liquidity_cache(*),
            token_tokenomics_cache(*),
            token_community_cache(*),
            token_development_cache(*)
          `)
          .eq("token_address", token.address)
          .single();

        if (error) {
          console.error("Error fetching scan results:", error);
          navigate("/");
          return;
        }

        // Calculate overall score and red flags
        const scores = {
          security: scanResults.token_security_cache?.score || 0,
          liquidity: scanResults.token_liquidity_cache?.score || 0,
          tokenomics: scanResults.token_tokenomics_cache?.score || 0,
          community: scanResults.token_community_cache?.score || 0,
          development: scanResults.token_development_cache?.score || 0,
        };

        const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);
        const redFlags = Object.values(scores).filter(score => score < 30).length;

        setScanData({
          security: scanResults.token_security_cache,
          liquidity: scanResults.token_liquidity_cache,
          tokenomics: scanResults.token_tokenomics_cache,
          community: scanResults.token_community_cache,
          development: scanResults.token_development_cache,
          overallScore,
          redFlags
        });

        // Check if authenticated user has reached Pro limit
        if (isAuthenticated) {
          const accessData = await checkUserHasProAccess();
          if (accessData.scansUsed !== undefined && accessData.scansUsed >= 3 && !accessData.hasPro) {
            setIsProLimitReached(true);
          }
        }

      } catch (error) {
        console.error("Error loading scan results:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadScanResults();
  }, [navigate, isAuthenticated, user]);

  if (loading || !tokenData || !scanData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="text-center">Loading scan results...</div>
        </main>
        <Footer />
      </div>
    );
  }

  const shouldBlurCategories = !isAuthenticated || isProLimitReached;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 70) return "bg-green-100 text-green-800";
    if (score >= 40) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              New Scan
            </Button>
          </div>

          {/* Token Info */}
          <Card>
            <CardContent className="p-6">
              <TokenInfo name={tokenData.name} symbol={tokenData.symbol} />
            </CardContent>
          </Card>

          {/* Trust Score Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Trust Score</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className={`text-4xl font-bold ${getScoreColor(scanData.overallScore)}`}>
                      {scanData.overallScore}/100
                    </span>
                    <Badge className={getScoreBadge(scanData.overallScore)}>
                      {scanData.overallScore >= 70 ? "Low Risk" : 
                       scanData.overallScore >= 40 ? "Medium Risk" : "High Risk"}
                    </Badge>
                  </div>
                  {scanData.redFlags > 0 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {scanData.redFlags} critical issue{scanData.redFlags > 1 ? 's' : ''} detected
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-right">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    {tokenData.price_change_24h !== undefined && (
                      <>
                        {tokenData.price_change_24h >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className={tokenData.price_change_24h >= 0 ? "text-green-600" : "text-red-600"}>
                          {tokenData.price_change_24h >= 0 ? "+" : ""}{tokenData.price_change_24h.toFixed(2)}%
                        </span>
                      </>
                    )}
                  </div>
                  <div className="text-lg font-semibold">
                    ${tokenData.price_usd.toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Analysis */}
          <BlurredCategory 
            title="Category Analysis" 
            isBlurred={shouldBlurCategories}
            isProLimitReached={isProLimitReached}
          >
            <CategoryTabs scanData={scanData} />
          </BlurredCategory>

          {/* Sticky CTA for anonymous users */}
          {!isAuthenticated && (
            <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-4 z-50">
              <div className="container max-w-4xl mx-auto">
                <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-center sm:text-left">
                        <h3 className="font-semibold text-lg">Want the full picture?</h3>
                        <p className="text-sm text-muted-foreground">
                          Create a free account to unlock detailed risk insights and track your scans.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => navigate("/auth")}>
                          Sign In
                        </Button>
                        <Button onClick={() => navigate("/auth")}>
                          Sign Up Free
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Upgrade CTA for users who hit Pro limit */}
          {isAuthenticated && isProLimitReached && (
            <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h3 className="font-semibold text-lg">You've reached your free scan limit</h3>
                    <p className="text-sm text-muted-foreground">
                      Upgrade to unlock unlimited monthly scans and advanced features.
                    </p>
                  </div>
                  <Button onClick={() => navigate("/pricing")} size="lg">
                    Upgrade Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
