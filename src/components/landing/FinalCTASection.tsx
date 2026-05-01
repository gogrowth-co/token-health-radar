
import { memo } from "react";
import { Button } from "@/components/ui/button";

const FinalCTASection = memo(() => {
  return (
    <section className="py-12 md:py-16 bg-primary text-primary-foreground">
      <div className="container px-4 md:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-4">
            Stop guessing what's wrong. Start fixing it.
          </h2>
          <p className="text-base md:text-lg opacity-90 mb-6 md:mb-8 leading-relaxed">
            Scan your protocol's token. Get a score, a breakdown, and a ranked fix list — in 60 seconds. Free, no login.
          </p>
          <Button variant="outline" size="lg" asChild className="bg-transparent border-white hover:bg-white hover:text-primary h-12 px-6 text-base">
            <a href="https://tokenhealthscan.com">
              Scan Your Token Now →
            </a>
          </Button>
          <p className="text-sm opacity-80 mt-4">
            Free: 1 scan/day · Pro: $20/month or $100/year — full report + historical tracking
          </p>
        </div>
      </div>
    </section>
  );
});

FinalCTASection.displayName = 'FinalCTASection';

export default FinalCTASection;
