/**
 * Pay-per-scan flow shared by the HTTP endpoint (x402-scan) and the MCP tool (token-health-mcp).
 *
 * Order follows the x402 "authorization" flow: verify (read-only) -> run the scan -> settle.
 * USDC only moves after the scan succeeded. A payment that fails verification or a scan that
 * fails never reaches /settle, so the payer is not charged for a result they did not get.
 *
 * The 402 offers one quote per configured rail (Solana and/or Monad); the payer picks one and the
 * verify/settle calls go to that rail's facilitator.
 *
 * Every attempt is written to public.x402_payments. payload_hash is unique, so a signed
 * payment can buy exactly one scan.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
import {
  buildPaymentRequired,
  buildRequirements,
  explorerUrl,
  isEvm,
  loadX402Config,
  matchesRequirements,
  probeRail,
  settlePayment,
  sha256Hex,
  verifyPayment,
  type PaymentPayload,
  type PaymentRequired,
  type PaymentRequirements,
  type Rail,
  type ResourceInfo,
  type SettleResponse,
  type X402Config,
} from "./x402.ts";

const CHAIN_IDS: Record<string, string> = {
  ethereum: "0x1", eth: "0x1",
  polygon: "0x89", matic: "0x89",
  bsc: "0x38", bnb: "0x38",
  arbitrum: "0xa4b1",
  base: "0x2105",
  solana: "solana", sol: "solana",
};

export const SUPPORTED_CHAINS = ["ethereum", "bsc", "polygon", "arbitrum", "base", "solana"];

export interface ScanInput {
  address: string;
  chain: string;
}

export function normalizeScanInput(input: ScanInput): { address: string; chainName: string; chainId: string } | { error: string } {
  const chainName = String(input.chain ?? "").toLowerCase().trim();
  const chainId = CHAIN_IDS[chainName];
  if (!chainId) return { error: `Unsupported chain. Use one of: ${SUPPORTED_CHAINS.join(", ")}` };
  const raw = String(input.address ?? "").trim();
  if (chainId === "solana") {
    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(raw)) return { error: "Invalid Solana address (expected base58, 32-44 chars)" };
    return { address: raw, chainName: "solana", chainId };
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return { error: "Invalid EVM address (expected 0x + 40 hex chars)" };
  return { address: raw.toLowerCase(), chainName, chainId };
}

export interface ScanResult {
  name: string | null;
  symbol: string | null;
  address: string;
  chain: string;
  overall_score: number | null;
  overall_reason: string | null;
  scores: Record<string, number | null>;
  scoring_version: string | null;
  verdict: string;
  scan_duration_ms: number;
  /** Why each dimension scored what it did: the inputs used (value, points, max) and the inputs left out. */
  evidence: ScanEvidence | null;
}

export interface ScanEvidence {
  completeness_pct: number | null;
  dimensions: Record<string, {
    score: number | null;
    status: string;
    reason?: string;
    inputs_used: Record<string, { value: unknown; points: number; max: number }>;
    inputs_excluded: Record<string, string>;
  }>;
}

/**
 * run-token-scan stores the full score breakdown in token_scans in the same transaction as the scan, so the evidence
 * is read back from there (by scan_id, else the latest row for the token). Never fails the paid scan: null on error.
 */
async function loadEvidence(scanId: string | null, address: string, chainId: string): Promise<ScanEvidence | null> {
  try {
    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let query = db.from("token_scans").select("dimension_scores, completeness_pct");
    query = scanId
      ? query.eq("id", scanId)
      : query.eq("token_address", address).eq("chain_id", chainId).order("scanned_at", { ascending: false });
    const { data } = await query.limit(1).maybeSingle();
    const dims = (data?.dimension_scores as any)?.dimensions;
    if (!dims) return null;
    return { completeness_pct: data?.completeness_pct ?? null, dimensions: dims };
  } catch {
    return null;
  }
}

