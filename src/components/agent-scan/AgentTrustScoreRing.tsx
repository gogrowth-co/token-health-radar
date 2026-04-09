import { useMemo } from "react";

interface AgentTrustScoreRingProps {
  score: number;
  color: string;
  label: string;
  size?: number;
}

export default function AgentTrustScoreRing({ score, color, label, size = 200 }: AgentTrustScoreRingProps) {
  const { circumference, offset, strokeWidth, radius } = useMemo(() => {
    const sw = size > 140 ? 12 : 6;
    const r = (size - sw * 2) / 2;
    const c = 2 * Math.PI * r;
    const o = c - (score / 100) * c;
    return { circumference: c, offset: o, strokeWidth: sw, radius: r };
  }, [score, size]);

  const center = size / 2;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={strokeWidth}
          />
          {/* Score ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
          />
        </svg>
        {/* Score text overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/100</span>
        </div>
      </div>
      <span
        className="text-sm font-semibold px-3 py-1 rounded-full"
        style={{ color, backgroundColor: `${color}18` }}
      >
        {label}
      </span>
    </div>
  );
}
