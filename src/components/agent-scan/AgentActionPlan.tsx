import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { CheckResult } from "@/lib/agent-scoring";

interface AgentActionPlanProps {
  actions: CheckResult[];
}

export default function AgentActionPlan({ actions }: AgentActionPlanProps) {
  if (actions.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-6 flex items-center gap-3 justify-center">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-500">All checks passed — no actions needed!</span>
        </CardContent>
      </Card>
    );
  }

  const priorityColor: Record<string, string> = {
    high: "text-red-500 border-red-500/30",
    medium: "text-amber-500 border-amber-500/30",
    low: "text-muted-foreground border-border",
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Action Plan ({actions.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {actions.slice(0, 8).map((action, i) => (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{action.name}</span>
                  {action.priority && (
                    <Badge variant="outline" className={`text-[10px] px-1 py-0 ${priorityColor[action.priority] || ""}`}>
                      {action.priority}
                    </Badge>
                  )}
                </div>
                {action.recommendation && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    {action.recommendation}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
