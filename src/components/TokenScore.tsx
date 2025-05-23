
interface TokenScoreProps {
  score?: number;
}

export default function TokenScore({ score }: TokenScoreProps) {
  if (score === undefined) return null;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#FFC107"; // amber-500
    if (score >= 40) return "#FF9800"; // orange-500
    return "#F44336"; // red-500
  };

  return (
    <div className="relative w-20 h-20">
      {/* Score progress arc */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
        <circle
          cx="40"
          cy="40"
          r="36"
          stroke={getScoreColor(score)}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={`${score * 2.26} 226`}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center font-bold text-3xl">
        {score}
      </div>
    </div>
  );
}
