
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ScanLoading() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Get parameters from URL
  const chain = searchParams.get("chain");
  const address = searchParams.get("address");
  const token = searchParams.get("token"); // backwards compatibility

  const steps = [
    "Initializing scan...",
    "Fetching token data...",
    "Analyzing security...",
    "Checking liquidity...",
    "Reviewing tokenomics...",
    "Scanning community...",
    "Evaluating development...",
    "Finalizing report..."
  ];

  const cryptoTrivia = [
    "Did you know? The first cryptocurrency transaction was 10,000 Bitcoin for 2 pizzas in 2010.",
    "Ethereum processes over 1 million transactions per day across its network.",
    "The total market cap of all cryptocurrencies exceeded $3 trillion in 2021.",
    "Bitcoin's blockchain has never been successfully hacked since its creation in 2009.",
    "Smart contracts automatically execute when predetermined conditions are met.",
    "DeFi protocols have locked over $100 billion in total value at their peak.",
    "The Lightning Network can process over 1 million Bitcoin transactions per second."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          clearInterval(interval);
          
          // Navigate to results with appropriate parameters
          const params = new URLSearchParams();
          if (chain && address) {
            params.set("chain", chain);
            params.set("address", address);
          } else if (token) {
            params.set("token", token);
          }
          
          setTimeout(() => {
            navigate(`/scan-result?${params.toString()}`);
          }, 500);
          
          return 100;
        }
        return newProgress;
      });
    }, 150);

    return () => clearInterval(interval);
  }, [navigate, chain, address, token]);

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 1800);

    return () => clearInterval(stepInterval);
  }, []);

  const getChainDisplayName = (chainId: string) => {
    const chainNames: Record<string, string> = {
      'eth': 'Ethereum',
      'ethereum': 'Ethereum',
      'polygon': 'Polygon',
      'bsc': 'BSC',
      'arbitrum': 'Arbitrum',
      'avalanche': 'Avalanche',
      'optimism': 'Optimism',
      'base': 'Base',
      'fantom': 'Fantom'
    };
    return chainNames[chainId?.toLowerCase()] || chainId;
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">Scanning Token Health</h1>
            {chain && address && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge variant="secondary" className="font-mono text-sm">
                  {getChainDisplayName(chain)}
                </Badge>
                <span className="text-muted-foreground text-sm font-mono">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </span>
              </div>
            )}
            <p className="text-muted-foreground">
              Analyzing your token across 5 critical health categories...
            </p>
          </div>

          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Scan Progress</span>
                  <span className="text-sm text-muted-foreground">{progress}%</span>
                </div>
                
                <Progress value={progress} className="h-3" />
                
                <div className="text-center">
                  <p className="text-sm text-muted-foreground animate-pulse">
                    {steps[currentStep]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 text-center">💡 Did You Know?</h3>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {cryptoTrivia[currentStep % cryptoTrivia.length]}
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
