
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
      <CardContent className="p-6">
        {/* Top section: Logo + Name/Symbol + Score */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <TokenLogo logo={logo} name={name} />
            <TokenInfo 
              name={name} 
              symbol={symbol} 
            />
          </div>
          {score !== undefined && <TokenScore score={score} />}
        </div>
        
        {/* Description section */}
        {description && (
          <div className="mb-4">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          </div>
        )}
        
        {/* Bottom section: Price/Change + Address/Chain + Social Links */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex flex-col gap-2">
            <TokenPrice 
              price={price} 
              priceChange={priceChange} 
              address={address}
            />
            
            {marketCap && (
              <div className="text-sm text-muted-foreground">
                Market Cap: {formatCurrencyValue(parseFloat(marketCap))}
              </div>
            )}
          </div>
          
          <TokenSocialLinks website={website} twitter={twitter} github={github} />
        </div>
      </CardContent>
    </Card>
  );
}
