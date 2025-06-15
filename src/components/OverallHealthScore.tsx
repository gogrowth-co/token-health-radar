
import { Progress } from "@/components/ui/progress";

interface OverallHealthScoreProps {
  score: number;
}

export default function OverallHealthScore({ score }: OverallHealthScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const getScoreLevel = (score: number) => {
    if (score >= 70) return "Excellent";
    if (score >= 40) return "Good";
    return "Needs Improvement";
  };

  const getProgressColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-24 h-24">
        {/* Background circle */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="transparent"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke={score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444"}
            strokeWidth="6"
            fill="transparent"
            strokeDasharray={`${score * 2.51} 251`}
            strokeLinecap="round"
          />
        </svg>
        
        {/* Score text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold ${getScoreColor(score)}`}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      
      <div className="text-center">
        <div className="text-sm font-medium text-muted-foreground">Health Score</div>
        <div className={`text-sm font-semibold ${getScoreColor(score)}`}>
          {getScoreLevel(score)}
        </div>
      </div>
    </div>
  );
}
