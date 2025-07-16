export function EthereumPlatformTypes() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Types of Ethereum Launchpads – Who's Who
          </h2>
          
          <p className="text-lg text-muted-foreground text-center mb-12 max-w-3xl mx-auto">
            Ethereum's launchpad ecosystem is diverse, but not chaotic. Each platform has evolved around a core identity, 
            shaped by its audience, tooling, and focus. From DeFi veterans to AI-native upstarts, the following five 
            categories define the current landscape.
          </p>
          
          {/* DeFi-Native Platforms */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-6 text-primary">DeFi-Native Platforms</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              These launchpads built their reputations in the early DeFi cycles and continue to dominate based on volume, 
              governance maturity, and compliance standards. DAO Maker and Poolz are the best-known examples. They serve 
              projects that prioritize credibility, network effects, and post-launch support infrastructure.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* DAO Maker */}
              <div className="bg-secondary/10 p-6 rounded-lg">
                <h4 className="text-xl font-semibold mb-4">DAO Maker</h4>
                <div className="mb-4">
                  <img
                    src="/lovable-uploads/dao_maker.png"
                    alt="DAO Maker launchpad"
                    className="w-full h-48 object-contain rounded-lg shadow-sm border border-border/50"
                  />
                </div>
                <p className="text-muted-foreground">
                  DAO Maker is one of the most established Ethereum-based launchpads, known for pioneering the concept of 
                  <strong> Strong Holder Offerings (SHOs)</strong>. It combines fundraising with community curation, 
                  KYC compliance, and flexible vesting options to attract both retail and institutional players.
                </p>
              </div>

              {/* Poolz Finance */}
              <div className="bg-secondary/10 p-6 rounded-lg">
                <h4 className="text-xl font-semibold mb-4">Poolz Finance</h4>
                <div className="mb-4">
                  <img
                    src="/lovable-uploads/poolz_finance.png"
                    alt="Poolz Finance Launchpad"
                    className="w-full h-48 object-contain rounded-lg shadow-sm border border-border/50"
                  />
                </div>
                <p className="text-muted-foreground">
                  <a href="https://www.poolz.finance/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Poolz Finance</a> is 
                  a cross-chain launchpad built for speed, flexibility, and accessibility. It supports IDOs across Ethereum, 
                  BNB Chain, Polygon, and more—but Ethereum remains its highest-volume network. Known for rapid-fire listings 
                  and support for early-stage teams.
                </p>
              </div>
            </div>
          </div>

          {/* AI-Focused Launchpads */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-6 text-primary">AI-Focused Launchpads</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              AI-native platforms like ChainGPT Pad have emerged to serve the growing number of crypto-AI crossovers. 
              These platforms tend to offer AI-powered curation, content generation, and agent-assisted community growth. 
              They are selective, developer-focused, and offer deeper incubation services than most generalists.
            </p>
            
            <div className="bg-secondary/10 p-6 rounded-lg max-w-2xl">
              <h4 className="text-xl font-semibold mb-4">ChainGPT Pad</h4>
              <div className="mb-4">
                <img
                  src="/lovable-uploads/chaingpt_pad.png"
                  alt="ChainGPT Pad"
                  className="w-full h-48 object-contain rounded-lg shadow-sm border border-border/50"
                />
              </div>
              <p className="text-muted-foreground">
                ChainGPT Pad is the launch platform within the <strong>ChainGPT AI ecosystem</strong>, focused on 
                accelerating early-stage AI, DeFi, and infrastructure projects. Positioned as an Ethereum-first launchpad 
                with growing multichain support, it combines curated listings, AI tooling, and tight capital efficiency 
                to attract highly technical founders and early adopters.
              </p>
            </div>
          </div>

          {/* Gaming and Metaverse Launchpads */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-6 text-primary">Gaming and Metaverse Launchpads</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              These platforms specialize in community-heavy verticals like GameFi, NFTs, and metaverse ecosystems. 
              Seedify and Enjinstarter are notable for their access mechanics, gamified staking systems, and close 
              alignment with creator economies.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Seedify */}
              <div className="bg-secondary/10 p-6 rounded-lg">
                <h4 className="text-xl font-semibold mb-4">Seedify</h4>
                <div className="mb-4">
                  <img
                    src="/lovable-uploads/seedify.png"
                    alt="Seedify Launchpad"
                    className="w-full h-48 object-contain rounded-lg shadow-sm border border-border/50"
                  />
                </div>
                <p className="text-muted-foreground">
                  <a href="https://seedify.fund/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Seedify</a> is 
                  one of the most well-known GameFi and metaverse launchpads on Ethereum. Originally launched to support 
                  gaming projects, it has since expanded into AI and utility token ecosystems, while maintaining a strong 
                  focus on gamified engagement and community-driven launches.
                </p>
              </div>

              {/* Enjinstarter */}
              <div className="bg-secondary/10 p-6 rounded-lg">
                <h4 className="text-xl font-semibold mb-4">Enjinstarter</h4>
                <div className="mb-4">
                  <img
                    src="/lovable-uploads/Enjinstarter.png"
                    alt="Enjinstarter Launchpad"
                    className="w-full h-48 object-contain rounded-lg shadow-sm border border-border/50"
                  />
                </div>
                <p className="text-muted-foreground">
                  <a href="https://enjinstarter.com/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Enjinstarter</a> is 
                  a launchpad born from the Enjin ecosystem, originally focused on gaming and NFTs. It has since evolved 
                  into a multichain platform for metaverse, AI, and impact-driven projects. While Ethereum was its foundation, 
                  Enjinstarter now facilitates cross-chain launches while keeping Ethereum as a credibility anchor.
                </p>
              </div>
            </div>
          </div>

          {/* Generalist Launchpads */}
          <div className="mb-16">
            <h3 className="text-2xl font-bold mb-6 text-primary">Generalist Launchpads</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              General-purpose platforms that prioritize accessibility and launch variety. They often support multiple chains, 
              have lower entry barriers, and cater to both new and experienced founders. Kommunitas and TrustPad are leading examples.
            </p>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Kommunitas */}
              <div className="bg-secondary/10 p-6 rounded-lg">
                <h4 className="text-xl font-semibold mb-4">Kommunitas</h4>
                <div className="mb-4">
                  <img
                    src="/lovable-uploads/kommunitas.png"
                    alt="Kommunitas Launchpad"
                    className="w-full h-48 object-contain rounded-lg shadow-sm border border-border/50"
                  />
                </div>
                <p className="text-muted-foreground">
                  <a href="https://kommunitas.net/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Kommunitas</a> is 
                  a decentralized, tierless launchpad originally focused on accessibility and community ownership. While it 
                  began on Polygon, it has expanded to Ethereum and other chains, offering low-barrier IDOs with optional 
                  KYC and a strong focus on fair participation.
                </p>
              </div>

              {/* TrustPad */}
              <div className="bg-secondary/10 p-6 rounded-lg">
                <h4 className="text-xl font-semibold mb-4">TrustPad</h4>
                <div className="mb-4">
                  <img
                    src="/lovable-uploads/trustpad.png"
                    alt="Trustpad Launchpad"
                    className="w-full h-48 object-contain rounded-lg shadow-sm border border-border/50"
                  />
                </div>
                <p className="text-muted-foreground">
                  <a href="https://trustpad.io/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">TrustPad</a> is 
                  a veteran multichain launchpad with a focus on security, compliance, and high-profile token sales. It built 
                  its reputation on strict vetting and institutional-friendly standards, making it a popular choice for projects 
                  launching serious DeFi, infrastructure, and AI platforms.
                </p>
              </div>
            </div>
          </div>

          {/* High-Variance / Experimental Platforms */}
          <div>
            <h3 className="text-2xl font-bold mb-6 text-primary">High-Variance / Experimental Platforms</h3>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              These are newer or less-established platforms that may offer aggressive terms, looser curation, or niche verticals. 
              While some may succeed in emerging categories, others carry higher execution risk due to limited audits, developer 
              activity, or fragmented communities.
            </p>
            
            <div className="bg-secondary/10 p-6 rounded-lg max-w-2xl">
              <h4 className="text-xl font-semibold mb-4">Spores</h4>
              <div className="mb-4">
                <img
                  src="/lovable-uploads/spores.png"
                  alt="Spores Launchpad"
                  className="w-full h-48 object-contain rounded-lg shadow-sm border border-border/50"
                />
              </div>
              <p className="text-muted-foreground">
                <a href="https://spores.app/" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">Spores Network</a> is 
                a cross-chain launchpad and Web3 media ecosystem focused on NFTs, gaming, and Asian market distribution. 
                While initially launched on BNB Chain, Spores has increasingly supported Ethereum-based projects—particularly 
                those blending entertainment, cultural IP, and tokenized media experiences.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}