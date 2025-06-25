
export default function TokenDistribution() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">Token Distribution Logic</h2>
      
      <p className="text-lg text-muted-foreground mb-8 max-w-4xl mx-auto text-center">
        Once a token goes live, the way it's distributed can shape everything from price movement to community engagement to long-term sustainability. In Solana's launchpad ecosystem, distribution models vary wildly — from pure degen chaos to slow-governance equity structures.
      </p>

      <div className="space-y-8">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-2xl font-bold mb-4 text-green-600">Fair Launch (No Preallocation)</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-2">Pump.fun, Letsbonk.fun</h4>
              <p className="text-sm text-muted-foreground mb-4">100% of tokens are distributed via the bonding curve. There are no team allocations, private rounds, or pre-mines. Everyone gets in from the same price curve (if they're fast enough).</p>
              
              <h4 className="font-semibold mb-2">Believe App</h4>
              <p className="text-sm text-muted-foreground">Similar to Pump, though some tokens use custom setups or external LPs post-launch. Still fair in spirit, but slightly more flexible.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Boop.fun</h4>
              <p className="text-sm text-muted-foreground mb-4">Unclear. Given the invite-only nature, it's possible there are pre-allocations or internal rules, but no data confirms this yet.</p>
              
              <h4 className="font-semibold mb-2">MetaDAO</h4>
              <p className="text-sm text-muted-foreground mb-4">Not a fair launch in the traditional sense. Token allocations are determined via governance proposals. Funding is distributed based on mission alignment and community votes, not speculation.</p>
              
              <h4 className="font-semibold mb-2">Devfun</h4>
              <p className="text-sm text-muted-foreground">Still evolving. Likely to offer multiple distribution options, possibly combining fair launches with dev-specific vesting.</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-2xl font-bold mb-4 text-blue-600">LP Ownership</h3>
          <div className="space-y-4">
            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-semibold">Believe App</h4>
              <p className="text-sm text-muted-foreground">Tokens are automatically paired with SOL via Meteora, and LP tokens are held by the project wallet or community treasury (details vary). This adds initial liquidity but may introduce centralization depending on how LPs are managed.</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">Pump.fun, Letsbonk.fun</h4>
              <p className="text-sm text-muted-foreground">No auto LP. Liquidity is manually seeded by the community or creators post-launch. This creates high volatility early on but gives creators full control.</p>
            </div>
            <div className="border-l-4 border-red-500 pl-4">
              <h4 className="font-semibold">MetaDAO</h4>
              <p className="text-sm text-muted-foreground">Doesn't launch tokens in the traditional sense. Any liquidity decisions are post-funding and governed by proposal outcomes.</p>
            </div>
          </div>
        </div>

        <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-lg border border-red-200 dark:border-red-800/30">
          <h3 className="text-xl font-bold mb-4 text-red-600">Notes & Risks</h3>
          <ul className="space-y-2 text-sm">
            <li>• <strong>Bonding curves can backfire:</strong> if whales buy early and dump fast, retail traders get wrecked.</li>
            <li>• <strong>No vesting means nothing prevents instant dumps,</strong> which fuels volatility.</li>
            <li>• <strong>Manual LP models can lead to either massive spikes or rug-pull risk,</strong> depending on community trust.</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
