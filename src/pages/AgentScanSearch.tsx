import { useSearchParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Helmet } from "@/components/ui/helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentSearchInput from "@/components/agent-scan/AgentSearchInput";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Search } from "lucide-react";

interface AgentEntry {
  agentId: string;
  chain: string;
  name: string;
}

export default function AgentScanSearch() {
  const [params] = useSearchParams();
  const query = params.get("q") || "";
  const chain = params.get("chain") || "base";
  const [results, setResults] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const isNumericQuery = /^\d+$/.test(query.trim());

  useEffect(() => {
    async function search() {
      setLoading(true);
      try {
        // Search previously scanned agents in agent_scans table
        // Search by agent_name first
        const { data } = await supabase
          .from("agent_scans")
          .select("agent_id, agent_name, chain, created_at, raw_data")
          .eq("chain", chain)
          .ilike("agent_name", `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(100);

        let rows = data || [];

        // If no results by agent_name, try searching raw_data for the name
        if (rows.length === 0) {
          const { data: fallbackData } = await supabase
            .from("agent_scans")
            .select("agent_id, agent_name, chain, created_at, raw_data")
            .eq("chain", chain)
            .order("created_at", { ascending: false })
            .limit(200);

          if (fallbackData) {
            rows = fallbackData.filter((row) => {
              const rawName = (row.raw_data as any)?.agent?.name;
              return rawName && rawName.toLowerCase().includes(query.toLowerCase());
            });
          }
        }

        // Deduplicate by chain-agent_id, keep most recent
        const seen = new Map<string, AgentEntry>();
        for (const row of rows) {
          const key = `${row.chain}-${row.agent_id}`;
          if (!seen.has(key)) {
            const realName = row.agent_name?.startsWith("Agent #")
              ? (row.raw_data as any)?.agent?.name || row.agent_name
              : row.agent_name;
            seen.set(key, {
              agentId: row.agent_id,
              chain: row.chain,
              name: realName || `Agent #${row.agent_id}`,
            });
          }
        }
        setResults(Array.from(seen.values()).slice(0, 20));
      } catch (err) {
        console.error("Search error:", err);
      }
      setLoading(false);
    }

    if (query && !isNumericQuery) search();
    else setLoading(false);
  }, [query, chain, isNumericQuery]);

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
          {`Results for "${query}" on ${chain}`}
        </h1>

        {/* Direct ID scan CTA */}
        {isNumericQuery && (
          <Link to={`/agent-scan/${chain}/${query.trim()}`} className="block">
            <Card className="border-primary/50 bg-primary/5 hover:bg-primary/10 transition-colors cursor-pointer">
              <CardContent className="py-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">Scan Agent #{query.trim()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Run a trust score scan on agent ID {query.trim()} on {chain}
                  </p>
                </div>
                <Button size="sm">Scan Now</Button>
              </CardContent>
            </Card>
          </Link>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : !isNumericQuery && results.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <p className="text-muted-foreground">No agents found matching "{query}"</p>
            <p className="text-sm text-muted-foreground">
              Try another name, or enter the exact agent ID to scan any agent directly.
            </p>
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
