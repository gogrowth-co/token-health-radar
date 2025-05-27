
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, Star, Shield, Zap, Clock, Users } from "lucide-react";

export default function LTD() {
  const { user, signIn, signUp, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Missing information",
        description: "Please provide both email and password.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleAuth = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/ltd'
        }
      });
      
      if (error) {
        toast({
          title: "Google authentication failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Google auth error:", error);
      toast({
        title: "Google authentication failed",
        description: "An error occurred during Google authentication.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Token Health Scan</h1>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              Limited Time Offer
            </Badge>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
              🚀 Lifetime Deal - 90% OFF
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Token Health Scan
              <span className="block text-primary">Lifetime Access</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get unlimited token scans forever. Normally $20/month, now just $97 one-time payment.
            </p>
            
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
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Features */}
            <div>
              <h2 className="text-2xl font-bold mb-6">What You Get Forever</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Unlimited Token Scans</div>
                    <div className="text-sm text-muted-foreground">Scan as many tokens as you want, forever</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Full Security Analysis</div>
                    <div className="text-sm text-muted-foreground">Contract audits, honeypot detection, and risk assessment</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">All 5 Categories</div>
                    <div className="text-sm text-muted-foreground">Security, Liquidity, Tokenomics, Community, Development</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="font-medium">Scan History</div>
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
            </div>

            {/* Auth Section */}
            <Card>
              <CardHeader>
                <CardTitle>
                  {isAuthenticated ? "You're Ready!" : "Sign In to Continue"}
                </CardTitle>
                <CardDescription>
                  {isAuthenticated 
                    ? `Logged in as ${user?.email}. Click below to get lifetime access.`
                    : "Sign in or create an account to purchase your lifetime deal."
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isAuthenticated ? (
                  <div className="space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={handleGoogleAuth}
                      disabled={isSubmitting}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Continue with Google
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    <form onSubmit={handleAuth} className="space-y-4">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                      <Input
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSignUp ? "Create Account" : "Sign In"}
                      </Button>
                    </form>
                    
                    <div className="text-center text-sm">
                      <button 
                        type="button"
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-primary hover:underline"
                      >
                        {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <Button 
                    onClick={handlePurchaseClick}
                    size="lg" 
                    className="w-full text-lg py-6"
                  >
                    🚀 Unlock Lifetime Access - $97
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Testimonials */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">What Users Are Saying</h2>
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

          {/* FAQ */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
            <div className="space-y-4 max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="font-medium mb-2">Is this really lifetime access?</h3>
                  <p className="text-sm text-muted-foreground">Yes! Pay once, use forever. No monthly fees, no hidden costs.</p>
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
                  <h3 className="font-medium mb-2">How many tokens can I scan?</h3>
                  <p className="text-sm text-muted-foreground">Unlimited! Scan as many tokens as you want with no restrictions.</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Final CTA */}
          <div className="text-center">
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-6">
                <h2 className="text-2xl font-bold mb-4">Don't Miss This Opportunity</h2>
                <p className="text-muted-foreground mb-6">This lifetime deal is only available for a limited time. Secure your access now.</p>
                {isAuthenticated ? (
                  <Button 
                    onClick={handlePurchaseClick}
                    size="lg" 
                    className="text-lg py-6 px-8"
                  >
                    🚀 Get Lifetime Access - $97
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">Sign in above to purchase</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
