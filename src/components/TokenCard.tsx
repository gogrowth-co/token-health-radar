
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface TokenCardProps {
  name: string;
  symbol: string;
  logo: string;
  price?: number;
  priceChange?: number;
  marketCap?: string;
  address?: string;
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
    <Card className="overflow-hidden border-2 hover:border-primary/50 transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <img src={logo} alt={`${name} logo`} className="w-12 h-12 rounded-full" />
          </div>
          
          <div className="flex-grow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{symbol}</Badge>
                  
                  {address && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 text-xs px-2 py-0"
                            onClick={copyAddress}
                          >
                            {shortenAddress(address)}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Click to copy address</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
              
              {price !== undefined && (
                <div className="text-right">
                  <div className="font-bold">${price.toLocaleString()}</div>
                  {priceChange !== undefined && (
                    <div className={`text-sm ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange}%
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {marketCap && (
              <div className="text-sm text-muted-foreground mt-1">
                Market Cap: ${marketCap}
              </div>
            )}
          </div>
        </div>
        
        {showActions && (
          <div className="flex justify-end mt-2">
            {onClick ? (
              <Button size="sm" onClick={onClick} className="flex items-center gap-1">
                Select 
                <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <Button size="sm" variant="outline" asChild>
                <Link to={`https://etherscan.io/address/${address}`} target="_blank">
                  View on Explorer
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
