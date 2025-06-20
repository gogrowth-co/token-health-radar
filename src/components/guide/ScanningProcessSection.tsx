import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, BarChart3, Users, Code, Lock } from "lucide-react";

export default function ScanningProcessSection() {
  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold mb-6">The Token Scanning Process</h2>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
        Alright, enough theory – let's walk through exactly how to scan a token using TokenHealthScan. Don't worry, we've made this ridiculously simple. No technical degree required.
      </p>

      <img 
        src="/lovable-uploads/tokenscanrecording01.gif" 
        alt="TokenHealthScan platform demonstration showing the complete token scanning process from search to detailed analysis results"
        className="w-full mb-8 rounded-lg shadow-lg"
        loading="lazy"
      />

      <img 
        src="/lovable-uploads/token-health-scan-product.png" 
        alt="TokenHealthScan platform interface showing detailed development analysis for a token, including GitHub activity, number of contributors, recent commits, and roadmap progress"
        className="w-full mb-8 rounded-lg shadow-lg"
        loading="lazy"
      />

      <div className="bg-muted p-6 rounded-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">Old Way vs. New Way</h3>
        <p className="text-muted-foreground mb-4">
          Before tools like TokenHealthScan existed, doing proper due diligence meant juggling multiple tabs and tools. It was messy, time-consuming, and easy to miss red flags.
        </p>
        <p className="font-medium">
          Now? It's one scan. One dashboard. All the answers. TokenHealthScan pulls real-time data from 7+ sources and organizes it into a single, visual health report, so you can go from confused to confident in under 30 seconds.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-8">
        <div>
          <h3 className="text-2xl font-bold mb-4">Step 1: Search by Name or Address</h3>
          <p className="text-lg text-muted-foreground mb-4">
            First things first – find the token you want to analyze. You've got two options:
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-4 bg-card rounded-lg border">
              <h4 className="font-semibold mb-2">Option A: Search by name</h4>
              <p className="text-sm text-muted-foreground">
                Type the token name like "Pendle" or "Pepe". Perfect when you don't have the contract address memorized.
              </p>
            </div>
            <div className="p-4 bg-card rounded-lg border">
              <h4 className="font-semibold mb-2">Option B: Paste contract address</h4>
              <p className="text-sm text-muted-foreground">
                More precise method since addresses are unique, unlike token names which can be duplicated.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-4">Step 2: Token Selection</h3>
          <p className="text-lg text-muted-foreground mb-4">
            If you searched by name, you'll see results from CoinGecko's database. Pick the exact token by checking the network and market cap.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-4">Step 3: The Loading Screen</h3>
          <p className="text-lg text-muted-foreground mb-4">
            While our system pulls data from multiple APIs (GoPlus, Etherscan, GeckoTerminal, GitHub), you'll see educational crypto trivia. This takes 15-30 seconds for comprehensive analysis.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-4">Step 4: Your Complete Token Analysis</h3>
          <img 
            src="/lovable-uploads/ac00a670-c9aa-476a-9282-5bf5287935ba.png" 
            alt="Token profile card for Pendle on TokenHealthScan platform showing live price, market cap, health score, and individual scores for security, tokenomics, liquidity, and development"
            className="w-full mb-6 rounded-lg shadow-lg"
            loading="lazy"
          />
          
          <h4 className="text-xl font-semibold mb-4">The 5-Pillar Health Score: Your Investment Compass</h4>
          <p className="text-lg text-muted-foreground mb-6">
            TokenHealthScan's signature feature – five color-coded scores that instantly tell you the token's strengths and weaknesses:
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800/30">
              <Shield className="h-8 w-8 text-red-500 mb-2" />
              <h5 className="font-semibold">Security Score</h5>
              <p className="text-sm text-muted-foreground">Smart contract safety</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/30">
              <BarChart3 className="h-8 w-8 text-blue-500 mb-2" />
              <h5 className="font-semibold">Liquidity Score</h5>
              <p className="text-sm text-muted-foreground">Trading accessibility</p>
            </div>
            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800/30">
              <Lock className="h-8 w-8 text-yellow-500 mb-2" />
              <h5 className="font-semibold">Tokenomics Score</h5>
              <p className="text-sm text-muted-foreground">Economic structure</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/30">
              <Users className="h-8 w-8 text-green-500 mb-2" />
              <h5 className="font-semibold">Community Score</h5>
              <p className="text-sm text-muted-foreground">Social engagement</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800/30">
              <Code className="h-8 w-8 text-purple-500 mb-2" />
              <h5 className="font-semibold">Development Score</h5>
              <p className="text-sm text-muted-foreground">Team activity</p>
            </div>
          </div>
          
          <p className="text-lg text-muted-foreground mt-6">
            Each pillar gets a score from 0-100, with visual indicators: Green = good, yellow = proceed with caution, red = major concerns.
          </p>
        </div>
      </div>

      {/* CTA Section */}
      <section className="text-center py-12 bg-gradient-to-r from-primary/10 to-blue-600/10 rounded-lg">
        <h2 className="text-3xl font-bold mb-4">Ready to Start Making Smarter Crypto Investments?</h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
          Get your first scan — it's free. No signup required, no credit card needed. Just paste a token address and see what professional-grade analysis looks like.
        </p>
        <Button size="lg" asChild>
          <Link to="/">
            Start Your Free Scan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </section>
    </section>
  );
}
