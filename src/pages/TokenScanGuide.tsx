
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, BarChart3, Users, Code, Lock } from "lucide-react";

export default function TokenScanGuide() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "The Complete Guide to Token Scanning (2025)",
    "description": "Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques.",
    "author": {
      "@type": "Organization",
      "name": "TokenHealthScan"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TokenHealthScan",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tokenhealthscan.com/lovable-uploads/c705b444-0cef-46bf-b4a1-c6663acf1164.png"
      }
    },
    "datePublished": "2025-01-01",
    "dateModified": "2025-01-01",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://tokenhealthscan.com/token-scan-guide"
    },
    "image": "https://tokenhealthscan.com/lovable-uploads/9823d2dd-2bbb-4762-9882-69c6848988c4.png"
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens</title>
        <meta name="description" content="Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools, techniques, and best practices." />
        <meta name="keywords" content="token scanning, crypto analysis, smart contract security, liquidity verification, token due diligence, DYOR crypto" />
        <link rel="canonical" href="https://tokenhealthscan.com/token-scan-guide" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens" />
        <meta property="og:description" content="Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://tokenhealthscan.com/token-scan-guide" />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/9823d2dd-2bbb-4762-9882-69c6848988c4.png" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens" />
        <meta name="twitter:description" content="Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques." />
        <meta name="twitter:image" content="https://tokenhealthscan.com/lovable-uploads/9823d2dd-2bbb-4762-9882-69c6848988c4.png" />
        
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <Navbar />
      
      <main className="flex-1">
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Hero Section */}
          <header className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
              The Complete Guide to Token Scanning (2025)
            </h1>
            <img 
              src="/lovable-uploads/9823d2dd-2bbb-4762-9882-69c6848988c4.png" 
              alt="Illustration of a token under a magnifying glass with a risk report, padlock, droplet, and warning icon, representing a comprehensive crypto token scan guide"
              className="w-full max-w-2xl mx-auto mb-8 rounded-lg shadow-lg"
            />
          </header>

          {/* Introduction */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Introduction to Token Scanning</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              If you've ever stared at a cryptocurrency token and wondered "Is this legit or am I about to get scammed?", you're not alone. Welcome to the wild world of crypto, where fortunes are made and lost faster than you can say "diamond hands."
            </p>
            
            <div className="bg-muted p-6 rounded-lg mb-8">
              <h3 className="text-xl font-semibold mb-4">TLDR</h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>What it is:</strong> A token scan analyzes a crypto project's safety, liquidity, tokenomics, team, and development activity.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>Why it matters:</strong> Over 90% of tokens are scams or failures – scanning helps you avoid costly mistakes.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>What to look for:</strong> Mint functions, blacklist code, unlocked liquidity, whale wallets, inactive devs.</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span><strong>How to scan:</strong> Use tools like TokenHealthScan to get all key data in one dashboard.</span>
                </li>
              </ul>
            </div>
          </section>

          {/* What is Token Scanning */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">What is a Token Scan?</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Think of a token scan as your crypto detective toolkit. It's a comprehensive, data-driven analysis that examines a cryptocurrency token from every angle – kind of like getting a full health checkup, but for digital assets instead of your body.
            </p>
            
            <img 
              src="/lovable-uploads/5522e54b-b6ba-49ea-bf0f-a540f1cdce10.png" 
              alt="Photo of a person holding a magnifying glass over a Bitcoin token, with a laptop displaying a token health report in the background, symbolizing token scanning analysis"
              className="w-full max-w-2xl mx-auto mb-8 rounded-lg shadow-lg"
            />

            <p className="text-lg text-muted-foreground mb-4">A proper token scan digs deep into:</p>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border">
                <Shield className="h-6 w-6 text-red-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Security vulnerabilities</h4>
                  <p className="text-sm text-muted-foreground">Is this token a honeypot waiting to trap your money?</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border">
                <BarChart3 className="h-6 w-6 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Liquidity health</h4>
                  <p className="text-sm text-muted-foreground">Can you actually sell when you want to?</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border">
                <Lock className="h-6 w-6 text-yellow-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Tokenomics structure</h4>
                  <p className="text-sm text-muted-foreground">How are the tokens distributed and controlled?</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-4 bg-card rounded-lg border">
                <Users className="h-6 w-6 text-green-500 mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Community strength</h4>
                  <p className="text-sm text-muted-foreground">Is there real buzz or just bot activity?</p>
                </div>
              </div>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed">
              Instead of relying on gut feelings or random Twitter threads, a token scan gives you hard data to make smarter decisions.
            </p>
          </section>

          {/* Why Token Scanning Matters */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Why Token Scanning Matters in Crypto</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              Here's the uncomfortable truth: the crypto space is absolutely flooded with projects designed to separate you from your hard-earned money.
            </p>

            <img 
              src="/lovable-uploads/a773e05d-cbb9-44b6-b5b8-b6b1bd4884a8.png" 
              alt="Photo of Ethereum and Bitcoin coins on top of dollar bills next to a bear trap, illustrating the financial dangers of crypto scams like rug pulls and honeypots"
              className="w-full max-w-2xl mx-auto mb-8 rounded-lg shadow-lg"
            />

            <p className="text-lg text-muted-foreground mb-4">We're talking about:</p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-1">⚠️</span>
                <span>Rug pulls where developers vanish overnight with investor funds</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-3 mt-1">🍯</span>
                <span>Honeypot tokens that let you buy but never sell</span>
              </li>
              <li className="flex items-start">
                <span className="text-orange-500 mr-3 mt-1">📈</span>
                <span>Pump and dump schemes that artificially inflate prices before crashing</span>
              </li>
              <li className="flex items-start">
                <span className="text-gray-500 mr-3 mt-1">💀</span>
                <span>Dead projects with zero development activity</span>
              </li>
            </ul>

            <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-lg mb-6">
              <p className="text-lg font-medium">
                According to recent data, over 90% of new tokens launched end up being worthless or outright scams.
              </p>
            </div>

            <p className="text-lg text-muted-foreground mb-4">Token scanning helps you DYOR smarter by:</p>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Spotting red flags before you invest</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Identifying genuine opportunities with strong fundamentals</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">✓</span>
                <span>Understanding risk levels so you can size your positions appropriately</span>
              </li>
            </ul>
          </section>

          {/* Types of Token Scans */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Types of Token Scans</h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Now that you understand why token scanning is crucial, let's break down the different types of scans you should be running. Think of these as different X-ray machines – each one reveals a specific part of the token's "anatomy" that could make or break your investment.
            </p>

            {/* Security Scans */}
            <div className="mb-10">
              <h3 className="text-2xl font-bold mb-4">Security Scans: Your First Line of Defense</h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                This is where we catch the obvious scams before they catch you. Security scans dig into the smart contract code to identify red flags that could drain your wallet.
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">What we're looking for:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span><strong>Mintability risks</strong> - Can the creators print unlimited new tokens?</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span><strong>Honeypot behavior</strong> - Will you be able to sell your tokens?</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span><strong>Blacklist functions</strong> - Can the contract block you from trading?</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-500 mr-2">•</span>
                      <span><strong>Hidden backdoors</strong> - Secret functions giving developers advantages?</span>
                    </li>
                  </ul>
                </div>
                <img 
                  src="/lovable-uploads/ea2b3602-9180-444e-882e-1d6395fe1805.png" 
                  alt="Infographic detailing smart contract security risks such as reentrancy attacks, oracle manipulation, frontrunning, insecure math, and denial of service vulnerabilities"
                  className="w-full rounded-lg shadow-lg"
                />
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-4 rounded-lg">
                <p className="font-medium text-red-800 dark:text-red-200">
                  Real talk: If a token fails the security scan, just walk away. There are thousands of other opportunities that won't potentially steal your money.
                </p>
              </div>
            </div>

            {/* Liquidity Verification */}
            <div className="mb-10">
              <h3 className="text-2xl font-bold mb-4">Liquidity Verification: Can You Actually Trade?</h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Here's a scenario that'll make you sick: You find a "moonshot" token, watch it pump 10x, go to sell... and discover there's no liquidity. Your gains are trapped.
              </p>

              <img 
                src="/lovable-uploads/153ba67b-19c1-43da-a3e8-69f2ab3985d3.png" 
                alt="Diagram showing key factors of liquidity verification in crypto tokens, including pool depth, lock status, token holder concentration, and trading patterns"
                className="w-full max-w-2xl mx-auto mb-6 rounded-lg shadow-lg"
              />

              <h4 className="text-lg font-semibold mb-4">Liquidity verification checks:</h4>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-card rounded-lg border">
                  <h5 className="font-semibold">Pool depth</h5>
                  <p className="text-sm text-muted-foreground">How much trading volume can the market handle?</p>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <h5 className="font-semibold">Lock status</h5>
                  <p className="text-sm text-muted-foreground">Are liquidity tokens locked or can developers rug pull?</p>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <h5 className="font-semibold">Token holder concentration</h5>
                  <p className="text-sm text-muted-foreground">Do a few whales control most of the supply?</p>
                </div>
                <div className="p-4 bg-card rounded-lg border">
                  <h5 className="font-semibold">Trading patterns</h5>
                  <p className="text-sm text-muted-foreground">Is the volume organic or artificially pumped?</p>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 p-4 rounded-lg">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Bottom line: High concentration + unlocked liquidity = high rug pull risk. Proceed with extreme caution.
                </p>
              </div>
            </div>

            {/* Team Ownership */}
            <div className="mb-10">
              <h3 className="text-2xl font-bold mb-4">Ownership & Team Visibility: Who's Really Behind This?</h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                This is where we get into detective mode. Who created this token? Do they still control it? Can you actually find information about the team?
              </p>

              <img 
                src="/lovable-uploads/a9862d4c-7598-4c06-b353-8514435ac69e.png" 
                alt="Photo-realistic image of a gold cryptocurrency token in front of silhouetted figures, representing anonymous team ownership and visibility in Web3 projects"
                className="w-full max-w-2xl mx-auto mb-6 rounded-lg shadow-lg"
              />

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Current analysis includes:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Deployer wallet activity - Is the original creator still involved?</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Control mechanisms - Single wallet vs. multisig setup</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-500 mr-2">•</span>
                      <span>Transaction patterns - Suspicious creator behavior?</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Coming soon in TokenHealthScan Pro:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span>Team wallet tracking - Monitor development team activity</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span>Cross-project analysis - See previous team involvement</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-500 mr-2">•</span>
                      <span>Social verification - Match wallets to public profiles</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Token Scanning Process */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6">The Token Scanning Process</h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Alright, enough theory – let's walk through exactly how to scan a token using TokenHealthScan. Don't worry, we've made this ridiculously simple. No technical degree required.
            </p>

            <img 
              src="/lovable-uploads/90b79610-95d8-4c35-8a07-56103bb73bdc.png" 
              alt="TokenHealthScan platform interface showing detailed development analysis for a token, including GitHub activity, number of contributors, recent commits, and roadmap progress"
              className="w-full mb-8 rounded-lg shadow-lg"
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
          </section>

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
        </article>
      </main>
      
      <Footer />
    </div>
  );
}
