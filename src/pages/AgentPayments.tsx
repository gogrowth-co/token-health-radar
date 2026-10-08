import { useEffect, useState } from "react";
import { Helmet } from "@/components/ui/helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink } from "lucide-react";

const FUNCTIONS_URL = "https://qaqebpcqespvzbfwawlp.supabase.co/functions/v1";
const REPO_DOCS = "https://github.com/gogrowth-co/token-health-radar/blob/main/docs/x402.md";

// Sasha Coin's public Solana wallet. Payments from it are labeled as the live agent.
const SASHA_WALLET = "647TT6SWA48yrmH8Csb2QakeYMnCNh2oSFijLQpRksJw";

// Sasha's entry rule (examples/x402-agent-client/gate.mjs). Applied here to the stored scores, so anyone can reproduce it.
const RULE = { minOverall: 60, minSecurity: 50, minLiquidity: 40 };

interface LedgerPayment {
  settled_at: string;
  payer: string | null;
  tx_signature: string;
  token_address: string;
  token_symbol: string | null;
  chain: string;
  overall_score: number | null;
  scores: Record<string, number | null> | null;
  usdc: number;
  explorer: string;
  channel: "http" | "mcp";
}

interface Ledger {
  totals: { settled_payments: number; usdc: number };
  payments: LedgerPayment[];
}

function gateDecision(p: LedgerPayment): { cleared: boolean; reason: string } {
  if (typeof p.overall_score !== "number") return { cleared: false, reason: "not scored" };
  const fails: string[] = [];
  if (p.overall_score < RULE.minOverall) fails.push(`overall ${p.overall_score} < ${RULE.minOverall}`);
  if ((p.scores?.security ?? 0) < RULE.minSecurity) fails.push(`security < ${RULE.minSecurity}`);
  if ((p.scores?.liquidity ?? 0) < RULE.minLiquidity) fails.push(`liquidity < ${RULE.minLiquidity}`);
  return fails.length ? { cleared: false, reason: fails.join(", ") } : { cleared: true, reason: "meets rule" };
}

const short = (s: string, n = 4) => (s.length > n * 2 + 1 ? `${s.slice(0, n)}…${s.slice(-n)}` : s);

