
import { ReactNode } from "react";
import { Shield, LucideIcon } from "lucide-react";
import CategoryFeatureCard, { BadgeVariant } from "./CategoryFeatureCard";

export interface CategoryFeature {
  icon: LucideIcon;
  title: string;
  description: string;
  badgeLabel: string;
  badgeVariant: BadgeVariant;
}

interface CategoryFeatureGridProps {
  features: CategoryFeature[];
  title?: string;
  description?: ReactNode;
}

export default function CategoryFeatureGrid({
  features,
  title,
  description
}: CategoryFeatureGridProps) {
  return (
    <div className="space-y-4">
      {title && <h2 className="text-xl font-semibold">{title}</h2>}
      {description && <div className="text-muted-foreground mb-4">{description}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <CategoryFeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            badgeLabel={feature.badgeLabel}
            badgeVariant={feature.badgeVariant}
          />
        ))}
      </div>
    </div>
  );
}

// Example usage (can be removed in production):
export const exampleFeatures: CategoryFeature[] = [
  {
    icon: Shield,
    title: "Ownership Renounced",
    description: "Contract ownership status (renounced = more secure)",
    badgeLabel: "Yes",
    badgeVariant: "green"
  },
  {
    icon: Shield,
    title: "Audit Status",
    description: "Security audit verification by third-party firm",
    badgeLabel: "Not Verified",
    badgeVariant: "red"
  }
];
