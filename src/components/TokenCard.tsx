
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
        {/* Top section: Logo + Name/Symbol + Score */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <TokenLogo logo={logo} name={name} />
            <TokenInfo 
              name={name} 
              symbol={symbol} 
              showAddressInHeader={false}
            />
          </div>
          {score !== undefined && <TokenScore score={score} />}
        </div>
        
        {/* Description section */}
        {description && (
          <div className="mb-4 ml-20">
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {description}
            </p>
          </div>
        )}
        
        {/* Bottom section: Price/Change + Address/Chain + Social Links + Actions */}
        <div className="flex items-center justify-between ml-20">
          <div className="flex items-center gap-6">
            <TokenPrice 
              price={price} 
              priceChange={priceChange} 
              address={address}
            />
            
            {marketCap && (
              <div className="text-sm text-muted-foreground">
                Market Cap: {marketCap}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <TokenSocialLinks website={website} twitter={twitter} github={github} />
            <TokenActions showActions={showActions} onClick={onClick} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
