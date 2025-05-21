
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cryptoTrivia } from "@/lib/mock-data";

export default function ScanLoading() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [trivia, setTrivia] = useState("");
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(true);
  const { user } = useAuth();
  
  // Get token from URL params (either address or id)
  const tokenAddress = searchParams.get("token") || "";
  const coinGeckoId = searchParams.get("id") || "";
  
  // Make sure we have a token to scan
  useEffect(() => {
    if (!tokenAddress) {
      toast.error("No token address provided");
      navigate("/");
    }
  }, [tokenAddress, navigate]);

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
        // Make sure user is authenticated
        if (!user) {
          toast.error("You must be logged in to scan tokens");
          navigate("/auth");
          return;
        }

        console.log("Starting token scan with address:", tokenAddress, "and CoinGecko ID:", coinGeckoId);

        // Enhanced error logging
        if (!tokenAddress) {
          console.error("Token address is missing");
          toast.error("Token address is required");
          navigate("/");
          return;
        }

        // Get token info from localStorage if available
        const savedTokenInfo = localStorage.getItem("selectedToken");
        const selectedToken = savedTokenInfo ? JSON.parse(savedTokenInfo) : null;
        
        // Call the run-token-scan edge function with properly named parameters
        const { data, error } = await supabase.functions.invoke('run-token-scan', {
          body: {
            token_address: tokenAddress, // Consistent parameter naming
            coingecko_id: coinGeckoId,
            user_id: user.id,
            token_name: selectedToken?.name,
            token_symbol: selectedToken?.symbol
          }
        });

        if (error) {
          console.error("Edge function error:", error);
          throw new Error(error.message || "Failed to scan token");
        }

        console.log("Token scan response:", data);

        if (!data) {
          console.error("No data returned from token scan");
          throw new Error("No data returned from scan");
        }

        if (!data.allowed) {
          toast.error(data.reason || "You don't have permission to scan this token.");
          navigate("/");
          return;
        }

        setTokenInfo(data.token_info || data);
        
        // Wait for the progress bar to reach 100%
        setTimeout(() => {
          // Save scan result to localStorage for persistence
          if (data.token_info) {
            localStorage.setItem("lastScanResult", JSON.stringify(data.token_info));
          } else {
            localStorage.setItem("lastScanResult", JSON.stringify(data));
          }
          
          // Redirect to scan result page with token info
          navigate(`/scan-result?token=${tokenAddress}&id=${coinGeckoId}`);
        }, 1000); // Short delay to ensure progress bar completes
      } catch (error) {
        console.error("Error during token scan:", error instanceof Error ? error.message : String(error));
        toast.error("Failed to scan token. Please try again later.");
        navigate("/");
      } finally {
        setIsScanning(false);
      }
    };

    // Start the scan
    scanToken();

    return () => {
      clearInterval(interval);
    };
  }, [navigate, tokenAddress, coinGeckoId, user]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-xl text-center space-y-8">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
              <span className="text-2xl text-white">
                {tokenAddress?.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold">{tokenAddress.slice(0, 8)}...{tokenAddress.slice(-6)}</h1>
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
      </main>
      
      <Footer />
    </div>
  );
}
