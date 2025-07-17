
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const FinalCTASection = memo(() => {
  return (
    <section className="py-12 md:py-16 bg-primary text-primary-foreground">
      <div className="container px-4 md:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-4">
            Start Scanning Tokens Before You Dive In
          </h2>
          <p className="text-base md:text-lg opacity-90 mb-6 md:mb-8 leading-relaxed">
            Protect your capital. Avoid scams. Make smarter plays — free.
          </p>
          <Button variant="outline" size="lg" asChild className="bg-transparent border-white hover:bg-white hover:text-primary h-12 px-6 text-base mb-4">
            <Link to="/scan">
              🔍 Run Your First Scan Now
            </Link>
          </Button>
          <p className="text-xs md:text-sm opacity-75">
            Security Scan powered by DD.xyz · 10,000+ scans run
          </p>
        </div>
      </div>
    </section>
  );
});

FinalCTASection.displayName = 'FinalCTASection';

export default FinalCTASection;
