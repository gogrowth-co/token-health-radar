/**
 * Pay-per-scan flow shared by the HTTP endpoint (x402-scan) and the MCP tool (token-health-mcp).
 *
 * Order follows the x402 "authorization" flow: verify (read-only) -> run the scan -> settle.
 * USDC only moves after the scan succeeded. A payment that fails verification or a scan that
 * fails never reaches /settle, so the payer is not charged for a result they did not get.
 *
 * Every attempt is written to public.x402_payments. payload_hash is unique, so a signed
 * payment can buy exactly one scan.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.7";
import {
  buildPaymentRequired,
  buildRequirements,
  explorerUrl,
  getFeePayer,
  loadX402Config,
  matchesRequirements,
  settlePayment,
  sha256Hex,
  verifyPayment,
  type PaymentPayload,
  type PaymentRequired,
  type PaymentRequirements,
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
  };
}

export type PaidScanOutcome =
  | { kind: "invalid_input"; message: string }
  | { kind: "not_configured" }
  | { kind: "facilitator_down"; message: string }
  | { kind: "ledger_error"; message: string }
  | { kind: "payment_required"; required: PaymentRequired }
  | { kind: "scan_failed"; message: string }
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

  let requirements: PaymentRequirements;
  try {
    requirements = buildRequirements(cfg, await getFeePayer(cfg), `ths:${norm.chainName}:${norm.address}`);
  } catch (e) {
    return { kind: "facilitator_down", message: (e as Error).message };
  }
  const required = (error?: string) => ({
    kind: "payment_required" as const,
    required: buildPaymentRequired(requirements, req.resource, error ?? "Payment required: pay per scan in USDC on Solana"),
  });

  if (!req.payment) return required();
  if (!matchesRequirements(req.payment.accepted, requirements)) return required("Payment does not match the requirements");

  const db = ledger();
  const payloadHash = await sha256Hex(JSON.stringify(req.payment.payload));
  const base = {
    channel: req.channel,
    network: cfg.network,
    asset: requirements.asset,
    amount_atomic: requirements.amount,
    pay_to: requirements.payTo,
    token_address: norm.address,
    chain: norm.chainName,
    payload_hash: payloadHash,
  };
  const { data: row, error: insertError } = await db.from("x402_payments").insert({ ...base, status: "pending" }).select("id").single();
  if (insertError?.code === "23505") return required("This payment was already used");
  if (insertError || !row) return { kind: "ledger_error", message: insertError?.message ?? "could not record payment" };
  const mark = (patch: Record<string, unknown>) => db.from("x402_payments").update(patch).eq("id", row.id);

  const verified = await verifyPayment(cfg, req.payment, requirements);
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

  const settle = await settlePayment(cfg, req.payment, requirements);
  if (!settle.success) {
    await mark({ status: "unsettled", payer: settle.payer ?? verified.payer ?? null, error: `settle: ${settle.errorReason}` });
    return required(`Settlement failed: ${settle.errorReason}`);
  }

  await mark({
    status: "settled",
    settled_at: new Date().toISOString(),
    payer: settle.payer ?? verified.payer ?? null,
    tx_signature: settle.transaction,
    overall_score: result.overall_score,
    scoring_version: result.scoring_version,
  });
  return { kind: "ok", result, settle, explorer: explorerUrl(settle.network, settle.transaction) };
}
