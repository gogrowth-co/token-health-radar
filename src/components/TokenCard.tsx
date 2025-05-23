
import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Twitter, Github, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
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

  // Generate a token summary based on available data
  const getTokenSummary = () => {
    if (description) return description;
    
    let summary = `${name} (${symbol}) is a cryptocurrency`;
    
    if (marketCap && marketCap !== "N/A") {
      summary += ` with a market cap of ${marketCap}`;
    }
    
    return summary;
  };

  // Get color based on score
  const getScoreColor = (score: number | undefined) => {
    if (score === undefined) return "#6b7280"; // gray-500
    if (score >= 70) return "#FFC107"; // amber-500
    if (score >= 40) return "#FF9800"; // orange-500
    return "#F44336"; // red-500
  };

  return (
    <Card className="overflow-hidden bg-card border-0 shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          {/* Left column with logo */}
          <div className="flex-shrink-0">
            <img src={logo} alt={`${name} logo`} className="w-16 h-16 rounded-full" />
          </div>
          
          {/* Middle column with token info */}
          <div className="flex-grow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-bold">{name}</h3>
                <Badge variant="outline" className="mt-1 text-xs font-medium">{symbol}</Badge>
                
                {/* Token description with proper wrapping */}
                <p className="mt-4 text-sm text-muted-foreground">
                  {getTokenSummary()}
                </p>
                
                {/* Price and change */}
                {price !== undefined && (
                  <div className="mt-2">
                    <div className="text-2xl font-bold">${price.toFixed(2)}</div>
                    {priceChange !== undefined && (
                      <div className={`text-sm ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Score circle on the right */}
              {score !== undefined && (
                <div className="relative w-20 h-20">
                  {/* Score progress arc */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
                    <circle
                      cx="40"
                      cy="40"
                      r="36"
                      stroke={getScoreColor(score)}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${score * 2.26} 226`}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Score text */}
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-3xl">
                    {score}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Bottom row with market cap */}
        <div className="flex justify-between items-center mt-4">
          {marketCap && (
            <div className="text-sm text-muted-foreground">
              Market Cap: {marketCap}
            </div>
          )}
          
          {/* Social links row */}
          {(website || twitter || github) && (
            <div className="flex items-center gap-3">
              {website && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <LinkIcon className="h-4 w-4" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Website</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {twitter && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <Twitter className="h-4 w-4" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Twitter</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {github && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <a href={github.startsWith('http') ? github : `https://github.com/${github}`} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                        <Github className="h-4 w-4" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>GitHub</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
          
          {showActions && onClick && (
            <Button size="sm" onClick={onClick} className="flex items-center gap-1">
              Select 
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
