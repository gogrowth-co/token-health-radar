
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SolanaLaunchpadsHero() {
  return (
    <section className="text-center py-6 md:py-12 mb-8 md:mb-16">
      <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-4 md:mb-6 px-2">
        A Deep Dive Into Solana's Token Launchpads: From Memes to Mechanisms
      </h1>
      
      <img 
        src="/lovable-uploads/solana launchpads2.png" 
        alt="Comprehensive overview of Solana launchpad ecosystem showing Pump.fun, MetaDAO, Boop.fun, and other major platforms for token launches"
        className="w-full max-w-4xl mx-auto mb-6 md:mb-8 rounded-lg shadow-lg"
        loading="eager"
        width="800"
        height="450"
      />
      
      <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-3xl mx-auto px-4">
        Discover and compare the best Solana launchpads for your token. From Pump.fun's viral memes to MetaDAO's governance-first approach - find the perfect platform for your project.
      </p>
      
      <div className="bg-muted p-4 md:p-6 rounded-lg mb-6 md:mb-8 max-w-4xl mx-auto text-left">
        <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Why Solana Launchpads Matter More Than Ever</h2>
        <p className="text-sm md:text-lg text-muted-foreground mb-3 md:mb-4">
          Solana has become crypto's go-to sandbox for token experimentation. From meme coins that explode overnight to community-governed DAOs with novel economic models, it's where ideas get tested—and where retail investors move fast.
        </p>
        <p className="text-sm md:text-lg text-muted-foreground">
          In 2025, the number of Solana token launch platforms has exploded. It's no longer just about Pump.fun. A new generation of tools—like Devfun, Believe App, and Letsbonk.fun—are changing how tokens get launched, discovered, and traded.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="p-3 md:p-4 bg-card rounded-lg border">
          <h3 className="font-semibold mb-2 text-sm md:text-base">For Founders</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Planning a token launch and need to choose the right platform</p>
        </div>
        <div className="p-3 md:p-4 bg-card rounded-lg border">
          <h3 className="font-semibold mb-2 text-sm md:text-base">For Investors</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Tracking early-stage projects across multiple launchpads</p>
        </div>
        <div className="p-3 md:p-4 bg-card rounded-lg border">
          <h3 className="font-semibold mb-2 text-sm md:text-base">For Analysts</h3>
          <p className="text-xs md:text-sm text-muted-foreground">Understanding the Solana launch stack and ecosystem</p>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6 md:mb-8">
        <Button size="lg" asChild>
          <Link to="/">
            Scan Your Token Now
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <div className="flex flex-wrap gap-2 justify-center">
          <Button variant="outline" size="sm" asChild>
            <Link to="/token-scan-guide">Token Scan Guide</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/token-sniffer-vs-tokenhealthscan">vs Token Sniffer</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
