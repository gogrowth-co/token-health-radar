
import { useParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ScanChain() {
  const { chain, address } = useParams<{ chain: string; address: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    // Validate parameters
    if (!chain || !address) {
      toast.error("Invalid scan parameters", {
        description: "Chain and token address are required"
      });
      navigate("/");
      return;
    }

    // Validate address format
    if (!/^(0x)?[0-9a-fA-F]{40}$/i.test(address)) {
      toast.error("Invalid token address", {
        description: "Please provide a valid token address"
      });
      navigate("/");
      return;
    }

    console.log(`[SCAN-CHAIN] Initiating scan for ${chain}:${address}`);
    
    // Navigate to scan loading with chain and address parameters
    navigate(`/scan-loading?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address)}`);
  }, [chain, address, navigate]);

  const supportedChains = [
    'eth', 'ethereum', 'polygon', 'bsc', 'arbitrum', 'avalanche', 'optimism', 'base', 'fantom'
  ];

  if (!chain || !supportedChains.includes(chain.toLowerCase())) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-1 container px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <div className="mb-8">
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1.5 mb-4" 
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4" /> Back to search
              </Button>
              
              <div className="flex items-center justify-center mb-4">
                <AlertCircle className="h-12 w-12 text-destructive" />
              </div>
              
              <h1 className="text-3xl font-bold mb-4">Unsupported Chain</h1>
              <p className="text-muted-foreground mb-6">
                The blockchain "{chain}" is not currently supported. We support Ethereum, Polygon, BSC, Arbitrum, Avalanche, Optimism, Base, and Fantom.
              </p>
              
              <Button onClick={() => navigate("/")} size="lg">
                Try Another Token
              </Button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-2xl mx-auto text-center">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4 mx-auto w-48"></div>
            <div className="h-4 bg-muted rounded mb-2 mx-auto w-64"></div>
            <div className="h-4 bg-muted rounded mx-auto w-32"></div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
