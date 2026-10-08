// Scan-before-entry gate for an LP agent (reference integration, used by Sasha Coin).
//
// 1. Read candidate pools from Byreal (Solana CLMM): launchpad and normal pools with real volume.
// 2. For every non-quote token, pay Token Health Scan 0.02 USDC over x402 and get a 0-100 verdict.
// 3. Decide: cleared (a pool may be considered for entry) or blocked (with the reason). Log everything,
//    including the Solana transaction that paid for each scan.
//
// The gate never opens a position. It only decides which candidates the agent is allowed to look at next.
//
//   SOLANA_KEYPAIR_PATH=<keypair.json> node gate.mjs                 # screen up to 10 tokens, spend cap 0.50 USDC
//   GATE_MAX_TOKENS=5 GATE_MAX_SPEND_USDC=0.20 SOLANA_KEYPAIR_PATH=... node gate.mjs
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { toClientSvmSigner } from "@x402/svm";
import { createKeyPairSignerFromBytes } from "@solana/kit";

const KEY = process.env.SOLANA_KEYPAIR_PATH;
const ENDPOINT = process.env.THS_X402_URL ?? "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1/x402-scan";
const MAX_TOKENS = Number(process.env.GATE_MAX_TOKENS ?? 10);
const MAX_SPEND = Number(process.env.GATE_MAX_SPEND_USDC ?? 0.5);
const MIN_TVL = Number(process.env.GATE_MIN_TVL_USD ?? 50_000);
const MIN_VOL = Number(process.env.GATE_MIN_VOLUME_24H_USD ?? 10_000);
const OUT_DIR = process.env.GATE_OUT_DIR ?? "./out";
const RESCAN_AFTER_MS = 24 * 3600_000;

// Gate thresholds. Documented, not tuned to the results.
const RULE = { minOverall: 60, minSecurity: 50, minLiquidity: 40 };

// Quote and blue-chip assets are not what the gate is for.
const SKIP_SYMBOLS = new Set(["SOL", "WSOL", "USDC", "USDT", "USD1", "PYUSD", "USDS", "JITOSOL", "MSOL", "BBSOL", "JUPSOL", "BTC", "WBTC", "CBBTC", "ETH", "WETH"]);

if (!KEY) {
  console.error("SOLANA_KEYPAIR_PATH is required");
  process.exit(2);
}

function byreal(args) {
  const out = execFileSync("byreal-cli", ["--non-interactive", "-o", "json", ...args], { encoding: "utf8", maxBuffer: 20_000_000 });
  return JSON.parse(out).data.pools;
}

function candidates() {
  const pools = [
    ...byreal(["pools", "list", "--sort-field", "volumeUsd24h", "--page-size", "40", "--category", "4"]),
    ...byreal(["pools", "list", "--sort-field", "volumeUsd24h", "--page-size", "40", "--category", "16"]),
  ];
  const byMint = new Map();
  for (const p of pools) {
    if (p.tvl_usd < MIN_TVL || p.volume_24h_usd < MIN_VOL) continue;
    for (const t of [p.token_a, p.token_b]) {
      if (SKIP_SYMBOLS.has(String(t.symbol).toUpperCase())) continue;
      const prev = byMint.get(t.mint);
      if (!prev || p.volume_24h_usd > prev.volume_24h_usd) {
        byMint.set(t.mint, { mint: t.mint, symbol: t.symbol, pair: p.pair, poolId: p.id, tvlUsd: Math.round(p.tvl_usd), volume24hUsd: Math.round(p.volume_24h_usd), aprPct: Math.round(p.total_apr * 100) / 100, volume_24h_usd: p.volume_24h_usd });
      }
    }
  }
  return [...byMint.values()].sort((a, b) => b.volume_24h_usd - a.volume_24h_usd);
}

