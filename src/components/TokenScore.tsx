
interface TokenScoreProps {
  score?: number;
}

export default function TokenScore({ score }: TokenScoreProps) {
  if (score === undefined) return null;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "#10b981"; // green
    if (score >= 40) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  return (
    <div className="relative w-16 h-16">
      {/* Background circle */}
      <svg className="absolute inset-0 w-full h-full -rotate-90 transform">
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke="#e5e7eb"
          strokeWidth="4"
          fill="transparent"
        />
        <circle
          cx="32"
          cy="32"
          r="28"
          stroke={getScoreColor(score)}
          strokeWidth="4"
          fill="transparent"
          strokeDasharray={`${score * 1.76} 176`}
          strokeLinecap="round"
        />
      </svg>
      
      {/* Score text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold">{score}</span>
      </div>
    </div>
  );
}
