
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Progress } from "@/components/ui/progress";
import { tokenProfiles, cryptoTrivia } from "@/lib/mock-data";

export default function ScanLoading() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);
  const [trivia, setTrivia] = useState("");
  
  // Get token from URL params (either address or symbol)
  const tokenParam = searchParams.get("token") || searchParams.get("address") || "";
  
  // Default to bitcoin if param not found (fallback for demo)
  const tokenKey = tokenParam || "bitcoin";
  const token = tokenProfiles[tokenKey as keyof typeof tokenProfiles] || tokenProfiles.bitcoin;
  
  useEffect(() => {
    // Select random trivia
    const randomTrivia = cryptoTrivia[Math.floor(Math.random() * cryptoTrivia.length)];
    setTrivia(randomTrivia);

    // Simulate loading progress
    const interval = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 2;
        return newProgress >= 100 ? 100 : newProgress;
      });
    }, 50);

    // Redirect after loading completes
    const timeout = setTimeout(() => {
      navigate(`/scan-result?token=${tokenKey}`);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [navigate, tokenKey]);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8 flex items-center justify-center">
        <div className="w-full max-w-xl text-center space-y-8">
          <div className="flex flex-col items-center">
            <img 
              src={token.logo} 
              alt={`${token.name} logo`} 
              className="w-20 h-20 rounded-full mb-4" 
            />
            <h1 className="text-3xl font-bold">{token.name} ({token.symbol})</h1>
            <p className="text-muted-foreground mt-2">Scanning token for health metrics...</p>
          </div>
          
          <div className="w-full">
            <Progress value={progress} className="h-2 mb-2 animate-progress-fill" />
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
