
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import TokenCard from "@/components/TokenCard";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TokenResult as TokenResultType } from "./types";

interface TokenResultProps {
  token: TokenResultType;
  onSelectToken: (token: TokenResultType) => void;
}

export default function TokenResult({ token, onSelectToken }: TokenResultProps) {
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
  
  // Determine if this is an ERC-20 token
  const isErc20 = typeof token.isErc20 === 'boolean' ? token.isErc20 : false;

  return (
    <div className="relative">
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
                  <p>This token is deployed on an EVM-compatible network and supports scanning.</p>
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
                    <p>This token is not supported yet. Support for Solana and others is coming soon.</p>
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
}
