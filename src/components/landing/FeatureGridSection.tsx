
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Droplet, BarChart3, Globe, Code, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const FeatureGridSection = memo(() => {
  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8 md:mb-10">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter">Comprehensive Token Analysis</h2>
          <p className="text-base md:text-lg text-muted-foreground mt-2 max-w-2xl mx-auto leading-relaxed">
            Get detailed insights across 5 critical categories
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-4">
          <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow min-h-[120px] flex flex-col justify-center">
            <Shield className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium">Security</h3>
            <p className="text-sm text-muted-foreground mt-1">Contract & vulnerability analysis</p>
          </div>
          
          <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow min-h-[120px] flex flex-col justify-center">
            <Droplet className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium">Liquidity</h3>
            <p className="text-sm text-muted-foreground mt-1">Depth & lock-up periods</p>
          </div>
          
          <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow min-h-[120px] flex flex-col justify-center">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium">Tokenomics</h3>
            <p className="text-sm text-muted-foreground mt-1">Supply model & distribution</p>
          </div>
          
          <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow min-h-[120px] flex flex-col justify-center">
            <Globe className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium">Community</h3>
            <p className="text-sm text-muted-foreground mt-1">Social presence & growth</p>
          </div>
          
          <div className="bg-card rounded-lg border p-4 text-center hover:shadow-md transition-shadow min-h-[120px] flex flex-col justify-center sm:col-span-2 lg:col-span-1">
            <Code className="h-8 w-8 mx-auto mb-2 text-primary" />
            <h3 className="font-medium">Development</h3>
            <p className="text-sm text-muted-foreground mt-1">Activity & contributor metrics</p>
          </div>
        </div>
        
        <div className="flex justify-center mt-8 md:mt-10">
          <Button asChild size="lg" className="h-12 px-6 text-base">
            <Link to="/pricing" className="flex items-center gap-2">
              Upgrade for Pro Analysis <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
});

FeatureGridSection.displayName = 'FeatureGridSection';

export default FeatureGridSection;
