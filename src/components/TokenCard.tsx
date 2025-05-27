
import { Card, CardContent } from "@/components/ui/card";
import TokenLogo from "./TokenLogo";
import TokenInfo from "./TokenInfo";
import TokenPrice from "./TokenPrice";
import TokenScore from "./TokenScore";
import TokenSocialLinks from "./TokenSocialLinks";
import { getFirstValidEvmAddress } from "@/utils/addressUtils";
import { formatCurrencyValue } from "@/utils/tokenFormatters";

interface TokenCardProps {
  name: string;
  symbol: string;
  logo: string;
  price?: number;
  priceChange?: number;
  marketCap?: string;
  address?: string;
  score?: number;
  launchDate?: string;
  website?: string;
  twitter?: string;
  github?: string;
  description?: string;
  onClick?: () => void;
  showActions?: boolean;
}

export default function TokenCard({
  name,
  symbol,
  logo,
  price,
  priceChange,
  marketCap,
  address,
  score,
  launchDate,
  website,
  twitter,
  github,
  description,
  onClick,
  showActions = true
}: TokenCardProps) {
  // Helper function to format market cap for display
  const formatMarketCapDisplay = (marketCap?: string) => {
    if (!marketCap || marketCap === "N/A" || marketCap === "0") {
      return null;
    }
    
    // If it's already formatted (contains $), use as is
    if (marketCap.includes('$')) {
      return marketCap;
    }
    
    // If it's a rank format, use as is
    if (marketCap.includes('Rank #')) {
      return marketCap;
    }
    
    // Try to parse as number and format
    const numValue = parseFloat(marketCap);
    if (!isNaN(numValue) && numValue > 0) {
      return formatCurrencyValue(numValue);
    }
    
    return marketCap;
  };

  const formattedMarketCap = formatMarketCapDisplay(marketCap);

  return (
    <Card className="overflow-hidden bg-card border border-border shadow-sm">
      <CardContent className="p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
          {/* LEFT SIDE - Token Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-4 mb-4">
              <TokenLogo logo={logo} name={name} />
              <div className="flex-1 min-w-0">
                <TokenInfo 
                  name={name} 
                  symbol={symbol} 
                />
              </div>
            </div>
            
            {/* Description - positioned under name/symbol */}
            {description && (
              <div className="mb-4">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {description}
                </p>
              </div>
            )}
            
            {/* Address and Chain - clean positioning */}
            {address && (
              <div className="flex items-center gap-3">
                <TokenPrice 
                  price={undefined} 
                  priceChange={undefined} 
                  address={address}
                  showPriceData={false}
                />
              </div>
            )}
          </div>
          
          {/* CENTER - Price & Market Data */}
          <div className="flex-shrink-0 lg:mx-8">
            <div className="space-y-4 text-center lg:text-left">
              {/* Price and change */}
              {price !== undefined && price > 0 && (
                <div>
                  <div className="text-3xl font-bold">${price.toLocaleString()}</div>
                  {priceChange !== undefined && (
                    <div className={`text-lg font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
              
              {/* Market Cap */}
              {formattedMarketCap && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Market Cap</div>
                  <div className="text-xl font-semibold">
                    {formattedMarketCap}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* RIGHT SIDE - Score & Socials */}
          <div className="flex-shrink-0 flex flex-col items-center lg:items-end space-y-6">
            {/* Health Score */}
            {score !== undefined && (
              <div className="flex flex-col items-center">
                <TokenScore score={score} />
                <div className="text-xs text-muted-foreground mt-2 text-center">Health Score</div>
              </div>
            )}
            
            {/* Social Links - positioned under score */}
            <div className="flex justify-center lg:justify-end">
              <TokenSocialLinks 
                website={website} 
                twitter={twitter} 
                github={github} 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
