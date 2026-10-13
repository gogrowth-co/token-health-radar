// Registers Token Health Scan as an ERC-8004 agent on Monad mainnet.
//
// Run with the payee wallet (the address that receives x402 USDC on Monad). The Identity Registry
// records the caller as the agent's wallet, so a client can check that an x402 quote pays the
// registered agent before it signs anything (see pay-scan.mjs).
//
// The agent card is stored fully onchain as a data: URI, so it cannot rot with a web server.
//   node register-ths.mjs            -> mint identity + write agent card
//   node register-ths.mjs --update   -> rewrite the card for an existing agentId
import fs from "node:fs";
import { decodeEventLog, parseAbiItem } from "viem";
import {
  AGENT_FILE, IDENTITY_REGISTRY, NETWORK, SCAN_ENDPOINT, identityAbi, loadAccount, publicClient, tx, walletFor,
} from "./lib.mjs";

const account = loadAccount("monad-payee");
const wallet = walletFor(account);

function card(agentId) {
  const doc = {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Token Health Scan",
    description:
      "Token risk API for agents. 0-100 health score across security, liquidity, tokenomics, community and " +
      "development for tokens on Ethereum, Base, BNB Chain, Polygon, Arbitrum and Solana. Pay per scan with x402: " +
      "0.02 USDC on Monad or Solana, no account or API key. USDC only settles after a scored result; unscored tokens are free.",
    image: "https://tokenhealthscan.com/og-image.png",
    services: [
      { name: "web", endpoint: "https://tokenhealthscan.com/agent-payments" },
      { name: "x402", endpoint: SCAN_ENDPOINT, version: "2", networks: [NETWORK, "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"] },
      { name: "MCP", endpoint: "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/token-health-mcp", version: "2025-06-18" },
    ],
    x402Support: true,
    active: true,
    registrations: agentId === undefined ? [] : [{ agentId: Number(agentId), agentRegistry: `${NETWORK}:${IDENTITY_REGISTRY}` }],
    supportedTrust: ["reputation"],
  };
  return "data:application/json;base64," + Buffer.from(JSON.stringify(doc)).toString("base64");
}

async function send(functionName, args) {
  const { request } = await publicClient.simulateContract({
    account, address: IDENTITY_REGISTRY, abi: identityAbi, functionName, args,
  });
  const hash = await wallet.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${functionName} reverted: ${tx(hash)}`);
  console.log(`${functionName}: ${tx(hash)}`);
  return receipt;
}

let agentId;
if (process.argv.includes("--update")) {
  agentId = BigInt(JSON.parse(fs.readFileSync(AGENT_FILE, "utf8")).agentId);
} else {
  if (fs.existsSync(AGENT_FILE)) throw new Error(`${AGENT_FILE} exists: already registered. Use --update.`);
  const receipt = await send("register", [card()]);
  const registered = parseAbiItem("event Registered(uint256 indexed agentId, string agentURI, address indexed owner)");
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== IDENTITY_REGISTRY.toLowerCase()) continue;
    try {
      const ev = decodeEventLog({ abi: [registered], data: log.data, topics: log.topics });
      agentId = ev.args.agentId;
    } catch { /* other event */ }
  }
  if (agentId === undefined) throw new Error("Registered event not found");
  fs.writeFileSync(AGENT_FILE, JSON.stringify({
    agentId: agentId.toString(), registry: IDENTITY_REGISTRY, network: NETWORK, owner: account.address,
    registeredTx: receipt.transactionHash,
  }, null, 2) + "\n");
}

// Second write: the card now names its own agentId, as the spec's registrations field expects.
await send("setAgentURI", [agentId, card(agentId)]);
const agentWallet = await publicClient.readContract({ address: IDENTITY_REGISTRY, abi: identityAbi, functionName: "getAgentWallet", args: [agentId] });
console.log(`agentId ${agentId}, agentWallet ${agentWallet}`);
console.log(`8004scan: https://8004scan.io/agents/monad/${agentId}`);
