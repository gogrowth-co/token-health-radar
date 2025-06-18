
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";
import { CategoryFeature } from "@/utils/categoryTransformers";

interface CategoryDataGridProps {
  features: CategoryFeature[];
  description?: string;
}

export default function CategoryDataGrid({ features, description }: CategoryDataGridProps) {
  const renderValue = (feature: CategoryFeature) => {
    if (feature.type === "boolean") {
      const boolValue = feature.value as boolean;
      const isPositive = feature.positive !== undefined ? feature.positive : true;
      const isGood = isPositive ? boolValue : !boolValue;
      
      return isGood ? (
        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
          <Check className="w-3 h-3 mr-1" /> Yes
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500">
          <X className="w-3 h-3 mr-1" /> No
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {String(feature.value)}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {description && (
        <div className="text-muted-foreground text-sm">{description}</div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {features.map((feature, index) => (
          <div 
            key={index}
            className="relative p-4 rounded-lg bg-white dark:bg-muted border border-gray-100 dark:border-gray-700 shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                  {feature.label}
                </h4>
              </div>
              <div className="ml-3">
                {renderValue(feature)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
