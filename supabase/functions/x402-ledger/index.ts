/**
 * x402-ledger: public, read-only list of settled pay-per-scan payments.
 * Every row links to a Solana transaction anyone can open on a block explorer.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
import { explorerUrl } from "../_shared/x402.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=15",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: CORS });

  const limit = Math.min(Math.max(Number(new URL(req.url).searchParams.get("limit") ?? 100) || 100, 1), 500);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const { data, error } = await db
    .from("x402_payments")
    .select("settled_at, network, payer, tx_signature, amount_atomic, token_address, chain, overall_score, scoring_version, channel")
    .eq("status", "settled")
    .order("settled_at", { ascending: false })
    .limit(limit);
  if (error) return new Response(JSON.stringify({ error: "ledger unavailable" }), { status: 503, headers: CORS });

  const { data: all } = await db.from("x402_payments").select("amount_atomic").eq("status", "settled");
  const totalAtomic = (all ?? []).reduce((sum, r: any) => sum + Number(r.amount_atomic), 0);

  return new Response(
    JSON.stringify({
      totals: { settled_payments: all?.length ?? 0, usdc: totalAtomic / 1e6 },
      payments: (data ?? []).map((r: any) => ({ ...r, usdc: Number(r.amount_atomic) / 1e6, explorer: explorerUrl(r.network, r.tx_signature) })),
    }),
    { headers: CORS },
  );
});
