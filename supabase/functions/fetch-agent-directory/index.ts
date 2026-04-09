import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const url = new URL(req.url);
    const chain = url.searchParams.get("chain") || "base";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = 20;

    console.log(`[fetch-agent-directory] chain=${chain} page=${page}`);

    // Check cache (24 hour TTL)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("agent_directory_cache")
      .select("*")
      .eq("chain_filter", chain)
      .gte("updated_at", twentyFourHoursAgo)
      .order("updated_at", { ascending: false })
      .limit(1)
      .single();

    let agents: any[] = [];

    if (cached?.agents_data) {
      console.log(`[fetch-agent-directory] Cache hit`);
      agents = cached.agents_data as any[];
    } else {
      // Fetch from 8004scan.io
      try {
        const res = await fetch(`https://8004scan.io/agents?chain=${chain}`, {
          headers: { "User-Agent": "TokenHealthScan/1.0" },
          signal: AbortSignal.timeout(10000),
        });

        if (res.ok) {
          const html = await res.text();

          // Parse agent cards from HTML
          // Look for patterns like agent links, IDs, names
          const agentPattern = /\/agents\/([^/]+)\/(\d+)[^>]*>([^<]*)/gi;
          let match;
          const seen = new Set<string>();

          while ((match = agentPattern.exec(html)) !== null) {
            const [, agentChain, id, name] = match;
            const key = `${agentChain}-${id}`;
            if (!seen.has(key) && name.trim()) {
              seen.add(key);
              agents.push({
                agentId: id,
                chain: agentChain,
                name: name.trim(),
              });
            }
          }

          // Fallback: try JSON in page
          if (agents.length === 0) {
            const jsonMatch = html.match(/agents['"]\s*:\s*(\[[\s\S]*?\])/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[1]);
                agents = parsed.map((a: any) => ({
                  agentId: a.id || a.agentId,
                  chain: a.chain || chain,
                  name: a.name || `Agent #${a.id}`,
                  description: a.description,
                  serviceTypes: a.serviceTypes || a.service_types || [],
                  owner: a.owner,
                }));
              } catch {}
            }
          }

          // Cache results
          if (agents.length > 0) {
            await supabase.from("agent_directory_cache").upsert(
              {
                chain_filter: chain,
                agents_data: agents,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "chain_filter" }
            ).then(res => {
              // If upsert fails (no unique constraint), just insert
              if (res.error) {
                return supabase.from("agent_directory_cache").insert({
                  chain_filter: chain,
                  agents_data: agents,
                  updated_at: new Date().toISOString(),
                });
              }
            });
          }
        }
      } catch (err) {
        console.error(`[fetch-agent-directory] Fetch error:`, err);
      }
    }

    // Paginate
    const total = agents.length;
    const start = (page - 1) * pageSize;
    const paged = agents.slice(start, start + pageSize);

    return new Response(
      JSON.stringify({
        agents: paged,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[fetch-agent-directory] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
