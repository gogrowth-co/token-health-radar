import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Filter, TrendingUp, Shield, Zap, Users, Code, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TokenLogo from "@/components/TokenLogo";
import TokenScore from "@/components/TokenScore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";

// Define interfaces for our token data
interface TokenReport {
  id: string;
  name: string;
  symbol: string;
  logo: string;
  score: number;
  categories: string[];
  color: string;
  description?: string;
  created_at: string;
}

// Category to badge mapping (kept for potential future categorization)
const categoryIcons = {
  "DeFi": <Zap className="w-3 h-3" />,
  "RWA": <TrendingUp className="w-3 h-3" />,
  "L1": <Shield className="w-3 h-3" />,
  "L2": <Shield className="w-3 h-3" />,
  "Oracle": <Code className="w-3 h-3" />,
  "Infrastructure": <Code className="w-3 h-3" />,
  "Smart Contracts": <Code className="w-3 h-3" />,
  "Store of Value": <TrendingUp className="w-3 h-3" />,
  "Digital Gold": <TrendingUp className="w-3 h-3" />,
  "DEX": <Zap className="w-3 h-3" />,
  "Lending": <Zap className="w-3 h-3" />,
  "Yield": <TrendingUp className="w-3 h-3" />,
  "Scaling": <Shield className="w-3 h-3" />
};

// Helper function to extract overall score from report content
const extractOverallScore = (reportContent: any): number => {
  if (reportContent?.metadata?.overallHealthScore) {
    return reportContent.metadata.overallHealthScore;
  }
  if (reportContent?.metadata?.scores) {
    const scores = reportContent.metadata.scores;
    const avgScore = Math.round((scores.security + scores.liquidity + scores.tokenomics + scores.community + scores.development) / 5);
    return avgScore;
  }
  return 75; // Default fallback score
};

// Helper function to determine categories based on token data
const determineCategories = (tokenData: any, reportContent: any): string[] => {
  const categories: string[] = [];
  
  // Basic categorization logic - can be expanded
  if (tokenData?.description?.toLowerCase().includes('defi')) categories.push('DeFi');
  if (tokenData?.description?.toLowerCase().includes('yield')) categories.push('Yield');
  if (tokenData?.name?.toLowerCase().includes('ethereum')) categories.push('L1');
  if (tokenData?.name?.toLowerCase().includes('bitcoin')) categories.push('Store of Value', 'Digital Gold');
  
  // Default category if none found
  if (categories.length === 0) categories.push('DeFi');
  
  return categories;
};

// Helper function to get color based on token symbol
const getTokenColor = (symbol: string): string => {
  const colorMap: { [key: string]: string } = {
    'BTC': 'text-orange-500',
    'ETH': 'text-blue-500',
    'PENDLE': 'text-purple-500',
    'LINK': 'text-blue-600',
    'SOL': 'text-green-500',
    'MATIC': 'text-purple-600',
    'UNI': 'text-pink-500',
    'AAVE': 'text-indigo-500'
  };
  return colorMap[symbol] || 'text-blue-500';
};

