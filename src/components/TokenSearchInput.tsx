
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { logError, safePerformanceTrack } from "@/utils/errorTracking";

interface TokenSearchInputProps {
  large?: boolean;
  placeholder?: string;
  textPosition?: "right" | "below";
}

export default function TokenSearchInput({ 
  large = false, 
  placeholder = "Enter token name or contract address",
  textPosition = "right"
}: TokenSearchInputProps) {
  const [tokenInput, setTokenInput] = useState("");
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [scanAccessData, setScanAccessData] = useState<{
    plan: string;
    scansUsed: number;
    scanLimit: number;
  } | null>(null);
  
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tokenInput.trim()) {
      toast({
        title: "Empty search",
        description: "Please enter a token name or address",
        variant: "destructive",
      });
      return;
    }
    
    safePerformanceTrack('token_search_attempt', { 
      isAuthenticated, 
      hasInput: !!tokenInput.trim() 
    });
    
    // If user is not authenticated, store the search query and redirect to auth page
    if (!isAuthenticated) {
      console.log("User not authenticated. Storing search query:", tokenInput);
      localStorage.setItem("pendingTokenSearch", tokenInput);
      navigate("/auth");
      return;
    }
    
    // Check if input looks like an address (simple validation)
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(tokenInput);
    console.log("Input validation:", { isAddress, tokenInput });
    
    // Check if user has access to perform a search (not incrementing scan counter here)
    setIsCheckingAccess(true);
    try {
      safePerformanceTrack('scan_access_check_start');
      
      const { data, error } = await supabase.functions.invoke('check-scan-access');
      
      if (error) {
        console.error("Error checking search access:", error);
        logError(error, { 
          context: 'scan_access_check_error',
          tokenInput: tokenInput.substring(0, 10) // Only log first 10 chars for privacy
        });
        
        toast({
          title: "Error",
          description: "Could not check access. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      safePerformanceTrack('scan_access_check_success', { canScan: data?.canScan });
      
      // Initial search is always allowed, token selection is what counts against the scan limit
      if (!data.canScan) {
        toast({
          title: "Error",
          description: "Could not access search functionality. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
    } catch (error: any) {
      console.error("Error checking search access:", error);
      logError(error, { 
        context: 'scan_access_check_exception',
        errorMessage: error.message || 'unknown error'
      });
    } finally {
      setIsCheckingAccess(false);
    }
    
    // CRITICAL: Use consistent 'token' parameter name for the search flow
    console.log("Navigating with token parameter:", tokenInput);
    safePerformanceTrack('token_search_navigation', { 
      isAddress, 
      destination: isAddress ? 'confirm' : 'confirm' 
    });
    
    if (isAddress) {
      // If it's an address, still go to confirm page to verify token
      navigate(`/confirm?token=${encodeURIComponent(tokenInput)}`);
    } else {
      // If it's a token name, go to confirm page
      navigate(`/confirm?token=${encodeURIComponent(tokenInput)}`);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
    setShowUpgradeDialog(false);
  };

  return (
    <>
      <div className={textPosition === "below" ? "w-full max-w-lg" : ""}>
        <form onSubmit={handleSubmit} className={`flex w-full max-w-lg gap-2 ${large ? 'flex-col md:flex-row' : ''}`}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={placeholder}
              className={`pl-9 ${large ? 'h-12 text-lg' : ''}`}
            />
          </div>
          <Button 
            type="submit" 
            className={large ? 'h-12 px-8' : ''} 
            disabled={isCheckingAccess}
          >
            {isCheckingAccess ? "Checking..." : "Scan Now"}
          </Button>
        </form>
        {textPosition === "below" && (
          <p className="text-xs text-muted-foreground mt-1 text-center">
            EVM tokens only
          </p>
        )}
      </div>
      {textPosition === "right" && (
        <p className="text-xs text-muted-foreground mt-1 text-center">
          EVM tokens only
        </p>
      )}

      <AlertDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Scan Limit Reached</AlertDialogTitle>
            <AlertDialogDescription>
              {scanAccessData?.plan === 'free'
                ? `You have used ${scanAccessData?.scansUsed} out of ${scanAccessData?.scanLimit} free scans. Upgrade to Pro for more scans and advanced features.`
                : `You have used ${scanAccessData?.scansUsed} out of ${scanAccessData?.scanLimit} Pro scans this month. Your limit will reset with your next billing cycle.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUpgrade}>
              {scanAccessData?.plan === 'free' ? 'Upgrade to Pro' : 'Manage Subscription'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
