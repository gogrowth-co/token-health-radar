
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Shield, Droplet, BarChart3, Globe, Code, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function LTD() {
  const handlePurchaseClick = () => {
    // GA4 event tracking
    if (typeof gtag !== 'undefined') {
      gtag('event', 'click_ltd_purchase', {
        event_category: 'LTD',
        event_label: 'Lifetime Deal Purchase Click',
        value: 97
      });
    }
    
    // Redirect to Kiwify checkout
    window.open('https://pay.kiwify.com.br/iuoRXYC', '_blank');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold hover:text-primary transition-colors">
              Token Health Scan
            </Link>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
              🚀 Limited Time Offer
            </Badge>
          </div>
        </div>
      </div>

      <main className="flex-1">
        {/* Section 1: Hero */}
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent -z-10"></div>
          
          <div className="container px-4 md:px-6 space-y-10 text-center">
            <div className="space-y-4 max-w-3xl mx-auto">
              <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
                🚀 Lifetime Deal - 90% OFF
              </Badge>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tighter">
                Find Hidden Risks Before You Dive In
                <span className="block text-primary">Lifetime Access</span>
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Scan any project and uncover critical risks — from contract flaws to liquidity traps — in seconds. Get 10 Pro Token Scans per Month for LIFE.
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500 line-through">$240/year</div>
                <div className="text-sm text-muted-foreground">Regular Price</div>
              </div>
              <div className="text-4xl font-bold text-primary">→</div>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600">$97</div>
                <div className="text-sm text-muted-foreground">One-time payment</div>
              </div>
            </div>

            <Button onClick={handlePurchaseClick} size="lg" className="text-lg py-6 px-8">
              🚀 Unlock Lifetime Access - $97
            </Button>
            <p className="text-sm text-muted-foreground">
              No account required. Get instant access after purchase.
            </p>
          </div>
        </section>

        {/* Section 2: LTD Benefits - Moved up for prominence */}
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter mb-4">What You Get Forever</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Pay once, scan tokens for life. Never worry about monthly subscriptions again.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Card className="border-primary bg-primary/5">
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <div className="text-xl font-semibold mb-2">10 Pro Token Scans per Month for LIFE</div>
                        <div className="text-muted-foreground">Never expires, scan your favorite tokens monthly</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xl font-semibold mb-2">Scan History Access</div>
                        <div className="text-muted-foreground">Access all your previous scans anytime</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-xl font-semibold mb-2">Priority Support</div>
                        <div className="text-muted-foreground">Get help when you need it</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="text-center mt-8">
              <Button onClick={handlePurchaseClick} size="lg" className="text-lg py-6 px-8">
                🚀 Secure Your Lifetime Access Now - $97
              </Button>
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
          </div>
        </section>

        {/* Section 4: Feature Grid with Screenshot */}
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold tracking-tighter">Comprehensive Token Analysis</h2>
              <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
                Get detailed insights across 5 critical categories with your lifetime access
              </p>
            </div>
            
            <div className="max-w-4xl mx-auto mb-12">
              <div className="relative rounded-lg overflow-hidden shadow-2xl border">
                <img 
                  src="/lovable-uploads/c705b444-0cef-46bf-b4a1-c6663acf1164.png" 
                  alt="Token Health Scan Report Example showing Pendle token analysis" 
                  className="w-full h-auto"
                />
              </div>
              <p className="text-center text-sm text-muted-foreground mt-4">
                Real report showing smart contract flags, liquidity, and token data
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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

            <div className="max-w-2xl mx-auto">
              <Card className="border-primary bg-primary/5">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium">10 Pro Token Scans per Month for LIFE</div>
                        <div className="text-sm text-muted-foreground">Never expires, scan your favorite tokens monthly</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Scan History Access</div>
                        <div className="text-sm text-muted-foreground">Access all your previous scans anytime</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="h-5 w-5 text-green-500 mt-0.5" />
                      <div>
                        <div className="font-medium">Priority Support</div>
                        <div className="text-sm text-muted-foreground">Get help when you need it</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 5: Social Proof */}
        <section className="py-16">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Users className="h-6 w-6 text-primary" />
                <span className="text-lg font-medium">Join 1,000+ users already scanning tokens safely</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm mb-3">"Saved me from investing in a honeypot token. This tool is essential for any DeFi investor."</p>
                  <div className="text-xs text-muted-foreground">- Alex K., Crypto Investor</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm mb-3">"The security analysis is incredibly detailed. I can finally DYOR with confidence."</p>
                  <div className="text-xs text-muted-foreground">- Sarah M., DeFi Trader</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm mb-3">"Best $97 I've ever spent. Already identified 3 risky tokens in my portfolio."</p>
                  <div className="text-xs text-muted-foreground">- Mike R., Portfolio Manager</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 6: FAQ */}
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4 max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">Is this really lifetime access?</h3>
                  <p className="text-sm text-muted-foreground">Yes! Pay once, get 10 Pro scans per month for life. No monthly fees, no hidden costs.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">What if I'm not satisfied?</h3>
                  <p className="text-sm text-muted-foreground">We offer a 30-day money-back guarantee. If you're not satisfied, we'll refund your purchase.</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">How do I access my account after purchase?</h3>
                  <p className="text-sm text-muted-foreground">Create an account using the same email address you used for checkout. Your lifetime access will be automatically activated.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Section 7: Final CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tighter mb-4">
                Don't Miss This Opportunity
              </h2>
              <p className="text-lg opacity-90 mb-8">
                This lifetime deal is only available for a limited time. Secure your access now and never pay monthly fees again.
              </p>
              <Button 
                onClick={handlePurchaseClick}
                variant="outline" 
                size="lg" 
                className="bg-transparent border-white hover:bg-white hover:text-primary text-lg py-6 px-8"
              >
                🚀 Get Lifetime Access - $97
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
