
import { CheckIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import React from "react";

interface PricingCardProps {
  name: string;
  price: string;
  interval?: string;
  discount?: string;
  features: string[];
  limitation?: string;
  cta: React.ReactNode;
  popular?: boolean;
  onCtaClick?: () => void;
}

export default function PricingCard({
  name,
  price,
  interval = "",
  discount,
  features,
  limitation,
  cta,
  popular = false,
  onCtaClick
}: PricingCardProps) {
  return (
    <Card className={`relative flex flex-col ${popular ? 'border-primary shadow-lg shadow-primary/20' : ''}`}>
      {popular && (
        <div className="absolute -top-3 left-0 right-0 mx-auto w-fit">
          <Badge variant="default" className="px-3 py-1">Most Popular</Badge>
        </div>
      )}
      
      <CardHeader className="pb-8">
        <CardTitle className="text-xl">{name}</CardTitle>
        {discount && <CardDescription className="text-primary font-medium">{discount}</CardDescription>}
      </CardHeader>
      
      <CardContent className="grid gap-4 flex-1">
        <div className="flex items-baseline text-center justify-center">
          <span className="text-4xl font-bold">${price}</span>
          {interval && <span className="ml-1 text-muted-foreground">{interval}</span>}
        </div>
        
        <ul className="space-y-2 mt-6">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-3">
              <CheckIcon className="h-4 w-4 text-primary mt-1 flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        {limitation && (
          <p className="text-sm text-muted-foreground mt-4">
            {limitation}
          </p>
        )}
      </CardContent>
      
      <CardFooter className="pt-4">
        <Button 
          variant={popular ? "default" : "outline"} 
          className={`w-full ${popular ? 'bg-primary hover:bg-primary/90' : ''}`}
          onClick={onCtaClick}
          disabled={typeof cta === "object" && React.isValidElement(cta) && cta.type === React.Fragment && cta.props.children[0]?.type === Loader2}
        >
          {cta}
        </Button>
      </CardFooter>
    </Card>
  );
}
