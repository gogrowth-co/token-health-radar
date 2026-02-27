import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "@/components/ui/helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrencyValue } from "@/utils/tokenFormatters";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type AgentToken = Tables<"agent_tokens">;

interface ScoreEntry {
  score: number;
  lastUpdated: string;
}

const CHAIN_MAP: Record<string, { label: string; color: string }> = {
  "0x1": { label: "ETH", color: "#627eea" },
  "0x2105": { label: "BASE", color: "#0052ff" },
  solana: { label: "SOL", color: "#9945ff" },
  "0x38": { label: "BSC", color: "#f0b90b" },
};

const CATEGORY_MAP: Record<string, { label: string; color: string }> = {
  "ai-agent": { label: "AI Agent", color: "#a855f7" },
  "ai-infrastructure": { label: "Infrastructure", color: "#3b82f6" },
  "ai-framework": { label: "Framework", color: "#22c55e" },
  "ai-launchpad": { label: "Launchpad", color: "#f59e0b" },
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "ai-agent", label: "Agents" },
  { key: "ai-framework", label: "Frameworks" },
  { key: "ai-infrastructure", label: "Infrastructure" },
  { key: "ai-launchpad", label: "Launchpads" },
  { key: "scored", label: "🩺 Scored Only" },
] as const;

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function AIAgents() {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [agents, setAgents] = useState<AgentToken[]>([]);
  const [scores, setScores] = useState<Record<string, ScoreEntry>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"mcap" | "score">("mcap");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function load() {
      const { data: agentData } = await supabase
        .from("agent_tokens")
        .select("*")
        .order("display_order", { ascending: true });

      const list = agentData || [];
      setAgents(list);

      const addresses = list
        .filter((a) => a.token_address)
        .map((a) => a.token_address!);

      if (addresses.length > 0) {
        const [secRes, tokRes, liqRes, comRes, devRes] = await Promise.all([
          supabase.from("token_security_cache").select("token_address, chain_id, score, updated_at").in("token_address", addresses),
          supabase.from("token_tokenomics_cache").select("token_address, chain_id, score, updated_at").in("token_address", addresses),
          supabase.from("token_liquidity_cache").select("token_address, chain_id, score, updated_at").in("token_address", addresses),
          supabase.from("token_community_cache").select("token_address, chain_id, score, updated_at").in("token_address", addresses),
          supabase.from("token_development_cache").select("token_address, chain_id, score, updated_at").in("token_address", addresses),
        ]);

        const map: Record<string, { totalScore: number; count: number; latest: string }> = {};

        for (const res of [secRes, tokRes, liqRes, comRes, devRes]) {
          for (const row of res.data || []) {
            if (row.score == null || !row.token_address) continue;
            const key = row.token_address;
            if (!map[key]) map[key] = { totalScore: 0, count: 0, latest: "" };
            map[key].totalScore += row.score;
            map[key].count += 1;
            if (row.updated_at && row.updated_at > map[key].latest) {
              map[key].latest = row.updated_at;
            }
          }
        }

        const scoreMap: Record<string, ScoreEntry> = {};
        for (const [addr, val] of Object.entries(map)) {
          scoreMap[addr] = {
            score: Math.round(val.totalScore / val.count),
            lastUpdated: val.latest,
          };
        }
        setScores(scoreMap);
      }

      setLoading(false);
    }
    load();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    let list = agents;
    if (filter === "scored") {
      list = list.filter((a) => a.token_address && scores[a.token_address]);
    } else if (filter !== "all") {
      list = list.filter((a) => a.category === filter);
    }

    if (sort === "score") {
      return [...list].sort((a, b) => {
        const sa = a.token_address ? scores[a.token_address]?.score : undefined;
        const sb = b.token_address ? scores[b.token_address]?.score : undefined;
        if (sa != null && sb != null) return sb - sa;
        if (sa != null) return -1;
        if (sb != null) return 1;
        return (b.market_cap_usd ?? 0) - (a.market_cap_usd ?? 0);
      });
    }

    return [...list].sort((a, b) => {
      const ma = a.market_cap_usd ?? -1;
      const mb = b.market_cap_usd ?? -1;
      return mb - ma;
    });
  }, [agents, filter, sort, scores]);

  const scannedCount = agents.filter(
    (a) => a.token_address && scores[a.token_address]
  ).length;

  async function handleSyncPrices() {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-agent-tokens', {
        method: 'POST',
      });

      if (error) {
        toast({ title: "Sync failed", description: error.message || "Unknown error", variant: "destructive" });
        return;
      }

      toast({
        title: "Sync complete",
        description: `${data.synced} tokens synced, ${data.new_tokens} new. ${data.errors?.length || 0} errors.`,
      });

      setRefreshKey((k) => k + 1);
    } catch (err: any) {
      toast({ title: "Sync error", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  }

  function handleRowClick(agent: AgentToken) {
    if (!agent.token_address || !agent.chain_id) return;
    navigate(`/scan-result?address=${agent.token_address}&chain=${agent.chain_id}`);
  }

  function scoreColor(s: number) {
    if (s >= 75) return "#10b981";
    if (s >= 50) return "#f59e0b";
    return "#ef4444";
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>AI Agent Tokens Health Scores | Token Health Scan</title>
        <meta
          name="description"
          content="Health scores for top AI agent tokens. Security, liquidity, tokenomics, community and development analysis for VIRTUAL, FET, TAO and more."
        />
        <link rel="canonical" href="https://token-health-radar.lovable.app/ai-agents" />
      </Helmet>

      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-10">
        {/* Hero */}
        <section className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-3">
            AI Agent Tokens
          </h1>
          {!loading && (
            <p className="text-muted-foreground">
              {agents.length} tokens tracked · {scannedCount} health-scored
            </p>
          )}
        </section>

        {/* Admin: Sync Prices */}
        {isAdmin && (
          <div className="flex justify-end mb-4">
            <Button
              size="sm"
              variant="outline"
              disabled={syncing}
              onClick={handleSyncPrices}
              className="gap-2"
            >
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {syncing ? "Syncing…" : "Sync Prices"}
            </Button>
          </div>
        )}

        {/* Filters + Sort */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium border whitespace-nowrap transition-colors",
                  filter === f.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1.5">
            <button
              onClick={() => setSort("mcap")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                sort === "mcap"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              Market Cap ↓
            </button>
            <button
              onClick={() => setSort("score")}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium border transition-colors",
                sort === "score"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/50"
              )}
            >
              Health Score ↓
            </button>
          </div>
        </div>

        {/* Token list */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            No AI agent tokens found
          </p>
        ) : (
          <div className="space-y-2">
            {/* Header row – desktop only */}
            <div className="hidden md:grid grid-cols-[2rem_2.5rem_1fr_5rem_6rem_5rem_6rem_5.5rem_5rem] gap-3 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>#</span>
              <span />
              <span>Name</span>
              <span>Chain</span>
              <span>Category</span>
              <span className="text-right">Price</span>
              <span className="text-right">24h</span>
              <span className="text-right">Mkt Cap</span>
              <span className="text-center">Score</span>
            </div>

            {filtered.map((agent, idx) => {
              const entry = agent.token_address
                ? scores[agent.token_address]
                : undefined;
              const chain = agent.chain_id
                ? CHAIN_MAP[agent.chain_id]
                : undefined;
              const cat = agent.category
                ? CATEGORY_MAP[agent.category]
                : undefined;
              const pct = agent.price_change_24h_pct;

              return (
                <div
                  key={agent.coingecko_id}
                  onClick={() => handleRowClick(agent)}
                  className="grid grid-cols-[2rem_2.5rem_1fr_auto] md:grid-cols-[2rem_2.5rem_1fr_5rem_6rem_5rem_6rem_5.5rem_5rem] gap-3 items-center px-4 py-3 rounded-lg border border-border bg-card hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  {/* Rank */}
                  <span className="text-xs text-muted-foreground font-mono">
                    {idx + 1}
                  </span>

                  {/* Logo */}
                  {agent.image_url ? (
                    <img
                      src={agent.image_url}
                      alt={agent.name}
                      className="w-8 h-8 rounded-full"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{
                        backgroundColor: cat?.color || "#6b7280",
                      }}
                    >
                      {agent.symbol?.charAt(0)}
                    </div>
                  )}

                  {/* Name + symbol (mobile: stacked with price & score) */}
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{agent.name}</p>
                    <p className="text-xs text-muted-foreground">{agent.symbol}</p>
                    {/* Mobile-only inline data */}
                    <div className="flex items-center gap-2 mt-1 md:hidden text-xs">
                      {chain && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${chain.color}22`,
                            color: chain.color,
                          }}
                        >
                          {chain.label}
                        </span>
                      )}
                      {cat && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                          style={{
                            backgroundColor: `${cat.color}22`,
                            color: cat.color,
                          }}
                        >
                          {cat.label}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {agent.current_price_usd != null
                          ? `$${Number(agent.current_price_usd).toFixed(agent.current_price_usd < 1 ? 4 : 2)}`
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Mobile score / scan */}
                  <div className="flex items-center justify-end md:hidden">
                    {entry ? (
                      <ScoreCircle score={entry.score} size={36} />
                    ) : agent.token_address ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(agent);
                        }}
                      >
                        Scan
                      </Button>
                    ) : null}
                  </div>

                  {/* Desktop columns */}
                  {/* Chain */}
                  <div className="hidden md:flex">
                    {chain && (
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-bold"
                        style={{
                          backgroundColor: `${chain.color}22`,
                          color: chain.color,
                        }}
                      >
                        {chain.label}
                      </span>
                    )}
                  </div>

                  {/* Category */}
                  <div className="hidden md:flex">
                    {cat && (
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          backgroundColor: `${cat.color}22`,
                          color: cat.color,
                        }}
                      >
                        {cat.label}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <span className="hidden md:block text-right text-sm">
                    {agent.current_price_usd != null
                      ? `$${Number(agent.current_price_usd).toFixed(
                          agent.current_price_usd < 1 ? 4 : 2
                        )}`
                      : "—"}
                  </span>

                  {/* 24h change */}
                  <span
                    className={cn(
                      "hidden md:block text-right text-sm font-medium",
                      pct != null && pct >= 0 ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {pct != null
                      ? `${pct >= 0 ? "+" : ""}${Number(pct).toFixed(2)}%`
                      : "—"}
                  </span>

                  {/* Market Cap */}
                  <span className="hidden md:block text-right text-sm text-muted-foreground">
                    {agent.market_cap_usd != null
                      ? formatCurrencyValue(Number(agent.market_cap_usd))
                      : "—"}
                  </span>

                  {/* Score */}
                  <div className="hidden md:flex flex-col items-center gap-0.5">
                    {entry ? (
                      <>
                        <ScoreCircle score={entry.score} size={36} />
                        <span className="text-[10px] text-muted-foreground">
                          {relativeTime(entry.lastUpdated)}
                        </span>
                      </>
                    ) : agent.token_address ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRowClick(agent);
                        }}
                      >
                        Scan
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

function ScoreCircle({ score, size = 36 }: { score: number; size?: number }) {
  const color =
    score >= 75 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="hsl(var(--border))"
          strokeWidth={3}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={3}
          fill="transparent"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-xs font-bold"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}
