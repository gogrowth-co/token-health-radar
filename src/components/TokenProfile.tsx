
import { ExternalLink, Github, Twitter, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import OverallHealthScore from "./OverallHealthScore";

interface TokenProfileProps {
  name: string;
  symbol: string;
  logo: string;
  address: string;
  website: string;
  twitter: string;
  github: string;
  price: number;
  priceChange: number;
  marketCap: string;
  overallScore?: number;
  description?: string;
  network?: string;
}

export default function TokenProfile({
  name,
  symbol,
  logo,
  address,
  website,
  twitter,
  github,
  price,
  priceChange,
  marketCap,
  overallScore = 0,
  description,
  network = "ETH"
}: TokenProfileProps) {
  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast("Address copied to clipboard");
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const formatMarketCap = (marketCapString: string) => {
    // Remove any existing formatting and convert to number
    const cleanValue = marketCapString.replace(/[^0-9.]/g, '');
    const value = parseFloat(cleanValue);
    
    if (isNaN(value)) return "N/A";
    
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    } else {
      return `$${value.toFixed(2)}`;
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-md bg-card">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Token Info */}
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <img src={logo} alt={`${name} logo`} className="w-16 h-16 rounded-full" />
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-2xl font-bold">{name}</h2>
                  <Badge variant="outline" className="text-sm py-0.5">{symbol}</Badge>
                </div>
                
                {description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {description.length > 150 ? `${description.substring(0, 150)}...` : description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Middle Column: Address & Links */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-2">Contract Address</div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 px-3 font-mono text-xs"
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
                
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  {network}
                </Badge>
              </div>
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-2">Official Links</div>
              <div className="flex items-center gap-2">
                {website && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={website} target="_blank" rel="noopener noreferrer" aria-label="Website">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {twitter && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                {github && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                    <a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Price & Health Score */}
          <div className="flex flex-col gap-6">
            {/* Health Score */}
            <div className="flex justify-center lg:justify-end">
              <OverallHealthScore score={overallScore} />
            </div>

            {/* Price Information */}
            <div className="text-center lg:text-right">
              <div className="text-sm text-muted-foreground mb-1">Current Price</div>
              <div className="flex flex-col items-center lg:items-end gap-1">
                <span className="text-3xl font-bold">${price.toFixed(2)}</span>
                <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
                </span>
              </div>
            </div>

            {/* Market Cap */}
            <div className="text-center lg:text-right">
              <div className="text-sm text-muted-foreground mb-1">Market Cap</div>
              <div className="text-lg font-semibold">{formatMarketCap(marketCap)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
