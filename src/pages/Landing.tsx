import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenSearchInput from "@/components/TokenSearchInput";
import { Button } from "@/components/ui/button";
import { Shield, Droplet, BarChart3, Globe, Code, ArrowRight, Users, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1">
        {/* Section 1: Hero */}
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
              <TokenSearchInput large={true} placeholder="Enter token name or contract address" />
              <p className="text-sm text-muted-foreground mt-2">
                Free to use. No wallet required.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Core Benefits */}
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Security Risks</h3>
                <p className="text-sm text-muted-foreground">
                  Detect honeypots, mint functions, and backdoor risks in smart contracts
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Droplet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Liquidity Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Examine lock periods, holder distribution, and pull indicators
                </p>
              </div>
              
              <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">Tokenomics</h3>
                <p className="text-sm text-muted-foreground">
                  Review supply constraints, circulation metrics, and allocation models
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: How It Works */}
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
              <TokenSearchInput placeholder="Try it now - enter any token name or address" textPosition="below" />
            </div>
          </div>
        </section>

        {/* Section 4: Report Preview */}
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter">Here's What Your Token Report Looks Like</h2>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="relative rounded-lg overflow-hidden shadow-2xl border">
                <img src="/lovable-uploads/139caadb-8984-4e76-900b-60aa83141ba5.png" alt="Token Health Scan Report Example" className="w-full h-auto" />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Real report showing smart contract flags, liquidity, and token data
              </p>
            </div>
          </div>
        </section>

        {/* Section 5: Feature Grid */}
        <section className="py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter">Comprehensive Token Analysis</h2>
              <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                Get detailed insights across 5 critical categories
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

        {/* Section 6: Social Proof */}
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="h-6 w-6 text-primary" />
                <span className="text-lg font-medium">Join 1,000+ users already scanning tokens safely with TokenHealthScan</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 7: Pricing Teaser */}
        <section className="py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter">Compare Plans</h2>
            </div>
            
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Free Plan */}
                <div className="bg-card rounded-lg border p-6 text-center">
                  <h3 className="text-xl font-bold mb-2">Free Trial</h3>
                  <div className="text-3xl font-bold mb-4">$0</div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">3 Pro scans lifetime</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Basic token search</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Overview scores</span>
                    </li>
                  </ul>
                </div>

                {/* Pro Plan */}
                <div className="bg-card rounded-lg border border-primary p-6 text-center relative">
                  <div className="absolute -top-3 left-0 right-0 mx-auto w-fit">
                    <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">Most Popular</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">Pro</h3>
                  <div className="text-3xl font-bold mb-4">$20<span className="text-lg font-normal">/mo</span></div>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">10 scans per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Full detailed analysis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">All 5 categories unlocked</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Scan history & dashboard</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-10">
              <Button asChild size="lg">
                <Link to="/pricing">
                  See Pricing Options
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Section 8: Final CTA Banner */}
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
