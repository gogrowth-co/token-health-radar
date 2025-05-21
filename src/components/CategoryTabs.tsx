
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Shield, Droplet, BarChart3, Globe, Code } from "lucide-react";
import { Link } from "react-router-dom";

interface CategoryTabsProps {
  activeTab?: string;
  isProUser?: boolean;
  securityData?: any;
  liquidityData?: any;
  tokenomicsData?: any;
  communityData?: any;
  developmentData?: any;
}

export default function CategoryTabs({ 
  activeTab = "security", 
  isProUser = true,
  securityData = {},
  liquidityData = {},
  tokenomicsData = {},
  communityData = {},
  developmentData = {}
}: CategoryTabsProps) {
  const [currentTab, setCurrentTab] = useState(activeTab);

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
              <CardTitle className="text-sm font-medium capitalize">
                {key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-lg font-semibold text-foreground">
                {value === null || value === undefined
                  ? "N/A"
                  : typeof value === 'boolean'
                    ? value ? "Yes" : "No"
                    : typeof value === 'object'
                      ? JSON.stringify(value)
                      : String(value)}
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
    <Tabs defaultValue={currentTab} onValueChange={setCurrentTab} className="w-full">
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
        {renderMetrics(securityData, !isProUser)}
        {renderBreakdown(securityData, !isProUser)}
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
        {renderMetrics(liquidityData, !isProUser)}
        {renderBreakdown(liquidityData, !isProUser)}
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
        {renderMetrics(tokenomicsData, !isProUser)}
        {renderBreakdown(tokenomicsData, !isProUser)}
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
        {renderMetrics(communityData, !isProUser)}
        {renderBreakdown(communityData, !isProUser)}
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
        {renderMetrics(developmentData, !isProUser)}
        {renderBreakdown(developmentData, !isProUser)}
      </TabsContent>
    </Tabs>
  );
}
