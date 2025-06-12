
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenSearchInput from "@/components/TokenSearchInput";
import CategoryFeatureGrid from "@/components/CategoryFeatureGrid";
import { Button } from "@/components/ui/button";
import { Shield, TrendingUp, Users, Code, BarChart3, ArrowRight } from "lucide-react";

const Index = () => {
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  const handleSearch = (token: string) => {
    if (!token.trim()) return;
    navigate(`/confirm?token=${encodeURIComponent(token)}`);
  };

  const features = [
    {
      icon: <Shield className="h-8 w-8 text-red-600" />,
      title: "Security Analysis",
      description: "Detect honeypots, rug pulls, and smart contract vulnerabilities"
    },
    {
      icon: <BarChart3 className="h-8 w-8 text-blue-600" />,
      title: "Liquidity Health",
      description: "Analyze liquidity locks, holder distribution, and trading depth"
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-green-600" />,
      title: "Tokenomics",
      description: "Examine supply mechanics, vesting schedules, and economic models"
    },
    {
      icon: <Users className="h-8 w-8 text-purple-600" />,
      title: "Community Signals",
      description: "Track social media growth, engagement, and community health"
    },
    {
      icon: <Code className="h-8 w-8 text-orange-600" />,
      title: "Development Activity",
      description: "Monitor GitHub commits, contributor activity, and code quality"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-12 md:py-24 bg-gradient-to-b from-background to-muted">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-4xl text-center space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                  DYOR Smarter, Not Harder
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                  Comprehensive token health analysis across 5 critical pillars: Security, Liquidity, Tokenomics, Community, and Development.
                </p>
              </div>
              
              <div className="max-w-2xl mx-auto">
                <TokenSearchInput
                  value={searchValue}
                  onChange={setSearchValue}
                  onSearch={handleSearch}
                  placeholder="Enter token name or contract address..."
                />
                <p className="text-sm text-muted-foreground mt-2">
                  Try: PENDLE, USDC, or paste any contract address
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => handleSearch("PENDLE")} className="text-lg px-8">
                  Try Demo Scan <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <a href="#features">Learn More</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                5 Pillars of Token Analysis
              </h2>
              <p className="text-lg text-muted-foreground">
                Our comprehensive scoring system analyzes tokens across five critical dimensions to give you the complete picture.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <div key={index} className="bg-card rounded-lg p-6 border text-center hover:shadow-lg transition-shadow">
                  <div className="mb-4 flex justify-center">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Category Feature Grid */}
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6">
            <CategoryFeatureGrid />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center space-y-8">
              <h2 className="text-3xl md:text-4xl font-bold">
                Start Scanning Tokens Today
              </h2>
              <p className="text-lg text-muted-foreground">
                Get 3 free Pro scans to experience the full power of our analysis. No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => handleSearch("")} className="text-lg px-8">
                  Start Free Scan <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button size="lg" variant="outline" asChild className="text-lg px-8">
                  <a href="/pricing">View Pricing</a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;
