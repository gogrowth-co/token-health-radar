
import { Badge } from "@/components/ui/badge";

export default function TokenHealthScanSection() {
  return (
    <section className="mb-12">
      <h2 className="text-2xl md:text-3xl font-bold mb-6">TokenHealthScan: Multi-Dimensional Token Due Diligence</h2>
      
      <h3 className="text-xl font-bold mb-4">What Is TokenHealthScan?</h3>
      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
        TokenHealthScan is a comprehensive scanner designed to evaluate a token's long-term viability, moving beyond merely assessing immediate contract safety. It provides an in-depth analysis of various crucial aspects that contribute to a token's sustainable success and investment potential.
      </p>

      <img 
        src="/lovable-uploads/token-health-scan-product.png" 
        alt="TokenHealthScan dashboard interface showing token risk analysis, liquidity data, community metrics, and token health scores" 
        className="w-full max-w-4xl h-auto rounded-lg shadow-lg mb-6 mx-auto"
        loading="lazy"
      />

      <div className="grid gap-3 mb-6">
        <div className="flex items-center gap-2">
          <Badge variant="blue">Security</Badge>
          <span>Contract audits, honeypot tests, ownership risks</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="blue">Liquidity</Badge>
          <span>Volume, locked liquidity, top holders, slippage risk</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="blue">Tokenomics</Badge>
          <span>Supply structure, emissions, utility mechanics</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="blue">Community</Badge>
          <span>Social engagement, holder behavior, team visibility</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="blue">Development</Badge>
          <span>GitHub activity, roadmap progress, and repository health</span>
        </div>
      </div>

      <p className="text-lg text-muted-foreground mb-6 leading-relaxed italic">
        Analogy: Token Sniffer is a smoke detector. TokenHealthScan is a full home inspection.
      </p>

      <h3 className="text-xl font-bold mb-4">Verified Data Sources</h3>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border rounded-lg">
          <thead>
            <tr className="bg-muted">
              <th className="border border-border p-3 text-left font-semibold">Source</th>
              <th className="border border-border p-3 text-left font-semibold">Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border p-3">GoPlus Security</td>
              <td className="border border-border p-3">Contract audits, honeypot detection</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="border border-border p-3">GeckoTerminal / Etherscan</td>
              <td className="border border-border p-3">Liquidity locks, top wallets</td>
            </tr>
            <tr>
              <td className="border border-border p-3">CoinGecko / DeFiLlama</td>
              <td className="border border-border p-3">Price, market cap, TVL</td>
            </tr>
            <tr className="bg-muted/50">
              <td className="border border-border p-3">Twitter (via Apify)</td>
              <td className="border border-border p-3">Community and team visibility</td>
            </tr>
            <tr>
              <td className="border border-border p-3">GitHub</td>
              <td className="border border-border p-3">Developer activity and commit history</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
