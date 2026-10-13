// A trust-minimized agent buying one token-risk scan from Token Health Scan on Monad.
//
//   1. Discover: read Token Health Scan's ERC-8004 identity (agent card + registered wallet) from Monad.
//   2. Check reputation: read the onchain feedback other clients left for this agent.
//   3. Get a quote: call the x402 endpoint unpaid; it answers 402 with a Monad and a Solana option.
//   4. Verify the quote: Monad USDC, the price we accept, and payTo == the agent's registered wallet.
//      A spoofed endpoint or a swapped payee fails here, before anything is signed.
//   5. Pay: sign an EIP-3009 USDC authorization (no gas, no approval). The Monad facilitator settles it
//      only after the scan returns a scored result.
//   6. Rate: post ERC-8004 feedback onchain, linked to the payment transaction and the result hash.
//
//   node pay-scan.mjs <chain> <tokenAddress> [--no-feedback]
//   e.g. node pay-scan.mjs ethereum 0x1f9840a85d5af5bf1d1762f925bdaddc4201f984
import fs from "node:fs";
import path from "node:path";
import { keccak256, toHex } from "viem";
import { x402Client, x402HTTPClient } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import {
  IDENTITY_REGISTRY, NETWORK, REPUTATION_REGISTRY, USDC, identityAbi, loadAccount, loadAgent, publicClient,
  reputationAbi, tx, walletFor,
} from "./lib.mjs";

const [chain, address] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!chain || !address) {
  console.error("usage: node pay-scan.mjs <chain> <tokenAddress> [--no-feedback]");
  process.exit(1);
}
const MAX_PRICE_ATOMIC = BigInt(process.env.MAX_PRICE_ATOMIC || "20000"); // 0.02 USDC per scan
const SPEND_CAP_ATOMIC = BigInt(process.env.SPEND_CAP_ATOMIC || "1000000"); // 1 USDC lifetime for this demo
const SPEND_LOG = path.join(path.dirname(new URL(import.meta.url).pathname), "spend-log.json");

const account = loadAccount("monad-payer");
const { agentId: agentIdStr } = loadAgent();
const agentId = BigInt(agentIdStr);
const step = (n, msg) => console.log(`\n[${n}] ${msg}`);

// 1. Discover
step(1, `Reading agent #${agentId} from the ERC-8004 Identity Registry on Monad`);
const [uri, agentWallet] = await Promise.all([
  publicClient.readContract({ address: IDENTITY_REGISTRY, abi: identityAbi, functionName: "tokenURI", args: [agentId] }),
  publicClient.readContract({ address: IDENTITY_REGISTRY, abi: identityAbi, functionName: "getAgentWallet", args: [agentId] }),
]);
const card = JSON.parse(Buffer.from(uri.split(",")[1], "base64").toString("utf8"));
const service = card.services.find((s) => s.name === "x402");
if (!card.active || !service) throw new Error("agent is inactive or has no x402 service");
console.log(`    ${card.name}: ${service.endpoint}`);
console.log(`    registered wallet: ${agentWallet}`);

// 2. Reputation
step(2, "Reading onchain reputation");
const clients = await publicClient.readContract({ address: REPUTATION_REGISTRY, abi: reputationAbi, functionName: "getClients", args: [agentId] });
if (clients.length === 0) {
  console.log("    no feedback yet: this agent has no track record");
} else {
  const [count, value, decimals] = await publicClient.readContract({
    address: REPUTATION_REGISTRY, abi: reputationAbi, functionName: "getSummary", args: [agentId, clients, "token-scan", ""],
  });
  console.log(`    ${count} rated scans from ${clients.length} client(s), average ${Number(value) / 10 ** decimals}/100`);
}

