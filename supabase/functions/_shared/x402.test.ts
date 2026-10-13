import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  BASE_MAINNET,
  buildPaymentRequired,
  buildRequirements,
  decodeHeader,
  explorerUrl,
  encodeHeader,
  loadX402Config,
  matchesRequirements,
  MONAD_MAINNET,
  networkLabel,
  type Rail,
  SOLANA_MAINNET,
  usdToAtomic,
  type X402Config,
} from "./x402.ts";
import { normalizeScanInput } from "./paidScan.ts";

Deno.test("a price that rounds to zero atomic units is not a valid configuration", () => {
  Deno.env.set("X402_PAYEE_SOLANA", "PayeeAddr");
  Deno.env.set("X402_PRICE_USD", "0.0000001");
  assertEquals(loadX402Config(), null);
  Deno.env.set("X402_PRICE_USD", "-1");
  assertEquals(loadX402Config(), null);
  Deno.env.set("X402_PRICE_USD", "0.02");
  assertEquals(loadX402Config()?.priceUsd, 0.02);
  Deno.env.delete("X402_PAYEE_SOLANA");
  Deno.env.delete("X402_PRICE_USD");
});

const sol: Rail = { facilitatorUrl: "https://f.example", network: SOLANA_MAINNET, payTo: "PayeeAddr" };
const monad: Rail = { facilitatorUrl: "https://m.example", network: MONAD_MAINNET, payTo: "0x12C479936bE431fBea60c376112561252b1E68Bb" };
const cfg: X402Config = { rails: [sol, monad], priceUsd: 0.02, memo: true };

Deno.test("usdToAtomic: USDC has 6 decimals", () => {
  assertEquals(usdToAtomic(0.02), "20000");
  assertEquals(usdToAtomic(1), "1000000");
});

