
import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, ArrowRight, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function LTDThankYou() {
  const { user, isAuthenticated } = useAuth();
  const [hasShownToast, setHasShownToast] = useState(false);

  useEffect(() => {
    // GA4 conversion event
    if (typeof gtag !== 'undefined') {
      gtag('event', 'ltd_purchase_complete', {
        event_category: 'LTD',
        event_label: 'Lifetime Deal Purchase Complete',
        value: 97
      });
    }

    // Show success toast for logged in users
    if (isAuthenticated && !hasShownToast) {
      toast({
        title: "✅ Your account has been upgraded to Lifetime Access",
        description: "You now have unlimited token scans forever!",
        duration: 5000,
      });
      setHasShownToast(true);
    }
  }, [isAuthenticated, hasShownToast]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-background">
      <Helmet>
        <title>Thank You - Lifetime Access Activated | Token Health Scan</title>
        <meta name="description" content="Thank you for your purchase! Your lifetime access to Token Health Scan has been activated. Start scanning tokens with unlimited Pro access." />
        <link rel="canonical" href="https://tokenhealthscan.com/ltd-thank-you" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold hover:text-primary transition-colors">
              Token Health Scan
            </Link>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-4xl font-bold text-green-600 mb-2">
              Welcome to Lifetime Access!
            </h1>
            <p className="text-xl text-muted-foreground">
              Your purchase was successful and you're all set.
            </p>
          </div>

          {/* Main Content */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-2xl">🎉 Congratulations!</CardTitle>
              <CardDescription>
                You now have unlimited access to Token Health Scan forever.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isAuthenticated && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-left">
                      <h3 className="font-medium text-blue-900 mb-1">Important: Access Your Account</h3>
                      <p className="text-sm text-blue-700">
                        If you're not logged in, please use the same email address you used during checkout to access your lifetime account.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="text-left p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Unlimited Scans</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Scan as many tokens as you want, forever
                  </p>
                </div>
                
                <div className="text-left p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">Full Analysis</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Access all 5 categories of token analysis
                  </p>
                </div>
              </div>

              {isAuthenticated ? (
                <div className="space-y-4">
                  <p className="text-green-600 font-medium">
                    ✅ You're logged in as {user?.email}
                  </p>
                  <Link to="/dashboard">
                    <Button size="lg" className="w-full">
                      Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <Link to="/auth">
                    <Button size="lg" className="w-full">
                      Sign In to Access Your Account <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Next Steps */}
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">What's Next?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-2xl mb-2">1️⃣</div>
                <div className="font-medium mb-1">Sign In</div>
                <div className="text-muted-foreground">Use your purchase email to access your account</div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-2xl mb-2">2️⃣</div>
                <div className="font-medium mb-1">Start Scanning</div>
                <div className="text-muted-foreground">Enter any token address to begin analysis</div>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <div className="text-2xl mb-2">3️⃣</div>
                <div className="font-medium mb-1">Enjoy Forever</div>
                <div className="text-muted-foreground">Unlimited scans with no expiration</div>
              </div>
            </div>
          </div>

          {/* Support */}
          <div className="mt-12 text-center">
            <p className="text-sm text-muted-foreground">
              Questions or need help? Contact us at{" "}
              <a href="mailto:support@tokenhealthscan.com" className="text-primary hover:underline">
                support@tokenhealthscan.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
