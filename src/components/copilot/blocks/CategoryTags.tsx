import { Badge } from "@/components/ui/badge";

interface CategoryTagsProps {
  categories?: string[];
  loading?: boolean;
}

export default function CategoryTags({ categories, loading }: CategoryTagsProps) {
  if (loading) {
    return (
      <div className="flex flex-wrap gap-2">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="h-6 w-20 bg-muted animate-pulse rounded-full"
          ></div>
        ))}
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No categories available
      </div>
    );
  }

  const formatCategory = (category: string) => {
    return category
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-muted-foreground">Categories</h4>
      <div className="flex flex-wrap gap-2">
        {categories.map((category, index) => (
          <Badge 
            key={index} 
            variant="secondary" 
            className="text-xs"
          >
            {formatCategory(category)}
          </Badge>
        ))}
      </div>
    </div>
  );
}