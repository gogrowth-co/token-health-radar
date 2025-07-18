
import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricingCard from "@/components/PricingCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { faqData } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

export default function Pricing() {
  const [isLoading, setIsLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();

  // Define price IDs for the different plans - these are the correct price IDs
  const pricePlans = {
    monthly: "price_1RQK5tD41aNWIHmd4YspKxDi", // Monthly price ID
    annual: "price_1RQK5tD41aNWIHmd1p46UCwl"   // Annual price ID
  };

  // Check for query parameters to show success/failure messages
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subscription = params.get('subscription');
    
    if (subscription === 'success') {
      toast.success("Subscription successful!", {
        description: "Your account has been upgraded successfully."
      });
    } else if (subscription === 'canceled') {
      toast.info("Checkout canceled", {
        description: "You can complete your subscription at any time."
      });
    }
  }, []);

  const handleUpgrade = async (priceId: string, planType: string) => {
    if (!isAuthenticated) {
      toast.error("Please sign in to upgrade your account.", {
        description: "You need to be logged in to subscribe to a plan."
      });
      return;
    }

    setCheckoutError(null);
    setIsLoading(true);
    setProcessingPlan(planType);
    
    try {
      console.log(`Creating checkout session for ${planType} plan with priceId: ${priceId}`);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing?subscription=canceled`,
        },
      });

      if (error) {
        console.error("Error from create-checkout function:", error);
        throw new Error(error.message || "Error creating checkout session");
      }

      if (!data?.url) {
        throw new Error("No checkout URL received from Stripe");
      }

      console.log("Received checkout URL:", data.url);
      
      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (error) {
      console.error("Error creating checkout session:", error);
      setCheckoutError(error instanceof Error ? error.message : "Unknown error occurred");
      toast.error("Checkout Error", {
        description: "There was a problem starting the checkout process. Please try again."
      });
    } finally {
      setIsLoading(false);
      setProcessingPlan(null);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Pricing Plans - Token Health Scan</title>
        <meta name="description" content="Choose the perfect plan for your crypto research. Free plan includes 3 Pro scans, Pro plans start at $20/month with advanced token analysis." />
        <meta name="keywords" content="token scanner pricing, crypto analysis plans, DeFi security subscription, token due diligence pricing" />
        <link rel="canonical" href="https://tokenhealthscan.com/pricing" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Pricing Plans - Token Health Scan" />
        <meta property="og:description" content="Choose the perfect plan for your crypto research. Free plan includes 3 Pro scans, Pro plans start at $20/month." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tokenhealthscan.com/pricing" />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pricing Plans - Token Health Scan" />
        <meta name="twitter:description" content="Choose the perfect plan for your crypto research. Free plan includes 3 Pro scans, Pro plans start at $20/month." />
        <meta name="twitter:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
      </Helmet>
      <Navbar />
      
      <main className="flex-1">
        <section className="py-12 md:py-24 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="mx-auto max-w-3xl text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                Choose the Perfect Plan for Your Needs
              </h1>
              <p className="text-xl text-muted-foreground">
                All plans include basic token scans. Upgrade for deeper insights and more scans.
              </p>
            </div>

            {checkoutError && (
              <Alert variant="destructive" className="mb-6 max-w-3xl mx-auto">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Checkout Error</AlertTitle>
                <AlertDescription>
                  {checkoutError}. Please try again or contact support.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <PricingCard 
                name="Free"
                price="0"
                interval="forever"
                features={[
                  "3 lifetime Pro Scans",
                  "Basic token security checks",
                  "Token metadata analysis",
                  "Shareable scan results"
                ]}
                limitation="Limited to 3 total Pro Scans"
                cta={isLoading && processingPlan === "free" ? "Processing..." : "Get Started Free"}
                popular={false}
                onCtaClick={() => {
                  if (!isAuthenticated) {
                    toast.info("Sign up to get started", {
                      description: "Create a free account to begin scanning tokens."
                    });
                  } else {
                    toast.info("Free Plan Active", {
                      description: "You're already on the Free plan."
                    });
                  }
                }}
              />
              <PricingCard 
                name="Pro Monthly"
                price="20"
                interval="per month"
                features={[
                  "10 Pro Scans per month",
                  "Advanced security analysis",
                  "Tokenomics deep dive",
                  "Community signal tracking",
                  "Developer activity checks",
                  "Liquidity analysis"
                ]}
                popular={true}
                cta={isLoading && processingPlan === "monthly" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : "Upgrade Now"}
                onCtaClick={() => handleUpgrade(pricePlans.monthly, "monthly")}
              />
              <PricingCard 
                name="Pro Annual"
                price="120"
                interval="per year"
                discount="Save $120 (50%)"
                features={[
                  "10 Pro Scans per month",
                  "Advanced security analysis",
                  "Tokenomics deep dive",
                  "Community signal tracking",
                  "Developer activity checks",
                  "Liquidity analysis",
                  "Priority support"
                ]}
                cta={isLoading && processingPlan === "annual" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : "Upgrade & Save"}
                onCtaClick={() => handleUpgrade(pricePlans.annual, "annual")}
              />
            </div>
          </div>
        </section>
        
        <section className="py-16">
          <div className="container px-4 md:px-6 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Frequently Asked Questions
            </h2>
            
            <Accordion type="single" collapsible className="w-full">
              {faqData.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-left font-medium">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
        
        <section className="py-16 bg-muted">
          <div className="container px-4 md:px-6 text-center">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Need a Custom Plan?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                If you need more scans or custom features, we offer enterprise solutions.
              </p>
              <a href="mailto:enterprise@tokenhealthscan.com" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                Contact Sales
              </a>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
