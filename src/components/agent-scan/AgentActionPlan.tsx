import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import type { CheckResult } from "@/lib/agent-scoring";

interface AgentActionPlanProps {
  actions: CheckResult[];
}

const PRIORITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  high: { bg: "bg-red-500/15", text: "text-red-600 dark:text-red-400", border: "border-red-500/30" },
  medium: { bg: "bg-amber-500/15", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30" },
  low: { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" },
};

export default function AgentActionPlan({ actions }: AgentActionPlanProps) {
  if (actions.length === 0) {
    return (
      <Card className="border-green-500/30 bg-green-500/5 rounded-xl">
        <CardContent className="py-6 flex items-center gap-3 justify-center">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-sm font-medium text-green-500">All checks passed — no actions needed!</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card rounded-xl hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Action Plan ({actions.length} items)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {actions.slice(0, 8).map((action, i) => {
            const priority = action.priority || "low";
            const styles = PRIORITY_STYLES[priority] || PRIORITY_STYLES.low;
            return (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{action.name}</span>
                    {action.priority && (
                      <Badge className={`text-[10px] px-1.5 py-0 border ${styles.bg} ${styles.text} ${styles.border}`}>
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
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
