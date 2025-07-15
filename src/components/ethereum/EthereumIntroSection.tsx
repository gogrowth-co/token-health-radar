export function EthereumIntroSection() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Ethereum Launchpads 2025 – Full Landscape & Analysis
          </h2>
          
          <div className="prose prose-lg max-w-none text-foreground">
            <h3 className="text-2xl font-semibold mb-4">What Is an Ethereum Token Launchpad?</h3>
            
            <p className="mb-6 text-muted-foreground leading-relaxed">
              An Ethereum token launchpad is a platform that helps new crypto projects raise capital, distribute tokens, 
              and build early traction. These platforms act as go-to-market engines for founders, offering structured 
              access to funding, community, and distribution—all built on Ethereum's infrastructure.
            </p>
            
            <p className="mb-6 text-muted-foreground leading-relaxed">
              Unlike the <strong>Ethereum staking launchpad</strong> (used to become a validator), token launchpads 
              are designed for teams launching ERC-20 tokens and aiming to reach early-stage investors through Initial 
              DEX Offerings (IDOs) or token sales. Most Ethereum launchpads offer tiered access based on staking or 
              whitelist participation, and some include compliance layers like KYC and audit integration.
            </p>
            
            <div className="bg-secondary/10 p-6 rounded-lg mb-6">
              <p className="mb-4 font-medium">While every launchpad has its own focus—gaming, DeFi, AI, or general-purpose—most share three core goals:</p>
              
              <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
                <li><strong className="text-foreground">Fundraising:</strong> Give projects access to early capital through a decentralized sale.</li>
                <li><strong className="text-foreground">Community building:</strong> Activate early supporters and token holders.</li>
                <li><strong className="text-foreground">Launch support:</strong> Provide tools, docs, and post-IDO infrastructure like multichain deployment or liquidity programs.</li>
              </ol>
            </div>
            
            <p className="text-muted-foreground leading-relaxed">
              Ethereum's deep liquidity, dev tooling, and regulatory mindshare make it a natural choice for launchpads 
              targeting long-term growth and institutional readiness.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}