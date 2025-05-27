
import { Button } from "@/components/ui/button";
import { Info, AlertTriangle } from "lucide-react";
import TokenCard from "@/components/TokenCard";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TokenResult as TokenResultType } from "./types";
import { formatCurrencyValue } from "@/utils/tokenFormatters";
import { isTokenScanSupported } from "@/utils/tokenStorage";

interface TokenResultProps {
  token: TokenResultType;
  onSelectToken: (token: TokenResultType) => void;
}

export default function TokenResult({ token, onSelectToken }: TokenResultProps) {
  // Determine if this is an ERC-20 token
  const isErc20 = typeof token.isErc20 === 'boolean' ? token.isErc20 : false;
  
  // Check if token is supported for full scanning
  const isFullySupported = isTokenScanSupported(token);

  return (
    <div className="relative border rounded-lg overflow-hidden shadow-sm">
      <TokenCard
        name={token.name}
        symbol={token.symbol.toUpperCase()}
        logo={token.large || token.thumb}
        marketCap={token.market_cap_rank ? `Rank #${token.market_cap_rank}` : (typeof token.market_cap === 'number' ? formatCurrencyValue(token.market_cap) : 'N/A')}
        price={token.price_usd || 0}
        priceChange={token.price_change_24h || 0}
        description={`${token.name} (${token.symbol.toUpperCase()}) is a cryptocurrency${token.market_cap_rank ? ` ranked #${token.market_cap_rank}` : ''}`}
        showActions={false} /* Disable built-in actions for custom layout */
      />

      {/* Badge and button row positioned within the card layout */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="flex items-center gap-2">
          {isFullySupported ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className="bg-green-500 hover:bg-green-600">Full Support</Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>This token supports comprehensive health scanning across all categories.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <div className="flex items-center gap-1.5">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-amber-500 hover:bg-amber-600 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      Limited Support
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Basic information only. Support for more blockchains coming soon.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        
        {/* Select button for all tokens */}
        <Button 
          size="sm" 
          onClick={() => onSelectToken(token)} 
          className="ml-auto"
          variant={isFullySupported ? "default" : "outline"}
        >
          {isFullySupported ? "Scan" : "View Info"}
        </Button>
      </div>
    </div>
  );
}
