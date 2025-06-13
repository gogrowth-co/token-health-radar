
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

export interface CategoryFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  badgeLabel: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline" | "blue" | "green" | "yellow" | "red" | "orange" | "gray";
}

interface CategoryFeatureGridProps {
  features: CategoryFeature[];
  description?: string;
}

export default function CategoryFeatureGrid({ features, description }: CategoryFeatureGridProps) {
  return (
    <div className="space-y-6">
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div key={index} className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <feature.icon className="h-6 w-6 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <Badge variant={feature.badgeVariant} className="text-xs">
                  {feature.badgeLabel}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
