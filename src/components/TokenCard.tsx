
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
  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
    <Card className="overflow-hidden bg-card border-0 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <TokenLogo logo={logo} name={name} />
          
          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <div>
                <TokenInfo name={name} symbol={symbol} description={description} />
                <TokenPrice price={price} priceChange={priceChange} />
              </div>
              
              <TokenScore score={score} />
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4">
          {marketCap && (
            <div className="text-sm text-muted-foreground">
              Market Cap: {marketCap}
            </div>
          )}
          
          <TokenSocialLinks website={website} twitter={twitter} github={github} />
          <TokenActions showActions={showActions} onClick={onClick} />
        </div>
      </CardContent>
    </Card>
  );
}
