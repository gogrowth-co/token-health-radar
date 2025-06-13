
import { useState, FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Search, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TokenSearchFormProps {
  initialSearchTerm: string;
  onSearch: (searchTerm: string) => void;
}

export default function TokenSearchForm({ initialSearchTerm, onSearch }: TokenSearchFormProps) {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [showRateLimit, setShowRateLimit] = useState(false);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      toast.error("Empty search", {
        description: "Please enter a token name"
      });
      return;
    }
    
    // Hide rate limit warning when user initiates new search
    setShowRateLimit(false);
    onSearch(searchTerm);
  };

  // Show rate limit warning if search term changes quickly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Show rate limit info for rapid typing
    if (value.length > 2) {
      setShowRateLimit(true);
      // Auto-hide after 3 seconds
      setTimeout(() => setShowRateLimit(false), 3000);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={handleInputChange}
            placeholder="Search token name"
            className="pl-9"
          />
        </div>
      </form>
      
      {showRateLimit && (
        <Alert className="mt-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Search results are cached to avoid rate limits. If you don't see recent tokens, try searching for established ones first.
          </AlertDescription>
        </Alert>
      )}
      
      <p className="text-xs text-muted-foreground mt-1">
        EVM tokens only • Results cached for better performance
      </p>
    </div>
  );
}
