import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, Droplet, BarChart3, Globe, Code, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CategoryTabsProps {
  activeTab?: string;
  isProUser?: boolean;
  isPro?: boolean;
  securityData?: any;
  liquidityData?: any;
  tokenomicsData?: any;
  communityData?: any;
  developmentData?: any;
  onCategoryChange?: (category: any) => void;
}

export default function CategoryTabs({ 
  activeTab = "security", 
  isProUser = true,
  isPro, 
  securityData = {},
  liquidityData = {},
  tokenomicsData = {},
  communityData = {},
  developmentData = {},
  onCategoryChange 
}: CategoryTabsProps) {
  // Use isPro if provided, otherwise fall back to isProUser
  const isUserPro = isPro !== undefined ? isPro : isProUser;
  
  // Use onCategoryChange if provided, otherwise handle locally
  const [currentTab, setCurrentTab] = useState(activeTab);
  
  const handleTabChange = (value: string) => {
    setCurrentTab(value);
    if (onCategoryChange) {
      onCategoryChange(value);
    }
  };

  // Helper for formatting values
  const formatValue = (key: string, value: any): string => {
    if (value === null || value === undefined) return "N/A";
    
    // Format booleans
    if (typeof value === 'boolean') return value ? "Yes" : "No";
    
    // Format objects
    if (typeof value === 'object') return JSON.stringify(value);
    
    // Format numbers based on common crypto metrics
    if (typeof value === 'number') {
      // Days or counts
      if (key.includes('day') || key.includes('count') || key.includes('listings')) {
        return value.toLocaleString();
      }
      // USD values
      else if (key.includes('usd') || key.includes('volume')) {
        if (value >= 1000000000) return `$${(value / 1000000000).toFixed(2)}B`;
        if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
        if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
        return `$${value.toLocaleString()}`;
      }
    }
    
    // Default stringification
    return String(value);
  };

  // Get tooltip descriptions for metrics
  const getMetricDescription = (key: string): string => {
    const descriptions: Record<string, string> = {
      // Security metrics
      "ownership_renounced": "When token ownership is renounced, developers can no longer modify the contract, which reduces rug-pull risk",
      "audit_status": "Security audits verify the contract code for vulnerabilities and potential exploits",
      "multisig_status": "Multi-signature wallets require multiple approvals for transactions, adding security",
      "honeypot_detected": "Honeypot tokens prevent selling, allowing scammers to steal investor funds",
      "freeze_authority": "The ability to freeze transactions can be used legitimately for security or maliciously",
      "can_mint": "Tokens that can be minted indefinitely may lead to supply inflation",
      
      // Tokenomics metrics
      "circulating_supply": "The number of tokens currently in circulation and available to the public",
      "supply_cap": "Maximum possible token supply, affecting long-term value and inflation",
      "tvl_usd": "Total Value Locked measures how much value is secured by a protocol",
      "vesting_schedule": "Defines when team and investor tokens unlock, affecting potential sell pressure",
      "distribution_score": "How well token supply is distributed among different holders",
      "treasury_usd": "Project's financial reserves, indicating sustainability",
      "burn_mechanism": "Token burning reduces supply over time, potentially increasing value",
      
      // Liquidity metrics
      "liquidity_locked_days": "Longer locked liquidity reduces the risk of rug pulls",
      "cex_listings": "More exchange listings typically indicates better liquidity and legitimacy",
      "trading_volume_24h_usd": "Higher trading volume suggests more active markets and better liquidity",
      "holder_distribution": "How tokens are distributed among holders, signaling potential concentration risks",
      "dex_depth_status": "Deeper liquidity pools mean less price impact when trading",
      
      // Community metrics
      "twitter_followers": "Larger social media following indicates stronger community engagement",
      "twitter_verified": "Verified accounts have higher credibility and are less likely to be scams",
      "twitter_growth_7d": "Rapid follower growth shows increasing interest in the project",
      "telegram_members": "Active messaging communities suggest engaged users",
      "discord_members": "Strong Discord presence indicates developer and community engagement",
      "active_channels": "More active communication channels suggest better community management",
      "team_visibility": "Transparent teams with public identities have higher accountability",
      
      // Development metrics
      "github_repo": "Open source code allows community verification of security and functionality",
      "is_open_source": "Transparent code builds trust and allows inspection",
      "contributors_count": "More contributors typically means better code and faster development",
      "commits_30d": "Recent code commits show active development",
      "last_commit": "Recent commits indicate ongoing maintenance and development",
      "roadmap_progress": "Shows how well the team delivers on promises"
    };
    
    const formattedKey = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
    return descriptions[key] || `This metric shows the ${formattedKey} of the token`;
  };

  const renderTabContent = (content: React.ReactNode, isBlurred: boolean) => {
    if (isBlurred) {
      return (
        <div className="relative">
          <div className="filter blur-md pointer-events-none">
            {content}
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-sm rounded-lg">
            <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
            <p className="text-sm text-center mb-4 max-w-xs">
              Upgrade to Pro to unlock full scan results
            </p>
            <Button asChild>
              <Link to="/pricing">Upgrade Now</Link>
            </Button>
          </div>
        </div>
      );
    }
    return content;
  };

  const renderMetrics = (data: any, isBlurred: boolean) => {
    // Filter out the scoreBreakdown and any non-displayable properties
    const displayableData = { ...data };
    if (displayableData.scoreBreakdown) delete displayableData.scoreBreakdown;
    if (displayableData.score) delete displayableData.score;
    if (displayableData.token_address) delete displayableData.token_address;
    if (displayableData.updated_at) delete displayableData.updated_at;
    
    const content = (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {Object.entries(displayableData).map(([key, value]: [string, any]) => (
          <Card key={key} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium capitalize flex items-center justify-between">
                <span>{key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <Info className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">{getMetricDescription(key)}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-lg font-semibold text-foreground">
                {formatValue(key, value)}
              </CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    );

    return renderTabContent(content, isBlurred);
  };

  // Generate a scoring breakdown from the data
  const getScoreBreakdown = (data: any): Array<{metric: string, score: number}> => {
    const breakdown = [];
    
    if (!data || typeof data !== 'object') {
      return [{metric: "No data available", score: 0}];
    }
    
    // Create mock score breakdown based on available data
    const keys = Object.keys(data).filter(key => 
      key !== 'token_address' && 
      key !== 'score' && 
      key !== 'updated_at' &&
      key !== 'scoreBreakdown'
    );
    
    // Convert data properties to score metrics
    keys.forEach(key => {
      const value = data[key];
      
      // Skip null or undefined values
      if (value === null || value === undefined) return;
      
      let score = 50; // default score
      
      // Determine a score based on the value type
      if (typeof value === 'boolean') {
        score = value ? 90 : 30; // positive for true values
      } 
      else if (typeof value === 'number') {
        // Scale numbers to 0-100 range (simplistic)
        if (key.includes('score')) score = value;
        else score = Math.min(Math.max(value, 0), 100);
      }
      else if (typeof value === 'string') {
        // Score strings based on positive/negative keywords
        const positiveWords = ['high', 'good', 'excellent', 'verified', 'audited', 'multisig', 'active'];
        const negativeWords = ['low', 'poor', 'unverified', 'unaudited', 'inactive', 'unknown'];
        
        if (positiveWords.some(word => value.toLowerCase().includes(word))) {
          score = 80;
        } else if (negativeWords.some(word => value.toLowerCase().includes(word))) {
          score = 30;
        }
      }
      
      breakdown.push({
        metric: key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim(),
        score: Math.round(score)
      });
    });
    
    return breakdown.length > 0 ? breakdown : [{metric: "No metrics available", score: 0}];
  };

  const renderBreakdown = (data: any, isBlurred: boolean) => {
    // Generate score breakdown or use provided scoreBreakdown if available
    const scoreBreakdown = data.scoreBreakdown || getScoreBreakdown(data);
    
    const content = (
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
        <div className="space-y-5">
          {scoreBreakdown.map((item: any) => (
            <div key={item.metric} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{item.metric}</span>
                <span className="text-sm font-medium">{item.score}/100</span>
              </div>
              <Progress value={item.score} className="h-2" />
            </div>
          ))}
        </div>
      </div>
    );

    return renderTabContent(content, isBlurred);
  };

  return (
    <Tabs defaultValue={currentTab} onValueChange={handleTabChange} className="w-full">
      <ScrollArea className="w-full">
        <TabsList className="flex w-full h-auto p-1 mb-8">
          <TabsTrigger value="security" className="flex-1 flex items-center gap-1.5 py-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="liquidity" className="flex-1 flex items-center gap-1.5 py-2">
            <Droplet className="h-4 w-4" />
            <span className="hidden sm:inline">Liquidity</span>
          </TabsTrigger>
          <TabsTrigger value="tokenomics" className="flex-1 flex items-center gap-1.5 py-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Tokenomics</span>
          </TabsTrigger>
          <TabsTrigger value="community" className="flex-1 flex items-center gap-1.5 py-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Community</span>
          </TabsTrigger>
          <TabsTrigger value="development" className="flex-1 flex items-center gap-1.5 py-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Development</span>
          </TabsTrigger>
        </TabsList>
      </ScrollArea>

      <TabsContent value="security" className="space-y-4">
        <Alert>
          <AlertTitle className="text-success flex items-center gap-2">
            <Shield className="h-4 w-4" /> Security Analysis
          </AlertTitle>
          <AlertDescription>
            {securityData.score 
              ? `This token has a security score of ${securityData.score}/100.`
              : "Security analysis data is not available for this token."}
          </AlertDescription>
        </Alert>
        {renderMetrics(securityData, !isUserPro)}
        {renderBreakdown(securityData, !isUserPro)}
      </TabsContent>

      <TabsContent value="liquidity" className="space-y-4">
        <Alert>
          <AlertTitle className="text-info flex items-center gap-2">
            <Droplet className="h-4 w-4" /> Liquidity Analysis
          </AlertTitle>
          <AlertDescription>
            {liquidityData.score 
              ? `This token has a liquidity score of ${liquidityData.score}/100.`
              : "Liquidity analysis data is not available for this token."}
          </AlertDescription>
        </Alert>
        {renderMetrics(liquidityData, !isUserPro)}
        {renderBreakdown(liquidityData, !isUserPro)}
      </TabsContent>
      
      <TabsContent value="tokenomics" className="space-y-4">
        <Alert>
          <AlertTitle className="text-info flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Tokenomics Analysis
          </AlertTitle>
          <AlertDescription>
            {tokenomicsData.score 
              ? `This token has a tokenomics score of ${tokenomicsData.score}/100.`
              : "Tokenomics analysis data is not available for this token."}
          </AlertDescription>
        </Alert>
        {renderMetrics(tokenomicsData, !isUserPro)}
        {renderBreakdown(tokenomicsData, !isUserPro)}
      </TabsContent>
      
      <TabsContent value="community" className="space-y-4">
        <Alert>
          <AlertTitle className="text-success flex items-center gap-2">
            <Globe className="h-4 w-4" /> Community Analysis
          </AlertTitle>
          <AlertDescription>
            {communityData.score 
              ? `This token has a community score of ${communityData.score}/100.`
              : "Community analysis data is not available for this token."}
          </AlertDescription>
        </Alert>
        {renderMetrics(communityData, !isUserPro)}
        {renderBreakdown(communityData, !isUserPro)}
      </TabsContent>
      
      <TabsContent value="development" className="space-y-4">
        <Alert>
          <AlertTitle className="text-warning flex items-center gap-2">
            <Code className="h-4 w-4" /> Development Analysis
          </AlertTitle>
          <AlertDescription>
            {developmentData.score 
              ? `This token has a development score of ${developmentData.score}/100.`
              : "Development analysis data is not available for this token."}
          </AlertDescription>
        </Alert>
        {renderMetrics(developmentData, !isUserPro)}
        {renderBreakdown(developmentData, !isUserPro)}
      </TabsContent>
    </Tabs>
  );
}
