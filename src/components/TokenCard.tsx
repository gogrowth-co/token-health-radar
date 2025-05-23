
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
  return (
    <Card className="overflow-hidden bg-card border border-border shadow-sm">
      <CardContent className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT SIDE - Token Info */}
          <div className="lg:col-span-6">
            <div className="flex items-start gap-4 mb-4">
              <TokenLogo logo={logo} name={name} />
              <div className="flex-1 min-w-0">
                <TokenInfo 
                  name={name} 
                  symbol={symbol} 
                />
              </div>
            </div>
            
            {/* Description */}
            {description && (
              <div className="mb-4 ml-20">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {description}
                </p>
              </div>
            )}
            
            {/* Address and Chain */}
            <div className="ml-20">
              <TokenPrice 
                price={undefined} 
                priceChange={undefined} 
                address={address}
                showPriceData={false}
              />
            </div>
          </div>
          
          {/* CENTER - Price & Market Data */}
          <div className="lg:col-span-4">
            <div className="space-y-3">
              {/* Price and change */}
              {price !== undefined && (
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
              {marketCap && (
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Market Cap</div>
                  <div className="text-xl font-semibold">
                    {formatCurrencyValue(parseFloat(marketCap))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* RIGHT SIDE - Score & Socials */}
          <div className="lg:col-span-2 flex flex-col items-end space-y-4">
            {/* Health Score */}
            {score !== undefined && (
              <div className="flex flex-col items-center">
                <TokenScore score={score} />
                <div className="text-xs text-muted-foreground mt-2 text-center">Health Score</div>
              </div>
            )}
            
            {/* Social Links */}
            <div className="flex flex-col items-center">
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
