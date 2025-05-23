
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Info } from "lucide-react";
import TokenCard from "@/components/TokenCard";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface TokenResult {
  id: string;
  name: string;
  symbol: string;
  market_cap_rank?: number;
  thumb: string;
  large?: string;
  platforms?: Record<string, string>;
  market_cap?: number;
  price_usd?: number;
  price_change_24h?: number;
  isErc20?: boolean;
}

interface TokenSearchResultsProps {
  isLoading: boolean;
  error: string | null;
  results: TokenResult[];
  searchTerm: string;
  onSelectToken: (token: TokenResult) => void;
}

// Known ERC-20 tokens that might not be correctly identified by platform data
const KNOWN_ERC20_TOKENS = [
  'ethereum', 'uniswap', 'dai', 'chainlink', 'aave', 'compound', 
  'maker', 'wrapped-bitcoin', 'tether', 'usd-coin'
];

export default function TokenSearchResults({ 
  isLoading, 
  error, 
  results, 
  searchTerm, 
  onSelectToken 
}: TokenSearchResultsProps) {
  const navigate = useNavigate();
  
  // Helper function to format numbers nicely
  const formatNumber = (value: number | undefined): string => {
    if (value === undefined) return "N/A";
    
    // For very large numbers
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } 
    // For millions
    else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    // For thousands
    else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    } 
    // For regular numbers
    else {
      return `$${value.toFixed(2)}`;
    }
  };

  // Enhanced helper function to robustly detect ERC-20 compatibility
  const isErc20Compatible = (token: TokenResult): boolean => {
    // If the token already has isErc20 explicitly set, trust that value
    if (typeof token.isErc20 === 'boolean') {
      return token.isErc20;
    }
    
    // Check if it's in our known ERC-20 whitelist
    if (KNOWN_ERC20_TOKENS.includes(token.id)) {
      return true;
    }
    
    // Check platforms data - this is the primary method
    if (token.platforms && token.platforms.ethereum) {
      const ethereumAddress = token.platforms.ethereum;
      
      // More lenient Ethereum address validation (handles any non-empty string)
      if (typeof ethereumAddress === "string" && ethereumAddress.trim().length > 0) {
        // Prefer correctly formatted addresses, but don't strictly require it
        // This helps with API inconsistencies in address formats
        if (/^(0x)?[0-9a-fA-F]{40}$/i.test(ethereumAddress.trim())) {
          return true;
        }
        
        // If it has any ethereum address, it's likely ERC-20
        return true;
      }
    }
    
    // Fallback based on token naming (some tokens have "ETH" or "ERC" in their name/symbol)
    const nameAndSymbol = (token.name + token.symbol).toLowerCase();
    if (nameAndSymbol.includes('erc20') || nameAndSymbol.includes('erc-20') || 
        nameAndSymbol.includes('eth') || nameAndSymbol.includes('ethereum')) {
      return true;
    }
    
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Searching for tokens...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">{error}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate("/")}
        >
          Try a different search
        </Button>
      </div>
    );
  }

  if (results.length > 0) {
    return (
      <div className="space-y-4">
        {results.map((token) => {
          // FIXED: Prioritize the pre-determined isErc20 flag if it exists
          const isErc20 = typeof token.isErc20 === 'boolean' ? token.isErc20 : isErc20Compatible(token);
          
          return (
            <div key={token.id} className="relative">
              <TokenCard
                name={token.name}
                symbol={token.symbol.toUpperCase()}
                logo={token.large || token.thumb}
                marketCap={token.market_cap_rank ? `Rank #${token.market_cap_rank}` : (typeof token.market_cap === 'number' ? formatNumber(token.market_cap) : 'N/A')}
                price={token.price_usd || 0}
                priceChange={token.price_change_24h || 0}
                onClick={isErc20 ? () => onSelectToken(token) : undefined}
                description={`${token.name} (${token.symbol.toUpperCase()}) is a cryptocurrency${token.market_cap_rank ? ` ranked #${token.market_cap_rank}` : ''}`}
                showActions={false} /* Disable built-in actions for custom layout */
              />

              {/* Fixed badge and button layout - separated from card content */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isErc20 ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge className="bg-green-500 hover:bg-green-600">ERC-20 Compatible</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This token is deployed on the Ethereum network and supports ERC-20 scanning.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-red-500 hover:bg-red-600">Unsupported Chain</Badge>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>This token is not supported yet. Support for Solana, Arbitrum, and others is coming soon.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                
                {/* Dedicated select button for ERC-20 tokens */}
                {isErc20 && (
                  <Button 
                    size="sm" 
                    onClick={() => onSelectToken(token)} 
                    className="ml-auto"
                  >
                    Select
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // No results found
  return (
    <div className="text-center py-12">
      {searchTerm ? (
        <p className="text-muted-foreground">No tokens found matching "{searchTerm}"</p>
      ) : (
        <p className="text-muted-foreground">Enter a token name to search</p>
      )}
      <Button 
        variant="outline" 
        className="mt-4"
        onClick={() => navigate("/")}
      >
        Try a different search
      </Button>
    </div>
  );
}