// 3. Quote
const url = `${service.endpoint}?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address)}`;
step(3, `Requesting a quote: GET ${url}`);
const quoteRes = await fetch(url);
if (quoteRes.status !== 402) throw new Error(`expected 402, got ${quoteRes.status}: ${await quoteRes.text()}`);
const client = new x402Client();
registerExactEvmScheme(client, { signer: toClientEvmSigner(account, publicClient), networks: [NETWORK] });
const http = new x402HTTPClient(client);
const required = http.getPaymentRequiredResponse((name) => quoteRes.headers.get(name), await quoteRes.json());
console.log(`    offered: ${required.accepts.map((a) => `${a.amount / 1e6} USDC on ${a.network}`).join(" | ")}`);

// 4. Verify the quote against the registry before signing
step(4, "Verifying the Monad quote against the agent's registered identity");
const quote = required.accepts.find((a) => a.network === NETWORK && a.scheme === "exact");
const checks = [
  ["Monad option offered", !!quote],
  ["asset is Monad USDC", quote?.asset?.toLowerCase() === USDC.toLowerCase()],
  [`price <= ${Number(MAX_PRICE_ATOMIC) / 1e6} USDC`, quote && BigInt(quote.amount) <= MAX_PRICE_ATOMIC],
  ["payTo == ERC-8004 agentWallet", quote?.payTo?.toLowerCase() === agentWallet.toLowerCase()],
];
const log = fs.existsSync(SPEND_LOG) ? JSON.parse(fs.readFileSync(SPEND_LOG, "utf8")) : [];
const spent = log.reduce((s, r) => s + BigInt(r.amount), 0n);
checks.push([`spend cap (${Number(spent) / 1e6} of ${Number(SPEND_CAP_ATOMIC) / 1e6} USDC used)`, quote && spent + BigInt(quote.amount) <= SPEND_CAP_ATOMIC]);
for (const [name, ok] of checks) console.log(`    ${ok ? "PASS" : "FAIL"}  ${name}`);
if (checks.some(([, ok]) => !ok)) {
  console.error("\nRefusing to pay.");
  process.exit(2);
}

// 5. Pay (sign only the verified quote) and receive the scan
step(5, `Signing ${quote.amount / 1e6} USDC (EIP-3009, gasless) and requesting the scan`);
const payload = await http.createPaymentPayload({ ...required, accepts: [quote] });
const started = Date.now();
const res = await fetch(url, { headers: http.encodePaymentSignatureHeader(payload) });
const bodyText = await res.text();
const body = JSON.parse(bodyText);
if (res.status === 422) {
  console.log(`    not scored, not charged: ${body.error}`);
  process.exit(0);
}
if (res.status !== 200) throw new Error(`scan failed: HTTP ${res.status} ${bodyText}`);
log.push({ at: new Date().toISOString(), amount: quote.amount, tx: body.payment.transaction, token: `${chain}:${address}` });
fs.writeFileSync(SPEND_LOG, JSON.stringify(log, null, 2) + "\n");
console.log(`    ${body.name ?? "?"} (${body.symbol ?? "?"}): ${body.verdict}`);
console.log(`    scores: ${JSON.stringify(body.scores)}`);
console.log(`    paid: ${body.payment.explorer}  (${Date.now() - started} ms incl. scan)`);

// 6. Rate the agent onchain
if (process.argv.includes("--no-feedback")) process.exit(0);
step(6, "Posting ERC-8004 feedback to the Reputation Registry");
const resultHash = keccak256(toHex(bodyText));
const wallet = walletFor(account);
const { request } = await publicClient.simulateContract({
  account, address: REPUTATION_REGISTRY, abi: reputationAbi, functionName: "giveFeedback",
  // value 100/100: paid scan delivered with a scored result. tag1 groups the service, tag2 the scanned chain.
  args: [agentId, 100n, 0, "token-scan", chain, service.endpoint, body.payment.explorer, resultHash],
});
const hash = await wallet.writeContract(request);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log(`    ${receipt.status === "success" ? "feedback recorded" : "feedback REVERTED"}: ${tx(hash)}`);
