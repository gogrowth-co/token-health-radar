
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface TokenSearchInputProps {
  large?: boolean;
  placeholder?: string;
}

export default function TokenSearchInput({ 
  large = false, 
  placeholder = "Enter token name or contract address"
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
    
    // If user is not authenticated, redirect to auth page
    if (!isAuthenticated) {
      // Store the search query in localStorage so we can use it after login
      localStorage.setItem("pendingTokenSearch", tokenInput);
      // Redirect to auth page
      navigate("/auth");
      return;
    }
    
    // Continue with the existing flow for authenticated users
    // Check if input looks like an address (simple validation)
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(tokenInput);
    
    // Check if user has access to perform a scan
    setIsCheckingAccess(true);
    try {
      const { data, error } = await supabase.functions.invoke('check-scan-access');
      
      if (error) {
        toast({
          title: "Error",
          description: "Could not check scan access. Please try again.",
          variant: "destructive",
        });
        return;
      }
      
      if (!data.canScan) {
        // Store the data for the upgrade dialog
        setScanAccessData({
          plan: data.plan,
          scansUsed: data.scansUsed,
          scanLimit: data.scanLimit
        });
        
        // Show upgrade dialog
        setShowUpgradeDialog(true);
        return;
      }
      
      // If authenticated and has access, proceed with the scan
      try {
        // First check if the token exists in our cache
        let tokenAddress = tokenInput;
        
        if (!isAddress) {
          // This is just placeholder logic - in a real app, we'd search by name
          // For now we're just using the input as a placeholder address
          tokenAddress = `0x${tokenInput.toLowerCase().replace(/[^a-z0-9]/g, "").padEnd(40, "0").slice(0, 40)}`;
        }
        
        // Check if token exists in cache, if not add it
        const { data: existingToken } = await supabase
          .from("token_data_cache")
          .select("token_address")
          .eq("token_address", tokenAddress)
          .single();
          
        if (!existingToken) {
          // Add token to cache with placeholder data
          await supabase.from("token_data_cache").insert({
            token_address: tokenAddress,
            name: isAddress ? "Unknown Token" : tokenInput,
            symbol: isAddress ? "???" : tokenInput.slice(0, 5).toUpperCase()
          });
        }
        
        // Record the scan
        await supabase.from("token_scans").insert({
          user_id: user.id,
          token_address: tokenAddress,
          score_total: Math.floor(Math.random() * 100), // Placeholder score
          pro_scan: true // Mark as a pro scan
        });
        
        // Increment the user's scans_used count
        await supabase
          .from("subscribers")
          .update({ scans_used: data.scansUsed + 1 })
          .eq("id", user.id);
      } catch (error) {
        console.error("Error recording search:", error);
      }
    } catch (error) {
      console.error("Error checking scan access:", error);
    } finally {
      setIsCheckingAccess(false);
    }
    
    // Proceed with navigation
    if (isAddress) {
      // If it's an address, go directly to scan-loading
      navigate(`/scan-loading?address=${tokenInput}`);
    } else {
      // If it's a token name, go to confirm page
      navigate(`/confirm?token=${tokenInput}`);
    }
  };

  const handleUpgrade = () => {
    navigate('/pricing');
    setShowUpgradeDialog(false);
  };

  return (
    <>
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
