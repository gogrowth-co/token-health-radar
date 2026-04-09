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
    const { chain, agentId } = await req.json();

    if (!chain || !agentId) {
      return new Response(
        JSON.stringify({ error: "chain and agentId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[scan-agent] Scanning agent ${agentId} on ${chain}`);

    // Step 1: Check cache (6 hour TTL)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: cached } = await supabase
      .from("agent_scans")
      .select("*")
      .eq("chain", chain)
      .eq("agent_id", agentId)
      .gte("created_at", sixHoursAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (cached) {
      console.log(`[scan-agent] Cache hit for ${agentId}`);
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Fetch from 8004scan.io
    let agentData: any = null;
    let onchainData: any = {
      isRegistered: false,
      hasOwner: false,
      hasDescription: false,
      hasServiceEndpoints: false,
      endpointCount: 0,
      hasMetadata: false,
      registryVerified: false,
      serviceTypes: [],
    };

    try {
      const url = `https://8004scan.io/agents/${chain}/${agentId}`;
      console.log(`[scan-agent] Fetching ${url}`);
      const res = await fetch(url, {
        headers: { "User-Agent": "TokenHealthScan/1.0" },
      });

      if (res.ok) {
        const html = await res.text();

        console.log(`[scan-agent] HTML preview: ${html.substring(0, 500)}`);
        console.log(`[scan-agent] Title match: ${html.match(/<title>([^|<]+)\|/i)}`);

        // Parse agent data from HTML
        // Priority 1: <title> tag (works on SPA pre-rendered pages like "Clawdia | 8004scan")
        const titleMatch = html.match(/<title>([^|<]+)\|/i);
        const nameMatch = titleMatch ||
          html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
          html.match(/agent[_-]?name["']?\s*[:=]\s*["']([^"']+)/i);
        const ownerMatch = html.match(/owner["']?\s*[:=]\s*["'](0x[a-fA-F0-9]+)/i) ||
          html.match(/owner[^>]*>(0x[a-fA-F0-9]{6,})/i);
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)/i) ||
          html.match(/description["']?\s*[:=]\s*["']([^"']{10,})/i) ||
          html.match(/<p[^>]*class="[^"]*description[^"]*"[^>]*>([^<]+)/i);
        const serviceMatch = html.match(/service[_-]?type[s]?["']?\s*[:=]\s*["']?(\[[^\]]+\]|[^"',\n]+)/i);
        const endpointMatches = html.match(/https?:\/\/[^\s"'<>]+\/api[^\s"'<>]*/gi) || [];
        const tokenMatch = html.match(/token[_-]?address["']?\s*[:=]\s*["'](0x[a-fA-F0-9]+)/i);
        const registrationMatch = html.match(/registered|registration/i);

        const agentName = nameMatch ? nameMatch[1].trim() : `Agent #${agentId}`;
        const owner = ownerMatch ? ownerMatch[1] : undefined;
        const description = descMatch ? descMatch[1].trim() : undefined;
        const serviceTypes: string[] = [];

        if (serviceMatch) {
          try {
            const parsed = JSON.parse(serviceMatch[1]);
            if (Array.isArray(parsed)) serviceTypes.push(...parsed);
          } catch {
            serviceTypes.push(serviceMatch[1].trim());
          }
        }

        // Unique endpoints (max 3)
        const endpoints = [...new Set(endpointMatches)].slice(0, 3);

        agentData = {
          name: agentName,
          agentId,
          chain,
          owner,
          description,
          serviceTypes,
          tokenAddress: tokenMatch ? tokenMatch[1] : undefined,
        };

        onchainData = {
          isRegistered: !!registrationMatch || true, // if page exists, it's registered
          hasOwner: !!owner,
          hasDescription: !!description && description.length > 0,
          hasServiceEndpoints: endpoints.length > 0,
          endpointCount: endpoints.length,
          hasMetadata: !!description || serviceTypes.length > 0,
          registryVerified: html.includes("verified") || html.includes("Verified"),
          serviceTypes,
        };

        // Store endpoints for health check
        agentData._endpoints = endpoints;
      } else {
        console.warn(`[scan-agent] 8004scan returned ${res.status}`);
      }
    } catch (err) {
      console.error(`[scan-agent] Error fetching 8004scan:`, err);
    }

    if (!agentData) {
      agentData = {
        name: `Agent #${agentId}`,
        agentId,
        chain,
      };
    }

    // Step 3: Search toku.agency (graceful failure)
    let offchainData: any = null;
    try {
      const tokuRes = await fetch(
        `https://www.toku.agency/api/agents?q=${encodeURIComponent(agentData.name)}`,
        {
          headers: { "User-Agent": "TokenHealthScan/1.0" },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (tokuRes.ok) {
        const tokuData = await tokuRes.json();
        const agent = Array.isArray(tokuData) ? tokuData[0] : tokuData?.results?.[0];
        if (agent) {
          offchainData = {
            tokuListed: true,
            tokuRating: agent.rating ?? null,
            tokuJobCount: agent.jobs_count ?? agent.jobCount ?? 0,
            tokuServices: agent.services ?? [],
            websiteReachable: null,
            socialPresence: !!(agent.website || agent.twitter || agent.github),
            documentationUrl: agent.docs_url ?? agent.documentation ?? null,
          };
        }
      }
    } catch (err) {
      console.warn(`[scan-agent] toku.agency lookup failed:`, err);
    }

    if (!offchainData) {
      offchainData = {
        tokuListed: false,
        tokuRating: null,
        tokuJobCount: 0,
        tokuServices: [],
        websiteReachable: null,
        socialPresence: false,
        documentationUrl: null,
      };
    }

    // Step 4: Endpoint health pings
    const endpointUrls: string[] = agentData._endpoints || [];
    const endpointResults = await Promise.all(
      endpointUrls.slice(0, 3).map(async (url: string) => {
        try {
          const start = Date.now();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 5000);
          const res = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
          });
          clearTimeout(timeout);
          return {
            url,
            isReachable: res.ok || res.status < 500,
            responseTimeMs: Date.now() - start,
            statusCode: res.status,
          };
        } catch {
          return { url, isReachable: false, responseTimeMs: undefined, statusCode: undefined };
        }
      })
    );

    const reachableEndpoints = endpointResults.filter(e => e.isReachable);
    const avgResponseTime = reachableEndpoints.length > 0
      ? Math.round(reachableEndpoints.reduce((s, e) => s + (e.responseTimeMs || 0), 0) / reachableEndpoints.length)
      : undefined;

    // Clean up internal fields
    delete agentData._endpoints;

    const result = {
      agent: agentData,
      onchainData,
      offchainData,
      endpointHealth: {
        endpoints: endpointResults,
        avgResponseTime,
        allReachable: endpointResults.length > 0 && endpointResults.every(e => e.isReachable),
      },
      metadata: {
        fetchedAt: new Date().toISOString(),
        source: "8004scan.io",
      },
    };

    // Save to cache
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    if (authHeader) {
      try {
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);
        userId = user?.id || null;
      } catch {}
    }

    await supabase.from("agent_scans").insert({
      chain,
      agent_id: agentId,
      agent_name: agentData.name,
      raw_data: result,
      scores: null, // scores calculated client-side
      user_id: userId,
    });

    console.log(`[scan-agent] Scan complete for ${agentData.name}`);

    return new Response(JSON.stringify({ raw_data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[scan-agent] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
