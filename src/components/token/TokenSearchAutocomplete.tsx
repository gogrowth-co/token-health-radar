
import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TokenSearchResult {
  id: string;
  name: string;
  symbol: string;
  address: string;
  chain: string;
  logo: string;
  verified: boolean;
  title: string;
  subtitle: string;
  value: string;
}

interface TokenSearchAutocompleteProps {
  placeholder?: string;
  onSelect?: (token: TokenSearchResult) => void;
  className?: string;
}

export default function TokenSearchAutocomplete({ 
  placeholder = "Search token name or paste address...",
  onSelect,
  className = ""
}: TokenSearchAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<TokenSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const performSearch = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    setSelectedIndex(-1);

    try {
      console.log(`[TOKEN-AUTOCOMPLETE] Searching for: "${query}"`);

      const { data, error } = await supabase.functions.invoke('moralis-token-search', {
        body: { searchTerm: query, limit: 8 }
      });

      if (error) {
        console.error('[TOKEN-AUTOCOMPLETE] Search error:', error);
        toast.error("Search failed", {
          description: "Unable to search tokens. Please try again."
        });
        setResults([]);
        return;
      }

      const tokens = data?.tokens || [];
      console.log(`[TOKEN-AUTOCOMPLETE] Found ${tokens.length} tokens`);
      
      setResults(tokens);
      setIsOpen(tokens.length > 0);

    } catch (err: any) {
      console.error('[TOKEN-AUTOCOMPLETE] Search exception:', err);
      toast.error("Search error", {
        description: "Something went wrong. Please try again."
      });
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectToken = (token: TokenSearchResult) => {
    console.log(`[TOKEN-AUTOCOMPLETE] Token selected:`, token);
    
    setSearchTerm(`${token.symbol} — ${token.name}`);
    setIsOpen(false);
    setResults([]);

    if (onSelect) {
      onSelect(token);
    } else {
      // Default behavior: navigate to scan page
      navigate(`/scan/${token.value}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % results.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev <= 0 ? results.length - 1 : prev - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleSelectToken(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      toast.error("Empty search", {
        description: "Please enter a token name or address"
      });
      return;
    }

    // Check if input looks like an address
    if (/^(0x)?[0-9a-fA-F]{40}$/.test(searchTerm.trim())) {
      console.log(`[TOKEN-AUTOCOMPLETE] Direct address input detected`);
      navigate(`/confirm?address=${encodeURIComponent(searchTerm.trim())}`);
    } else if (results.length > 0) {
      // Select first result if available
      handleSelectToken(results[0]);
    } else {
      toast.error("No tokens found", {
        description: "Try a different search term or paste a token address"
      });
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getChainDisplayName = (chain: string) => {
    const chainNames: Record<string, string> = {
      'eth': 'Ethereum',
      'polygon': 'Polygon',
      'bsc': 'BSC',
      'arbitrum': 'Arbitrum',
      'avalanche': 'Avalanche',
      'optimism': 'Optimism',
      'base': 'Base',
      'fantom': 'Fantom'
    };
    return chainNames[chain.toLowerCase()] || chain.charAt(0).toUpperCase() + chain.slice(1);
  };

  return (
    <div ref={searchRef} className={`relative w-full max-w-lg ${className}`}>
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-9 pr-10 h-12 text-base"
            autoComplete="off"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          {!isLoading && isOpen && (
            <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          )}
        </div>
        <Button type="submit" className="sr-only">Search</Button>
      </form>

      {/* Results dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((token, index) => (
                <button
                  key={token.id}
                  onClick={() => handleSelectToken(token)}
                  className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-3 ${
                    index === selectedIndex ? 'bg-muted' : ''
                  }`}
                >
                  {/* Token logo */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                    {token.logo ? (
                      <img 
                        src={token.logo} 
                        alt={token.symbol}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">
                        {token.symbol.slice(0, 2)}
                      </span>
                    )}
                  </div>

                  {/* Token info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{token.symbol}</span>
                      <span className="text-muted-foreground">—</span>
                      <span className="text-sm text-muted-foreground truncate">{token.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                      {token.address}
                    </div>
                  </div>

                  {/* Chain badge */}
                  <div className="flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {getChainDisplayName(token.chain)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.trim() && !isLoading ? (
            <div className="px-4 py-6 text-center text-muted-foreground">
              <div className="text-sm">😕 No tokens found</div>
              <div className="text-xs mt-1">Try a different search term or paste a token address</div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
