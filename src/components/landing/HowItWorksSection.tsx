import { memo } from "react";
import TokenSearchInput from "@/components/TokenSearchInput";
const HowItWorksSection = memo(() => {
  return <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">How It Works</h2>
          <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
            Get comprehensive token analysis in three simple steps
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
              1
            </div>
            <h3 className="text-lg font-medium mb-2">Enter Token</h3>
            <p className="text-muted-foreground leading-relaxed">
              Search by name or paste the contract address of any token
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
              2
            </div>
            <h3 className="text-lg font-medium mb-2">Scan Process</h3>
            <p className="text-muted-foreground leading-relaxed">
              Our system analyzes on-chain and off-chain data sources
            </p>
          </div>
          
          <div className="flex flex-col items-center text-center">
            <div className="h-14 w-14 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg mb-4">
              3
            </div>
            <h3 className="text-lg font-medium mb-2">Review Results</h3>
            <p className="text-muted-foreground leading-relaxed">
              Get detailed insights across all categories with actionable data
            </p>
          </div>
        </div>
        
        
      </div>
    </section>;
});
HowItWorksSection.displayName = 'HowItWorksSection';
export default HowItWorksSection;