export default function TokenDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [tokens, setTokens] = useState<TokenReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  // Fetch token reports from database
  useEffect(() => {
    const fetchTokenReports = async () => {
      try {
        setIsLoading(true);
        
        // Fetch token reports with associated token data
        const { data: reports, error } = await supabase
          .from('token_reports')
          .select(`
            *,
            token_data_cache (
              logo_url,
              description
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching token reports:', error);
          return;
        }

        if (reports) {
          const tokenReports: TokenReport[] = reports.map(report => {
            const score = extractOverallScore(report.report_content);
            const tokenData = Array.isArray(report.token_data_cache) 
              ? report.token_data_cache[0] 
              : report.token_data_cache;
            const categories = determineCategories(tokenData, report.report_content);
            
            return {
              id: report.token_symbol.toLowerCase(),
              name: report.token_name,
              symbol: report.token_symbol,
              logo: tokenData?.logo_url || '/placeholder.svg',
              score,
              categories,
              color: getTokenColor(report.token_symbol),
              description: tokenData?.description,
              created_at: report.created_at
            };
          });

          setTokens(tokenReports);
          
          // Extract unique categories
          const uniqueCategories = [...new Set(tokenReports.flatMap(token => token.categories))];
          setAllCategories(uniqueCategories);
        }
      } catch (error) {
        console.error('Error in fetchTokenReports:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenReports();
  }, []);

  const filteredTokens = useMemo(() => {
    return tokens.filter(token => {
      const matchesSearch = token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           token.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || token.categories.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [tokens, searchTerm, selectedCategory]);

  if (isLoading) {
  return (
      <>
        <Helmet>
          <title>Token Risk Reports Directory - TokenHealthScan</title>
          <meta 
            name="description" 
            content="Explore comprehensive crypto token risk analysis across top cryptocurrencies. Real-time security, liquidity, and tokenomics assessments." 
          />
          <meta name="keywords" content="crypto token analysis, token risk reports, DeFi security, blockchain analytics" />
        </Helmet>

        <div className="min-h-screen bg-background">
          <Navbar />
          
          <main className="container mx-auto px-4 py-12">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading token reports...</p>
              </div>
            </div>
          </main>

          <Footer />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Token Risk Reports Directory - TokenHealthScan</title>
        <meta 
          name="description" 
          content="Explore comprehensive crypto token risk analysis across top cryptocurrencies. Real-time security, liquidity, and tokenomics assessments." 
        />
        <meta name="keywords" content="crypto token analysis, token risk reports, DeFi security, blockchain analytics" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        
        <main className="container mx-auto px-4 py-12">
          {/* Header Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Token Risk Reports
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Explore real-time risk analysis across popular crypto tokens
            </p>
            
            {/* Search Bar */}
            <div className="max-w-lg mx-auto mb-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Search by token name or symbol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>
            </div>
            
            {/* Category Filter */}
            <div className="flex justify-center">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {allCategories.map(category => (
                    <SelectItem key={category} value={category}>
                      <div className="flex items-center gap-2">
                        {categoryIcons[category]}
                        {category}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="text-center mb-8">
            <p className="text-muted-foreground">
              {filteredTokens.length} {filteredTokens.length === 1 ? 'token' : 'tokens'} found
              {selectedCategory !== "all" && ` in ${selectedCategory}`}
            </p>
          </div>

          {/* Token Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {filteredTokens.map((token) => (
              <Card key={token.id} className="group hover:shadow-lg transition-all duration-200 hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center space-y-4">
                    {/* Token Logo */}
                    <div>
                      <TokenLogo logo={token.logo} name={token.name} />
                    </div>
                    
                    {/* Token Info */}
                    <div>
                      <h3 className="font-semibold text-lg text-foreground mb-1">
                        {token.name}
                      </h3>
                      <p className={`text-sm font-medium ${token.color}`}>
                        ${token.symbol}
                      </p>
                    </div>
                    
                    {/* Score Display */}
                    <div className="text-center">
                      <div className="text-2xl font-bold text-foreground">
                        {token.score}/100
                      </div>
                      <div className="text-xs text-muted-foreground">Health Score</div>
                    </div>
                    
                    {/* Category Tags */}
                    <div className="flex flex-wrap gap-1 justify-center">
                      {token.categories.map((category) => (
                        <Badge key={category} variant="secondary" className="text-xs">
                          <div className="flex items-center gap-1">
                            {categoryIcons[category]}
                            {category}
                          </div>
                        </Badge>
                      ))}
                    </div>
                    
                    {/* View Report Button */}
                    <Link to={`/token/${token.id}`} className="w-full">
                      <Button className="w-full" variant="default">
                        View Report
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredTokens.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="mb-4">
                <Search className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {tokens.length === 0 ? "No token reports yet" : "No tokens found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {tokens.length === 0 
                  ? "Token reports will appear here as they are created"
                  : "Try adjusting your search term or category filter"
                }
              </p>
              {tokens.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCategory("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* CTA Section */}
          <div className="text-center py-12 border-t border-border">
            <h2 className="text-2xl font-semibold text-foreground mb-4">
              Don't see your token?
            </h2>
            <p className="text-muted-foreground mb-6">
              Submit a token for analysis or scan any ERC-20 token instantly
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/">
                <Button size="lg">
                  Scan Any Token
                </Button>
              </Link>
              <Link to="/pricing">
                <Button variant="outline" size="lg">
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
}