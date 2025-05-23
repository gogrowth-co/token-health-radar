import { useState, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Lock, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CategoryFeatureGrid from "./CategoryFeatureGrid";
import { transformSecurityData } from "@/utils/categoryTransformers";

// Use the types defined in ScanResult for consistency
interface SecurityData {
  token_address: string;
  score: number | null;
  ownership_renounced: boolean | null;
  audit_status: string | null;
  multisig_status: string | null;
  honeypot_detected: boolean | null;
  freeze_authority: boolean | null;
  can_mint: boolean | null;
}

interface TokenomicsData {
  token_address: string;
  score: number | null;
  circulating_supply: number | null;
  supply_cap: number | null;
  tvl_usd: number | null;
  vesting_schedule: string | null;
  distribution_score: string | null;
  treasury_usd: number | null;
  burn_mechanism: boolean | null;
}

interface LiquidityData {
  token_address: string;
  score: number | null;
  liquidity_locked_days: number | null;
  cex_listings: number | null;
  trading_volume_24h_usd: number | null;
  holder_distribution: string | null;
  dex_depth_status: string | null;
}

interface CommunityData {
  token_address: string;
  score: number | null;
  twitter_followers: number | null;
  twitter_verified: boolean | null;
  twitter_growth_7d: number | null;
  telegram_members: number | null;
  discord_members: number | null;
  active_channels: string[] | null;
  team_visibility: string | null;
}

interface DevelopmentData {
  token_address: string;
  score: number | null;
  github_repo: string | null;
  is_open_source: boolean | null;
  contributors_count: number | null;
  commits_30d: number | null;
  last_commit: string | null;
  roadmap_progress: string | null;
}

enum ScanCategory {
  Security = "security",
  Tokenomics = "tokenomics",
  Liquidity = "liquidity",
  Community = "community",
  Development = "development"
}

interface CategoryTabsProps {
  activeTab: ScanCategory;
  securityData: SecurityData | null;
  tokenomicsData: TokenomicsData | null;
  liquidityData: LiquidityData | null;
  communityData: CommunityData | null;
  developmentData: DevelopmentData | null;
  isPro: boolean;
  onCategoryChange: (value: ScanCategory) => void;
}

// Format numbers in a user-friendly way
const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "N/A";
  
  // For very large numbers
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  } 
  // For millions
  else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  // For thousands
  else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  } 
  // For regular numbers
  else {
    return value.toFixed(2);
  }
};

// Format currency values
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "N/A";
  return `$${formatNumber(value)}`;
};

// Helper function to render boolean values
const BooleanIndicator = ({ value, positive }: { value: boolean | null | undefined, positive: boolean }) => {
  if (value === null || value === undefined) return <Badge variant="outline">Unknown</Badge>;
  
  const isGood = positive ? value : !value;
  
  return isGood ? (
    <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
      <Check className="w-3 h-3 mr-1" /> Yes
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500">
      <X className="w-3 h-3 mr-1" /> No
    </Badge>
  );
};

