
import { memo } from "react";
import { Shield, Droplet, BarChart3 } from "lucide-react";

const BenefitsSection = memo(() => {
  return (
    <section className="py-12 md:py-16 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Security Risks</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Detect honeypots, mint functions, and backdoor risks in smart contracts
            </p>
          </div>
          
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Droplet className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Liquidity Analysis</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Examine lock periods, holder distribution, and pull indicators
            </p>
          </div>
          
          <div className="flex flex-col items-center p-6 bg-card rounded-lg border shadow-sm text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">Tokenomics</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Review supply constraints, circulation metrics, and allocation models
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});

BenefitsSection.displayName = 'BenefitsSection';

export default BenefitsSection;
