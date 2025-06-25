
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function KeyTakeaways() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">Key Takeaways</h2>
      
      <p className="text-lg text-muted-foreground mb-8 max-w-4xl mx-auto text-center">
        Not all launchpads are created equal — and more importantly, a launchpad alone won't make your token succeed. Here's what stood out across the research:
      </p>

      <div className="grid md:grid-cols-2 gap-8 mb-12">
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-3 text-blue-600">1. Speed is overrated — fit is underrated.</h3>
            <p className="text-sm text-muted-foreground">
              Many founders rush to launch on the trendiest platform without thinking through token design, community onboarding, or what happens after the first pump. The best outcomes come from matching your goals to the platform's strengths.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-3 text-green-600">2. Know what you're optimizing for.</h3>
            <p className="text-sm text-muted-foreground">
              If you want virality, use tools like Pump.fun or Believe App. But if you're building a long-term governance system or ecosystem token, MetaDAO will be a better fit. It's not about good or bad platforms — it's about alignment.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-3 text-purple-600">3. UX gaps shape user behavior.</h3>
            <p className="text-sm text-muted-foreground">
              A smoother onboarding process — like what you get on Boop.fun or Letsbonk.fun — leads to more participation. But sometimes these platforms sacrifice transparency or flexibility. There's always a trade-off.
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-3 text-orange-600">4. Launchpads don't replace strategy.</h3>
            <p className="text-sm text-muted-foreground">
              They're tools, not magic wands. The best launches we've seen combine platform mechanics with thoughtful tokenomics, strong messaging, and clear post-launch plans.
            </p>
          </div>

          <div className="bg-card p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-3 text-red-600">5. Community quality > speculation.</h3>
            <p className="text-sm text-muted-foreground">
              Platforms that attract speculative attention can generate noise, but not necessarily retention. Sustainable growth comes from engaging real users — not just early flippers.
            </p>
          </div>

          <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 p-6 rounded-lg border">
            <h3 className="text-lg font-bold mb-3">The Bottom Line</h3>
            <p className="text-sm text-muted-foreground">
              Each platform in this landscape has tradeoffs: Some prioritize virality over sustainability, others focus on community and governance but move slower, and a few sit in the middle — flexible, but not always beginner-friendly.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/20 to-blue-600/20 p-8 rounded-lg text-center">
        <h2 className="text-3xl font-bold mb-4">Conclusion: Launch Wisely, Not Just Quickly</h2>
        <p className="text-lg text-muted-foreground mb-6 max-w-3xl mx-auto">
          Solana has unlocked a new wave of permissionless innovation — but launchpads are not one-size-fits-all. Whether you're building a memecoin for the culture or a governance token for real-world coordination, your launchpad choice shapes more than just your first day of trading.
        </p>
        <p className="text-lg font-semibold mb-6">
          The best founders won't just chase hype. They'll map their token goals to platform mechanics — and then build accordingly.
        </p>
        <p className="text-lg text-muted-foreground mb-8">
          This guide isn't the end of your research. It's the start of your strategy.
        </p>
        <Button size="lg" asChild>
          <Link to="/">
            Start Your Token Analysis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
