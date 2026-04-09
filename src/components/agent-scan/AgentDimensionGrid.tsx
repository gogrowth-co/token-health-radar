import AgentDimensionCard from "./AgentDimensionCard";
import type { DimensionScore } from "@/lib/agent-scoring";

interface AgentDimensionGridProps {
  dimensions: DimensionScore[];
}

export default function AgentDimensionGrid({ dimensions }: AgentDimensionGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {dimensions.map((dim) => (
        <AgentDimensionCard key={dim.key} dimension={dim} />
      ))}
    </div>
  );
}
