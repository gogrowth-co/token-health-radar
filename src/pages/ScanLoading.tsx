import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function ScanLoading() {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'success' | 'error'>('scanning');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

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

  const getChainDisplayName = (chainId: string) => {
    const chainNames: Record<string, string> = {
      '0x1': 'Ethereum',
      'eth': 'Ethereum',
      'ethereum': 'Ethereum',
      '0x89': 'Polygon',
      'polygon': 'Polygon',
      '0x38': 'BSC',
      'bsc': 'BSC',
      '0xa4b1': 'Arbitrum',
      'arbitrum': 'Arbitrum',
      '0xa86a': 'Avalanche',
      'avalanche': 'Avalanche',
      '0xa': 'Optimism',
      'optimism': 'Optimism',
      '0x2105': 'Base',
      'base': 'Base',
      '0xfa': 'Fantom',
      'fantom': 'Fantom'
    };
    return chainNames[chainId?.toLowerCase()] || chainId;
  };

  const getTokenInfoFromStorage = () => {
    try {
      const selectedTokenData = localStorage.getItem("selectedToken");
      if (selectedTokenData) {
        const selectedToken = JSON.parse(selectedTokenData);
        console.log('[SCAN-LOADING] Retrieved token from localStorage:', selectedToken);
        return selectedToken;
      }
    } catch (error) {
      console.error('[SCAN-LOADING] Error parsing selectedToken from localStorage:', error);
    }
    return null;
  };

  const triggerTokenScan = async (retryAttempt = 0) => {
    try {
      console.log('[SCAN-LOADING] Starting token scan...');
      console.log('[SCAN-LOADING] Parameters:', { chain, address, token, user: user?.id });
      
      // Get token info from localStorage for additional context
      const tokenInfo = getTokenInfoFromStorage();
      console.log('[SCAN-LOADING] Token info from storage:', tokenInfo);

      // Determine final parameters for scan - use address as primary identifier
      const scanParams: any = {
        user_id: user?.id || null
      };

      // Use token address as the primary identifier
      let finalTokenAddress = address || token;
      let finalChainId = chain || '0x1'; // Default to Ethereum

      if (!finalTokenAddress && tokenInfo?.address) {
        finalTokenAddress = tokenInfo.address;
        finalChainId = tokenInfo.chain_id || chain || '0x1';
      }

      if (!finalTokenAddress) {
        throw new Error('No token address provided for scan');
      }

      // Normalize chain ID to hex format
      if (!finalChainId.startsWith('0x')) {
        const chainMap: Record<string, string> = {
          '1': '0x1',
          '137': '0x89',
          '56': '0x38',
          '42161': '0xa4b1',
          '43114': '0xa86a',
          '10': '0xa',
          '8453': '0x2105',
          '250': '0xfa'
        };
        finalChainId = chainMap[finalChainId] || `0x${parseInt(finalChainId).toString(16)}`;
      }

      scanParams.token_address = finalTokenAddress;
      scanParams.chain_id = finalChainId;

      console.log('[SCAN-LOADING] Final scan parameters:', scanParams);

      // Call the run-token-scan edge function
      const { data: scanResult, error: scanError } = await supabase.functions.invoke('run-token-scan', {
        body: scanParams
      });

      if (scanError) {
        console.error('[SCAN-LOADING] Scan error:', scanError);
        throw new Error(scanError.message || 'Failed to scan token');
      }

      if (!scanResult?.success) {
        console.error('[SCAN-LOADING] Scan failed:', scanResult);
        throw new Error(scanResult?.error || 'Token scan was not successful');
      }

      console.log('[SCAN-LOADING] Scan completed successfully:', scanResult);
      setScanStatus('success');
      
      // Wait a moment then navigate to results
      setTimeout(() => {
        const params = new URLSearchParams();
        params.set("chain", scanParams.chain_id);
        params.set("address", scanParams.token_address);
        
        navigate(`/scan-result?${params.toString()}`);
      }, 1000);

    } catch (error: any) {
      console.error('[SCAN-LOADING] Token scan failed:', error);
      
      // Handle retry logic for network errors
      if (retryAttempt < 2 && (
        error.message?.includes('Failed to fetch') || 
        error.message?.includes('network') ||
        error.message?.includes('timeout')
      )) {
        console.log(`[SCAN-LOADING] Retrying scan attempt ${retryAttempt + 1}/3`);
        setTimeout(() => triggerTokenScan(retryAttempt + 1), 2000);
        return;
      }

      setScanStatus('error');
      setErrorMessage(error.message || 'An error occurred while scanning the token');
      toast.error('Scan failed: ' + (error.message || 'Unknown error'));
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    setScanStatus('scanning');
    setErrorMessage('');
    setProgress(0);
    setCurrentStep(0);
    
    await triggerTokenScan();
    setIsRetrying(false);
  };

  // Trigger the actual scan when component mounts
  useEffect(() => {
    const finalAddress = address || token;
    if (!finalAddress && !chain) {
      console.error('[SCAN-LOADING] No token parameters provided');
      setScanStatus('error');
      setErrorMessage('No token information provided. Please go back and select a token to scan.');
      return;
    }

    // Start the scan
    triggerTokenScan();
  }, [chain, address, token, user]);

  // Handle progress animation only when scanning
  useEffect(() => {
    if (scanStatus !== 'scanning') return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 2;
        if (newProgress >= 95) {
          // Stop at 95% until scan actually completes
          return 95;
        }
        return newProgress;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [scanStatus]);

  // Handle step rotation only when scanning
  useEffect(() => {
    if (scanStatus !== 'scanning') return;

    const stepInterval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(stepInterval);
  }, [scanStatus]);

  // Complete progress when scan succeeds
  useEffect(() => {
    if (scanStatus === 'success') {
      setProgress(100);
    }
  }, [scanStatus]);

  if (scanStatus === 'error') {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <h1 className="text-2xl font-bold">Scan Failed</h1>
              <p className="text-muted-foreground mt-2">
                {errorMessage}
              </p>
              
              <div className="flex flex-col gap-4 mt-6 w-full">
                <Button 
                  onClick={handleRetry} 
                  disabled={isRetrying}
                  className="w-full"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    'Retry Scan'
                  )}
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  Back to Search
                </Button>
              </div>
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
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-4">
              {scanStatus === 'success' ? 'Scan Complete!' : 'Scanning Token Health'}
            </h1>
            {chain && (address || token) && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <Badge variant="secondary" className="font-mono text-sm">
                  {getChainDisplayName(chain)}
                </Badge>
                <span className="text-muted-foreground text-sm font-mono">
                  {(address || token)?.slice(0, 6)}...{(address || token)?.slice(-4)}
                </span>
              </div>
            )}
            <p className="text-muted-foreground">
              {scanStatus === 'success' 
                ? 'Token analysis complete! Redirecting to results...' 
                : 'Analyzing your token across 5 critical health categories...'
              }
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
                    {scanStatus === 'success' ? 'Analysis complete!' : steps[currentStep]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {scanStatus === 'scanning' && (
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3 text-center">💡 Did You Know?</h3>
                <p className="text-sm text-muted-foreground text-center leading-relaxed">
                  {cryptoTrivia[currentStep % cryptoTrivia.length]}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
