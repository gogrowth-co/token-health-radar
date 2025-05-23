
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface CategoryScoreCardProps {
  category: string;
  score: number;
  level: string;
  color: string;
  onClick?: () => void;
}

export default function CategoryScoreCard({
  category,
  score,
  level,
  color,
  onClick
}: CategoryScoreCardProps) {
  const getColorClass = () => {
    switch (color) {
      case 'success':
        return 'bg-gradient-to-br from-emerald-400 to-green-500';
      case 'warning':
        return 'bg-gradient-to-br from-amber-400 to-orange-500';
      case 'danger':
        return 'bg-gradient-to-br from-red-400 to-rose-500';
      case 'info':
      default:
        return 'bg-gradient-to-br from-blue-400 to-indigo-500';
    }
  };
  
  const getTextColorClass = () => {
    switch (color) {
      case 'success':
        return 'text-success';
      case 'warning':
        return 'text-warning';
      case 'danger':
        return 'text-danger';
      case 'info':
      default:
        return 'text-info';
    }
  };

  const getLevelText = () => {
    switch (level) {
      case 'high':
        return 'Excellent';
      case 'medium':
        return 'Good';
      case 'low':
        return 'Needs Improvement';
      default:
        return 'Unknown';
    }
  };

  return (
    <Card 
      className="token-score-card cursor-pointer hover:shadow-md hover:scale-105"
      onClick={onClick}
    >
      <div className={`score-gradient-bg ${getColorClass()}`}></div>
      
      <div className="flex flex-col items-center gap-2 p-1">
        <div className={`text-3xl font-bold ${getTextColorClass()}`}>
          {score}
        </div>
        
        <div className="text-sm font-medium capitalize">
          {category}
        </div>
        
        <Progress 
          value={score} 
          className={`h-1.5 w-full ${color === 'success' ? 'bg-green-100 dark:bg-green-900/30' : 
                   color === 'warning' ? 'bg-amber-100 dark:bg-amber-900/30' : 
                   color === 'danger' ? 'bg-red-100 dark:bg-red-900/30' : 
                   'bg-blue-100 dark:bg-blue-900/30'}`}
        />

        <span className={`text-xs ${getTextColorClass()}`}>
          {getLevelText()}
        </span>
      </div>
    </Card>
  );
}
