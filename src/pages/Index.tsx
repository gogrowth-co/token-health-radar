
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Shield, TrendingUp, Users, Code, Coins } from "lucide-react";
import { toast } from "sonner";
import CategoryFeatureGrid from "@/components/CategoryFeatureGrid";

export default function Index() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchTerm.trim()) {
      toast.error("Please enter a token name or address");
      return;
    }
    
    // Navigate to confirm page with the search term
    navigate(`/confirm?token=${encodeURIComponent(searchTerm.trim())}`);
  };

  const features = [
    {
      icon: Shield,
      title: "Security Analysis",
      description: "Detect honeypots, rug pulls, and contract vulnerabilities",
      badgeLabel: "Critical",
      badgeVariant: "red" as const
    },
    {
      icon: TrendingUp,
      title: "Liquidity Health",
      description: "Analyze trading volume, depth, and market stability",
      badgeLabel: "High",
      badgeVariant: "green" as const
    },
    {
      icon: Coins,
      title: "Tokenomics Review",
      description: "Evaluate supply distribution and inflation mechanics",
      badgeLabel: "Medium",
      badgeVariant: "yellow" as const
    },
    {
      icon: Users,
      title: "Community Strength",
      description: "Assess social presence and engagement metrics",
      badgeLabel: "Active",
      badgeVariant: "blue" as const
    },
    {
      icon: Code,
      title: "Development Activity",
      description: "Track code commits and project maintenance",
      badgeLabel: "Updated",
      badgeVariant: "green" as const
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <main className="flex-1">
        <section className="container px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
                Scan Any Token's
                <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent"> Health</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Get instant risk analysis across security, liquidity, tokenomics, community, and development. 
                DYOR smarter and faster.
              </p>
            </div>
            
            {/* Search Form */}
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Enter token name or contract address..."
                    className="pl-10 h-12 text-base"
                  />
                </div>
                <Button type="submit" size="lg" className="h-12 px-8">
                  Scan Token
                </Button>
              </form>
              <p className="text-sm text-muted-foreground mt-2">
                Start scanning immediately - no signup required
              </p>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container px-4 py-16">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Complete Token Health Analysis</h2>
              <p className="text-muted-foreground">
                Our 5-pillar analysis gives you the full picture of any token's risk profile
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <div key={index} className="text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Category Features */}
        <section className="container px-4 py-16 bg-muted/50">
          <CategoryFeatureGrid features={features} />
        </section>

        {/* CTA Section */}
        <section className="container px-4 py-16">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold">Ready to DYOR Smarter?</h2>
            <p className="text-xl text-muted-foreground">
              Join thousands of crypto investors making informed decisions with TokenHealthScan
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/pricing")}>
                View Pricing
              </Button>
              <Button variant="outline" size="lg" onClick={() => navigate("/auth")}>
                Sign Up Free
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
