import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, Filter, TrendingUp, Shield, Zap, Users, Code } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TokenLogo from "@/components/TokenLogo";
import TokenScore from "@/components/TokenScore";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Enhanced mock data with additional tokens and categories
const mockTokens = [
  {
    id: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    logo: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
    score: 92,
    categories: ["Store of Value", "Digital Gold"],
    color: "text-orange-500"
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH", 
    logo: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
    score: 88,
    categories: ["DeFi", "Smart Contracts"],
    color: "text-blue-500"
  },
  {
    id: "pendle",
    name: "Pendle",
    symbol: "PENDLE",
    logo: "https://assets.coingecko.com/coins/images/15069/large/pendle_token_logo.png",
    score: 84,
    categories: ["DeFi", "RWA", "Yield"],
    color: "text-purple-500"
  },
  {
    id: "chainlink",
    name: "Chainlink",
    symbol: "LINK",
    logo: "https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png",
    score: 89,
    categories: ["Oracle", "Infrastructure"],
    color: "text-blue-600"
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    logo: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
    score: 81,
    categories: ["L1", "DeFi"],
    color: "text-green-500"
  },
  {
    id: "polygon",
    name: "Polygon",
    symbol: "MATIC",
    logo: "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
    score: 79,
    categories: ["L2", "Scaling"],
    color: "text-purple-600"
  },
  {
    id: "uniswap",
    name: "Uniswap",
    symbol: "UNI",
    logo: "https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png",
    score: 86,
    categories: ["DeFi", "DEX"],
    color: "text-pink-500"
  },
  {
    id: "aave",
    name: "Aave",
    symbol: "AAVE",
    logo: "https://assets.coingecko.com/coins/images/12645/large/AAVE.png",
    score: 83,
    categories: ["DeFi", "Lending"],
    color: "text-indigo-500"
  }
];

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

const allCategories = [...new Set(mockTokens.flatMap(token => token.categories))];

export default function TokenDirectory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredTokens = useMemo(() => {
    return mockTokens.filter(token => {
      const matchesSearch = token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           token.symbol.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "all" || token.categories.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

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
          {filteredTokens.length === 0 && (
            <div className="text-center py-12">
              <div className="mb-4">
                <Search className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">No tokens found</h3>
              <p className="text-muted-foreground mb-4">
                Try adjusting your search term or category filter
              </p>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("all");
                }}
              >
                Clear Filters
              </Button>
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