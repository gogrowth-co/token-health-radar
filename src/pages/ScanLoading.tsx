
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
  
  // Get token from URL params (either address or symbol)
  const tokenParam = searchParams.get("token") || searchParams.get("address") || "";
  
  // Make sure we have a token to scan
  if (!tokenParam) {
    navigate("/");
  }

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

        // Call the run-token-scan edge function
        const { data, error } = await supabase.functions.invoke('run-token-scan', {
          body: {
            token_address: tokenParam,
            user_id: user.id
          }
        });

        if (error) {
          console.error("Error running token scan:", error);
          toast.error("Failed to scan token. Please try again later.");
          navigate("/");
          return;
        }

        if (!data.allowed) {
          toast.error(data.reason || "You don't have permission to scan this token.");
          navigate("/");
          return;
        }

        setTokenInfo(data.token_info);
        
        // Wait for the progress bar to reach 100%
        setTimeout(() => {
          // Redirect to scan result page with token info
          navigate(`/scan-result?token=${tokenParam}`);
        }, 1000); // Short delay to ensure progress bar completes
      } catch (error) {
        console.error("Error during token scan:", error);
        toast.error("Something went wrong during the token scan.");
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
  }, [navigate, tokenParam, user]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-xl text-center space-y-8">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
              <span className="text-2xl text-white">
                {tokenParam?.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold">{tokenParam}</h1>
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
