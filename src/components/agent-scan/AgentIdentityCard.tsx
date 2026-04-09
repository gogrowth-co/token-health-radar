import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { AgentScanData } from "@/lib/agent-scoring";

interface AgentIdentityCardProps {
  data: AgentScanData;
}

const CHAIN_LABELS: Record<string, { label: string; color: string }> = {
  base: { label: "Base", color: "#0052ff" },
  ethereum: { label: "Ethereum", color: "#627eea" },
  polygon: { label: "Polygon", color: "#8247e5" },
  arbitrum: { label: "Arbitrum", color: "#28a0f0" },
};

export default function AgentIdentityCard({ data }: AgentIdentityCardProps) {
  const { toast } = useToast();
  const chain = CHAIN_LABELS[data.agent.chain] || { label: data.agent.chain, color: "#6b7280" };

  function copyAddress(addr: string) {
    navigator.clipboard.writeText(addr);
    toast({ title: "Copied!", description: addr.slice(0, 20) + "..." });
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
            {data.agent.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-xl truncate">{data.agent.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge style={{ backgroundColor: `${chain.color}22`, color: chain.color }} className="border-0 text-[11px]">
                {chain.label}
              </Badge>
              <span className="text-xs text-muted-foreground">ID: {data.agent.agentId}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.agent.description && (
          <p className="text-sm text-muted-foreground line-clamp-3">{data.agent.description}</p>
        )}

        {data.agent.owner && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">Owner:</span>
            <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-xs">
              {data.agent.owner.slice(0, 6)}...{data.agent.owner.slice(-4)}
            </code>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyAddress(data.agent.owner!)}>
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        )}

        {data.agent.serviceTypes && data.agent.serviceTypes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.agent.serviceTypes.map((type, i) => (
              <Badge key={i} variant="secondary" className="text-[11px]">{type}</Badge>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="text-xs h-7 gap-1" asChild>
            <a href={`https://8004scan.io/agents/${data.agent.chain}/${data.agent.agentId}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3 w-3" /> 8004scan
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
