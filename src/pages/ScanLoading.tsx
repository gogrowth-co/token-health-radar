
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cryptoTrivia } from "@/lib/mock-data";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScanLoading() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [trivia, setTrivia] = useState("");
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scanFailed, setScanFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [currentStep, setCurrentStep] = useState("Starting scan...");
  const [debugInfo, setDebugInfo] = useState<any>({});
  const { user } = useAuth();
  
  const tokenAddress = searchParams.get("token") || "";
  const coinGeckoId = searchParams.get("id") || "";
  
  useEffect(() => {
    console.log("🔍 ScanLoading: URL parameters received:", Object.fromEntries(searchParams.entries()));
    console.log("🔍 ScanLoading: tokenAddress =", tokenAddress);
    console.log("🔍 ScanLoading: coinGeckoId =", coinGeckoId);
    
    if (!tokenAddress) {
      console.error("❌ ScanLoading: No token address provided in URL parameters");
      toast.error("No token address provided");
      navigate("/");
      return;
    }
    
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenAddress);
    const isSpecialAddress = tokenAddress === '0x0000000000000000000000000000000000000000' || 
                             tokenAddress === '0x0000000000000000000000000000000000001010';
    
    if (!isValidAddress && !isSpecialAddress) {
      console.error("❌ ScanLoading: Invalid token address format:", tokenAddress);
      toast.error("Invalid token address format");
      navigate("/");
      return;
    }
  }, [tokenAddress, navigate, searchParams]);

  useEffect(() => {
    const randomTrivia = cryptoTrivia[Math.floor(Math.random() * cryptoTrivia.length)];
    setTrivia(randomTrivia);

    // Enhanced progress animation with steps
    const interval = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 1.5;
        
        // Update step messages based on progress
        if (newProgress >= 20 && newProgress < 40) {
          setCurrentStep("Fetching token data...");
        } else if (newProgress >= 40 && newProgress < 60) {
          setCurrentStep("Analyzing security...");
        } else if (newProgress >= 60 && newProgress < 80) {
          setCurrentStep("Checking liquidity...");
        } else if (newProgress >= 80 && newProgress < 95) {
          setCurrentStep("Calculating scores...");
        } else if (newProgress >= 95) {
          setCurrentStep("Finalizing results...");
        }
        
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 100);

    const scanToken = async () => {
      try {
        if (!user) {
          console.error("❌ ScanLoading: User not authenticated");
          toast.error("You must be logged in to scan tokens");
          navigate("/auth");
          return;
        }

        console.log("🚀 ScanLoading: Starting token scan with address:", tokenAddress, "and CoinGecko ID:", coinGeckoId);
        setDebugInfo({ step: "initialization", tokenAddress, coinGeckoId, userId: user.id });

        if (!tokenAddress) {
          console.error("❌ ScanLoading: Token address is missing");
          toast.error("Token address is required");
          navigate("/");
          return;
        }

        const savedTokenInfo = localStorage.getItem("selectedToken");
        const selectedToken = savedTokenInfo ? JSON.parse(savedTokenInfo) : null;
        
        console.log("📋 ScanLoading: Selected token from localStorage:", selectedToken);
        setDebugInfo(prev => ({ ...prev, selectedToken }));
        
        let tokenToScan = selectedToken;
        if (!tokenToScan || selectedToken?.address !== tokenAddress) {
          let tokenData = null;
          
          if (coinGeckoId) {
            console.log("🔍 ScanLoading: Looking up token by CoinGecko ID:", coinGeckoId);
            const { data } = await supabase
              .from("token_data_cache")
              .select("*")
              .eq("coingecko_id", coinGeckoId)
              .maybeSingle();
            tokenData = data;
          }
          
          if (!tokenData) {
            console.log("🔍 ScanLoading: Looking up token by address:", tokenAddress);
            const { data } = await supabase
              .from("token_data_cache")
              .select("*")
              .eq("token_address", tokenAddress)
              .maybeSingle();
            tokenData = data;
          }
            
          if (tokenData) {
            console.log("✅ ScanLoading: Found token in database:", tokenData);
            tokenToScan = {
              address: tokenAddress,
              name: tokenData.name,
              symbol: tokenData.symbol,
              logo: tokenData.logo_url,
              id: tokenData.coingecko_id || coinGeckoId
            };
          } else {
            console.log("⚠️ ScanLoading: No token info available for address", tokenAddress);
            tokenToScan = {
              address: tokenAddress,
              name: `Token ${tokenAddress.substring(0, 6)}...`,
              symbol: "???",
              id: coinGeckoId
            };
          }
        }
        
        setDebugInfo(prev => ({ ...prev, tokenToScan }));
        
        if (!coinGeckoId && !tokenToScan?.id) {
          console.error("❌ ScanLoading: No CoinGecko ID available for scanning");
          setScanFailed(true);
          setErrorMessage("Unable to scan token: Missing token identifier. Please try selecting the token again.");
          setDebugInfo(prev => ({ ...prev, error: "Missing CoinGecko ID" }));
          return;
        }
        
        const scanParams = {
          token_address: tokenAddress,
          coingecko_id: coinGeckoId || tokenToScan?.id || "",
          user_id: user.id,
        };
        
        console.log("📞 ScanLoading: Calling run-token-scan with params:", scanParams);
        setDebugInfo(prev => ({ ...prev, scanParams }));
        
        // Enhanced scan call with better timeout handling
        const startTime = Date.now();
        const { data, error } = await supabase.functions.invoke('run-token-scan', {
          body: scanParams
        });
        const endTime = Date.now();

        console.log(`⏱️ ScanLoading: Scan took ${endTime - startTime}ms`);
        setDebugInfo(prev => ({ ...prev, scanDuration: endTime - startTime, scanResponse: data, scanError: error }));

        if (error) {
          console.error("❌ ScanLoading: Edge function error:", error);
          
          // Enhanced error messaging based on error type
          let userFriendlyMessage = "Failed to scan token. Please try again.";
          if (error.message?.includes('timeout') || error.message?.includes('network')) {
            userFriendlyMessage = "Network timeout occurred. The scan may take longer due to high demand. Please try again.";
          } else if (error.message?.includes('rate limit')) {
            userFriendlyMessage = "Too many requests. Please wait a moment and try again.";
          } else if (error.message?.includes('Invalid token')) {
            userFriendlyMessage = "Invalid token address or the token is not supported.";
          } else if (error.message?.includes('Missing required parameters')) {
            userFriendlyMessage = "Invalid scan request. Please try selecting the token again.";
          }
          
          setScanFailed(true);
          setErrorMessage(userFriendlyMessage);
          return;
        }

        console.log("✅ ScanLoading: Token scan response:", data);

        if (!data) {
          console.error("❌ ScanLoading: No data returned from token scan");
          setScanFailed(true);
          setErrorMessage("No data returned from scan. The service may be experiencing issues. Please try again.");
          return;
        }

        if (!data.success) {
          console.error("❌ ScanLoading: Scan failed:", data.error_message);
          setScanFailed(true);
          setErrorMessage(data.error_message || "Failed to retrieve token data. Please try again.");
          return;
        }

        if (!data.token_info || data.overall_score === undefined) {
          console.error("❌ ScanLoading: Incomplete scan results:", data);
          setScanFailed(true);
          setErrorMessage("Scan completed but returned incomplete results. Please try again.");
          return;
        }

        setTokenInfo(data.token_info || data);
        setCurrentStep("Scan completed!");
        
        // Complete the progress animation
        setTimeout(() => {
          setProgress(100);
        }, 500);
        
        setTimeout(() => {
          const resultData = data.token_info || data;
          console.log("💾 ScanLoading: Saving scan result to localStorage:", resultData);
          localStorage.setItem("lastScanResult", JSON.stringify(resultData));
          
          console.log("🔄 ScanLoading: Redirecting to scan result page with parameters:", { 
            token: tokenAddress, 
            id: coinGeckoId || tokenToScan?.id || "" 
          });
          
          navigate(`/scan-result?token=${tokenAddress}${coinGeckoId ? `&id=${coinGeckoId}` : (tokenToScan?.id ? `&id=${tokenToScan.id}` : '')}`);
        }, 1500);
        
      } catch (error) {
        console.error("💥 ScanLoading: Error during token scan:", error instanceof Error ? error.message : String(error));
        
        // Enhanced error handling with retry logic
        let errorMsg = "Unknown error occurred. Please try again.";
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
            errorMsg = "Network connection error. Please check your internet connection and try again.";
          } else if (error.message.includes('timeout')) {
            errorMsg = "Request timed out. The service may be busy. Please try again in a moment.";
          } else {
            errorMsg = error.message;
          }
        }
        
        setDebugInfo(prev => ({ ...prev, criticalError: error instanceof Error ? error.message : String(error) }));
        setScanFailed(true);
        setErrorMessage(errorMsg);
      } finally {
        setIsScanning(false);
      }
    };

    scanToken();

    return () => {
      clearInterval(interval);
    };
  }, [navigate, tokenAddress, coinGeckoId, user, retryCount]);

  const displayToken = (() => {
    try {
      const savedToken = localStorage.getItem("selectedToken");
      if (savedToken) {
        const parsedToken = JSON.parse(savedToken);
        if (parsedToken && parsedToken.address === tokenAddress) {
          return parsedToken;
        }
      }
      
      return { 
        name: tokenAddress.substring(0, 8) + "..." + tokenAddress.substring(tokenAddress.length - 6),
        logo: null
      };
    } catch (e) {
      console.error("Error parsing token from localStorage:", e);
      return { 
        name: tokenAddress.substring(0, 8) + "..." + tokenAddress.substring(tokenAddress.length - 6),
        logo: null
      };
    }
  })();

  const handleRetry = () => {
    setIsScanning(true);
    setScanFailed(false);
    setProgress(0);
    setCurrentStep("Starting scan...");
    setRetryCount(prev => prev + 1);
    setDebugInfo({});
  };

  const handleBackToSearch = () => {
    navigate("/");
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8 flex items-center justify-center">
        {!scanFailed ? (
          <div className="w-full max-w-xl text-center space-y-8">
            <div className="flex flex-col items-center">
              {displayToken.logo ? (
                <img 
                  src={displayToken.logo} 
                  alt={`${displayToken.name} logo`} 
                  className="w-20 h-20 rounded-full mb-4 object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
                  <span className="text-2xl text-white">
                    {tokenAddress.substring(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <h1 className="text-3xl font-bold">{displayToken.name}</h1>
              <p className="text-muted-foreground mt-2">Scanning token for health metrics...</p>
            </div>
            
            <div className="w-full">
              <Progress value={progress} className="h-3 mb-3" />
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>{currentStep}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              {progress === 100 && (
                <div className="flex items-center justify-center text-green-600 mt-2">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span className="text-sm font-medium">Scan completed successfully!</span>
                </div>
              )}
            </div>
            
            <div className="py-6 px-6 rounded-lg bg-muted">
              <h3 className="text-lg font-medium mb-2">Did you know?</h3>
              <p className="text-muted-foreground italic">{trivia}</p>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-xl text-center space-y-8">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-3xl font-bold">Scan Failed</h1>
              <p className="text-muted-foreground mt-2 max-w-md">
                {errorMessage || "We encountered an error while scanning this token. Please try again."}
              </p>
              
              {Object.keys(debugInfo).length > 0 && (
                <details className="mt-4 text-left max-w-md">
                  <summary className="text-sm text-muted-foreground cursor-pointer">Debug Information</summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto max-h-32">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-4 mt-8">
                <Button variant="outline" onClick={handleBackToSearch}>
                  Back to Search
                </Button>
                <Button onClick={handleRetry}>
                  Retry Scan
                </Button>
              </div>
              
              {retryCount > 0 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Retry attempt: {retryCount}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
