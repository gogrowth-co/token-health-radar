/**
 * partner-scan: the same scan x402-scan sells, for a reseller that bills its own customers (Apify Store).
 * Auth is a per-partner secret in the x-partner-key header (secret THS_PARTNER_KEY_APIFY). No USDC moves here
 * and nothing is written to the public x402 ledger: the partner charges per scored scan on its own platform.
 *
 *   POST /functions/v1/partner-scan  {"chain":"base","address":"0x..."}   header x-partner-key: <secret>
 *   200 scored result · 422 not scored (partner must not charge) · 400 bad input · 401 bad key · 502 scan failed
 */
import { normalizeScanInput, runScan } from "../_shared/paidScan.ts";
import { sha256Hex } from "../_shared/x402.ts";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

/** Partners keyed by name; the key itself is only ever compared as a SHA-256 digest. */
async function partnerFor(key: string | null): Promise<string | null> {
  if (!key) return null;
  const digest = await sha256Hex(key);
  for (const [name, env] of [["apify", "THS_PARTNER_KEY_APIFY"]] as const) {
    const expected = Deno.env.get(env);
    if (expected && expected.length >= 32 && (await sha256Hex(expected)) === digest) return name;
  }
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const partner = await partnerFor(req.headers.get("x-partner-key"));
  if (!partner) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({}));
  const norm = normalizeScanInput({ address: body.address, chain: body.chain });
  if ("error" in norm) return json({ error: norm.error }, 400);

  try {
    const result = await runScan(norm.address, norm.chainName, norm.chainId);
    console.log(`[partner-scan] ${partner} ${norm.chainName}:${norm.address} overall=${result.overall_score}`);
    if (typeof result.overall_score !== "number") {
      return json({ error: "Not scored: not enough verified data for a verdict.", partial: result }, 422);
    }
    return json(result);
  } catch (e) {
    return json({ error: "Scan failed", detail: (e as Error).message }, 502);
  }
});
