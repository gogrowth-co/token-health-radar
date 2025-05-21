
import { ExternalLink, Github, Twitter, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

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
  tvl: string;
  launchDate: string;
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
  tvl,
  launchDate
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <Card className="overflow-hidden border-none shadow-md bg-card">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <img src={logo} alt={`${name} logo`} className="w-16 h-16 rounded-full" />
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">{name}</h2>
                <Badge variant="outline" className="text-sm py-0.5">{symbol}</Badge>
              </div>
              
              <div className="flex items-center gap-2 mt-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-2 py-0 text-xs"
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
                
                <div className="flex items-center gap-1.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={website} target="_blank" rel="noopener noreferrer" aria-label="Website">
                      <Globe className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={twitter} target="_blank" rel="noopener noreferrer" aria-label="Twitter">
                      <Twitter className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                    <a href={github} target="_blank" rel="noopener noreferrer" aria-label="GitHub">
                      <Github className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 ml-0 md:ml-auto">
            <div>
              <div className="text-sm text-muted-foreground">Price (USD)</div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">${price.toLocaleString()}</span>
                <span className={`text-sm ${priceChange >= 0 ? 'text-success' : 'text-danger'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange}%
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">Market Cap</div>
              <div className="text-lg font-bold">${marketCap}</div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">TVL</div>
              <div className="text-lg font-bold">${tvl}</div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">Launch Date</div>
              <div className="text-lg font-bold">{formatDate(launchDate)}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