Deno.test("requirements carry amount, USDC mint, payee and fee payer", () => {
  const req = buildRequirements(cfg, sol, "FeePayer", "ths:solana:Tok");
  assertEquals(req.amount, "20000");
  assertEquals(req.asset, "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
  assertEquals(req.extra, { feePayer: "FeePayer", memo: "ths:solana:Tok" });
});

Deno.test("memo is omitted when disabled", () => {
  const req = buildRequirements({ ...cfg, memo: false }, sol, "FeePayer", "ths:solana:Tok");
  assertEquals(req.extra, { feePayer: "FeePayer" });
});

Deno.test("matchesRequirements rejects a cheaper or redirected payment", () => {
  const req = buildRequirements(cfg, sol, "FeePayer", "m");
  assert(matchesRequirements({ ...req }, req));
  assert(!matchesRequirements({ ...req, amount: "1" }, req));
  assert(!matchesRequirements({ ...req, payTo: "Attacker" }, req));
  assert(!matchesRequirements({ ...req, asset: "OtherMint" }, req));
  assert(!matchesRequirements({ ...req, extra: { feePayer: "FeePayer", memo: "other" } }, req));
  assert(!matchesRequirements(undefined, req));
});

Deno.test("header round-trips", () => {
  const pr = buildPaymentRequired([buildRequirements(cfg, sol, "FeePayer"), buildRequirements(cfg, monad)], { url: "https://x/y?a=é" });
  assertEquals(decodeHeader(encodeHeader(pr)), pr);
  assertEquals(decodeHeader("not base64 json"), null);
});

Deno.test("normalizeScanInput validates chain and address", () => {
  assertEquals(normalizeScanInput({ chain: "SOL", address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN" }), {
    address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    chainName: "solana",
    chainId: "solana",
  });
  assert("error" in normalizeScanInput({ chain: "solana", address: "0x1234" }));
  assert("error" in normalizeScanInput({ chain: "dogechain", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" }));
  const evm = normalizeScanInput({ chain: "ethereum", address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" });
  assert(!("error" in evm) && evm.address === "0xdac17f958d2ee523a2206206994597c13d831ec7" && evm.chainId === "0x1");
});

Deno.test("Monad rail: USDC EIP-3009 domain, no fee payer, no memo", () => {
  const req = buildRequirements(cfg, monad, undefined, "ths:base:0xabc");
  assertEquals(req.network, "eip155:143");
  assertEquals(req.asset, "0x754704Bc059F8C67012fEd69BC8A327a5aafb603");
  assertEquals(req.amount, "20000");
  assertEquals(req.extra, { name: "USDC", version: "2" });
});

Deno.test("Monad match is case-insensitive on addresses but still rejects redirects", () => {
  const req = buildRequirements(cfg, monad);
  assert(matchesRequirements({ ...req, payTo: req.payTo.toLowerCase(), asset: req.asset.toLowerCase() }, req));
  assert(!matchesRequirements({ ...req, payTo: "0x0000000000000000000000000000000000000001" }, req));
  assert(!matchesRequirements({ ...req, amount: "19999" }, req));
  assert(!matchesRequirements({ ...req, network: "eip155:10143" }, req));
});

const base: Rail = { facilitatorUrl: "https://b.example", network: BASE_MAINNET, payTo: "0x12C479936bE431fBea60c376112561252b1E68Bb" };

Deno.test("Base rail: Base USDC signs under the \"USD Coin\" domain, not Monad's \"USDC\"", () => {
  const req = buildRequirements(cfg, base, undefined, "ths:base:0xabc");
  assertEquals(req.network, "eip155:8453");
  assertEquals(req.asset, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");
  assertEquals(req.amount, "20000");
  assertEquals(req.maxTimeoutSeconds, 300);
  assertEquals(req.extra, { name: "USD Coin", version: "2" });
  assert(!matchesRequirements({ ...req, network: MONAD_MAINNET }, req));
});

Deno.test("Base payments label and link to Base", () => {
  assertEquals(networkLabel(BASE_MAINNET), "Base");
  assertEquals(networkLabel(MONAD_MAINNET), "Monad");
  assertEquals(networkLabel(SOLANA_MAINNET), "Solana");
  assertEquals(explorerUrl(BASE_MAINNET, "0xabc"), "https://basescan.org/tx/0xabc");
});

Deno.test("loadX402Config offers Base between Solana and Monad, and rejects a bad Base payee", () => {
  Deno.env.set("X402_PAYEE_SOLANA", "PayeeAddr");
  Deno.env.set("X402_PAYEE_BASE", "0x12C479936bE431fBea60c376112561252b1E68Bb");
  Deno.env.set("X402_PAYEE_MONAD", "0x12C479936bE431fBea60c376112561252b1E68Bb");
  const cfg3 = loadX402Config();
  assertEquals(cfg3?.rails.map((r) => r.network), [SOLANA_MAINNET, BASE_MAINNET, MONAD_MAINNET]);
  assertEquals(cfg3?.rails[1].facilitatorUrl, "https://facilitator.payai.network");
  Deno.env.set("X402_PAYEE_BASE", "not-an-address");
  assertEquals(loadX402Config()?.rails.map((r) => r.network), [SOLANA_MAINNET, MONAD_MAINNET]);
  Deno.env.delete("X402_PAYEE_BASE");
  Deno.env.delete("X402_PAYEE_SOLANA");
  Deno.env.delete("X402_PAYEE_MONAD");
});

Deno.test("loadX402Config offers each configured rail", () => {
  Deno.env.set("X402_PAYEE_SOLANA", "PayeeAddr");
  Deno.env.set("X402_PAYEE_MONAD", "0x12C479936bE431fBea60c376112561252b1E68Bb");
  assertEquals(loadX402Config()?.rails.map((r) => r.network), [SOLANA_MAINNET, MONAD_MAINNET]);
  Deno.env.delete("X402_PAYEE_SOLANA");
  assertEquals(loadX402Config()?.rails.map((r) => r.network), [MONAD_MAINNET]);
  Deno.env.set("X402_PAYEE_MONAD", "not-an-address");
  assertEquals(loadX402Config(), null);
  Deno.env.delete("X402_PAYEE_MONAD");
});