export default function CategoryTabs({
  activeTab,
  securityData,
  tokenomicsData,
  liquidityData,
  communityData,
  developmentData,
  isPro,
  onCategoryChange
}: CategoryTabsProps) {
  const navigate = useNavigate();
  
  // Define category descriptions with explanations for tooltips
  const categoryDescriptions = {
    [ScanCategory.Security]: "Security metrics assess smart contract risks, ownership status, and audit quality - critical indicators of potential vulnerabilities that could lead to hacks or rug pulls.",
    [ScanCategory.Tokenomics]: "Tokenomics evaluates supply distribution, token utility, and economic design - key factors that affect token value and sustainability.",
    [ScanCategory.Liquidity]: "Liquidity metrics measure how easily tokens can be bought or sold without significant price impact - important for traders and long-term holders.",
    [ScanCategory.Community]: "Community indicators measure user engagement and growth across social platforms - strong communities often correlate with long-term project success.",
    [ScanCategory.Development]: "Development metrics assess code quality, team contributions, and roadmap progress - important signals of project activity and technical health."
  };
  
  // Use state to track blur status for non-pro users
  const [showProCTA, setShowProCTA] = useState(false);
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    onCategoryChange(value as ScanCategory);
    
    // Show CTA if user is not pro
    if (!isPro) {
      setShowProCTA(true);
    }
  };
  
  // Create tab content with blur effect for non-pro users
  const renderTabContent = (categoryData: any, children: ReactNode, category: ScanCategory) => {
    const isActiveTab = activeTab === category;
    const shouldBlur = !isPro && isActiveTab;
    
    return (
      <TabsContent value={category} className="relative">
        <Card>
          <CardHeader className="pb-4">
            <h3 className="text-lg font-semibold">{category.charAt(0).toUpperCase() + category.slice(1)} Analysis</h3>
          </CardHeader>
          <CardContent className={shouldBlur ? "filter blur-sm" : ""}>
            {children}
          </CardContent>
          
          {shouldBlur && showProCTA && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 p-4 z-10">
              <Lock className="h-6 w-6 mb-2" />
              <h3 className="text-xl font-bold mb-2">Pro Feature</h3>
              <p className="text-center text-muted-foreground mb-4">
                Upgrade to Pro for full access to detailed token health metrics
              </p>
              <Button onClick={() => navigate("/pricing")}>
                Upgrade to Pro
              </Button>
              
              <Button variant="ghost" className="mt-2" onClick={() => setShowProCTA(false)}>
                Return to Summary
              </Button>
            </div>
          )}
        </Card>
      </TabsContent>
    );
  };
  
  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="w-full grid grid-cols-5 mb-6">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center w-full">
                <TabsTrigger value={ScanCategory.Security} className="w-full">
                  Security
                  <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                </TabsTrigger>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{categoryDescriptions[ScanCategory.Security]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center w-full">
                <TabsTrigger value={ScanCategory.Tokenomics} className="w-full">
                  Tokenomics
                  <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                </TabsTrigger>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{categoryDescriptions[ScanCategory.Tokenomics]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center w-full">
                <TabsTrigger value={ScanCategory.Liquidity} className="w-full">
                  Liquidity
                  <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                </TabsTrigger>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{categoryDescriptions[ScanCategory.Liquidity]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center w-full">
                <TabsTrigger value={ScanCategory.Community} className="w-full">
                  Community
                  <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                </TabsTrigger>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{categoryDescriptions[ScanCategory.Community]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center w-full">
                <TabsTrigger value={ScanCategory.Development} className="w-full">
                  Development
                  <Info className="h-3.5 w-3.5 ml-1 text-muted-foreground" />
                </TabsTrigger>
              </div>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{categoryDescriptions[ScanCategory.Development]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TabsList>
      
      {/* Security Tab Content - Updated to use CategoryFeatureGrid */}
      {renderTabContent(securityData, (
        <CategoryFeatureGrid 
          features={transformSecurityData(securityData)}
          title="Security Indicators"
          description="Key security indicators for this token's smart contract"
        />
      ), ScanCategory.Security)}
      
      {/* Tokenomics Tab Content */}
      {renderTabContent(tokenomicsData, (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Circulating Supply</h4>
              <p className="font-medium">{formatNumber(tokenomicsData?.circulating_supply)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Supply Cap</h4>
              <p className="font-medium">{formatNumber(tokenomicsData?.supply_cap)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Total Value Locked</h4>
              <p className="font-medium">{formatCurrency(tokenomicsData?.tvl_usd)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Vesting Schedule</h4>
              <Badge variant="outline">{tokenomicsData?.vesting_schedule || "Unknown"}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Distribution Score</h4>
              <Badge variant="outline">{tokenomicsData?.distribution_score || "Unknown"}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Treasury Value</h4>
              <p className="font-medium">{formatCurrency(tokenomicsData?.treasury_usd)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Burn Mechanism</h4>
              <BooleanIndicator value={tokenomicsData?.burn_mechanism} positive={true} />
            </div>
          </div>
        </div>
      ), ScanCategory.Tokenomics)}
      
      {/* Liquidity Tab Content */}
      {renderTabContent(liquidityData, (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Liquidity Locked Days</h4>
              <p className="font-medium">{liquidityData?.liquidity_locked_days ?? "N/A"} days</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">CEX Listings</h4>
              <p className="font-medium">{liquidityData?.cex_listings ?? "N/A"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">24h Trading Volume</h4>
              <p className="font-medium">{formatCurrency(liquidityData?.trading_volume_24h_usd)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">DEX Depth Status</h4>
              <Badge variant="outline">{liquidityData?.dex_depth_status || "Unknown"}</Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Holder Distribution</h4>
              <Badge variant="outline">{liquidityData?.holder_distribution || "Unknown"}</Badge>
            </div>
          </div>
        </div>
      ), ScanCategory.Liquidity)}
      
      {/* Community Tab Content */}
      {renderTabContent(communityData, (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Twitter Followers</h4>
              <p className="font-medium">{formatNumber(communityData?.twitter_followers)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Twitter Verified</h4>
              <BooleanIndicator value={communityData?.twitter_verified} positive={true} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Twitter 7d Growth</h4>
              <p className={`font-medium ${
                communityData?.twitter_growth_7d && communityData.twitter_growth_7d >= 0 
                  ? 'text-green-500' 
                  : 'text-red-500'
              }`}>
                {communityData?.twitter_growth_7d !== null && communityData?.twitter_growth_7d !== undefined
                  ? `${communityData.twitter_growth_7d >= 0 ? '+' : ''}${communityData.twitter_growth_7d.toFixed(2)}%` 
                  : "N/A"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Telegram Members</h4>
              <p className="font-medium">{formatNumber(communityData?.telegram_members)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Discord Members</h4>
              <p className="font-medium">{formatNumber(communityData?.discord_members)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Active Channels</h4>
              <div className="flex flex-wrap gap-1">
                {communityData?.active_channels && communityData.active_channels.length > 0 ? (
                  communityData.active_channels.map((channel, i) => (
                    <Badge key={i} variant="outline">{channel}</Badge>
                  ))
                ) : (
                  <Badge variant="outline">None</Badge>
                )}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Team Visibility</h4>
              <Badge variant="outline">{communityData?.team_visibility || "Unknown"}</Badge>
            </div>
          </div>
        </div>
      ), ScanCategory.Community)}
      
      {/* Development Tab Content */}
      {renderTabContent(developmentData, (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">GitHub Repository</h4>
              <p className="font-medium truncate">
                {developmentData?.github_repo ? (
                  <a 
                    href={developmentData.github_repo} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {developmentData.github_repo.replace(/https:\/\/github\.com\//, '')}
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Open Source</h4>
              <BooleanIndicator value={developmentData?.is_open_source} positive={true} />
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Contributors</h4>
              <p className="font-medium">{developmentData?.contributors_count ?? "N/A"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Commits (30d)</h4>
              <p className="font-medium">{developmentData?.commits_30d ?? "N/A"}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Last Commit</h4>
              <p className="font-medium">
                {developmentData?.last_commit 
                  ? new Date(developmentData.last_commit).toLocaleDateString() 
                  : "N/A"}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Roadmap Progress</h4>
              <Badge variant="outline">{developmentData?.roadmap_progress || "Unknown"}</Badge>
            </div>
          </div>
        </div>
      ), ScanCategory.Development)}
    </Tabs>
  );
}
