// Pay for one Token Health Scan in USDC on Solana over x402, then print the verdict and the payment proof.
//
//   SOLANA_KEYPAIR_PATH=~/.config/solana/id.json node pay-scan.mjs solana <token-address>
//
// SOLANA_KEYPAIR_PATH is a solana-keygen style JSON file (array of 64 bytes). The key never leaves this
// process: it signs a USDC transfer, the facilitator pays the network fee and broadcasts it, and USDC
// moves only after the scan succeeded. Price is whatever the server advertises (currently 0.02 USDC).
import { readFileSync } from "node:fs";
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";
import { createKeyPairSignerFromBytes } from "@solana/kit";

const [chain, address] = process.argv.slice(2);
const keyPath = process.env.SOLANA_KEYPAIR_PATH;
const endpoint = process.env.THS_X402_URL ?? "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/x402-scan";
if (!chain || !address || !keyPath) {
  console.error("usage: SOLANA_KEYPAIR_PATH=<keypair.json> node pay-scan.mjs <chain> <token-address>");
  process.exit(2);
}

const signer = toClientSvmSigner(await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(readFileSync(keyPath, "utf8")))));
const client = new x402Client().register("solana:*", new ExactSvmScheme(signer));
const paidFetch = wrapFetchWithPayment(fetch, client);

const res = await paidFetch(`${endpoint}?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address)}`);
const body = await res.json();
if (!res.ok) {
  console.error(`HTTP ${res.status}`, JSON.stringify(body));
  process.exit(1);
}
const receipt = res.headers.get("PAYMENT-RESPONSE");
console.log(JSON.stringify({ ...body, receipt: receipt ? decodePaymentResponseHeader(receipt) : null }, null, 2));
