
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";

const PricingTeaserSection = memo(() => {
  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">Compare Plans</h2>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="bg-card rounded-lg border p-6 text-center">
              <h3 className="text-xl font-bold mb-2">Free Trial</h3>
              <div className="text-3xl font-bold mb-4">$0</div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">3 Pro scans lifetime</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Basic token search</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Overview scores</span>
                </li>
              </ul>
            </div>

            <div className="bg-card rounded-lg border border-primary p-6 text-center relative">
              <div className="absolute -top-3 left-0 right-0 mx-auto w-fit">
                <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">Most Popular</span>
              </div>
              <h3 className="text-xl font-bold mb-2">Pro</h3>
              <div className="text-3xl font-bold mb-4">$20<span className="text-lg font-normal">/mo</span></div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">10 scans per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Full detailed analysis</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">All 5 categories unlocked</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">Scan history & dashboard</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-8 md:mt-10">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link to="/pricing">
              See Pricing Options
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});

PricingTeaserSection.displayName = 'PricingTeaserSection';

export default PricingTeaserSection;
