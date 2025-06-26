
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import TokenSearchAutocomplete from "@/components/token/TokenSearchAutocomplete";

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
    // Navigate to the new scan route with chain and address
    navigate(`/scan/${token.value}`);
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
    
    // Check if input looks like an address
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(searchTerm);
    
    if (isAddress) {
      // Direct address input - go to confirm page
      navigate(`/confirm?address=${encodeURIComponent(searchTerm)}`);
    } else {
      // Search by name - go to confirm page for backwards compatibility
      navigate(`/confirm?token=${encodeURIComponent(searchTerm)}`);
    }
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
            Multi-chain EVM token search powered by Moralis
          </p>
        )}
      </div>
      {textPosition === "right" && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Multi-chain EVM token search powered by Moralis
        </p>
      )}
    </>
  );
}
