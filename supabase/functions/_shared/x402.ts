/**
 * x402 v2 (exact scheme, Solana) resource-server helpers.
 *
 * Spec: https://github.com/x402-foundation/x402/tree/main/specs
 *   - core:       specs/x402-specification-v2.md
 *   - HTTP:       specs/transports-v2/http.md   (PAYMENT-REQUIRED / PAYMENT-SIGNATURE / PAYMENT-RESPONSE)
 *   - MCP:        specs/transports-v2/mcp.md    (_meta["x402/payment"])
 *   - Solana:     specs/schemes/exact/scheme_exact_svm.md
 *
 * This module only builds requirements and talks to a facilitator over the
 * standard /supported, /verify and /settle HTTP contract. It never holds keys
 * and never signs: the payer signs, the facilitator pays the network fee and
 * broadcasts, USDC goes straight from the payer to X402_PAYEE_SOLANA.
 */

export const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

const USDC_MINT: Record<string, string> = {
  [SOLANA_MAINNET]: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  [SOLANA_DEVNET]: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
};
const USDC_DECIMALS = 6;

export interface X402Config {
  facilitatorUrl: string;
  network: string;
  payTo: string;
  priceUsd: number;
  /** Put the scanned token in the on-chain Memo instruction (X402_MEMO=1). Off until the facilitator is proven to honor it. */
  memo: boolean;
}

export interface PaymentRequirements {
  scheme: "exact";
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra: { feePayer: string; memo?: string };
}

export interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
  serviceName?: string;
  tags?: string[];
}

export interface PaymentRequired {
  x402Version: 2;
  error?: string;
  resource: ResourceInfo;
  accepts: PaymentRequirements[];
}

export interface PaymentPayload {
  x402Version: number;
  resource?: ResourceInfo;
  accepted: Partial<PaymentRequirements>;
  payload: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface SettleResponse {
  success: boolean;
  transaction: string;
  network: string;
  payer?: string;
  errorReason?: string;
}

/** Returns null when the payee is not configured, so callers can answer 503 instead of faking a price. */
export function loadX402Config(): X402Config | null {
  const payTo = Deno.env.get("X402_PAYEE_SOLANA");
  if (!payTo) return null;
  const network = Deno.env.get("X402_NETWORK") || SOLANA_MAINNET;
  if (!USDC_MINT[network]) return null;
  const priceUsd = Number(Deno.env.get("X402_PRICE_USD") || "0.02");
  // A price that rounds to zero atomic units would authorize a free scan.
  if (!Number.isFinite(priceUsd) || priceUsd <= 0 || usdToAtomic(priceUsd) === "0") return null;
  return {
    facilitatorUrl: (Deno.env.get("X402_FACILITATOR_URL") || "https://facilitator.payai.network").replace(/\/$/, ""),
    network,
    payTo,
    priceUsd,
    memo: Deno.env.get("X402_MEMO") === "1",
  };
}

export function usdToAtomic(usd: number): string {
  return Math.round(usd * 10 ** USDC_DECIMALS).toString();
}

let feePayerCache: { key: string; value: string; at: number } | null = null;

/** The facilitator advertises the fee payer the client must put in the transaction. */
export async function getFeePayer(cfg: X402Config): Promise<string> {
  const key = `${cfg.facilitatorUrl}|${cfg.network}`;
  if (feePayerCache && feePayerCache.key === key && Date.now() - feePayerCache.at < 5 * 60_000) {
    return feePayerCache.value;
  }
  const res = await fetch(`${cfg.facilitatorUrl}/supported`);
  if (!res.ok) throw new Error(`facilitator /supported returned HTTP ${res.status}`);
  const data = await res.json();
  const kind = (data?.kinds ?? []).find(
    (k: any) => k?.x402Version === 2 && k?.scheme === "exact" && k?.network === cfg.network,
  );
  const feePayer = kind?.extra?.feePayer;
  if (typeof feePayer !== "string") throw new Error(`facilitator does not support exact on ${cfg.network}`);
  feePayerCache = { key, value: feePayer, at: Date.now() };
  return feePayer;
}

export function buildRequirements(cfg: X402Config, feePayer: string, memo?: string): PaymentRequirements {
  return {
    scheme: "exact",
    network: cfg.network,
    amount: usdToAtomic(cfg.priceUsd),
    asset: USDC_MINT[cfg.network],
    payTo: cfg.payTo,
    maxTimeoutSeconds: 60,
    extra: { feePayer, ...(cfg.memo && memo ? { memo } : {}) },
  };
}

export function buildPaymentRequired(
  requirements: PaymentRequirements,
  resource: ResourceInfo,
  error?: string,
): PaymentRequired {
  return { x402Version: 2, ...(error ? { error } : {}), resource, accepts: [requirements] };
}

export function encodeHeader(obj: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

export function decodeHeader<T>(value: string): T | null {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(value)))) as T;
  } catch {
    return null;
  }
}

/** The client echoes the requirements it chose. Only accept an exact match of what we asked for. */
export function matchesRequirements(accepted: Partial<PaymentRequirements> | undefined, req: PaymentRequirements): boolean {
  return !!accepted &&
    accepted.scheme === req.scheme &&
    accepted.network === req.network &&
    accepted.amount === req.amount &&
    accepted.asset === req.asset &&
    accepted.payTo === req.payTo &&
    (accepted.extra?.memo ?? null) === (req.extra.memo ?? null);
}

async function facilitatorCall(cfg: X402Config, path: "/verify" | "/settle", payload: PaymentPayload, req: PaymentRequirements) {
  const res = await fetch(`${cfg.facilitatorUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: 2, paymentPayload: payload, paymentRequirements: req }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function verifyPayment(cfg: X402Config, payload: PaymentPayload, req: PaymentRequirements) {
  const { ok, data } = await facilitatorCall(cfg, "/verify", payload, req);
  return { isValid: ok && data?.isValid === true, reason: data?.invalidReason as string | undefined, payer: data?.payer as string | undefined };
}

export async function settlePayment(cfg: X402Config, payload: PaymentPayload, req: PaymentRequirements): Promise<SettleResponse> {
  const { ok, data } = await facilitatorCall(cfg, "/settle", payload, req);
  if (!ok || data?.success !== true || !data?.transaction) {
    return {
      success: false,
      transaction: data?.transaction ?? "",
      network: req.network,
      payer: data?.payer,
      errorReason: data?.errorReason ?? "settlement_failed",
    };
  }
  return { success: true, transaction: data.transaction, network: data.network ?? req.network, payer: data.payer };
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function explorerUrl(network: string, signature: string): string {
  const cluster = network === SOLANA_DEVNET ? "?cluster=devnet" : "";
  return `https://solscan.io/tx/${signature}${cluster}`;
}
