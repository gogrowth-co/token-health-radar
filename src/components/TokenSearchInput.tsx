
import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  validateTokenAddressSecure, 
  searchRateLimiter,
  sanitizeForDisplay 
} from "@/utils/secureValidation";

interface TokenSearchInputProps {
  placeholder?: string;
  className?: string;
  large?: boolean;
  textPosition?: "below" | "above";
}

export default function TokenSearchInput({ 
  placeholder = "Enter token name or contract address...",
  className = "",
  large = false,
  textPosition = "below"
}: TokenSearchInputProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      toast.error("Please enter a token name or address");
      return;
    }

    // Rate limiting check
    const userIdentifier = 'search_' + (Date.now() % 1000); // Simple identifier for searches
    if (!searchRateLimiter.isAllowed(userIdentifier)) {
      const remaining = searchRateLimiter.getRemainingRequests(userIdentifier);
      toast.error(`Search rate limit exceeded. Remaining searches: ${remaining}`);
      return;
    }

    // Validate and sanitize input
    const validation = validateTokenAddressSecure(searchTerm);
    if (!validation.isValid) {
      toast.error(`Invalid input: ${validation.errors.join(', ')}`);
      return;
    }

    setIsSearching(true);
    
    try {
      const sanitizedTerm = validation.sanitizedInput || searchTerm;
      console.log('🔍 Searching for token:', sanitizeForDisplay(sanitizedTerm));
      
      // Navigate to confirm page with sanitized input
      navigate(`/confirm?token=${encodeURIComponent(sanitizedTerm)}`);
    } catch (error) {
      console.error('Search error:', error);
      toast.error("Search failed. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Basic input sanitization on change
    const sanitized = value.replace(/[<>\"'&]/g, '').slice(0, 100);
    setSearchTerm(sanitized);
  };

  const helpText = "Search by token name (e.g., USDC) or contract address";

  return (
    <form onSubmit={handleSearch} className={`relative ${className}`}>
      {textPosition === "above" && (
        <p className={`text-muted-foreground mb-2 ${large ? 'text-sm' : 'text-xs'}`}>
          {helpText}
        </p>
      )}
      
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground ${large ? 'h-5 w-5' : 'h-4 w-4'}`} />
          <Input
            value={searchTerm}
            onChange={handleInputChange}
            placeholder={placeholder}
            className={`${large ? 'pl-10 pr-4 h-12 text-base' : 'pl-9 pr-4'}`}
            disabled={isSearching}
            maxLength={100}
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button 
          type="submit" 
          disabled={isSearching || !searchTerm.trim()}
          className={large ? "px-8 h-12 text-base" : "px-6"}
        >
          {isSearching ? (
            <>
              <Loader2 className={`animate-spin mr-2 ${large ? 'h-5 w-5' : 'h-4 w-4'}`} />
              Searching
            </>
          ) : (
            <>
              <Search className={`mr-2 ${large ? 'h-5 w-5' : 'h-4 w-4'}`} />
              Search
            </>
          )}
        </Button>
      </div>
      
      {textPosition === "below" && (
        <p className={`text-muted-foreground mt-1 ${large ? 'text-sm' : 'text-xs'}`}>
          {helpText}
        </p>
      )}
    </form>
  );
}
