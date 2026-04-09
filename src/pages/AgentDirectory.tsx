import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "@/components/ui/helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentSearchInput from "@/components/agent-scan/AgentSearchInput";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface AgentEntry {
  agentId: string;
  chain: string;
  name: string;
  description?: string;
  serviceTypes?: string[];
}

export default function AgentDirectory() {
  const [params, setParams] = useSearchParams();
  const chain = params.get("chain") || "base";
  const page = parseInt(params.get("page") || "1");

  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await supabase.functions.invoke("fetch-agent-directory", {
          method: "POST",
          body: {},
        });

        // The edge function is GET-based, but invoke sends POST. 
        // Handle both response shapes.
        if (data?.agents) {
          setAgents(data.agents);
          setTotal(data.total || data.agents.length);
          setTotalPages(data.totalPages || 1);
        }
      } catch (err) {
        console.error("Directory fetch error:", err);
      }
      setLoading(false);
    }
    load();
  }, [chain, page]);

  function setChain(newChain: string) {
    setParams({ chain: newChain, page: "1" });
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>AI Agent Trust Directory — ERC-8004 Agent Rankings | Token Health Scan</title>
        <meta name="description" content="Browse and scan ERC-8004 AI agents. View trust scores and rankings across the agent registry." />
        <link rel="canonical" href="https://token-health-radar.lovable.app/agent-directory" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "AI Agent Trust Directory",
          description: "ERC-8004 AI Agent rankings by trust score",
          url: "https://token-health-radar.lovable.app/agent-directory",
        })}</script>
      </Helmet>

      <Navbar />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">AI Agent Directory</h1>
          <p className="text-muted-foreground text-sm">Browse ERC-8004 registered agents and scan for trust scores</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="max-w-sm flex-1">
            <AgentSearchInput />
          </div>
          <Select value={chain} onValueChange={setChain}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Chain" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="base">Base</SelectItem>
              <SelectItem value="ethereum">Ethereum</SelectItem>
              <SelectItem value="polygon">Polygon</SelectItem>
              <SelectItem value="arbitrum">Arbitrum</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agent list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground">No agents found for this chain.</p>
            <a
              href="https://8004scan.io/agents"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Browse on 8004scan.io →
            </a>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {agents.map((agent, i) => (
                <Link
                  key={`${agent.chain}-${agent.agentId}`}
                  to={`/agent-scan/${agent.chain}/${agent.agentId}`}
                  className="block"
                >
                  <Card className="border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer">
                    <CardContent className="py-4 flex items-center gap-4">
                      <span className="text-xs text-muted-foreground font-mono w-6 text-right">
                        {(page - 1) * 20 + i + 1}
                      </span>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {agent.name?.charAt(0) || "#"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{agent.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">{agent.chain}</Badge>
                          <span className="text-xs text-muted-foreground">ID: {agent.agentId}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs h-7 shrink-0">
                        Scan
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setParams({ chain, page: String(page - 1) })}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground flex items-center px-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setParams({ chain, page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
