
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
  // Check if token is supported for full scanning
  const isFullySupported = isTokenScanSupported(token);
  
  console.log(`[TOKEN-RESULT] ${token.name} (${token.symbol}):`);
  console.log(`  - Market cap:`, token.market_cap);
  console.log(`  - Market cap rank:`, token.market_cap_rank);
  console.log(`  - Price USD:`, token.price_usd);
  console.log(`  - Price change 24h:`, token.price_change_24h);
  console.log(`  - Platforms:`, token.platforms);
  console.log(`  - Is fully supported:`, isFullySupported);

  // Format market cap display - prioritize market cap value over rank
  const getMarketCapDisplay = () => {
    if (typeof token.market_cap === 'number' && token.market_cap > 0) {
      return formatCurrencyValue(token.market_cap);
    }
    if (token.market_cap_rank) {
      return `Rank #${token.market_cap_rank}`;
    }
    return 'N/A';
  };

  // Get real description or create a basic one
  const getTokenDescription = () => {
    // If we have a real description, use it
    if (token.description && token.description.trim() && !token.description.includes('is a cryptocurrency')) {
      return token.description;
    }
    
    // Create a basic description with available data
    let desc = `${token.name} (${token.symbol.toUpperCase()})`;
    if (token.market_cap_rank) {
      desc += ` is ranked #${token.market_cap_rank} by market capitalization`;
    } else if (typeof token.market_cap === 'number' && token.market_cap > 0) {
      desc += ` has a market cap of ${formatCurrencyValue(token.market_cap)}`;
    } else {
      desc += ` is a cryptocurrency token`;
    }
    
    return desc;
  };

  return (
    <div className="relative border rounded-lg overflow-hidden shadow-sm">
      <TokenCard
        name={token.name}
        symbol={token.symbol.toUpperCase()}
        logo={token.large || token.thumb}
        marketCap={getMarketCapDisplay()}
        price={token.price_usd || 0}
        priceChange={token.price_change_24h || 0}
        description={getTokenDescription()}
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
