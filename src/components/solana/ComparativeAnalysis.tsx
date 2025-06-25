
export default function ComparativeAnalysis() {
  return (
    <section className="mb-8 md:mb-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">Comparative Deep Dive: Pros & Cons by Platform</h2>
      
      <p className="text-base md:text-lg text-muted-foreground mb-6 md:mb-8 max-w-4xl mx-auto text-center px-4">
        Solana's token launch scene isn't one-size-fits-all. Founders today aren't just deciding when to launch — they're deciding how. Some platforms are built for speed and hype. Others prioritize control, governance, or experimentation.
      </p>

      <div className="grid gap-6 md:gap-8">
        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-green-600">Best for Fast Virality</h3>
          <p className="text-muted-foreground mb-4 text-sm md:text-base">
            <a href="https://pump.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Pump.fun</a>, 
            <a href="https://letsbonk.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline ml-1">Letsbonk.fun</a>, 
            <a href="https://believe.app/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline ml-1">Believe App</a>
          </p>
          <p className="mb-4 md:mb-6 text-sm md:text-base">These platforms are designed for speed and shareability. They minimize friction and maximize meme potential. Tokens can launch in minutes, sometimes directly from a tweet.</p>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-background p-3 md:p-4 rounded border">
              <div className="flex items-center mb-3">
                <img 
                  src="/lovable-uploads/pumpfun1.png" 
                  alt="Pump.fun platform interface showing bonding curve and token launch features" 
                  className="w-6 h-6 md:w-8 md:h-8 rounded mr-2 md:mr-3" 
                  width="32" 
                  height="32"
                />
                <h4 className="font-semibold text-sm md:text-base">
                  <a href="https://pump.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Pump.fun</a>
                </h4>
              </div>
              <div className="text-xs md:text-sm">
                <p className="text-green-600 mb-2"><strong>Pros:</strong> Instant bonding curve launch. Massive liquidity funnel via Solana DEXs.</p>
                <p className="text-red-600"><strong>Cons:</strong> No customization. Little holder stickiness. Frequent rugs.</p>
              </div>
            </div>
            
            <div className="bg-background p-3 md:p-4 rounded border">
              <div className="flex items-center mb-3">
                <img 
                  src="/lovable-uploads/letsbonk1.png" 
                  alt="Letsbonk.fun platform showing token feed and trending filters" 
                  className="w-6 h-6 md:w-8 md:h-8 rounded mr-2 md:mr-3" 
                  width="32" 
                  height="32"
                />
                <h4 className="font-semibold text-sm md:text-base">
                  <a href="https://letsbonk.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Letsbonk.fun</a>
                </h4>
              </div>
              <div className="text-xs md:text-sm">
                <p className="text-green-600 mb-2"><strong>Pros:</strong> Real-time token feed. Watchlist and trending filters built in.</p>
                <p className="text-red-600"><strong>Cons:</strong> Still early. No docs or transparency on mechanics.</p>
              </div>
            </div>
            
            <div className="bg-background p-3 md:p-4 rounded border">
              <div className="flex items-center mb-3">
                <img 
                  src="/lovable-uploads/believeapp1.png" 
                  alt="Believe App interface for one-click meme coin launches with dynamic curves" 
                  className="w-6 h-6 md:w-8 md:h-8 rounded mr-2 md:mr-3" 
                  width="32" 
                  height="32"
                />
                <h4 className="font-semibold text-sm md:text-base">
                  <a href="https://believe.app/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Believe App</a>
                </h4>
              </div>
              <div className="text-xs md:text-sm">
                <p className="text-green-600 mb-2"><strong>Pros:</strong> One-click meme coin launches. Dynamic curve. Meteora liquidity handled automatically.</p>
                <p className="text-red-600"><strong>Cons:</strong> Less clarity on token lifecycle. Focused on virality over structure.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-blue-600">Best for Builder Equity and Governance Design</h3>
          <p className="text-muted-foreground mb-4 text-sm md:text-base">
            <a href="https://metadao.fi/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">MetaDAO</a>
          </p>
          <p className="mb-4 md:mb-6 text-sm md:text-base">MetaDAO stands out for doing the opposite. It's slower by design. The goal isn't just to raise funds but to build legitimacy, governance, and long-term alignment.</p>
          
          <div className="bg-background p-3 md:p-4 rounded border max-w-md">
            <div className="flex items-center mb-3">
              <img 
                src="/lovable-uploads/metadao1.png" 
                alt="MetaDAO platform interface showing governance-first approach and futarchy voting system" 
                className="w-6 h-6 md:w-8 md:h-8 rounded mr-2 md:mr-3" 
                width="32" 
                height="32"
              />
              <h4 className="font-semibold text-sm md:text-base">
                <a href="https://metadao.fi/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">MetaDAO</a>
              </h4>
            </div>
            <div className="text-xs md:text-sm">
              <p className="text-green-600 mb-2"><strong>Pros:</strong> Designed for DAOs. Tokenholders vote on funding via futarchy. High-trust environment.</p>
              <p className="text-red-600"><strong>Cons:</strong> Launch takes longer. Requires more coordination.</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-purple-600">Best for Experiments and Dev Teams</h3>
          <p className="text-muted-foreground mb-4 text-sm md:text-base">
            <a href="https://dev.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Devfun</a>
          </p>
          <p className="mb-4 md:mb-6 text-sm md:text-base">Devfun caters to the builder crowd. It's not built for slick onboarding or flashy launches — it's for shipping experiments and testing ideas.</p>
          
          <div className="bg-background p-3 md:p-4 rounded border max-w-md">
            <div className="flex items-center mb-3">
              <img 
                src="/lovable-uploads/devfun1.png" 
                alt="Devfun platform with developer-first interface for utility token experiments" 
                className="w-6 h-6 md:w-8 md:h-8 rounded mr-2 md:mr-3" 
                width="32" 
                height="32"
              />
              <h4 className="font-semibold text-sm md:text-base">
                <a href="https://dev.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Devfun</a>
              </h4>
            </div>
            <div className="text-xs md:text-sm">
              <p className="text-green-600 mb-2"><strong>Pros:</strong> Dev-first interface. Encourages utility experiments, not just speculation.</p>
              <p className="text-red-600"><strong>Cons:</strong> Limited public reach. Few established case studies.</p>
            </div>
          </div>
        </div>

        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-xl md:text-2xl font-bold mb-4 text-orange-600">Best UX Polish for Newcomers</h3>
          <p className="text-muted-foreground mb-4 text-sm md:text-base">
            <a href="https://boop.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Boop.fun</a>, 
            <a href="https://letsbonk.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline ml-1">Letsbonk.fun</a>
          </p>
          <p className="mb-4 md:mb-6 text-sm md:text-base">Not all founders are devs. Some are marketers, meme creators, or community builders. For them, a clean, intuitive interface makes all the difference.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-background p-3 md:p-4 rounded border">
              <div className="flex items-center mb-3">
                <img 
                  src="/lovable-uploads/boopfun1.png" 
                  alt="Boop.fun invite-based platform with meme builder tools and clean UX" 
                  className="w-6 h-6 md:w-8 md:h-8 rounded mr-2 md:mr-3" 
                  width="32" 
                  height="32"
                />
                <h4 className="font-semibold text-sm md:text-base">
                  <a href="https://boop.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Boop.fun</a>
                </h4>
              </div>
              <div className="text-xs md:text-sm">
                <p className="text-green-600 mb-2"><strong>Pros:</strong> Invite-based minting. Meme builder tools. Good onboarding UX.</p>
                <p className="text-red-600"><strong>Cons:</strong> Harder to access. Token design isn't fully transparent.</p>
              </div>
            </div>
            
            <div className="bg-background p-3 md:p-4 rounded border">
              <div className="flex items-center mb-3">
                <img 
                  src="/lovable-uploads/letsbonk1.png" 
                  alt="Letsbonk.fun grid layout showing trending tokens with clean sorting features" 
                  className="w-6 h-6 md:w-8 md:h-8 rounded mr-2 md:mr-3" 
                  width="32" 
                  height="32"
                />
                <h4 className="font-semibold text-sm md:text-base">
                  <a href="https://letsbonk.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Letsbonk.fun</a>
                </h4>
              </div>
              <div className="text-xs md:text-sm">
                <p className="text-green-600 mb-2"><strong>Pros:</strong> Grid layout of trending tokens. Clean sorting. Token cards feel familiar.</p>
                <p className="text-red-600"><strong>Cons:</strong> Still unverified. No audits or docs. Hard to separate signal from noise.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
