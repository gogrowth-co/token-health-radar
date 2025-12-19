import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, CheckCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import TokenLogo from "./TokenLogo";
import { isSolanaAddress } from "@/utils/addressUtils";

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

interface CachedSearchResult {
  results: TokenSearchResult[];
  message: string;
  timestamp: number;
}

// Simple in-memory cache with 5-minute TTL
const searchCache = new Map<string, CachedSearchResult>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface TokenSearchAutocompleteProps {
  placeholder?: string;
  onSelect?: (token: TokenSearchResult) => void;
  className?: string;
}

// Chain priority for sorting (matches backend) - Solana added
const CHAIN_PRIORITY: Record<string, number> = {
  'eth': 1,
  'solana': 2, // Solana high priority
  '0xa4b1': 3, // Arbitrum
  'arbitrum': 3,
  'bsc': 4,
  '0x89': 5, // Polygon
  'polygon': 5,
  '0x2105': 6, // Base
  'base': 6,
  '0xa': 7, // Optimism
  'optimism': 7,
  'avalanche': 8,
};

// Enhanced chain display names with hex ID support and Solana
const getChainDisplayName = (chain: string) => {
  const chainNames: Record<string, string> = {
    'eth': 'Ethereum',
    'solana': 'Solana',
    'polygon': 'Polygon',
    '0x89': 'Polygon',
    'bsc': 'BSC',
    'arbitrum': 'Arbitrum',
    '0xa4b1': 'Arbitrum',
    'avalanche': 'Avalanche',
    'optimism': 'Optimism',
    '0xa': 'Optimism',
    'base': 'Base',
    '0x2105': 'Base',
    'fantom': 'Fantom'
  };
  return chainNames[chain.toLowerCase()] || chain.charAt(0).toUpperCase() + chain.slice(1);
};

// Chain colors for badges including hex IDs and Solana
const getChainBadgeVariant = (chain: string): "default" | "secondary" | "destructive" | "outline" => {
  const chainColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    'eth': 'default',
    'solana': 'secondary', // Purple-ish for Solana
    'polygon': 'secondary',
    '0x89': 'secondary', // Polygon
    'bsc': 'outline',
    'arbitrum': 'secondary',
    '0xa4b1': 'secondary', // Arbitrum
    'base': 'default',
    '0x2105': 'default', // Base
    'optimism': 'destructive',
    '0xa': 'destructive', // Optimism
    'avalanche': 'secondary'
  };
  return chainColors[chain.toLowerCase()] || 'outline';
};

// Check if chain is Solana
const isSolanaChain = (chain: string): boolean => {
  return chain.toLowerCase() === 'solana' || chain.toLowerCase() === 'sol';
};

// Text highlighting utility with improved colors
const highlightText = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-amber-100 dark:bg-amber-500/20 px-0.5 rounded">
        {part}
      </mark>
    ) : part
  );
};

// Sort tokens by updated chain priority
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
      const cacheKey = query.toLowerCase().trim();

      // Check cache first
      const cached = searchCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
        console.log(`[TOKEN-AUTOCOMPLETE] Using cached results for: "${query}"`);
        setResults(cached.results);
        setSearchMessage(cached.message);
        setIsOpen(cached.results.length > 0 || cached.message.length > 0);
        setIsLoading(false);
        return;
      }

      console.log(`[TOKEN-AUTOCOMPLETE] dd.xyz-style search for: "${query}"`);

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

      console.log(`[TOKEN-AUTOCOMPLETE] Found ${tokens.length} tokens across chains`);

      // Sort tokens by updated chain priority
      const sortedTokens = sortTokensByChain(tokens);

      // Cache the results
      searchCache.set(cacheKey, {
        results: sortedTokens,
        message: message,
        timestamp: Date.now()
      });

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
      // Route Solana tokens to the Solana scan flow
      if (isSolanaChain(token.chain)) {
        console.log(`[TOKEN-AUTOCOMPLETE] Routing Solana token to scan-loading`);
        navigate(`/scan-loading?chain=solana&address=${encodeURIComponent(token.address)}`);
      } else {
        navigate(`/scan/${token.value}`);
      }
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

    const trimmedSearch = searchTerm.trim();

    // Check if input looks like an EVM address
    if (/^(0x)?[0-9a-fA-F]{40}$/.test(trimmedSearch)) {
      console.log(`[TOKEN-AUTOCOMPLETE] Direct EVM address input detected`);
      navigate(`/confirm?address=${encodeURIComponent(trimmedSearch)}`);
    } 
    // Check if input looks like a Solana address (Base58)
    else if (isSolanaAddress(trimmedSearch)) {
      console.log(`[TOKEN-AUTOCOMPLETE] Direct Solana address input detected`);
      navigate(`/scan-loading?chain=solana&address=${encodeURIComponent(trimmedSearch)}`);
    }
    else if (results.length > 0) {
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

      {/* Enhanced Results dropdown with dual-logo display */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-80 overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((token, index) => (
                <button
                  key={token.id}
                  onClick={() => handleSelectToken(token)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 flex items-center gap-4 group border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:shadow-sm ${
                    index === selectedIndex ? 'bg-gray-50 dark:bg-gray-800' : ''
                  }`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  {/* Token logo with chain badge */}
                  <div className="flex-shrink-0">
                    <TokenLogo 
                      logo={token.logo} 
                      symbol={token.symbol}
                      chain={token.chain}
                      className="w-10 h-10"
                      showChainBadge={true}
                    />
                  </div>

                  {/* Token information with improved typography and alignment */}
                  <div className="flex-1 min-w-0 space-y-1 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-gray-900 dark:text-gray-100">
                        {highlightText(token.symbol, searchTerm)}
                      </span>
                      {token.verified && (
                        <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                      {highlightText(token.name, searchTerm)}
                    </div>
                    <div className="text-xs font-mono text-gray-500 dark:text-gray-500 truncate bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded max-w-full">
                      {token.address}
                    </div>
                  </div>

                  {/* Chain badge with improved styling and alignment - special Solana styling */}
                  <div className="flex-shrink-0 flex items-center">
                    <Badge 
                      variant={getChainBadgeVariant(token.chain)} 
                      className={`text-xs font-medium px-2 py-1 shadow-sm border ${
                        isSolanaChain(token.chain) 
                          ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' 
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {isSolanaChain(token.chain) && <span className="mr-1">◎</span>}
                      {getChainDisplayName(token.chain)}
                    </Badge>
                  </div>
                </button>
              ))}
            </div>
          ) : searchMessage ? (
            <div className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
              <div className="text-sm font-medium">{searchMessage}</div>
              <div className="text-xs mt-2 text-gray-500 dark:text-gray-500">
                Try searching by symbol (e.g., "ETH", "USDC") or paste a contract address
              </div>
            </div>
          ) : searchTerm.trim() && !isLoading ? (
            <div className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
              <div className="text-sm font-medium">😕 No tokens found</div>
              <div className="text-xs mt-2 text-gray-500 dark:text-gray-500">
                Try searching by symbol or contract address
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
