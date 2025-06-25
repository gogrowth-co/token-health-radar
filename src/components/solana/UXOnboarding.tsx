
export default function UXOnboarding() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">UX + Community Onboarding</h2>
      
      <p className="text-lg text-muted-foreground mb-8 max-w-4xl mx-auto text-center">
        When it comes to launching or discovering tokens, the experience around the token is often just as important as the token itself. Let's break down how each Solana launchpad approaches UX and onboarding, from a user's very first click to community vibes.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <img src="/lovable-uploads/pumpfun1.png" alt="Pump.fun interface" className="w-full max-w-md rounded mr-3" />
          </div>
          <h3 className="text-xl font-bold mb-4">Pump.fun</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Discovery:</strong> Feeds you the meme firehose. New tokens constantly refresh, sorted by volume or time created.</p>
            <p><strong>Wallet Connection:</strong> Clean, instant. One-click with Phantom, no KYC.</p>
            <p><strong>Token List Navigation:</strong> Scroll-and-refresh interface with trending and recently launched tokens.</p>
            <p><strong>Virality Layer:</strong> Tweet-to-launch creates an immediate community moment. Feels chaotic—but on purpose.</p>
            <p className="text-muted-foreground italic"><strong>UX Verdict:</strong> Feels like a meme slot machine. Zero friction, infinite scroll. Addictive, but not built for long-term token lifecycle.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <img src="/lovable-uploads/letsbonk1.png" alt="Letsbonk.fun interface" className="w-full max-w-md rounded mr-3" />
          </div>
          <h3 className="text-xl font-bold mb-4">Letsbonk.fun</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Discovery:</strong> Similar grid-style layout as Pump, but with real-time stats like "Heating Up" and "Last Trade."</p>
            <p><strong>Wallet Connection:</strong> Seamless. Phantom and other common Solana wallets.</p>
            <p><strong>Token List Navigation:</strong> Cleaner categorization, with a functioning search bar and token watchlist.</p>
            <p><strong>Virality Layer:</strong> Lacks tweet-to-launch, but emphasizes "What's hot right now" on-platform.</p>
            <p className="text-muted-foreground italic"><strong>UX Verdict:</strong> Slightly more structured than Pump. Good for degens who want a bit more signal with their chaos.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <img src="/lovable-uploads/believeapp1.png" alt="Believe App interface" className="w-full max-w-md rounded mr-3" />
          </div>
          <h3 className="text-xl font-bold mb-4">Believe App</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Discovery:</strong> Feels more curated. Homepage showcases top launches and upcoming tokens.</p>
            <p><strong>Wallet Connection:</strong> Required for launch interaction. Supports standard Solana wallets.</p>
            <p><strong>Token List Navigation:</strong> Emphasizes live bonding curve charts, social links, and token metrics.</p>
            <p><strong>Virality Layer:</strong> Integrates tweet-to-launch like Pump, but paired with Meteora LP creation.</p>
            <p className="text-muted-foreground italic"><strong>UX Verdict:</strong> Better suited for founders who care about branding and token page aesthetics. More "Web3 product" than meme casino.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <img src="/lovable-uploads/boopfun1.png" alt="Boop.fun interface" className="w-full max-w-md rounded mr-3" />
          </div>
          <h3 className="text-xl font-bold mb-4">Boop.fun</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Discovery:</strong> Invite-only means less browsing, more direct links.</p>
            <p><strong>Wallet Connection:</strong> Smooth, minimal friction.</p>
            <p><strong>Token List Navigation:</strong> Unknown (due to lack of open token feed).</p>
            <p><strong>Virality Layer:</strong> N/A — designed to be controlled and polished.</p>
            <p className="text-muted-foreground italic"><strong>UX Verdict:</strong> Feels premium. Less meme-y, more like a soft launchpad for stealth projects or friends.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <img src="/lovable-uploads/devfun1.png" alt="Devfun interface" className="w-full max-w-md rounded mr-3" />
          </div>
          <h3 className="text-xl font-bold mb-4">Devfun</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Discovery:</strong> Mostly developer-focused, unclear UI from public side.</p>
            <p><strong>Wallet Connection:</strong> Expected but unconfirmed.</p>
            <p><strong>Token List Navigation:</strong> Minimal to nonexistent. Focus is on launching, not discovery.</p>
            <p><strong>Virality Layer:</strong> No clear viral loop.</p>
            <p className="text-muted-foreground italic"><strong>UX Verdict:</strong> This is more a dev playground than a polished launchpad. Great for testing, not for community vibes.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="flex items-center mb-4">
            <img src="/lovable-uploads/metadao1.png" alt="MetaDAO interface" className="w-full max-w-md rounded mr-3" />
          </div>
          <h3 className="text-xl font-bold mb-4">MetaDAO</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Discovery:</strong> Proposal-based, not browsable in the traditional sense.</p>
            <p><strong>Wallet Connection:</strong> Tied into DAO governance process.</p>
            <p><strong>Token List Navigation:</strong> Not applicable.</p>
            <p><strong>Virality Layer:</strong> None. The virality comes from alignment with governance narratives, not memes.</p>
            <p className="text-muted-foreground italic"><strong>UX Verdict:</strong> Structured, governance-first. Best for serious projects with community alignment.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
