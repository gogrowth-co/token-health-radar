
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
  const isFullySupported = isTokenScanSupported(token);
  
  console.log(`[TOKEN-RESULT] ${token.name} (${token.symbol}):`);
  console.log(`  - Market cap:`, token.market_cap);
  console.log(`  - Market cap rank:`, token.market_cap_rank);
  console.log(`  - Price USD:`, token.price_usd);
  console.log(`  - Price change 24h:`, token.price_change_24h);
  console.log(`  - Platforms:`, token.platforms);
  console.log(`  - Is fully supported:`, isFullySupported);

  // Enhanced market cap display - always show something meaningful
  const getMarketCapDisplay = () => {
    if (typeof token.market_cap === 'number' && token.market_cap > 0) {
      return formatCurrencyValue(token.market_cap);
    }
    if (token.market_cap_rank && token.market_cap_rank > 0) {
      return `Rank #${token.market_cap_rank}`;
    }
    return 'Market cap not available';
  };

  // Enhanced description with better fallbacks
  const getTokenDescription = () => {
    // Use tokenInfo description if available (most complete)
    if (token.tokenInfo?.description && token.tokenInfo.description.trim()) {
      return token.tokenInfo.description;
    }
    
    // Use token description if available
    if (token.description && token.description.trim() && !token.description.includes('is a cryptocurrency')) {
      return token.description;
    }
    
    // Create meaningful description with available data
    let desc = `${token.name} (${token.symbol.toUpperCase()})`;
    if (token.market_cap_rank && token.market_cap_rank > 0) {
      desc += ` is ranked #${token.market_cap_rank} by market capitalization`;
    } else if (typeof token.market_cap === 'number' && token.market_cap > 0) {
      desc += ` has a market cap of ${formatCurrencyValue(token.market_cap)}`;
    } else {
      desc += ` is a cryptocurrency token`;
    }
    
    // Add chain information if available
    if (token.platforms && Object.keys(token.platforms).length > 0) {
      const chainCount = Object.keys(token.platforms).length;
      desc += `. Available on ${chainCount} blockchain${chainCount > 1 ? 's' : ''}`;
    }
    
    return desc;
  };

  // Get supported chains for display
  const getSupportedChains = () => {
    if (!token.platforms || Object.keys(token.platforms).length === 0) {
      return [];
    }
    
    const chainNames: Record<string, string> = {
      'ethereum': 'Ethereum',
      'polygon-pos': 'Polygon',
      'binance-smart-chain': 'BSC',
      'arbitrum-one': 'Arbitrum',
      'avalanche': 'Avalanche',
      'optimistic-ethereum': 'Optimism',
      'base': 'Base',
      'fantom': 'Fantom'
    };
    
    return Object.keys(token.platforms)
      .slice(0, 3) // Show max 3 chains
      .map(platform => chainNames[platform] || platform.charAt(0).toUpperCase() + platform.slice(1));
  };

  const supportedChains = getSupportedChains();

  return (
    <div className="relative border rounded-lg overflow-hidden shadow-sm">
      <TokenCard
        name={token.name}
        symbol={token.symbol.toUpperCase()}
        logo={token.tokenInfo?.logo_url || token.large || token.thumb}
        marketCap={getMarketCapDisplay()}
        price={token.price_usd || 0}
        priceChange={token.price_change_24h || 0}
        description={getTokenDescription()}
        showActions={false}
      />

      {/* Enhanced footer with chain info and support status */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Support status badge */}
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
          )}
          
          {/* Chain badges */}
          {supportedChains.map((chain, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {chain}
            </Badge>
          ))}
          
          {/* Show "+" if there are more chains */}
          {token.platforms && Object.keys(token.platforms).length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{Object.keys(token.platforms).length - 3} more
            </Badge>
          )}
        </div>
        
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
