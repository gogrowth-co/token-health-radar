/**
 * x402-scan: pay-per-call token health scan. USDC on Solana, no account, no API key.
 *
 *   GET|POST /functions/v1/x402-scan?chain=solana&address=<token>
 *   1. No PAYMENT-SIGNATURE header -> 402 + PAYMENT-REQUIRED (base64 PaymentRequired)
 *   2. Client signs, retries with PAYMENT-SIGNATURE -> verify, scan, settle -> 200 + PAYMENT-RESPONSE
 */
import { executePaidScan } from "../_shared/paidScan.ts";
import { decodeHeader, encodeHeader, type PaymentPayload } from "../_shared/x402.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, payment-signature",
  "Access-Control-Expose-Headers": "PAYMENT-REQUIRED, PAYMENT-RESPONSE",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  let address = url.searchParams.get("address") ?? "";
  let chain = url.searchParams.get("chain") ?? "";
  if (req.method === "POST") {
    const body = await req.json().catch(() => ({}));
    address = body.address ?? address;
    chain = body.chain ?? chain;
  }

  const header = req.headers.get("payment-signature");
  let payment: PaymentPayload | null = null;
  if (header) {
    payment = decodeHeader<PaymentPayload>(header);
    if (!payment) return json({ error: "PAYMENT-SIGNATURE is not valid base64 JSON" }, 400);
  }

  const resourceUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/x402-scan?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address)}`;
  const outcome = await executePaidScan({
    payment,
    channel: "http",
    input: { address, chain },
    resource: {
      url: resourceUrl,
      description: "Token Health Scan: 0-100 health score across security, liquidity, tokenomics, community and development",
      mimeType: "application/json",
      serviceName: "Token Health Scan",
      tags: ["token-risk", "security", "solana"],
    },
  });

  switch (outcome.kind) {
    case "invalid_input":
      return json({ error: outcome.message }, 400);
    case "not_configured":
      return json({ error: "x402 payments are not configured on this deployment" }, 503);
    case "facilitator_down":
    case "ledger_error":
      return json({ error: "Payment service unavailable, try again shortly", detail: outcome.message }, 503);
    case "payment_required":
      return json(outcome.required, 402, { "PAYMENT-REQUIRED": encodeHeader(outcome.required) });
    case "scan_failed":
      return json({ error: "Scan failed. You were not charged.", detail: outcome.message }, 502);
    case "ok":
      return json(
        { ...outcome.result, payment: { transaction: outcome.settle.transaction, network: outcome.settle.network, payer: outcome.settle.payer, explorer: outcome.explorer } },
        200,
        { "PAYMENT-RESPONSE": encodeHeader(outcome.settle) },
      );
  }
});
