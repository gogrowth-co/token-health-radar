
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

interface TokenSearchInputProps {
  large?: boolean;
  placeholder?: string;
}

export default function TokenSearchInput({ 
  large = false, 
  placeholder = "Enter token name or contract address"
}: TokenSearchInputProps) {
  const [tokenInput, setTokenInput] = useState("");
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
    
    // Check if input looks like an address (simple validation)
    const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(tokenInput);
    
    // If authenticated, record this search
    if (isAuthenticated && user) {
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
          score_total: Math.floor(Math.random() * 100) // Placeholder score
        });
      } catch (error) {
        console.error("Error recording search:", error);
      }
    }
    
    if (isAddress) {
      // If it's an address, go directly to scan-loading
      navigate(`/scan-loading?address=${tokenInput}`);
    } else {
      // If it's a token name, go to confirm page
      navigate(`/confirm?token=${tokenInput}`);
    }
  };

  return (
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
      <Button type="submit" className={large ? 'h-12 px-8' : ''}>
        Scan Now
      </Button>
    </form>
  );
}
