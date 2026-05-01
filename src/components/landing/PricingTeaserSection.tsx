
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, MinusCircle } from "lucide-react";
import { Link } from "react-router-dom";

const PricingTeaserSection = memo(() => {
  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">Simple. No surprises.</h2>
          <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
            Start free. Upgrade when you need the full report.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-card rounded-lg border p-6 text-center flex flex-col">
              <h3 className="text-xl font-bold mb-2">Free</h3>
              <div className="text-3xl font-bold mb-1">$0</div>
              <p className="text-sm text-muted-foreground mb-4">No credit card. No login.</p>
              <ul className="space-y-3 mb-6 text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">1 scan per day</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Overall health score</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Top 3 issues flagged</span>
                </li>
                <li className="flex items-center gap-2">
                  <MinusCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Full dimension breakdown</span>
                </li>
                <li className="flex items-center gap-2">
                  <MinusCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Historical tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <MinusCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">Score alerts</span>
                </li>
              </ul>
              <Button asChild variant="outline" className="mt-auto">
                <a href="https://tokenhealthscan.com">Start Free →</a>
              </Button>
            </div>

            <div className="bg-card rounded-lg border border-primary p-6 text-center relative flex flex-col">
              <div className="absolute -top-3 left-0 right-0 mx-auto w-fit">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="text-3xl font-bold mb-1">$20<span className="text-lg font-normal">/month</span></div>
              <p className="text-sm text-muted-foreground mb-4">or $100/year — 2 months free</p>
              <ul className="space-y-3 mb-6 text-left">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Unlimited scans</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Full 5-dimension report</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Complete remediation list</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Historical score tracking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Score change alerts</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Bulk scan access</span>
                </li>
              </ul>
              <Button asChild className="mt-auto">
                <a href="https://tokenhealthscan.com/pricing">Get Pro →</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
});

PricingTeaserSection.displayName = 'PricingTeaserSection';

export default PricingTeaserSection;
