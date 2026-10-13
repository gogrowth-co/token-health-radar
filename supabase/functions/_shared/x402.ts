/**
 * x402 v2 (exact scheme) resource-server helpers. Two payment rails, offered side by side in one
 * PaymentRequired so the paying agent picks its network:
 *   - Solana: USDC SPL transfer, PayAI facilitator pays the fee (specs/schemes/exact/scheme_exact_svm.md)
 *   - Monad:  USDC EIP-3009 transferWithAuthorization, Monad facilitator pays gas (scheme_exact_evm.md)
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
 * broadcasts, USDC goes straight from the payer to X402_PAYEE_SOLANA / X402_PAYEE_MONAD.
 */

export const SOLANA_MAINNET = "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp";
export const SOLANA_DEVNET = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

export const MONAD_MAINNET = "eip155:143";
export const MONAD_TESTNET = "eip155:10143";

const USDC_MINT: Record<string, string> = {
  [SOLANA_MAINNET]: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  [SOLANA_DEVNET]: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  // Circle native USDC on Monad. EIP-712 domain name is "USDC" (not "USD Coin"), version "2".
  [MONAD_MAINNET]: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  [MONAD_TESTNET]: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
};
const USDC_DECIMALS = 6;

export function isEvm(network: string): boolean {
  return network.startsWith("eip155:");
}

/** One way to pay: a network, the facilitator that settles on it, and who gets the USDC. */
export interface Rail {
  network: string;
  facilitatorUrl: string;
  payTo: string;
}

export interface X402Config {
  rails: Rail[];
  priceUsd: number;
  /** Put the scanned token in the on-chain Memo instruction (X402_MEMO=1, Solana only). Off until the facilitator is proven to honor it. */
  memo: boolean;
}

export interface PaymentRequirements {
  scheme: "exact";
  network: string;
  amount: string;
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  /** Solana: feePayer (+ memo). Monad: the USDC EIP-712 domain name and version. */
  extra: { feePayer?: string; memo?: string; name?: string; version?: string };
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

/** Returns null when no payee is configured, so callers can answer 503 instead of faking a price. */
export function loadX402Config(): X402Config | null {
  const rails: Rail[] = [];
  const solPayee = Deno.env.get("X402_PAYEE_SOLANA");
  const solNetwork = Deno.env.get("X402_NETWORK") || SOLANA_MAINNET;
  if (solPayee && USDC_MINT[solNetwork]) {
    rails.push({
      network: solNetwork,
      payTo: solPayee,
      facilitatorUrl: (Deno.env.get("X402_FACILITATOR_URL") || "https://facilitator.payai.network").replace(/\/$/, ""),
    });
  }
  const monadPayee = Deno.env.get("X402_PAYEE_MONAD");
  const monadNetwork = Deno.env.get("X402_MONAD_NETWORK") || MONAD_MAINNET;
  if (monadPayee && /^0x[0-9a-fA-F]{40}$/.test(monadPayee) && USDC_MINT[monadNetwork]) {
    rails.push({
      network: monadNetwork,
      payTo: monadPayee,
      facilitatorUrl: (Deno.env.get("X402_MONAD_FACILITATOR_URL") || "https://x402-facilitator.molandak.org").replace(/\/$/, ""),
    });
  }
  if (rails.length === 0) return null;
  const priceUsd = Number(Deno.env.get("X402_PRICE_USD") || "0.02");
  // A price that rounds to zero atomic units would authorize a free scan.
  if (!Number.isFinite(priceUsd) || priceUsd <= 0 || usdToAtomic(priceUsd) === "0") return null;
  return { rails, priceUsd, memo: Deno.env.get("X402_MEMO") === "1" };
}

export function usdToAtomic(usd: number): string {
  return Math.round(usd * 10 ** USDC_DECIMALS).toString();
}

const feePayerCache = new Map<string, { value: string; at: number }>();

/** Solana only: the facilitator advertises the fee payer the client must put in the transaction. */
export async function getFeePayer(rail: Rail): Promise<string> {
  const key = `${rail.facilitatorUrl}|${rail.network}`;
  const hit = feePayerCache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.value;
  const res = await fetch(`${rail.facilitatorUrl}/supported`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`facilitator /supported returned HTTP ${res.status}`);
  const data = await res.json();
  const kind = (data?.kinds ?? []).find(
    (k: any) => k?.x402Version === 2 && k?.scheme === "exact" && k?.network === rail.network,
  );
  const feePayer = kind?.extra?.feePayer;
  if (typeof feePayer !== "string") throw new Error(`facilitator does not support exact on ${rail.network}`);
  feePayerCache.set(key, { value: feePayer, at: Date.now() });
  return feePayer;
}

/** feePayer is required on Solana and ignored on EVM, where the facilitator pays gas through EIP-3009. */
export function buildRequirements(cfg: X402Config, rail: Rail, feePayer?: string, memo?: string): PaymentRequirements {
  const evm = isEvm(rail.network);
  return {
    scheme: "exact",
    network: rail.network,
    amount: usdToAtomic(cfg.priceUsd),
    asset: USDC_MINT[rail.network],
    payTo: rail.payTo,
    maxTimeoutSeconds: evm ? 300 : 60,
    extra: evm
      ? { name: "USDC", version: "2" }
      : { feePayer: feePayer ?? "", ...(cfg.memo && memo ? { memo } : {}) },
  };
}

export function buildPaymentRequired(
  accepts: PaymentRequirements[],
  resource: ResourceInfo,
  error?: string,
): PaymentRequired {
  return { x402Version: 2, ...(error ? { error } : {}), resource, accepts };
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
  if (!accepted) return false;
  // EVM addresses are case-insensitive (checksum casing); Solana base58 is not.
  const same = (a: unknown, b: string) =>
    typeof a === "string" && (isEvm(req.network) ? a.toLowerCase() === b.toLowerCase() : a === b);
  return accepted.scheme === req.scheme &&
    accepted.network === req.network &&
    accepted.amount === req.amount &&
    same(accepted.asset, req.asset) &&
    same(accepted.payTo, req.payTo) &&
    (accepted.extra?.memo ?? null) === (req.extra.memo ?? null);
}

async function facilitatorCall(rail: Rail, path: "/verify" | "/settle", payload: PaymentPayload, req: PaymentRequirements) {
  const res = await fetch(`${rail.facilitatorUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x402Version: 2, paymentPayload: payload, paymentRequirements: req }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export async function verifyPayment(rail: Rail, payload: PaymentPayload, req: PaymentRequirements) {
  const { ok, data } = await facilitatorCall(rail, "/verify", payload, req);
  return { isValid: ok && data?.isValid === true, reason: data?.invalidReason as string | undefined, payer: data?.payer as string | undefined };
}

export async function settlePayment(rail: Rail, payload: PaymentPayload, req: PaymentRequirements): Promise<SettleResponse> {
  const { ok, data } = await facilitatorCall(rail, "/settle", payload, req);
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
  if (network === MONAD_MAINNET) return `https://monadvision.com/tx/${signature}`;
  if (network === MONAD_TESTNET) return `https://testnet.monadvision.com/tx/${signature}`;
  const cluster = network === SOLANA_DEVNET ? "?cluster=devnet" : "";
  return `https://solscan.io/tx/${signature}${cluster}`;
}
