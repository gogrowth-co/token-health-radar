export function EthereumWhyMattersSection() {
  return (
    <section className="py-16 bg-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Why Ethereum Launchpads Still Matter
          </h2>
          
          <div className="mb-8">
            <img
              src="/lovable-uploads/ethereum-launchpad-evolution-rwa-defi-ai-multichain.jpg"
              alt="A sleek, glowing Ethereum tower serves as a central launchpad, with vibrant purple data lines extending to four distinct, illuminated modules. These modules represent key areas of evolution for Ethereum launchpads: 'Real-World Assets' (depicted with a shield and document icon), 'DeFi' (with gears and a network icon), 'AI' (with a microchip and neural network icon), and 'Multichain Deployment' (with interconnected blockchain symbols). The image conveys the strategic expansion and robust infrastructure of Ethereum for long-term projects."
              className="w-full max-w-3xl mx-auto h-auto rounded-lg"
            />
          </div>
          
          <div className="prose prose-lg max-w-none text-foreground">
            <p className="mb-6 text-muted-foreground leading-relaxed">
              In a cycle dominated by fast-moving chains and meme-fueled launches, Ethereum might seem like old ground. 
              But beneath the surface, Ethereum launchpads are quietly evolving — and becoming mission-critical 
              infrastructure for Web3 founders.
            </p>
            
            <p className="mb-6 text-muted-foreground leading-relaxed">
              Unlike newer ecosystems optimized for speed or speculation, Ethereum platforms have doubled down on 
              <em className="text-foreground"> structure</em>. They're not here for the hype cycle — they're built for staying power. 
              And in 2024–2025, we're seeing them shift from simple fundraising portals to fully integrated growth platforms.
            </p>
            
            <div className="bg-primary/10 p-6 rounded-lg mb-6">
              <p className="mb-4 font-medium">While Solana's launchpad wave leaned into instant launches and viral velocity, Ethereum's leaders have focused on:</p>
              
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li><strong className="text-foreground">DeFi-native tooling</strong> and compliance</li>
                <li><strong className="text-foreground">Real-world asset (RWA)</strong> support</li>
                <li><strong className="text-foreground">AI project incubation</strong></li>
                <li><strong className="text-foreground">Multichain deployment paths</strong></li>
              </ul>
            </div>
            
            <p className="mb-6 text-muted-foreground leading-relaxed">
              This makes Ethereum launchpads the go-to for projects with long-term goals — especially those that need 
              legitimacy, flexibility, and access to a broader capital base.
            </p>
            
            <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-6 rounded-lg text-center">
              <p className="text-lg font-medium mb-2">TL;DR: Ethereum isn't where you go to "launch fast."</p>
              <p className="text-lg font-bold">It's where you go to <em>launch right</em>.</p>
            </div>
            
            <div className="mt-8 p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Note:</strong> This guide focuses on Ethereum token launchpads used for project fundraising 
                and community distribution — not the official Ethereum staking launchpad used to become a network validator. 
                If you're looking to stake ETH, visit <a href="https://launchpad.ethereum.org" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">launchpad.ethereum.org</a>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}