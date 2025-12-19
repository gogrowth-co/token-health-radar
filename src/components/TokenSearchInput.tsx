
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import TokenSearchAutocomplete from "@/components/token/TokenSearchAutocomplete";
import { isSolanaAddress, isEvmAddress } from "@/utils/addressUtils";

interface TokenSearchInputProps {
  large?: boolean;
  placeholder?: string;
  textPosition?: "right" | "below";
}

export default function TokenSearchInput({ 
  large = false, 
  placeholder = "Search token name or paste address...",
  textPosition = "right"
}: TokenSearchInputProps) {
  const navigate = useNavigate();
  
  const handleTokenSelect = (token: any) => {
    console.log('Token selected from autocomplete:', token);
    
    // Check if this is a Solana token
    const isSolana = token.chain === 'solana' || token.chain === 'sol' || isSolanaAddress(token.address);
    
    if (isSolana) {
      // Route Solana tokens directly to scan-loading, bypassing ScanChain validation
      navigate(`/scan-loading?chain=solana&address=${encodeURIComponent(token.address)}`);
    } else {
      // Navigate to the scan route for EVM tokens
      navigate(`/scan/${token.value}`);
    }
  };

  const handleManualSubmit = (searchTerm: string) => {
    if (!searchTerm.trim()) {
      toast({
        title: "Empty search",
        description: "Please enter a token name or address",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Manual token search:', searchTerm);
    
    // Check if input is a Solana address - route directly to Solana scan
    if (isSolanaAddress(searchTerm)) {
      navigate(`/scan-loading?chain=solana&address=${encodeURIComponent(searchTerm)}`);
      return;
    }
    
    // Check if input looks like an EVM address
    if (isEvmAddress(searchTerm)) {
      navigate(`/confirm?address=${encodeURIComponent(searchTerm)}`);
      return;
    }
    
    // Search by name - go to confirm page for backwards compatibility
    navigate(`/confirm?token=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <>
      <div className={textPosition === "below" ? "w-full max-w-lg" : ""}>
        <div className={`flex w-full max-w-lg gap-2 ${large ? 'flex-col sm:flex-row' : ''}`}>
          <TokenSearchAutocomplete
            placeholder={placeholder}
            onSelect={handleTokenSelect}
            className={`flex-1 ${large ? 'min-h-[48px]' : ''}`}
          />
          {large && (
            <Button 
              onClick={() => {
                const searchInput = document.querySelector('input[placeholder*="Search token"]') as HTMLInputElement;
                if (searchInput?.value) {
                  handleManualSubmit(searchInput.value);
                }
              }}
              className="h-12 px-6 md:px-8 text-base min-h-[44px] min-w-[120px]"
            >
              Scan Now
            </Button>
          )}
        </div>
        {textPosition === "below" && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Multi-chain EVM token search Powered by DD.xyz
          </p>
        )}
      </div>
      {textPosition === "right" && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Multi-chain EVM token search Powered by DD.xyz
        </p>
      )}
    </>
  );
}
