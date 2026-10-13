/**
 * x402-onchain: what Monad itself says about Token Health Scan, read through Envio HyperSync.
 *
 *   GET /functions/v1/x402-onchain
 *
 * Two HyperSync queries over the full history since the agent was registered (a public RPC refuses
 * eth_getLogs over this range):
 *   1. Every ERC-8004 NewFeedback event for agent #10387, decoded, with the payment tx each rating links to.
 *   2. Every USDC Transfer into the agent wallet (the x402 payee).
 * Then it reconciles our own ledger against the chain: every settled Monad payment in x402_payments must
 * appear onchain as a Transfer of the same amount from the same payer to the payee.
 *
 * Public, read-only. The HyperSync token stays server-side (ENVIO_API_TOKEN).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
import { decodeAbiParameters, keccak256, toHex } from "https://esm.sh/viem@2.21.0";

const HYPERSYNC = "https://monad.hypersync.xyz/query";
const REPUTATION = "0x8004baa17c55a88189ae136b182e5fda19de9b63";
const USDC = "0x754704bc059f8c67012fed69bc8a327a5aafb603";
const AGENT_ID = 10387n;
const FROM_BLOCK = 112_929_000; // just before the agent was registered (block 112930xxx)

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=20",
};

const pad32 = (hex: string) => "0x" + hex.replace(/^0x/, "").toLowerCase().padStart(64, "0");
const NEW_FEEDBACK = keccak256(toHex("NewFeedback(uint256,address,uint64,int128,uint8,string,string,string,string,string,bytes32)"));
const TRANSFER = keccak256(toHex("Transfer(address,address,uint256)"));

type Log = { block_number: number; transaction_hash: string; log_index: number; topic1?: string; topic2?: string; data: string };

/** Follows next_block until HyperSync reaches its archive height. */
async function hypersync(token: string, logFilter: Record<string, unknown>) {
  const logs: Log[] = [];
  const time = new Map<number, number>();
  let from = FROM_BLOCK, height = 0;
  for (let page = 0; page < 20; page++) {
    const res = await fetch(HYPERSYNC, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        from_block: from,
        logs: [logFilter],
        field_selection: {
          log: ["block_number", "transaction_hash", "log_index", "topic1", "topic2", "data"],
          block: ["number", "timestamp"],
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`hypersync HTTP ${res.status}`);
    const body = await res.json();
    for (const batch of body.data ?? []) {
      for (const l of batch.logs ?? []) logs.push(l);
      for (const b of batch.blocks ?? []) time.set(Number(b.number), Number(b.timestamp));
    }
    height = body.archive_height;
    if (!body.next_block || body.next_block > height) break;
    from = body.next_block;
  }
  return { logs, time, height };
}

const iso = (t?: number) => (t ? new Date(t * 1000).toISOString() : null);
const addr = (topic?: string) => (topic ? "0x" + topic.slice(-40) : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const token = Deno.env.get("ENVIO_API_TOKEN");
  if (!token) return new Response(JSON.stringify({ error: "not configured" }), { status: 503, headers: CORS });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: payee } = await db.from("x402_payments").select("pay_to").eq("network", "eip155:143").limit(1).maybeSingle();
  const PAYEE = (payee?.pay_to ?? Deno.env.get("X402_PAYEE_MONAD") ?? "").toLowerCase();

  try {
    const [fb, tr, ledgerRes] = await Promise.all([
      hypersync(token, { address: [REPUTATION], topics: [[NEW_FEEDBACK], [pad32(AGENT_ID.toString(16))]] }),
      hypersync(token, { address: [USDC], topics: [[TRANSFER], [], [pad32(PAYEE)]] }),
      db.from("x402_payments").select("tx_signature, payer, amount_atomic, token_symbol, chain, settled_at")
        .eq("status", "settled").eq("network", "eip155:143"),
    ]);

    const feedback = fb.logs.map((l) => {
      const [index, value, decimals, tag1, tag2, endpoint, feedbackURI, feedbackHash] = decodeAbiParameters(
        [{ type: "uint64" }, { type: "int128" }, { type: "uint8" }, { type: "string" }, { type: "string" },
         { type: "string" }, { type: "string" }, { type: "bytes32" }],
        l.data as `0x${string}`,
      );
      const paymentTx = (String(feedbackURI).match(/0x[0-9a-fA-F]{64}/) ?? [])[0] ?? null;
      return {
        block: l.block_number, at: iso(fb.time.get(l.block_number)), tx: l.transaction_hash,
        client: addr(l.topic2), index: Number(index), value: Number(value) / 10 ** Number(decimals),
        tag1, tag2, endpoint, feedbackURI, feedbackHash, payment_tx: paymentTx,
      };
    });

    const transfers = tr.logs.map((l) => ({
      block: l.block_number, at: iso(tr.time.get(l.block_number)), tx: l.transaction_hash,
      from: addr(l.topic1), amount_atomic: BigInt(l.data).toString(),
    }));

    // Reconcile our ledger against the chain.
    const byTx = new Map(transfers.map((t) => [t.tx.toLowerCase(), t]));
    const ledger = ledgerRes.data ?? [];
    const rows = ledger.map((r) => {
      const t = byTx.get(String(r.tx_signature).toLowerCase());
      const ok = !!t && t.amount_atomic === String(r.amount_atomic) && (!r.payer || t.from === String(r.payer).toLowerCase());
      return { tx: r.tx_signature, token: r.token_symbol, chain: r.chain, onchain: !!t, matches: ok };
    });
    const ledgerTx = new Set(ledger.map((r) => String(r.tx_signature).toLowerCase()));
    const paidTx = new Set(transfers.map((t) => t.tx.toLowerCase()));

    return new Response(JSON.stringify({
      source: "Envio HyperSync (monad.hypersync.xyz)",
      agent_id: Number(AGENT_ID),
      payee: PAYEE,
      scanned: { from_block: FROM_BLOCK, to_block: Math.max(fb.height, tr.height) },
      reconciliation: {
        ledger_payments: rows.length,
        found_onchain: rows.filter((r) => r.onchain).length,
        matching: rows.filter((r) => r.matches).length,
        onchain_not_in_ledger: transfers.filter((t) => !ledgerTx.has(t.tx.toLowerCase())).length,
        rows,
      },
      feedback: feedback.map((f) => ({ ...f, payment_verified: !!f.payment_tx && paidTx.has(f.payment_tx.toLowerCase()) })),
      transfers,
    }), { headers: CORS });
  } catch (e) {
    return new Response(JSON.stringify({ error: "onchain read failed", detail: (e as Error).message }), { status: 502, headers: CORS });
  }
});
