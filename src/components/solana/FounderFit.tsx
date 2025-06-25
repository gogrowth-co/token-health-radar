
export default function FounderFit() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">Founder Fit: Who Should Launch Where?</h2>
      
      <p className="text-lg text-muted-foreground mb-8 max-w-4xl mx-auto text-center">
        Choosing a launchpad isn't just about features — it's about fit. Different platforms on Solana cater to different types of founders. Your project's personality, goals, and risk appetite should guide your decision.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded-lg border">
          <div className="mb-4">
            <img src="/lovable-uploads/meme degen.jpg" alt="Meme degen founder type" className="w-full max-w-md rounded-lg mx-auto mb-3 object-cover" />
            <h3 className="text-xl font-bold text-green-600 text-center">Meme Degen</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            If your goal is pure speed and virality — think memes, vibes, and quick upside — you'll feel right at home on Pump.fun or Letsbonk.fun. These platforms thrive on frictionless creation and social momentum. No KYC, no gatekeeping, just launch and tweet. Perfect for riding a wave — but don't expect long-term support.
          </p>
          <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded border">
            <p className="text-sm font-medium">Best Platforms: Pump.fun, Letsbonk.fun</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="mb-4">
            <img src="/lovable-uploads/experimental dev.png" alt="Experimental developer founder type" className="w-full max-w-md rounded-lg mx-auto mb-3 object-cover" />
            <h3 className="text-xl font-bold text-purple-600 text-center">Experimental Dev</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Tinkering with mechanics? Building something weird and unproven? Devfun is your playground. It's not the most polished, but it's designed for devs to experiment publicly. Ideal for those who want to build in public with other devs and iterate based on feedback.
          </p>
          <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded border">
            <p className="text-sm font-medium">Best Platform: Devfun</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="mb-4">
            <img src="/lovable-uploads/impact dao.jpg" alt="Impact DAO founder type" className="w-full max-w-md rounded-lg mx-auto mb-3 object-cover" />
            <h3 className="text-xl font-bold text-blue-600 text-center">Impact DAO</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            If you're launching a DAO with real governance goals — think long-term value creation and shared decision-making. MetaDAO is your best bet. It's not built for memes or pump-and-dumps. It's built for legitimacy, structure, and collective intelligence. Token launches here are slower but more defensible.
          </p>
          <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded border">
            <p className="text-sm font-medium">Best Platform: MetaDAO</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="mb-4">
            <img src="/lovable-uploads/influencer builder.png" alt="Influencer or community builder founder type" className="w-full max-w-md rounded-lg mx-auto mb-3 object-cover" />
            <h3 className="text-xl font-bold text-orange-600 text-center">Influencer or Small Community Builder</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Got a loyal following but not a big dev team? Platforms like Boop.fun and Believe App are solid picks. They offer smoother UX and handle some of the backend mechanics for you. These are great for launching community tokens, creator coins, or small experiments without deep technical lift.
          </p>
          <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded border">
            <p className="text-sm font-medium">Best Platforms: Boop.fun, Believe App</p>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <div className="mb-4">
            <img src="/lovable-uploads/creator coin.png" alt="Creator coin founder type" className="w-full max-w-md rounded-lg mx-auto mb-3 object-cover" />
            <h3 className="text-xl font-bold text-pink-600 text-center">Creator Coin Launch</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Building a token around your personal brand or creative work? You need a platform that balances professionalism with accessibility. Look for tools that offer good branding options and community engagement features without overwhelming technical complexity.
          </p>
          <div className="bg-pink-50 dark:bg-pink-950/20 p-3 rounded border">
            <p className="text-sm font-medium">Best Platforms: Believe App, Boop.fun</p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">Remember: You Can Evolve</h3>
          <p className="text-sm text-muted-foreground">
            These recommendations aren't absolute — you can move between platforms over time. Some founders start on Pump.fun to test the waters, then migrate to a structured relaunch when they have traction and clarity. The key is knowing what stage you're at, and choosing a launchpad that complements your real goals — not just your short-term metrics.
          </p>
        </div>
      </div>
    </section>
  );
}
