import { Skeleton } from "@/components/ui/skeleton";

const STEPS = [
  "Fetching agent identity...",
  "Checking onchain registry...",
  "Searching marketplace data...",
  "Pinging service endpoints...",
  "Calculating trust score...",
];

interface AgentScanLoadingProps {
  currentStep?: number;
}

export default function AgentScanLoading({ currentStep = 0 }: AgentScanLoadingProps) {
  return (
    <div className="max-w-md mx-auto py-20 space-y-6 text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
        <span className="text-2xl">🔍</span>
      </div>
      <div className="space-y-3">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center gap-3 justify-center text-sm">
            {i < currentStep ? (
              <span className="text-green-500">✓</span>
            ) : i === currentStep ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <span className="text-muted-foreground/40">○</span>
            )}
            <span className={i <= currentStep ? "text-foreground" : "text-muted-foreground/40"}>
              {step}
            </span>
          </div>
        ))}
      </div>
      <div className="space-y-2 pt-4">
        <Skeleton className="h-4 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
    </div>
  );
}
