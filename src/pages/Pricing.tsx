
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PricingCard from "@/components/PricingCard";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { pricingTiers, faqData } from "@/lib/mock-data";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function Pricing() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "annual">("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, user } = useAuth();

  const handleUpgrade = async (priceId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to upgrade your account.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          priceId,
          successUrl: `${window.location.origin}/dashboard?subscription=success`,
          cancelUrl: `${window.location.origin}/pricing?subscription=canceled`,
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast({
        title: "Checkout Error",
        description: "There was a problem starting the checkout process. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
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
                cta="Get Started Free"
                onCtaClick={() => {
                  if (!isAuthenticated) {
                    toast({
                      title: "Sign up to get started",
                      description: "Create a free account to begin scanning tokens."
                    });
                  } else {
                    toast({
                      title: "Free Plan Active",
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
                cta="Upgrade Now"
                onCtaClick={() => handleUpgrade("price_1RQK5tD41aNWIHmd4YspKxDi")}
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
                cta="Upgrade & Save"
                onCtaClick={() => handleUpgrade("price_1RQK5tD41aNWIHmd1p46UCwl")}
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
