import { Link } from "react-router-dom";
import { ArrowRight, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

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

  const formatNumber = (value: number | undefined): string => {
    if (value === undefined) return "N/A";
    
    // For very large numbers
    if (value >= 1000000000) {
      return `$${(value / 1000000000).toFixed(2)}B`;
    } 
    // For millions
    else if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    }
    // For thousands
    else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    } 
    // For regular numbers
    else {
      return `$${value.toFixed(2)}`;
    }
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
    
    // Create a more comprehensive summary with the available data
    let summary = `${name} (${symbol}) is a cryptocurrency`;
    if (launchDate) {
      const date = new Date(launchDate);
      summary += ` launched on ${date.toLocaleDateString()}`;
    }
    if (marketCap && marketCap !== "N/A") {
      summary += ` with a market cap of ${marketCap}`;
    }
    if (score !== undefined) {
      const healthStatus = score >= 70 ? "good" : score >= 40 ? "moderate" : "poor";
      summary += `. The token has a ${healthStatus} health score of ${score}/100.`;
    }
    return summary;
  };

  // Get color based on score
  const getScoreColor = (score: number | undefined) => {
    if (score === undefined) return "#6b7280"; // gray-500
    if (score >= 70) return "#10b981"; // green-500
    if (score >= 40) return "#f59e0b"; // amber-500
    return "#ef4444"; // red-500
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
              
              {score !== undefined && (
                <div className="relative w-16 h-16">
                  {/* Speedometer background circle */}
                  <div className="absolute inset-0 rounded-full bg-gray-700/30" />
                  
                  {/* Colored progress arc for speedometer */}
                  <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke={getScoreColor(score)}
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${score * 1.76} 176`} // 2πr ≈ 176 for r=28
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Score text in the middle */}
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-xl">
                    {score}
                  </div>
                </div>
              )}
            </div>
            
            {/* Enhanced token description with proper wrapping */}
            <div className="mt-2 text-sm text-muted-foreground line-clamp-2">
              {getTokenSummary()}
            </div>
            
            <div className="flex justify-between items-center mt-3">
              {price !== undefined && (
                <div>
                  <div className="font-bold">{formatNumber(price)}</div>
                  {priceChange !== undefined && (
                    <div className={`text-sm ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
              
              {marketCap && (
                <div className="text-sm text-muted-foreground">
                  Market Cap: {marketCap}
                </div>
              )}
            </div>
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
