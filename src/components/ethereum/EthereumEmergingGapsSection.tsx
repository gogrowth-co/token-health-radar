export function EthereumEmergingGapsSection() {
  return (
    <section className="py-16 bg-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Emerging Gaps and Future Signals
          </h2>
          
          <p className="text-lg text-muted-foreground text-center mb-12">
            Ethereum's launchpad landscape may look crowded, but several strategic gaps remain. These aren't just white 
            space—they're opportunities for the next category-defining platform to emerge.
          </p>
          
          <div className="mb-12">
            <img
              src="/lovable-uploads/ethereum-gaps-future-opportunities-bridge.jpg"
              alt="A conceptual image showing a futuristic bridge extending from an 'Ethereum Network Base' across a chasm towards a glowing, futuristic city. This city represents the future of Web3, with distinct illuminated districts labeled as 'RWA Gateway', 'AI Innovation Hub Gateway', 'Enterprise Blockchain District', and 'Decentralized Community Nexus', each signifying strategic opportunities. The image visually represents the emerging gaps in the Ethereum landscape and the potential to bridge towards these future areas of innovation."
              className="w-full max-w-3xl mx-auto h-auto rounded-lg"
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-background p-6 rounded-lg border border-secondary/20">
              <h3 className="text-xl font-semibold mb-4 text-primary">1. AI-Native Project Incubation</h3>
              <p className="text-muted-foreground leading-relaxed">
                While ChainGPT Pad leads AI launches, no platform offers full technical incubation. There's growing demand 
                for launchpads that support compute access, LLM auditing tools, and AI-specific dev infrastructure. This 
                goes beyond fundraising—it's about giving AI founders what they actually need to ship.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border border-secondary/20">
              <h3 className="text-xl font-semibold mb-4 text-primary">2. RWA-Focused Infrastructure</h3>
              <p className="text-muted-foreground leading-relaxed">
                Real-world asset (RWA) tokenization is gaining traction, but Ethereum lacks a purpose-built launchpad that 
                integrates legal contracts, custody tools, and jurisdiction-specific compliance. Projects in this space are 
                often forced to hack together solutions across multiple vendors. A full-stack RWA launchpad would solve that.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border border-secondary/20">
              <h3 className="text-xl font-semibold mb-4 text-primary">3. Regulatory-Ready Enterprise Onboarding</h3>
              <p className="text-muted-foreground leading-relaxed">
                As traditional enterprises explore tokenization, there's no clear entry point via Ethereum launchpads. 
                Platforms that offer institutional-grade KYC, audit trails, and integration with fiat banking rails could 
                corner this market. It's less about hype, more about being able to answer due diligence requests.
              </p>
            </div>
            
            <div className="bg-background p-6 rounded-lg border border-secondary/20">
              <h3 className="text-xl font-semibold mb-4 text-primary">4. Community Ownership Beyond the Token</h3>
              <p className="text-muted-foreground leading-relaxed">
                Most launchpads treat governance as a secondary layer. There's room for platforms to innovate around 
                user-owned curation, staking-based vetting, or even DAO-led incubation programs. These mechanics build 
                long-term alignment—and defensibility.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}