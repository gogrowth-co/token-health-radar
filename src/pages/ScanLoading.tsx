
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ScanLoading() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [progress, setProgress] = useState(0);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const trivia = [
    "🔍 Scanning smart contract for vulnerabilities...",
    "📊 Analyzing token distribution patterns...",
    "💧 Checking liquidity pool health...",
    "🔒 Verifying ownership renouncement...",
    "📈 Calculating risk score across 5 pillars...",
    "🚀 Did you know? Over 80% of new tokens have at least one red flag.",
    "⚡ TokenHealthScan analyzes 50+ data points in seconds.",
    "🛡️ We've helped users avoid over $10M in potential rug pulls.",
    "💎 Pro tip: Always check liquidity locks before investing!",
    "🔬 Our AI scans GitHub commits, social metrics, and on-chain data.",
  ];

  useEffect(() => {
    const startScan = async () => {
      try {
        // Get stored token data
        const storedToken = localStorage.getItem("selectedToken");
        if (!storedToken) {
          console.error("No token data found");
          navigate("/");
          return;
        }

        const tokenData = JSON.parse(storedToken);
        console.log("Starting scan for token:", tokenData);

        // Start progress animation
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + Math.random() * 15;
          });
        }, 500);

        // Rotate trivia
        const triviaInterval = setInterval(() => {
          setTriviaIndex(prev => (prev + 1) % trivia.length);
        }, 2000);

        // Call scan function - works for both authenticated and anonymous users
        const { data, error } = await supabase.functions.invoke("run-token-scan", {
          body: {
            token_address: tokenData.address,
            user_id: user?.id || null, // Allow null for anonymous users
            is_anonymous: !user // Track if this is an anonymous scan
          }
        });

        clearInterval(progressInterval);
        clearInterval(triviaInterval);

        if (error) {
          console.error("Scan failed:", error);
          setError(error.message || "Scan failed. Please try again.");
          return;
        }

        console.log("Scan completed successfully:", data);
        setProgress(100);

        // Navigate to results page
        setTimeout(() => {
          navigate("/scan-results");
        }, 1000);

      } catch (err) {
        console.error("Scan error:", err);
        setError("Something went wrong. Please try again.");
      }
    };

    startScan();
  }, [navigate, user]);

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold">Scan Failed</h2>
            <p className="text-muted-foreground">{error}</p>
            <button 
              onClick={() => navigate("/")} 
              className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90"
            >
              Try Another Token
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8 flex items-center justify-center">
        <div className="text-center space-y-8 max-w-md">
          <div className="space-y-4">
            <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold">Scanning Token Health</h2>
            <p className="text-muted-foreground">
              Analyzing security, liquidity, tokenomics, and community metrics...
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-muted-foreground">{Math.round(progress)}% complete</p>
          </div>
          
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm font-medium">{trivia[triviaIndex]}</p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
