
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import OverallHealthScore from "./OverallHealthScore";
import TokenLogo from "./token/TokenLogo";

interface TokenProfileProps {
  name: string;
  symbol: string;
  logo: string;
  address: string;
  website?: string;
  twitter?: string;
  github?: string;
  price?: number;
  priceChange?: number;
  marketCap?: string;
  overallScore: number;
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
  overallScore,
  description,
  network = "ETH"
}: TokenProfileProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy address");
    }
  };

  // Enhanced logo validation and fallback
  const getValidatedLogo = () => {
    if (!logo || logo === '/placeholder.svg' || logo.trim() === '') {
      return '/placeholder.svg';
    }
    
    // Check if it's a valid URL
    try {
      new URL(logo);
      return logo;
    } catch {
      return '/placeholder.svg';
    }
  };

  // Enhanced description validation and fallback
  const getValidatedDescription = () => {
    if (!description || description.trim() === '') {
      return `${name} (${symbol.toUpperCase()}) is a cryptocurrency token${network ? ` on ${network === 'ARB' ? 'Arbitrum' : network === 'ETH' ? 'Ethereum' : network}` : ''}.`;
    }
    
    // Remove any HTML tags that might be present
    const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
    
    // If description is too generic, enhance it
    if (cleanDescription.length < 20 || 
        cleanDescription.toLowerCase().includes('is a cryptocurrency token') ||
        cleanDescription.toLowerCase().includes('is a digital currency')) {
      return `${name} (${symbol.toUpperCase()}) is a cryptocurrency token${network ? ` on ${network === 'ARB' ? 'Arbitrum' : network === 'ETH' ? 'Ethereum' : network}` : ''}.`;
    }
    
    return cleanDescription;
  };

  const validatedLogo = getValidatedLogo();
  const validatedDescription = getValidatedDescription();

  console.log('[TOKEN-PROFILE] Logo validation:', {
    original: logo,
    validated: validatedLogo,
    isPlaceholder: validatedLogo === '/placeholder.svg'
  });

  console.log('[TOKEN-PROFILE] Description validation:', {
    original: description,
    validated: validatedDescription,
    originalLength: description?.length || 0,
    validatedLength: validatedDescription.length
  });

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          {/* LEFT SIDE - Token Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-4 mb-4">
              <TokenLogo 
                logo={validatedLogo}
                symbol={symbol}
                chain={network === 'ARB' ? 'arbitrum' : network === 'ETH' ? 'ethereum' : 'ethereum'}
                className="w-16 h-16"
                showChainBadge={true}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold truncate">{name}</h1>
                  <Badge variant="secondary" className="font-mono">
                    {symbol.toUpperCase()}
                  </Badge>
                </div>
                
                {/* Address with copy functionality */}
                <div className="flex items-center gap-2 mb-2">
                  <code className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyAddress}
                    className="h-8 w-8 p-0"
                  >
                    {copied ? (
                      <Check className="h-3 w-3 text-green-500" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                  {network && (
                    <Badge variant="outline" className="text-xs">
                      {network === 'ARB' ? 'Arbitrum' : network === 'ETH' ? 'Ethereum' : network}
                    </Badge>
                  )}
                </div>
                
                {/* Price and Market Cap */}
                {(price !== undefined && price > 0) && (
                  <div className="flex items-center gap-4 mb-3">
                    <div>
                      <div className="text-2xl font-bold">
                        ${price.toLocaleString()}
                      </div>
                      {priceChange !== undefined && (
                        <div className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% (24h)
                        </div>
                      )}
                    </div>
                    {marketCap && marketCap !== "0" && marketCap !== "N/A" && (
                      <div>
                        <div className="text-sm text-muted-foreground">Market Cap</div>
                        <div className="text-lg font-semibold">{marketCap}</div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {validatedDescription}
                </p>
              </div>
            </div>
            
            {/* Social Links */}
            {(website || twitter || github) && (
              <div className="flex items-center gap-3">
                {website && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={website} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Website
                    </a>
                  </Button>
                )}
                {twitter && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={twitter} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Twitter
                    </a>
                  </Button>
                )}
                {github && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={github} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* RIGHT SIDE - Health Score */}
          <div className="flex-shrink-0">
            <OverallHealthScore score={overallScore} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
