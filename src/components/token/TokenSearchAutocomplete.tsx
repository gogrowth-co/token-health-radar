import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, CheckCircle } from "lucide-react";
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

// Chain priority for sorting
const CHAIN_PRIORITY: Record<string, number> = {
  'eth': 1,
  'arbitrum': 2,
  'bsc': 3,
  'polygon': 4,
  'base': 5,
  'optimism': 6,
  'avalanche': 7,
};

// Enhanced chain display names with better formatting
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

// Chain colors for badges
const getChainBadgeVariant = (chain: string): "default" | "secondary" | "destructive" | "outline" | "blue" => {
  const chainColors: Record<string, "default" | "secondary" | "destructive" | "outline" | "blue"> = {
    'eth': 'blue',
    'polygon': 'secondary',
    'bsc': 'default',
    'arbitrum': 'outline',
    'base': 'blue',
    'optimism': 'destructive',
    'avalanche': 'secondary'
  };
  return chainColors[chain.toLowerCase()] || 'outline';
};

// Text highlighting utility
const highlightText = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
        {part}
      </mark>
    ) : part
  );
};

// Sort tokens by chain priority
const sortTokensByChain = (tokens: TokenSearchResult[]) => {
  return tokens.sort((a, b) => {
    const priorityA = CHAIN_PRIORITY[a.chain] || 999;
    const priorityB = CHAIN_PRIORITY[b.chain] || 999;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // If same chain priority, sort by symbol alphabetically
    return a.symbol.localeCompare(b.symbol);
  });
};

export default function TokenSearchAutocomplete({ 
  placeholder = "Search by name, symbol, or contract address...",
  onSelect,
  className = ""
}: TokenSearchAutocompleteProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<TokenSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [searchMessage, setSearchMessage] = useState("");
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Debounced search effect
  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsOpen(false);
      setSearchMessage("");
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
    setSearchMessage("");

    try {
      console.log(`[TOKEN-AUTOCOMPLETE] Searching for: "${query}"`);

      const { data, error } = await supabase.functions.invoke('moralis-token-search', {
        body: { searchTerm: query, limit: 12 }
      });

      if (error) {
        console.error('[TOKEN-AUTOCOMPLETE] Search error:', error);
        toast.error("Search failed", {
          description: "Unable to search tokens. Please try again."
        });
        setResults([]);
        setSearchMessage("Search failed. Please try again.");
        return;
      }

      const tokens = data?.tokens || [];
      const message = data?.message || "";
      
      console.log(`[TOKEN-AUTOCOMPLETE] Found ${tokens.length} tokens`);
      
      // Sort tokens by chain priority
      const sortedTokens = sortTokensByChain(tokens);
      
      setResults(sortedTokens);
      setSearchMessage(message);
      setIsOpen(sortedTokens.length > 0 || message.length > 0);

    } catch (err: any) {
      console.error('[TOKEN-AUTOCOMPLETE] Search exception:', err);
      toast.error("Search error", {
        description: "Something went wrong. Please try again."
      });
      setResults([]);
      setSearchMessage("Search error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectToken = (token: TokenSearchResult) => {
    console.log(`[TOKEN-AUTOCOMPLETE] Token selected:`, token);
    
    setSearchTerm(`${token.symbol} — ${token.name}`);
    setIsOpen(false);
    setResults([]);
    setSearchMessage("");

    if (onSelect) {
      onSelect(token);
    } else {
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
        description: "Please enter a token name, symbol, or contract address"
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
      // Try to search again or show helpful message
      performSearch(searchTerm);
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

      {/* Enhanced Results dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((token, index) => (
                <button
                  key={token.id}
                  onClick={() => handleSelectToken(token)}
                  className={`w-full px-4 py-4 text-left hover:bg-muted/20 transition-all duration-200 flex items-center gap-4 group ${
                    index === selectedIndex ? 'bg-muted/30' : ''
                  }`}
                >
                  {/* Enhanced Token logo with fallback */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center overflow-hidden shadow-sm">
                    {token.logo ? (
                      <img 
                        src={token.logo} 
                        alt={token.symbol}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <span className={`text-sm font-bold text-gray-600 dark:text-gray-300 ${token.logo ? 'hidden' : ''}`}>
                      {token.symbol.slice(0, 2).toUpperCase()}
                    </span>
                  </div>

                  {/* Enhanced Token info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground">
                        {highlightText(token.symbol, searchTerm)}
                      </span>
                      {token.verified && (
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {highlightText(token.name, searchTerm)}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground/80 truncate bg-muted/30 px-2 py-1 rounded">
                      {token.address}
                    </div>
                  </div>

                  {/* Enhanced Chain badge */}
                  <div className="flex-shrink-0">
                    <Badge 
                      variant={getChainBadgeVariant(token.chain)} 
                      className="text-xs font-medium px-2 py-1 shadow-sm"
                    >
                      {getChainDisplayName(token.chain)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : searchMessage ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              <div className="text-sm font-medium">{searchMessage}</div>
              <div className="text-xs mt-2 text-muted-foreground/70">
                Try searching by symbol (e.g., "ETH", "USDC") or paste a contract address
              </div>
            </div>
          ) : searchTerm.trim() && !isLoading ? (
            <div className="px-6 py-8 text-center text-muted-foreground">
              <div className="text-sm font-medium">😕 No tokens found</div>
              <div className="text-xs mt-2 text-muted-foreground/70">
                Try searching by symbol or contract address
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
