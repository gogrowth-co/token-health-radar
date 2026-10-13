// Shared setup for the Monad demo agent: chain, registries, wallets.
// Private keys are read from JSON files outside the repo and never printed.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const here = path.dirname(new URL(import.meta.url).pathname);

export const monad = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [process.env.MONAD_RPC_URL || "https://rpc.monad.xyz"] } },
  blockExplorers: { default: { name: "MonadVision", url: "https://monadvision.com" } },
});

export const NETWORK = "eip155:143";
export const USDC = "0x754704Bc059F8C67012fEd69BC8A327a5aafb603";
// ERC-8004 registries on Monad mainnet (docs.monad.xyz/guides/erc-8004)
export const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
export const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";

export const SCAN_ENDPOINT =
  process.env.THS_SCAN_URL || "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/x402-scan";

export const identityAbi = JSON.parse(fs.readFileSync(path.join(here, "abis/IdentityRegistry.json"), "utf8"));
export const reputationAbi = JSON.parse(fs.readFileSync(path.join(here, "abis/ReputationRegistry.json"), "utf8"));

export const publicClient = createPublicClient({ chain: monad, transport: http() });

/** Loads a key file ({address, privateKey}) from ~/.config/ths-x402 or $<NAME>_KEY_FILE. */
export function loadAccount(name) {
  const file =
    process.env[`${name.toUpperCase().replace(/-/g, "_")}_KEY_FILE`] ||
    path.join(os.homedir(), ".config/ths-x402", `${name}.json`);
  const { privateKey } = JSON.parse(fs.readFileSync(file, "utf8"));
  return privateKeyToAccount(privateKey);
}

export function walletFor(account) {
  return createWalletClient({ account, chain: monad, transport: http() });
}

export const AGENT_FILE = path.join(here, "ths-agent.json");

/** The registered Token Health Scan agent (written by register-ths.mjs). */
export function loadAgent() {
  return JSON.parse(fs.readFileSync(AGENT_FILE, "utf8"));
}

export const tx = (hash) => `https://monadvision.com/tx/${hash}`;
