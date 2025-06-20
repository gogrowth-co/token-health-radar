
import { memo } from "react";

const ReportPreviewSection = memo(() => {
  return (
    <section className="py-12 md:py-16 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">Here's What Your Token Report Looks Like</h2>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="relative rounded-lg overflow-hidden shadow-2xl border">
            <img 
              src="/lovable-uploads/token-health-scan-product.png" 
              alt="Token Health Scan comprehensive risk assessment report showing security analysis, liquidity verification, and smart contract audit results for cryptocurrency token evaluation" 
              className="w-full h-auto"
              loading="lazy"
              width="800"
              height="600"
            />
          </div>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Real report showing smart contract flags, liquidity, and token data
          </p>
        </div>
      </div>
    </section>
  );
});

ReportPreviewSection.displayName = 'ReportPreviewSection';

export default ReportPreviewSection;
