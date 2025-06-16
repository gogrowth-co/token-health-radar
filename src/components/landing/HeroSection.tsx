
import { memo } from "react";
import TokenSearchInput from "@/components/TokenSearchInput";

const HeroSection = memo(() => {
  return (
    <section className="relative py-12 md:py-20 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent -z-10"></div>
      
      <div className="container px-4 md:px-6 space-y-8 md:space-y-10 text-center">
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="hero-title">
            Find Hidden Risks Before You Dive In
          </h1>
          <p className="hero-subtitle">
            Scan any project and uncover critical risks — from contract flaws to liquidity traps — in seconds.
          </p>
        </div>
        
        <div className="max-w-lg mx-auto px-4 sm:px-0">
          <TokenSearchInput large={true} placeholder="Enter token name or contract address" />
          <p className="text-sm text-muted-foreground mt-3">
            Free to use. No wallet required.
          </p>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
