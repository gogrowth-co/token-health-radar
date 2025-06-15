
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cryptoTrivia } from "@/lib/mock-data";
import { AlertCircle, Loader2 } from "lucide-react";
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
  const { user, isAuthenticated } = useAuth();
  
  // Get token from URL params
  const tokenAddress = searchParams.get("token") || "";
  const coinGeckoId = searchParams.get("id") || "";
  
  // Validate token parameters
  useEffect(() => {
    console.log("ScanLoading: URL parameters received:", Object.fromEntries(searchParams.entries()));
    console.log("ScanLoading: tokenAddress =", tokenAddress);
    console.log("ScanLoading: coinGeckoId =", coinGeckoId);
    
    if (!tokenAddress) {
      console.error("ScanLoading: No token address provided in URL parameters");
      toast.error("No token address provided");
      navigate("/");
      return;
    }
    
    // Validate token address format (allow special addresses for native tokens)
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenAddress);
    const isSpecialAddress = tokenAddress === '0x0000000000000000000000000000000000000000' || 
                             tokenAddress === '0x0000000000000000000000000000000000001010';
    
    if (!isValidAddress && !isSpecialAddress) {
      console.error("ScanLoading: Invalid token address format:", tokenAddress);
      toast.error("Invalid token address format");
      navigate("/");
      return;
    }
  }, [tokenAddress, navigate, searchParams]);

  useEffect(() => {
    // Select random trivia
    const randomTrivia = cryptoTrivia[Math.floor(Math.random() * cryptoTrivia.length)];
    setTrivia(randomTrivia);

    // Simulate progress bar animation
    const interval = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 2;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 50);

    // Function to handle the token scan
    const scanToken = async () => {
      try {
        console.log("ScanLoading: Starting token scan with address:", tokenAddress, "and CoinGecko ID:", coinGeckoId);
        console.log("ScanLoading: User authenticated:", isAuthenticated);

        if (!tokenAddress) {
          console.error("ScanLoading: Token address is missing");
          toast.error("Token address is required");
          navigate("/");
          return;
        }

        // Get token info from localStorage if available
        const savedTokenInfo = localStorage.getItem("selectedToken");
        const selectedToken = savedTokenInfo ? JSON.parse(savedTokenInfo) : null;
        
        console.log("ScanLoading: Selected token from localStorage:", selectedToken);
        
        // Validate we have minimum required data for scanning
        if (!coinGeckoId && !selectedToken?.id) {
          console.error("ScanLoading: No CoinGecko ID available for scanning");
          setScanFailed(true);
          setErrorMessage("Unable to scan token: Missing token identifier. Please try selecting the token again.");
          return;
        }
        
        // Call the run-token-scan edge function
        console.log("ScanLoading: Calling run-token-scan with params:", {
          token_address: tokenAddress,
          coingecko_id: coinGeckoId || selectedToken?.id || "",
          user_id: user?.id || null
        });
        
        const { data, error } = await supabase.functions.invoke('run-token-scan', {
          body: {
            token_address: tokenAddress,
            coingecko_id: coinGeckoId || selectedToken?.id || "",
            user_id: user?.id || null
          }
        });

        if (error) {
          console.error("ScanLoading: Edge function error:", error);
          setScanFailed(true);
          setErrorMessage(error.message || "Failed to scan token. Please try again.");
          return;
        }

        console.log("ScanLoading: Token scan response:", data);

        if (!data) {
          console.error("ScanLoading: No data returned from token scan");
          setScanFailed(true);
          setErrorMessage("No data returned from scan. Please try again.");
          return;
        }

        // Check if scan was successful
        if (!data.success) {
          console.error("ScanLoading: Scan failed:", data.error);
          setScanFailed(true);
          setErrorMessage(data.error || "Failed to scan token. Please try again.");
          return;
        }

        // Validate that we have token info (the response should always have token_info now)
        if (!data.token_info || !data.token_info.name) {
          console.error("ScanLoading: Missing token info in scan results:", data);
          setScanFailed(true);
          setErrorMessage("Scan completed but missing token information. Please try again.");
          return;
        }

        console.log("ScanLoading: Scan completed successfully, token info:", data.token_info);
        setTokenInfo(data.token_info);
        
        // Wait for the progress bar to reach 100%
        setTimeout(() => {
          // Save scan result to localStorage for persistence
          console.log("ScanLoading: Saving scan result to localStorage");
          localStorage.setItem("lastScanResult", JSON.stringify(data));
          
          // Navigate to scan result page
          console.log("ScanLoading: Redirecting to scan result page with parameters:", { 
            token: tokenAddress, 
            id: coinGeckoId || selectedToken?.id || "" 
          });
          
          navigate(`/scan-result?token=${tokenAddress}${coinGeckoId ? `&id=${coinGeckoId}` : (selectedToken?.id ? `&id=${selectedToken.id}` : '')}`);
        }, 1000);
      } catch (error) {
        console.error("ScanLoading: Error during token scan:", error instanceof Error ? error.message : String(error));
        setScanFailed(true);
        setErrorMessage(error instanceof Error ? error.message : "Unknown error occurred. Please try again.");
      } finally {
        setIsScanning(false);
      }
    };

    // Start the scan
    scanToken();

    return () => {
      clearInterval(interval);
    };
  }, [navigate, tokenAddress, coinGeckoId, user, isAuthenticated]);

  // Get token display information
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
    window.location.reload();
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
              <Progress value={progress} className="h-2 mb-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Scanning...</span>
                <span>{progress}%</span>
              </div>
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
              
              <div className="flex gap-4 mt-8">
                <Button variant="outline" onClick={handleBackToSearch}>
                  Back to Search
                </Button>
                <Button onClick={handleRetry}>
                  Retry Scan
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
