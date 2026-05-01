import { memo } from "react";
import TokenSearchInput from "@/components/TokenSearchInput";
const HowItWorksSection = memo(() => {
  return <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-10">
          <p className="text-sm font-medium text-primary uppercase tracking-wider mb-2">Sample scan output</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">What Your Protocol's Score Looks Like</h2>
          <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
            Every scan returns a breakdown across all 5 dimensions — plus a ranked fix list your team can act on today, not after 3 hours of analysis.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
              1
            </div>
            <h3 className="text-lg font-medium mb-2">Enter your token</h3>
            <p className="text-muted-foreground leading-relaxed">
              Ticker symbol or contract address. Works on Ethereum, Base, Arbitrum, Solana, and Polygon.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
              2
            </div>
            <h3 className="text-lg font-medium mb-2">Live data pulls in 60s</h3>
            <p className="text-muted-foreground leading-relaxed">
              Seven APIs fire simultaneously. On-chain security, DEX liquidity, holder distribution, social engagement, and GitHub activity — all live, no cache.
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
              3
            </div>
            <h3 className="text-lg font-medium mb-2">Score + fix list delivered</h3>
            <p className="text-muted-foreground leading-relaxed">
              A 0–100 score per dimension. An overall health score. A prioritized checklist of exactly what to fix first — not just what's wrong.
            </p>
          </div>
        </div>
        
        
      </div>
    </section>;
});
HowItWorksSection.displayName = 'HowItWorksSection';
export default HowItWorksSection;