function decide(r) {
  if (typeof r.overall_score !== "number") return { decision: "blocked", reason: `not scored: ${r.overall_reason ?? "not enough verified data"}` };
  const fails = [];
  if (r.overall_score < RULE.minOverall) fails.push(`overall ${r.overall_score} < ${RULE.minOverall}`);
  if ((r.scores?.security ?? 0) < RULE.minSecurity) fails.push(`security ${r.scores?.security ?? "n/a"} < ${RULE.minSecurity}`);
  if ((r.scores?.liquidity ?? 0) < RULE.minLiquidity) fails.push(`liquidity ${r.scores?.liquidity ?? "n/a"} < ${RULE.minLiquidity}`);
  return fails.length ? { decision: "blocked", reason: fails.join("; ") } : { decision: "cleared", reason: `overall ${r.overall_score}, security ${r.scores.security}, liquidity ${r.scores.liquidity}` };
}

mkdirSync(OUT_DIR, { recursive: true });
const logPath = `${OUT_DIR}/decisions.json`;
const log = existsSync(logPath) ? JSON.parse(readFileSync(logPath, "utf8")) : [];
const spentBefore = log.reduce((s, d) => s + (d.usdc ?? 0), 0);
const recent = new Set(log.filter((d) => Date.now() - Date.parse(d.at) < RESCAN_AFTER_MS && d.tx).map((d) => d.mint));

const signer = toClientSvmSigner(await createKeyPairSignerFromBytes(Uint8Array.from(JSON.parse(readFileSync(KEY, "utf8")))));
const paidFetch = wrapFetchWithPayment(fetch, new x402Client().register("solana:*", new ExactSvmScheme(signer)));

const queue = candidates().filter((c) => !recent.has(c.mint)).slice(0, MAX_TOKENS);
console.log(`candidates to screen: ${queue.length} (cap ${MAX_TOKENS} tokens, ${MAX_SPEND} USDC this run)`);

let spent = 0;
for (const c of queue) {
  if (spent + 0.02 > MAX_SPEND + 1e-9) {
    console.log("spend cap reached, stopping");
    break;
  }
  const entry = { at: new Date().toISOString(), mint: c.mint, symbol: c.symbol, pair: c.pair, poolId: c.poolId, tvlUsd: c.tvlUsd, volume24hUsd: c.volume24hUsd, aprPct: c.aprPct };
  try {
    const res = await paidFetch(`${ENDPOINT}?chain=solana&address=${encodeURIComponent(c.mint)}`);
    const body = await res.json();
    if (res.status === 422) {
      // Scanner could not verify enough data for a verdict: nothing was charged.
      Object.assign(entry, { decision: "blocked", reason: `not scored (not charged): ${body.partial?.overall_reason ?? "not enough verified data"}`, overall: null, scores: body.partial?.scores, usdc: 0 });
      log.push(entry);
      writeFileSync(logPath, JSON.stringify(log, null, 2));
      console.log(`${entry.decision.padEnd(8)} ${String(entry.symbol).padEnd(12)} ${entry.reason}`);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`);
    const receipt = res.headers.get("PAYMENT-RESPONSE");
    const settled = receipt ? decodePaymentResponseHeader(receipt) : null;
    Object.assign(entry, decide(body), {
      overall: body.overall_score, scores: body.scores, verdict: body.verdict, scoringVersion: body.scoring_version,
      tx: settled?.transaction ?? body.payment?.transaction, explorer: body.payment?.explorer, usdc: 0.02,
    });
    spent += 0.02;
  } catch (e) {
    Object.assign(entry, { decision: "error", reason: String(e.message ?? e).slice(0, 300), usdc: 0 });
  }
  log.push(entry);
  writeFileSync(logPath, JSON.stringify(log, null, 2));
  console.log(`${entry.decision.padEnd(8)} ${String(entry.symbol).padEnd(12)} ${entry.reason}`);
}
console.log(JSON.stringify({ screened: queue.length, spentThisRunUsdc: Math.round(spent * 100) / 100, totalSpentUsdc: Math.round((spentBefore + spent) * 100) / 100, log: logPath }));
