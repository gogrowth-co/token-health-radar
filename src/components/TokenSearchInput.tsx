
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { safePerformanceTrack } from "@/utils/errorTracking";

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
  
  const navigate = useNavigate();
  
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
      hasInput: !!tokenInput.trim() 
    });
    
    // Check if input looks like an address (simple validation)
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(tokenInput);
    console.log("Input validation:", { isAddress, tokenInput });
    
    // CRITICAL: Use consistent 'token' parameter name for the search flow
    console.log("Navigating with token parameter:", tokenInput);
    safePerformanceTrack('token_search_navigation', { 
      isAddress, 
      destination: 'confirm' 
    });
    
    // Navigate to confirm page - no auth gate
    navigate(`/confirm?token=${encodeURIComponent(tokenInput)}`);
  };

  return (
    <>
      <div className={textPosition === "below" ? "w-full max-w-lg" : ""}>
        <form onSubmit={handleSubmit} className={`flex w-full max-w-lg gap-2 ${large ? 'flex-col sm:flex-row' : ''}`}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              placeholder={placeholder}
              className={`pl-9 ${large ? 'h-12 text-base md:text-lg' : 'h-11'} min-h-[44px]`}
            />
          </div>
          <Button 
            type="submit" 
            className={`${large ? 'h-12 px-6 md:px-8 text-base' : 'h-11 px-4'} min-h-[44px] min-w-[120px]`}
          >
            Scan Now
          </Button>
        </form>
        {textPosition === "below" && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            EVM tokens only
          </p>
        )}
      </div>
      {textPosition === "right" && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          EVM tokens only
        </p>
      )}
    </>
  );
}
