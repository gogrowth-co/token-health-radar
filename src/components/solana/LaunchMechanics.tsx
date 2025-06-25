
export default function LaunchMechanics() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">Launch Mechanics Breakdown</h2>
      
      <p className="text-lg text-muted-foreground mb-8 max-w-4xl mx-auto text-center">
        Behind every token launch is a set of mechanics that determines how fast a coin goes live, who can access it, and what kind of liquidity forms around it. On Solana, launchpads are getting increasingly creative — and chaotic — with how they structure this.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">Launch Flow</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Pump.fun, Letsbonk.fun</h4>
              <p className="text-sm text-muted-foreground">Instant, permissionless launch. Fill out a quick form, pay a fee in SOL, and your token is live. No approval, no waiting.</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">Boop.fun</h4>
              <p className="text-sm text-muted-foreground">Invite-only and less transparent. The launch form appears only for accepted users, adding a layer of curation.</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold">Devfun</h4>
              <p className="text-sm text-muted-foreground">Still early-stage. Appears to allow more tailored launch setups, possibly even for utility tokens.</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-semibold">Believe App</h4>
              <p className="text-sm text-muted-foreground">Users submit a proposal-like form. Slightly more curated than Pump.fun but still fast and meme-friendly.</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold">MetaDAO</h4>
              <p className="text-sm text-muted-foreground">Entirely different flow. Founders participate in a futarchy-style governance process, proposing public goods or missions, with community backers voting using funding commitments.</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">Bonding Curves</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Pump.fun, Letsbonk.fun</h4>
              <p className="text-sm text-muted-foreground">Classic bonding curve. Early buyers get in cheaper, and price rises with demand. Good for early hype, but risky when liquidity dries up.</p>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">Boop.fun</h4>
              <p className="text-sm text-muted-foreground">Unknown mechanics, possibly bonding curve with capped or gamified elements. Needs validation.</p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-semibold">Believe App</h4>
              <p className="text-sm text-muted-foreground">Uses dynamic bonding curves with an automatic LP setup via Meteora. Helps with deeper liquidity right after launch.</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold">MetaDAO</h4>
              <p className="text-sm text-muted-foreground">No bonding curve. Funds are allocated via quadratic voting and collective decision-making — entirely outside the "buy-low-sell-high" pump model.</p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold">Devfun</h4>
              <p className="text-sm text-muted-foreground">Unknown, likely more customizable or dev-configurable (needs deeper validation).</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">Tweet-to-Launch Mechanics</h3>
          <div className="space-y-3">
            <p><strong>Pump.fun & Believe App:</strong> Tightly integrated with Twitter. Once your token launches, it immediately creates a tweet-ready link and campaign. Designed for virality loops.</p>
            <p><strong>Letsbonk.fun:</strong> Not integrated in the same way, but tokens often go viral via community-driven tweets.</p>
            <p><strong>MetaDAO & Devfun:</strong> No social automation built-in — more focused on builders, not influencers.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">KYC and Legal Risk</h3>
          <div className="space-y-3">
            <p><strong>Pump.fun, Letsbonk.fun, Boop.fun, Devfun:</strong> No KYC, no filtering, and no accountability. These platforms operate in the gray area of crypto law — exciting but dangerous.</p>
            <p><strong>Believe App:</strong> No KYC but slightly more curated. Still high risk in terms of regulatory exposure.</p>
            <p><strong>MetaDAO:</strong> Built for public goods and governance-based launches. Could still face scrutiny but has a more defensible, protocol-aligned structure.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
