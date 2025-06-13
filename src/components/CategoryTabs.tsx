import { useState, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Lock, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import CategoryFeatureGrid from "./CategoryFeatureGrid";
import { 
  transformSecurityData, 
  transformTokenomicsData,
  transformLiquidityData,
  transformCommunityData,
  transformDevelopmentData,
  SecurityData,
  TokenomicsData,
  LiquidityData,
  CommunityData,
  DevelopmentData
} from "@/utils/categoryTransformers";

enum ScanCategory {
  Security = "security",
  Tokenomics = "tokenomics",
  Liquidity = "liquidity",
  Community = "community",
  Development = "development"
}

interface CategoryTabsProps {
  activeTab?: ScanCategory;
  securityData: any;
  tokenomicsData: any;
  liquidityData: any;
  communityData: any;
  developmentData: any;
  isPro: boolean;
  onCategoryChange?: (category: ScanCategory) => void;
  scanData?: {
    security: any;
    liquidity: any;
    tokenomics: any;
    community: any;
    development: any;
    overallScore: number;
    redFlags: number;
  };
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
  activeTab: propActiveTab, 
  securityData, 
  tokenomicsData, 
  liquidityData, 
  communityData, 
  developmentData, 
  isPro,
  onCategoryChange,
  scanData 
}: CategoryTabsProps) {
  const navigate = useNavigate();
  const [internalActiveTab, setInternalActiveTab] = useState<ScanCategory>(ScanCategory.Security);
  
  // Use prop activeTab if provided, otherwise use internal state
  const activeTab = propActiveTab || internalActiveTab;
  
  // Define category descriptions with explanations for tooltips
  const categoryDescriptions = {
    [ScanCategory.Security]: "Security metrics assess smart contract risks, ownership status, and audit quality - critical indicators of potential vulnerabilities that could lead to hacks or rug pulls.",
    [ScanCategory.Tokenomics]: "Tokenomics evaluates supply distribution, token utility, and economic design - key factors that affect token value and sustainability.",
    [ScanCategory.Liquidity]: "Liquidity metrics measure how easily tokens can be bought or sold without significant price impact - important for traders and long-term holders.",
    [ScanCategory.Community]: "Community indicators measure user engagement and growth across social platforms - strong communities often correlate with long-term project success.",
    [ScanCategory.Development]: "Development metrics assess code quality, team contributions, and roadmap progress - important signals of project activity and technical health."
  };
  
  // Handle tab change
  const handleTabChange = (value: string) => {
    const category = value as ScanCategory;
    if (onCategoryChange) {
      onCategoryChange(category);
    } else {
      setInternalActiveTab(category);
    }
  };
  
  // Create tab content
  const renderTabContent = (categoryData: any, children: ReactNode, category: ScanCategory) => {
    return (
      <TabsContent value={category}>
        <Card>
          <CardHeader className="pb-4">
            <h3 className="text-lg font-semibold">{category.charAt(0).toUpperCase() + category.slice(1)} Analysis</h3>
          </CardHeader>
          <CardContent>
            {children}
          </CardContent>
        </Card>
      </TabsContent>
    );
  };
  
  // Use scanData if provided, otherwise use individual data props
  const securityDataToUse = scanData?.security || securityData;
  const tokenomicsDataToUse = scanData?.tokenomics || tokenomicsData;
  const liquidityDataToUse = scanData?.liquidity || liquidityData;
  const communityDataToUse = scanData?.community || communityData;
  const developmentDataToUse = scanData?.development || developmentData;
  
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
      
      {/* Security Tab Content */}
      {renderTabContent(securityDataToUse, (
        <CategoryFeatureGrid 
          features={transformSecurityData(securityDataToUse)}
          description="Key security indicators for this token's smart contract"
        />
      ), ScanCategory.Security)}
      
      {/* Tokenomics Tab Content */}
      {renderTabContent(tokenomicsDataToUse, (
        <CategoryFeatureGrid
          features={transformTokenomicsData(tokenomicsDataToUse)}
          description="Economic metrics and token supply analysis"
        />
      ), ScanCategory.Tokenomics)}
      
      {/* Liquidity Tab Content */}
      {renderTabContent(liquidityDataToUse, (
        <CategoryFeatureGrid
          features={transformLiquidityData(liquidityDataToUse)}
          description="Measures of token trading activity and accessibility"
        />
      ), ScanCategory.Liquidity)}
      
      {/* Community Tab Content */}
      {renderTabContent(communityDataToUse, (
        <CategoryFeatureGrid
          features={transformCommunityData(communityDataToUse)}
          description="Social media presence and community engagement metrics"
        />
      ), ScanCategory.Community)}
      
      {/* Development Tab Content */}
      {renderTabContent(developmentDataToUse, (
        <CategoryFeatureGrid
          features={transformDevelopmentData(developmentDataToUse)}
          description="GitHub activity and development progress metrics"
        />
      ), ScanCategory.Development)}
    </Tabs>
  );
}
