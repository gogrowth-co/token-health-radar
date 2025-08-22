import { Link } from "react-router-dom";

export default function ToolsDashboards() {
  return (
    <section className="mb-8 md:mb-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">What's Next: Tools & Dashboards</h2>
      
      <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-4xl mx-auto text-center px-4">
        Picking the right launchpad is only the first step. To navigate this ecosystem with clarity, you'll need the right dashboards and tracking tools — especially if you're investing, advising, or preparing for your own token launch.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-blue-600">Solscan: Watch the Tokens, Not Just the Platform</h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            Solscan remains one of the most flexible block explorers for tracking token-level activity across launchpads.
          </p>
          <div className="space-y-2 text-xs md:text-sm">
            <p><strong>Use it to:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Monitor contract creation, liquidity depth, and mint authority</li>
              <li>Spot rug risks early (no LP lock, no renounced ownership, etc.)</li>
              <li>Filter recent launches by volume spikes or unique holders</li>
            </ul>
          </div>
        </div>

        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-purple-600">Dune: Build the Dashboard You Wish You Had</h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            Dune lets you turn blockchain data into powerful visualizations — if someone hasn't already.
          </p>
          <div className="space-y-2 text-xs md:text-sm">
            <p><strong>Metrics that matter:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Token graduation rate (launch → trading on Jupiter, Orca, etc.)</li>
              <li>Volume over time per launchpad (not just 24h spikes)</li>
              <li>User behavior (wallets that participate in multiple launches)</li>
              <li>Cross-launchpad trends</li>
            </ul>
          </div>
        </div>

        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4 text-green-600">TokenHealthScan: Score Before You Ape</h3>
          <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
            <Link to="/" className="text-blue-600 hover:underline">TokenHealthScan</Link> offers a layer of real-time token scanning built specifically for early-stage tokens — including those launched via Solana's new-gen platforms. <Link to="/token-scan-guide" className="text-blue-600 hover:underline">Learn how token scanning works</Link> or see how we <Link to="/token-sniffer-comparison" className="text-blue-600 hover:underline">compare to Token Sniffer</Link>.
          </p>
          <div className="space-y-2 text-xs md:text-sm">
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

      <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 p-4 md:p-6 rounded-lg mt-6 md:mt-8">
        <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Pro Tip: Layer Your Analysis</h3>
        <p className="text-muted-foreground text-sm md:text-base">
          Don't rely on just one tool. The best token analysts combine onchain data (Solscan), custom dashboards (Dune), and risk scoring (TokenHealthScan) to get a complete picture. Each tool reveals different aspects of token health and market dynamics.
        </p>
      </div>

      <div className="mt-6 md:mt-8">
        <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
          <iframe 
            className="absolute top-0 left-0 w-full h-full rounded-lg"
            src="https://www.youtube.com/embed/G6bHIO_PsEM" 
            title="The Next Chapter for Pump.Fun with Co-Founder Alon - Interview about Solana launchpad future"
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>
        <p className="text-xs md:text-sm text-muted-foreground mt-2 text-center">
          The Next Chapter for Pump.Fun with Co-Founder Alon
        </p>
      </div>
    </section>
  );
}
