
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenSearchInput from "@/components/TokenSearchInput";
import { Button } from "@/components/ui/button";
import { Shield, Droplet, BarChart3, Globe, Code, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function Landing() {
  // This component embeds TokenSearchInput which now uses the correct 'token' parameter
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent -z-10"></div>
          
          <div className="container px-4 md:px-6 space-y-10 text-center">
            <div className="space-y-4 max-w-3xl mx-auto">
              <h1 className="text-3xl md:text-5xl font-bold tracking-tighter">
                Find Hidden Risks Before You Dive In
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Scan any project and uncover critical risks — from contract flaws to liquidity traps — in seconds.
              </p>
            </div>
            
            <div className="max-w-lg mx-auto">
              <TokenSearchInput large={true} />
              <p className="text-sm text-muted-foreground mt-2">
                Free to use. No wallet required.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Security Risks</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Detect honeypots, mint functions, and backdoor risks in smart contracts
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Droplet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Liquidity Analysis</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Examine lock periods, holder distribution, and rug pull indicators
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Tokenomics</h3>
                <p className="text-sm text-center text-muted-foreground">
                  Review supply constraints, circulation metrics, and allocation models
                </p>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter">Comprehensive Token Analysis</h2>
              <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                Get detailed insights across 5 critical categories to make better investment decisions
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow">
                <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Security</h3>
                <p className="text-sm text-muted-foreground mt-1">Contract & vulnerability analysis</p>
              </div>
              
              <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow">
                <Droplet className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Liquidity</h3>
                <p className="text-sm text-muted-foreground mt-1">Depth & lock-up periods</p>
              </div>
              
              <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Tokenomics</h3>
                <p className="text-sm text-muted-foreground mt-1">Supply model & distribution</p>
              </div>
              
              <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow">
                <Globe className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Community</h3>
                <p className="text-sm text-muted-foreground mt-1">Social presence & growth</p>
              </div>
              
              <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow">
                <Code className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">Development</h3>
                <p className="text-sm text-muted-foreground mt-1">Activity & contributor metrics</p>
              </div>
            </div>
            
            <div className="flex justify-center mt-10">
              <Button asChild size="lg">
                <Link to="/pricing" className="flex items-center gap-2">
                  Upgrade for Pro Analysis <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
        
        {/* How It Works */}
        <section className="py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter">How It Works</h2>
              <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                Get comprehensive token analysis in three simple steps
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
                  1
                </div>
                <h3 className="text-lg font-medium mb-2">Enter Token</h3>
                <p className="text-muted-foreground">
                  Search by name or paste the contract address of any token
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
                  2
                </div>
                <h3 className="text-lg font-medium mb-2">Scan Process</h3>
                <p className="text-muted-foreground">
                  Our system analyzes on-chain and off-chain data sources
                </p>
              </div>
              
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
                  3
                </div>
                <h3 className="text-lg font-medium mb-2">Review Results</h3>
                <p className="text-muted-foreground">
                  Get detailed insights across all categories with actionable data
                </p>
              </div>
            </div>
            
            <div className="flex justify-center mt-10">
              <TokenSearchInput placeholder="Try it now - enter any token name or address" />
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tighter mb-4">
                Start Analyzing Tokens Now
              </h2>
              <p className="text-lg opacity-90 mb-8">
                Find hidden risks and opportunities with our comprehensive token scanner
              </p>
              <Button variant="outline" size="lg" asChild className="bg-transparent border-white hover:bg-white hover:text-primary">
                <Link to="/pricing">
                  See Pricing Options
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
