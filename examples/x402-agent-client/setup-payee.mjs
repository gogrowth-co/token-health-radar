// One-time setup for a seller: create the payee's USDC token account.
//
// The x402 Solana "exact" scheme forbids the facilitator's fee payer from creating the destination token
// account, so it must exist before the first payment. This pays the ~0.002 SOL rent from the funder wallet.
//
//   FUNDER_KEYPAIR_PATH=<keypair.json> node setup-payee.mjs <payee-address>
import { readFileSync } from "node:fs";
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";

const USDC = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const [payeeArg] = process.argv.slice(2);
const keyPath = process.env.FUNDER_KEYPAIR_PATH;
if (!payeeArg || !keyPath) {
  console.error("usage: FUNDER_KEYPAIR_PATH=<keypair.json> node setup-payee.mjs <payee-address>");
  process.exit(2);
}

const connection = new Connection(process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com", "confirmed");
const funder = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(keyPath, "utf8"))));
const payee = new PublicKey(payeeArg);
const ata = getAssociatedTokenAddressSync(USDC, payee);

const existing = await connection.getAccountInfo(ata);
if (existing) {
  console.log(JSON.stringify({ status: "already_exists", payee: payee.toBase58(), usdcTokenAccount: ata.toBase58() }));
  process.exit(0);
}

const tx = new Transaction().add(createAssociatedTokenAccountIdempotentInstruction(funder.publicKey, ata, payee, USDC));
const signature = await sendAndConfirmTransaction(connection, tx, [funder]);
console.log(JSON.stringify({ status: "created", payee: payee.toBase58(), usdcTokenAccount: ata.toBase58(), funder: funder.publicKey.toBase58(), signature, explorer: `https://solscan.io/tx/${signature}` }));
