
import { memo } from "react";
import TokenSearchInput from "@/components/TokenSearchInput";

const HeroSection = memo(() => {
  return (
    <section className="relative py-8 md:py-12 lg:py-20 pb-16 md:pb-20 lg:pb-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent -z-10"></div>
      
      <div className="container px-4 md:px-6 space-y-6 md:space-y-8 text-center">
        <div className="space-y-3 md:space-y-4 max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Find Hidden Risks Before You Dive In
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Scan any project and uncover critical risks — from contract flaws to liquidity traps — in seconds.
          </p>
        </div>
        
        <div className="max-w-lg mx-auto px-2 sm:px-4">
          <TokenSearchInput large={true} placeholder="Enter token name or address" />
          <p className="text-xs sm:text-sm text-muted-foreground mt-2">
            Free to use. No wallet required.
          </p>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
