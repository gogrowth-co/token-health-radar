import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { DimensionScore } from "@/lib/agent-scoring";

interface AgentDimensionCardProps {
  dimension: DimensionScore;
}

export default function AgentDimensionCard({ dimension }: AgentDimensionCardProps) {
  const pct = Math.round((dimension.score / dimension.maxScore) * 100);

  const scoreColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#14b8a6" : pct >= 40 ? "#f59e0b" : pct >= 20 ? "#f97316" : "#ef4444";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{dimension.label}</CardTitle>
          <span className="text-lg font-bold" style={{ color: scoreColor }}>
            {dimension.score}
          </span>
        </div>
        <Progress value={pct} className="h-1.5 mt-1" />
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible>
          <AccordionItem value="checks" className="border-none">
            <AccordionTrigger className="py-1 text-xs text-muted-foreground hover:no-underline">
              {dimension.checks.filter(c => c.passed).length}/{dimension.checks.length} checks passed
            </AccordionTrigger>
            <AccordionContent>
              <ul className="space-y-2 mt-1">
                {dimension.checks.map((check, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    {check.passed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                    ) : check.partial ? (
                      <AlertCircle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="font-medium">{check.name}</span>
                      {check.value != null && (
                        <span className="ml-1 text-muted-foreground">
                          ({String(check.value)})
                        </span>
                      )}
                      {check.priority && !check.passed && (
                        <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0">
                          {check.priority}
                        </Badge>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
