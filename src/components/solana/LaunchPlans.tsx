
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function LaunchPlans() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">Launchpad Fit in Practice: Sample Launch Plans & Recommendations</h2>
      
      <p className="text-lg text-muted-foreground mb-8 max-w-4xl mx-auto text-center">
        Every token launch is a strategic choice. The platform you choose shapes not just how you raise capital, but who your holders are, how your token trades, and whether your narrative sticks. Here are a few generic token launch types — and how they might play out across the Solana launchpad landscape.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4 text-green-600">A. Meme Coin with Viral Potential</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Goal:</strong> Fast launch, rapid exposure, minimal setup.</p>
            <p><strong>Best Fit:</strong> Pump.fun, Letsbonk.fun</p>
            <p><strong>Why:</strong> These platforms are optimized for memetic velocity. You don't need a whitepaper, KYC, or even a team — just vibes and a community.</p>
            <p className="text-red-600"><strong>Caution:</strong> These tokens live and die by narrative. No long-term roadmap? Expect a short shelf life.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4 text-blue-600">B. Creator Coin or Micro-Community Token</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Goal:</strong> Serve a small but loyal group (e.g., fans, followers, niche DAOs).</p>
            <p><strong>Best Fit:</strong> Boop.fun, Believe App</p>
            <p><strong>Why:</strong> Both provide smoother onboarding, less noise, and some tooling for community engagement. Great for creators or small teams.</p>
            <p className="text-red-600"><strong>Caution:</strong> These platforms don't come with built-in liquidity or investor hype. You'll need to drive traction yourself.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4 text-purple-600">C. Experimental Mechanism / Prototype Token</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Goal:</strong> Test tokenomics, bonding curves, or unusual mechanics.</p>
            <p><strong>Best Fit:</strong> Devfun</p>
            <p><strong>Why:</strong> Devfun is designed for experiments. It's rough around the edges, but encourages public iteration. Ideal for builders shipping weird stuff.</p>
            <p className="text-red-600"><strong>Caution:</strong> Not the place for polished launches or wide distribution. It's a dev sandbox.</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4 text-orange-600">D. Governance Token for a DAO or Public Goods Project</h3>
          <div className="space-y-3 text-sm">
            <p><strong>Goal:</strong> Long-term alignment, legitimacy, and structured participation.</p>
            <p><strong>Best Fit:</strong> MetaDAO</p>
            <p><strong>Why:</strong> This is the only platform that explicitly centers governance and capital formation for purpose-driven communities.</p>
            <p className="text-red-600"><strong>Caution:</strong> It's not built for memes or hype. Expect slower ramp-up, more thoughtful process, and likely some contributor involvement.</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 p-8 rounded-lg text-center mt-8">
        <h3 className="text-2xl font-bold mb-4">Decision Tree</h3>
        <img 
          src="/lovable-uploads/Solana-Wallet-scaled.jpg" 
          alt="Solana wallet and decision-making process for choosing the right launchpad"
          className="w-full max-w-2xl mx-auto mb-6 rounded-lg shadow-lg"
          loading="lazy"
        />
        <p className="text-lg text-muted-foreground mb-6">
          These recommendations aren't absolute — you can move between platforms over time. Some founders start on Pump.fun to test the waters, then migrate to a structured relaunch when they have traction and clarity.
        </p>
        <p className="font-semibold text-lg mb-6">
          The key is knowing what stage you're at, and choosing a launchpad that complements your real goals — not just your short-term metrics.
        </p>
        <Button size="lg" asChild>
          <Link to="/">
            Analyze Your Token Strategy
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
