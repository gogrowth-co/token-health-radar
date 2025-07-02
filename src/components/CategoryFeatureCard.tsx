
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type BadgeVariant = "gray" | "blue" | "green" | "red" | "orange" | "yellow";

export interface CategoryFeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badgeLabel: string;
  badgeVariant: BadgeVariant;
}

export default function CategoryFeatureCard({
  icon: Icon,
  title,
  description,
  badgeLabel,
  badgeVariant
}: CategoryFeatureProps) {
  // Badge styling based on variant
  const getBadgeStyles = (variant: BadgeVariant) => {
    const baseClasses = "text-xs font-medium px-2.5 py-0.5 rounded-full";
    
    const variantClasses = {
      gray: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
      blue: "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300",
      green: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
      red: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300", 
      orange: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
      yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
    };
    
    return cn(baseClasses, variantClasses[variant]);
  };
  
  return (
    <div className="relative p-5 rounded-lg bg-white dark:bg-muted border border-gray-100 dark:border-gray-700 shadow-sm min-h-[140px] flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
        <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
          {title}
        </h3>
      </div>
      
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
        {description}
      </div>
      
      <div className="mt-auto">
        <span className={getBadgeStyles(badgeVariant)}>
          {badgeLabel}
        </span>
      </div>
    </div>
  );
}
