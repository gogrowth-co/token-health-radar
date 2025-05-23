
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import TokenLogo from "./TokenLogo";
import TokenInfo from "./TokenInfo";
import TokenPrice from "./TokenPrice";
import TokenScore from "./TokenScore";
import TokenSocialLinks from "./TokenSocialLinks";
import TokenActions from "./TokenActions";

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
  const copyAddress = async () => {
    if (address) {
      try {
        await navigator.clipboard.writeText(address);
        toast({
          title: "Address copied to clipboard",
          duration: 2000,
        });
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  return (
    <Card className="overflow-hidden bg-card border border-border shadow-sm">
      <CardContent className="p-6">
        {/* Main content area */}
        <div className="flex items-start gap-4 mb-4">
          <TokenLogo logo={logo} name={name} />
          
          <div className="flex-1 flex items-start justify-between">
            <TokenInfo 
              name={name} 
              symbol={symbol} 
              description={description}
              address={address}
            />
            
            <div className="flex items-start gap-4 ml-4">
              <TokenSocialLinks website={website} twitter={twitter} github={github} />
              {score !== undefined && <TokenScore score={score} />}
            </div>
          </div>
        </div>
        
        {/* Price and market cap row */}
        <div className="flex items-center justify-between">
          <TokenPrice price={price} priceChange={priceChange} />
          
          <div className="flex items-center gap-4">
            {marketCap && (
              <div className="text-sm text-muted-foreground">
                Market Cap: {marketCap}
              </div>
            )}
            
            <TokenActions showActions={showActions} onClick={onClick} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