function verdictFor(scores: Record<string, number | null>, overall: number | null, reason: string | null): string {
  if (typeof overall !== "number") return `Not scored: ${reason ?? "not enough verified data"}.`;
  const level = overall >= 80 ? "Healthy token" : overall >= 60 ? "Moderate risk token" : overall >= 40 ? "Elevated risk token" : "High risk token";
  const valid = Object.entries(scores).filter(([, v]) => typeof v === "number") as [string, number][];
  const weakest = valid.sort(([, a], [, b]) => a - b)[0];
  return `${level} (${overall}/100).${weakest ? ` Weakest dimension: ${weakest[0]} at ${weakest[1]}/100.` : ""}`;
}

/** run-token-scan accepts a user JWT or x-internal-secret only (the service-role key is rejected). */
export async function runScan(address: string, chainName: string, chainId: string): Promise<ScanResult> {
  const secret = Deno.env.get("INTERNAL_API_SECRET");
  if (!secret) throw new Error("INTERNAL_API_SECRET is not configured");
  const start = Date.now();
  const res = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/run-token-scan`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-internal-secret": secret },
    body: JSON.stringify({ token_address: address, chain_id: chainId, user_id: null, force_refresh: false }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) throw new Error(data?.error ?? `Scan failed (HTTP ${res.status})`);
  const evidence = await loadEvidence(data.scan_id ?? null, address, chainId);
  return {
    name: data.token_name ?? null,
    symbol: data.token_symbol ?? null,
    address,
    chain: chainName,
    overall_score: data.overall_score ?? null,
    overall_reason: data.overall_reason ?? null,
    scores: data.scores ?? {},
    scoring_version: data.scoring_version ?? null,
    verdict: verdictFor(data.scores ?? {}, data.overall_score ?? null, data.overall_reason ?? null),
    scan_duration_ms: Date.now() - start,
    evidence,
  };
}

export type PaidScanOutcome =
  | { kind: "invalid_input"; message: string }
  | { kind: "not_configured" }
  | { kind: "facilitator_down"; message: string }
  | { kind: "ledger_error"; message: string }
  | { kind: "payment_required"; required: PaymentRequired }
  | { kind: "scan_failed"; message: string }
  | { kind: "not_scored"; result: ScanResult }
  | { kind: "ok"; result: ScanResult; settle: SettleResponse; explorer: string };

export interface PaidScanRequest {
  payment: PaymentPayload | null;
  resource: ResourceInfo;
  channel: "http" | "mcp";
  input: ScanInput;
}

function ledger() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

export async function executePaidScan(req: PaidScanRequest): Promise<PaidScanOutcome> {
  const norm = normalizeScanInput(req.input);
  if ("error" in norm) return { kind: "invalid_input", message: norm.error };

  const cfg: X402Config | null = loadX402Config();
  if (!cfg) return { kind: "not_configured" };

  // Quote every configured rail. A rail whose facilitator is down is left out; only all-down is an outage.
  const memo = `ths:${norm.chainName}:${norm.address}`;
  const quotes: { rail: Rail; requirements: PaymentRequirements }[] = [];
  const failures: string[] = [];
  for (const rail of cfg.rails) {
    try {
      const feePayer = await probeRail(rail);
      quotes.push({ rail, requirements: buildRequirements(cfg, rail, feePayer || undefined, memo) });
    } catch (e) {
      failures.push(`${rail.network}: ${(e as Error).message}`);
    }
  }
  if (quotes.length === 0) return { kind: "facilitator_down", message: failures.join("; ") };
  const networks = quotes.map((q) => (isEvm(q.rail.network) ? "Monad" : "Solana")).join(" or ");
  const required = (error?: string) => ({
    kind: "payment_required" as const,
    required: buildPaymentRequired(quotes.map((q) => q.requirements), req.resource, error ?? `Payment required: pay per scan in USDC on ${networks}`),
  });

  if (!req.payment) return required();
  // The client echoes the requirements it chose; it must be exactly one of the quotes.
  const chosen = quotes.find((q) => q.requirements.network === req.payment!.accepted?.network);
  if (!chosen || !matchesRequirements(req.payment.accepted, chosen.requirements)) return required("Payment does not match the requirements");
  const { rail, requirements } = chosen;
  // Bind the payment to the scan it was signed for: the client echoes the resource it was quoted.
  if (req.payment.resource?.url !== req.resource.url) return required("Payment was signed for a different resource");

  const db = ledger();
  const payloadHash = await sha256Hex(JSON.stringify(req.payment.payload));
  const base = {
    channel: req.channel,
    network: rail.network,
    asset: requirements.asset,
    amount_atomic: requirements.amount,
    pay_to: requirements.payTo,
    token_address: norm.address,
    chain: norm.chainName,
    payload_hash: payloadHash,
  };
  let { data: row, error: insertError } = await db.from("x402_payments").insert({ ...base, status: "pending" }).select("id").single();
  if (insertError?.code === "23505") {
    // Same signed payment again. Only a payment that never settled (verify failed, scan failed, or a transient
    // settle failure) may be retried; the claim is atomic so two concurrent retries cannot both win.
    const claim = await db
      .from("x402_payments")
      .update({ status: "pending", error: null })
      .eq("payload_hash", payloadHash)
      .in("status", ["void", "unsettled"])
      .select("id")
      .maybeSingle();
    if (claim.error) return { kind: "ledger_error", message: claim.error.message };
    if (!claim.data) return required("This payment was already used");
    row = claim.data;
    insertError = null;
  }
  if (insertError || !row) return { kind: "ledger_error", message: insertError?.message ?? "could not record payment" };
  const mark = (patch: Record<string, unknown>) => db.from("x402_payments").update(patch).eq("id", row.id);

  let verified: Awaited<ReturnType<typeof verifyPayment>>;
  try {
    verified = await verifyPayment(rail, req.payment, requirements);
  } catch (e) {
    // Nothing was settled: free the payment for a retry.
    await mark({ status: "void", error: `verify: ${(e as Error).message}`.slice(0, 500) });
    return { kind: "facilitator_down", message: "facilitator unreachable during verify" };
  }
  if (!verified.isValid) {
    await mark({ status: "void", error: `verify: ${verified.reason ?? "invalid"}` });
    return required(`Payment verification failed: ${verified.reason ?? "invalid payment"}`);
  }

  let result: ScanResult;
  try {
    result = await runScan(norm.address, norm.chainName, norm.chainId);
  } catch (e) {
    await mark({ status: "void", payer: verified.payer ?? null, error: `scan: ${(e as Error).message}`.slice(0, 500) });
    return { kind: "scan_failed", message: (e as Error).message };
  }

  // No overall score means the scanner could not verify enough data to give a verdict. The payer gets the
  // partial data for free and nothing is settled: you pay for a result you can act on.
  if (typeof result.overall_score !== "number") {
    await mark({ status: "void", payer: verified.payer ?? null, error: "not_scored", scoring_version: result.scoring_version });
    return { kind: "not_scored", result };
  }

  let settle: SettleResponse;
  try {
    settle = await settlePayment(rail, req.payment, requirements);
  } catch (e) {
    // The facilitator may or may not have broadcast. Keep the row retryable and flag it for reconciliation.
    await mark({ status: "unsettled", payer: verified.payer ?? null, error: `settle: no response (${(e as Error).message})`.slice(0, 500) });
    return { kind: "facilitator_down", message: "facilitator unreachable during settle" };
  }
  if (!settle.success) {
    await mark({ status: "unsettled", payer: settle.payer ?? verified.payer ?? null, error: `settle: ${settle.errorReason}` });
    return required(`Settlement failed: ${settle.errorReason}`);
  }

  // The payer has been charged and the scan is delivered. Record it, retrying once; if the ledger is down the
  // transaction signature is in the logs for reconciliation.
  const settledPatch = {
    status: "settled",
    settled_at: new Date().toISOString(),
    payer: settle.payer ?? verified.payer ?? null,
    tx_signature: settle.transaction,
    overall_score: result.overall_score,
    scoring_version: result.scoring_version,
    token_symbol: result.symbol,
    scores: result.scores,
    evidence: result.evidence,
  };
  let recorded = await mark(settledPatch);
  if (recorded.error) recorded = await mark(settledPatch);
  if (recorded.error) {
    console.error(`[x402] settled but ledger update failed: tx=${settle.transaction} payload_hash=${payloadHash} error=${recorded.error.message}`);
  }
  return { kind: "ok", result, settle, explorer: explorerUrl(settle.network, settle.transaction) };
}
