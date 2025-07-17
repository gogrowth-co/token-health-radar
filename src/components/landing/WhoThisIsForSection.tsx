import { memo } from "react";
import { Wallet, Shield, Code } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const WhoThisIsForSection = memo(() => {
  const audiences = [
    {
      icon: Wallet,
      title: "Retail Traders",
      description: "Spot scams early and protect your capital with zero-code scans."
    },
    {
      icon: Shield,
      title: "Security Auditors", 
      description: "Run quick pre-checks before diving into deeper contract analysis."
    },
    {
      icon: Code,
      title: "Web3 Builders",
      description: "Vet protocols or tokens you're working with — instantly."
    }
  ];

  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-4">
            Who This Is For
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {audiences.map((audience) => (
            <Card key={audience.title} className="text-center border-border/50 hover:border-primary/20 transition-colors duration-200">
              <CardContent className="p-6 md:p-8">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <audience.icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-3">{audience.title}</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {audience.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
});

WhoThisIsForSection.displayName = 'WhoThisIsForSection';

export default WhoThisIsForSection;