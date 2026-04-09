import { useSearchParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "@/components/ui/helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentSearchInput from "@/components/agent-scan/AgentSearchInput";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface AgentEntry {
  agentId: string;
  chain: string;
  name: string;
  description?: string;
  serviceTypes?: string[];
}

export default function AgentScanSearch() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const chain = params.get("chain") || "base";
  const [results, setResults] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function search() {
      setLoading(true);
      try {
        // Search agent_directory_cache
        const { data } = await supabase
          .from("agent_directory_cache")
          .select("agents_data")
          .eq("chain_filter", chain)
          .limit(1)
          .single();

        if (data?.agents_data) {
          const agents = (data.agents_data as AgentEntry[]).filter(a =>
            a.name?.toLowerCase().includes(query.toLowerCase()) ||
            a.agentId?.toString().includes(query)
          );
          setResults(agents.slice(0, 20));
        } else {
          // Try fetching from edge function
          const { data: dirData } = await supabase.functions.invoke("fetch-agent-directory", {
            method: "POST",
            body: {},
          });
          if (dirData?.agents) {
            const agents = dirData.agents.filter((a: AgentEntry) =>
              a.name?.toLowerCase().includes(query.toLowerCase()) ||
              a.agentId?.toString().includes(query)
            );
            setResults(agents.slice(0, 20));
          }
        }
      } catch (err) {
        console.error("Search error:", err);
      }
      setLoading(false);
    }

    if (query) search();
    else setLoading(false);
  }, [query, chain]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>Agent Search Results | Token Health Scan</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="max-w-xl mx-auto">
          <AgentSearchInput />
        </div>

        <h1 className="text-xl font-bold">
          Results for "{query}" on {chain}
        </h1>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground">No agents found matching "{query}"</p>
            <a
              href={`https://8004scan.io/agents?chain=${chain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Browse agents on 8004scan.io →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map(agent => (
              <Link
                key={`${agent.chain}-${agent.agentId}`}
                to={`/agent-scan/${agent.chain}/${agent.agentId}`}
                className="block"
              >
                <Card className="border-border bg-card hover:bg-accent/40 transition-colors cursor-pointer">
                  <CardContent className="py-4 flex items-center gap-4">
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
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
