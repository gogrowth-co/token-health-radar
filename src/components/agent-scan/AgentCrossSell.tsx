import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ArrowRight, X } from "lucide-react";
import { useState } from "react";

interface AgentCrossSellProps {
  tokenAddress?: string;
  chain?: string;
  variant?: "banner" | "card";
}

export default function AgentCrossSell({ tokenAddress, chain, variant = "card" }: AgentCrossSellProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (variant === "banner") {
    return (
      <Alert className="border-primary/20 bg-primary/5 relative">
        <AlertTitle className="text-sm font-semibold flex items-center gap-2">
          🤖 NEW: Agent Trust Score
        </AlertTitle>
        <AlertDescription className="text-xs mt-1">
          Scan the AI agent behind the token — get a trust score across 5 dimensions.{" "}
          <Link to="/agent-scan" className="text-primary font-medium hover:underline inline-flex items-center gap-1">
            Try it now <ArrowRight className="h-3 w-3" />
          </Link>
        </AlertDescription>
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </Alert>
    );
  }

  // Card variant for scan result page
  if (tokenAddress) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-4">
        <div className="flex-1">
          <p className="text-sm font-medium">Want to scan this agent's token?</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get a full token health score for the linked token.
          </p>
        </div>
        <Button size="sm" variant="outline" asChild>
          <Link to={`/scan/${chain || "0x1"}/${tokenAddress}`}>
            Scan Token <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    );
  }

  return null;
}
