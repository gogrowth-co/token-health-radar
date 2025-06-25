
export default function ToolsDashboards() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">What's Next: Tools & Dashboards</h2>
      
      <p className="text-lg text-muted-foreground mb-8 max-w-4xl mx-auto text-center">
        Picking the right launchpad is only the first step. To navigate this ecosystem with clarity, you'll need the right dashboards and tracking tools — especially if you're investing, advising, or preparing for your own token launch.
      </p>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4 text-blue-600">Solscan: Watch the Tokens, Not Just the Platform</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Solscan remains one of the most flexible block explorers for tracking token-level activity across launchpads.
          </p>
          <div className="space-y-2 text-sm">
            <p><strong>Use it to:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Monitor contract creation, liquidity depth, and mint authority</li>
              <li>Spot rug risks early (no LP lock, no renounced ownership, etc.)</li>
              <li>Filter recent launches by volume spikes or unique holders</li>
            </ul>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4 text-purple-600">Dune: Build the Dashboard You Wish You Had</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Dune lets you turn blockchain data into powerful visualizations — if someone hasn't already.
          </p>
          <div className="space-y-2 text-sm">
            <p><strong>Metrics that matter:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Token graduation rate (launch → trading on Jupiter, Orca, etc.)</li>
              <li>Volume over time per launchpad (not just 24h spikes)</li>
              <li>User behavior (wallets that participate in multiple launches)</li>
              <li>Cross-launchpad trends</li>
            </ul>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4 text-green-600">TokenHealthScan (THS): Score Before You Ape</h3>
          <p className="text-sm text-muted-foreground mb-4">
            THS offers a layer of real-time token scanning built specifically for early-stage tokens — including those launched via Solana's new-gen platforms.
          </p>
          <div className="space-y-2 text-sm">
            <p><strong>What it adds:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>A 5-pillar scorecard: Security, Liquidity, Tokenomics, Community, Development</li>
              <li>Auto-generated token safety reports for investors</li>
              <li>Integrations with GoPlus, GeckoTerminal, and GitHub</li>
              <li>Visual indicators for contract risks, LP locks, and whale holders</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-6 rounded-lg mt-8">
        <h3 className="text-xl font-bold mb-4">Pro Tip: Layer Your Analysis</h3>
        <p className="text-muted-foreground">
          Don't rely on just one tool. The best token analysts combine onchain data (Solscan), custom dashboards (Dune), and risk scoring (TokenHealthScan) to get a complete picture. Each tool reveals different aspects of token health and market dynamics.
        </p>
      </div>

      <div className="mt-8">
        <iframe 
          width="100%" 
          height="315" 
          src="https://www.youtube.com/embed/G6bHIO_PsEM" 
          title="The Next Chapter for Pump.Fun with Co-Founder Alon"
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
          className="rounded-lg"
        ></iframe>
        <p className="text-sm text-muted-foreground mt-2 text-center">
          The Next Chapter for Pump.Fun with Co-Founder Alon
        </p>
      </div>
    </section>
  );
}
