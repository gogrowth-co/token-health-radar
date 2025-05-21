
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput.trim()) {
      // Check if input looks like an address (simple validation)
      const isAddress = /^(0x)?[0-9a-fA-F]{40}$/.test(tokenInput);
      
      if (isAddress) {
        // If it's an address, go directly to scan-loading
        navigate(`/scan-loading?address=${tokenInput}`);
      } else {
        // If it's a token name, go to confirm page
        navigate(`/confirm?token=${tokenInput}`);
      }
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
