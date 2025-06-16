
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinalCTASection = memo(() => {
  return (
    <section className="py-12 md:py-16 bg-primary text-primary-foreground">
      <div className="container px-4 md:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-4">
            Start Analyzing Tokens Now
          </h2>
          <p className="text-base md:text-lg opacity-90 mb-6 md:mb-8 leading-relaxed">
            Find hidden risks and opportunities with our comprehensive token scanner
          </p>
          <Button variant="outline" size="lg" asChild className="bg-transparent border-white hover:bg-white hover:text-primary h-12 px-6 text-base">
            <Link to="/pricing">
              See Pricing Options
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});

FinalCTASection.displayName = 'FinalCTASection';

export default FinalCTASection;