export default function AgentPayments() {
  const [ledger, setLedger] = useState<Ledger | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch(`${FUNCTIONS_URL}/x402-ledger?limit=200`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Ledger;
        if (alive) {
          setLedger(data);
          setError(false);
        }
      } catch {
        if (alive) setError(true);
      }
    };
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const payers = ledger ? new Set(ledger.payments.map((p) => p.payer).filter(Boolean)).size : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Pay-per-scan token risk API for AI agents (x402, USDC on Solana) | Token Health Scan</title>
        <meta
          name="description"
          content="AI agents pay 0.02 USDC per Token Health Scan over x402. No account, no API key. USDC only moves after a successful scan. Every payment is public."
        />
      </Helmet>
      <Navbar />
      <main className="container mx-auto max-w-5xl px-4 py-12 space-y-12">
        <section className="space-y-4">
          <Badge variant="secondary">x402 · USDC on Solana · MCP</Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Token risk checks that AI agents can pay for</h1>
          <p className="text-lg text-muted-foreground max-w-3xl">
            An agent calls the API, gets a price, pays 0.02 USDC, and receives a 0-100 health score across security, liquidity,
            tokenomics, community and development. No account. No API key. USDC only moves after the scan succeeds, and if the
            scanner cannot verify enough data for a verdict, the agent is not charged.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Settled payments", value: ledger ? String(ledger.totals.settled_payments) : null },
            { label: "USDC received", value: ledger ? ledger.totals.usdc.toFixed(2) : null },
            { label: "Paying agents", value: ledger ? String(payers) : null },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
              </CardHeader>
              <CardContent>{s.value === null ? <Skeleton className="h-9 w-20" /> : <div className="text-3xl font-bold">{s.value}</div>}</CardContent>
            </Card>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Live payment ledger</h2>
          <p className="text-muted-foreground">
            Every row is a real USDC transfer on Solana mainnet. Open the transaction to check the payer, the payee and the amount
            yourself. The outcome column applies Sasha Coin&apos;s entry rule (overall ≥ {RULE.minOverall}, security ≥ {RULE.minSecurity}, liquidity ≥{" "}
            {RULE.minLiquidity}) to the stored scores. Sasha screens candidate pools with it before it looks at them; the screen never
            opens a position.
          </p>
          {error && <p className="text-sm text-destructive">Could not load the ledger. Try again in a moment.</p>}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-3">Time (UTC)</th>
                  <th className="p-3">Agent</th>
                  <th className="p-3">Token</th>
                  <th className="p-3">Score</th>
                  <th className="p-3">Entry rule</th>
                  <th className="p-3">USDC</th>
                  <th className="p-3">Proof</th>
                </tr>
              </thead>
              <tbody>
                {!ledger &&
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={7} className="p-3">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    </tr>
                  ))}
                {ledger?.payments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No settled payments yet.
                    </td>
                  </tr>
                )}
                {ledger?.payments.map((p) => {
                  const d = gateDecision(p);
                  return (
                    <tr key={p.tx_signature} className="border-t">
                      <td className="p-3 whitespace-nowrap">{p.settled_at.slice(0, 16).replace("T", " ")}</td>
                      <td className="p-3 whitespace-nowrap">
                        {p.payer === SASHA_WALLET ? <Badge>Sasha Coin (live agent)</Badge> : <span className="font-mono">{p.payer ? short(p.payer) : "unknown"}</span>}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="font-medium">{p.token_symbol ?? "?"}</span> <span className="font-mono text-muted-foreground">{short(p.token_address)}</span>
                      </td>
                      <td className="p-3">{typeof p.overall_score === "number" ? p.overall_score : "n/a"}</td>
                      <td className="p-3 whitespace-nowrap">
                        <Badge variant={d.cleared ? "default" : "outline"}>{d.cleared ? "cleared" : "blocked"}</Badge>{" "}
                        <span className="text-muted-foreground">{d.reason}</span>
                      </td>
                      <td className="p-3">{p.usdc.toFixed(2)}</td>
                      <td className="p-3">
                        <a className="inline-flex items-center gap-1 underline" href={p.explorer} target="_blank" rel="noopener noreferrer">
                          {short(p.tx_signature, 5)} <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">How an agent pays</h2>
          <ol className="list-decimal pl-6 space-y-2 text-muted-foreground">
            <li>Call the endpoint. The server answers HTTP 402 with the price, the USDC mint and the payee.</li>
            <li>The agent signs a USDC transfer and retries with a <code>PAYMENT-SIGNATURE</code> header. The facilitator pays the network fee.</li>
            <li>The server verifies the payment, runs the scan, and only then settles. A failed scan or an unscored token costs nothing.</li>
            <li>The response carries the verdict and a link to the settled Solana transaction.</li>
          </ol>
          <pre className="overflow-x-auto rounded-lg border bg-muted/40 p-4 text-sm">
{`# 1. see the price (HTTP 402 + PAYMENT-REQUIRED header)
curl -i "${FUNCTIONS_URL}/x402-scan?chain=solana&address=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN"

# 2. pay and scan with the x402 client (Node)
SOLANA_KEYPAIR_PATH=~/.config/solana/id.json node pay-scan.mjs solana <token-address>

# MCP: tool "scan_token" on ${FUNCTIONS_URL}/token-health-mcp`}
          </pre>
          <p className="text-sm text-muted-foreground">
            Scans Ethereum, BNB Chain, Base, Arbitrum, Polygon and Solana. Open source (MIT):{" "}
            <a className="underline" href={REPO_DOCS} target="_blank" rel="noopener noreferrer">
              docs, client and server code
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
