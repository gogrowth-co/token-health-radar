
import { Badge } from "@/components/ui/badge";

export default function TokenSnifferSection() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">Token Sniffer: Quick Safety Checks, Limited Context</h2>
      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
        Token Sniffer is a free, user-friendly tool that offers immediate feedback on the security and basic characteristics of Ethereum-based token contracts. It's designed for quick evaluations, providing essential information without requiring a login or any personal details.
      </p>
      
      <div className="grid gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">✅</Badge>
          <span>Smart Contract Risk Score (0–100) based on common vulnerabilities</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">✅</Badge>
          <span>Honeypot Detection — flags contracts that trap buyers</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">✅</Badge>
          <span>Buy/Sell Tax Analysis</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">✅</Badge>
          <span>Mint Function Detection</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="default" className="bg-green-500">✅</Badge>
          <span>Free and Anonymous access — no login needed</span>
        </div>
      </div>
      
      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
        Token Sniffer is ideal for fast, one-click checks before impulse trades or DEX swaps.
      </p>

      <h3 className="text-xl font-bold mb-4">Token Sniffer Limitations</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border rounded-lg">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-3 text-left font-semibold">Limitation</th>
              <th className="border border-border p-3 text-left font-semibold">Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-3">❌ No Liquidity Data</td>
              <td className="border border-border p-3">No visibility into volume, locks, or top holders</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="border border-border p-3">❌ No Tokenomics Breakdown</td>
              <td className="border border-border p-3">Doesn't explain supply, emissions, or vesting</td>
            </tr>
            <tr>
              <td className="border border-border p-3">❌ No Community or Dev Metrics</td>
              <td className="border border-border p-3">Can't gauge project activity or credibility</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="border border-border p-3">❌ No Ongoing Monitoring</td>
              <td className="border border-border p-3">Only provides a one-time snapshot</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
