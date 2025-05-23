
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface TokenPriceProps {
  price?: number;
  priceChange?: number;
  address?: string;
}

export default function TokenPrice({ price, priceChange, address }: TokenPriceProps) {
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
    <div className="flex items-center gap-4">
      {/* Price and change */}
      {price !== undefined && (
        <div>
          <div className="text-2xl font-bold">${price.toLocaleString()}</div>
          {priceChange !== undefined && (
            <div className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </div>
          )}
        </div>
      )}
      
      {/* Address and chain */}
      {address && (
        <div className="flex items-center gap-2 ml-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-auto p-1 text-xs font-mono text-muted-foreground hover:text-foreground"
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
          
          <Badge variant="secondary" className="text-xs px-2 py-0">
            ETH
          </Badge>
        </div>
      )}
    </div>
  );
}
