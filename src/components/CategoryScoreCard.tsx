
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface CategoryScoreCardProps {
  category: string;
  score: number;
  level: 'low' | 'medium' | 'high';
  color: 'red' | 'amber' | 'green';
  onClick?: () => void;
}

export default function CategoryScoreCard({
  category,
  score,
  level,
  color,
  onClick
}: CategoryScoreCardProps) {
  // Check if this is the Community category to show "Coming Soon"
  const isComingSoon = category === "Community";

  const getScoreColor = (color: 'red' | 'amber' | 'green') => {
    switch (color) {
      case 'green':
        return '#10b981';
      case 'amber':
        return '#f59e0b';
      case 'red':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getLevelText = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'high':
        return 'Excellent';
      case 'medium':
        return 'Good';
      case 'low':
        return 'Poor';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card 
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        onClick ? 'hover:bg-accent/50' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="text-center space-y-4">
          {/* Score Display */}
          <div className="text-4xl font-bold text-primary">
            {isComingSoon ? "?" : score}
          </div>
          
          {/* Category Name */}
          <h3 className="text-lg font-semibold text-foreground">
            {category}
          </h3>
          
          {/* Progress Bar */}
          <div className="w-full">
            <Progress 
              value={isComingSoon ? 0 : score} 
              className="h-2"
              style={{
                '--progress-foreground': isComingSoon ? '#6b7280' : getScoreColor(color)
              } as React.CSSProperties}
            />
          </div>
          
          {/* Status Badge */}
          <Badge 
            variant="secondary"
            className={`${
              isComingSoon 
                ? 'bg-gray-100 text-gray-600 border-gray-200' 
                : color === 'green' 
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : color === 'amber'
                    ? 'bg-amber-100 text-amber-700 border-amber-200'
                    : 'bg-red-100 text-red-700 border-red-200'
            }`}
          >
            {isComingSoon ? "Coming Soon" : getLevelText(level)}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
