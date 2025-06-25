
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function SolanaLaunchpadsHero() {
  return (
    <section className="text-center py-12 mb-16">
      <img 
        src="/lovable-uploads/solana launchpads2.png" 
        alt="Solana Launchpads ecosystem overview showing various platforms for token launches"
        className="w-full max-w-4xl mx-auto mb-8 rounded-lg shadow-lg"
        loading="eager"
      />
      
      <h1 className="hero-title mb-6">
        A Deep Dive Into Solana's Token Launchpads: From Memes to Mechanisms
      </h1>
      
      <p className="hero-subtitle mb-8 max-w-3xl mx-auto">
        Discover and compare the best Solana launchpads for your token. From Pump.fun's viral memes to MetaDAO's governance-first approach - find the perfect platform for your project.
      </p>
      
      <div className="bg-muted p-6 rounded-lg mb-8 max-w-4xl mx-auto text-left">
        <h2 className="text-2xl font-bold mb-4">Why Solana Launchpads Matter More Than Ever</h2>
        <p className="text-lg text-muted-foreground mb-4">
          Solana has become crypto's go-to sandbox for token experimentation. From meme coins that explode overnight to community-governed DAOs with novel economic models, it's where ideas get tested—and where retail investors move fast.
        </p>
        <p className="text-lg text-muted-foreground">
          In 2025, the number of Solana token launch platforms has exploded. It's no longer just about Pump.fun. A new generation of tools—like Devfun, Believe App, and Letsbonk.fun—are changing how tokens get launched, discovered, and traded.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="p-4 bg-card rounded-lg border">
          <h3 className="font-semibold mb-2">For Founders</h3>
          <p className="text-sm text-muted-foreground">Planning a token launch and need to choose the right platform</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <h3 className="font-semibold mb-2">For Investors</h3>
          <p className="text-sm text-muted-foreground">Tracking early-stage projects across multiple launchpads</p>
        </div>
        <div className="p-4 bg-card rounded-lg border">
          <h3 className="font-semibold mb-2">For Analysts</h3>
          <p className="text-sm text-muted-foreground">Understanding the Solana launch stack and ecosystem</p>
        </div>
      </div>
      
      <Button size="lg" asChild className="mb-8">
        <Link to="/">
          Scan Your Token Now
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </section>
  );
}
