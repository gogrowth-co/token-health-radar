export default function LaunchpadSpectrum() {
  return (
    <section className="mb-8 md:mb-16">
      <h2 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-center">The Solana Launchpad Spectrum: From Memes to Mission</h2>
      
      <div className="max-w-4xl mx-auto mb-6 md:mb-8">
        <p className="text-base md:text-lg text-muted-foreground mb-4 md:mb-6 px-4">
          Not all Solana launchpads are built for the same purpose. Some are meme factories optimized for speed. Others prioritize governance, UX, or long-term product alignment. This section maps out six leading platforms across four core axes to help you choose the right one for your project.
        </p>
        
        <img 
          src="/lovable-uploads/Permissionless-vs-Curated-Platforms.png" 
          alt="Spectrum comparison chart showing permissionless vs curated crypto platforms, from fully open launches like Pump.fun to highly curated platforms like MetaDAO"
          className="w-full rounded-lg shadow-lg mb-6 md:mb-8"
          loading="lazy"
          width="800"
          height="450"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-8 md:mb-12">
        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">1. Permissionless vs. Curated</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Platform</th>
                  <th className="text-left p-2">Launch Model</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://pump.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Pump.fun</a>
                  </td>
                  <td className="p-2">Fully permissionless</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://letsbonk.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Letsbonk.fun</a>
                  </td>
                  <td className="p-2">Fully permissionless</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://dev.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Devfun</a>
                  </td>
                  <td className="p-2">Semi-permissionless</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://boop.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Boop.fun</a>
                  </td>
                  <td className="p-2">Semi-curated (invite or gated start)</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://believe.app/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Believe App</a>
                  </td>
                  <td className="p-2">Curated with social trust layer</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">
                    <a href="https://metadao.fi/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">MetaDAO</a>
                  </td>
                  <td className="p-2">Fully curated via DAO governance</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4">
            <strong>Summary:</strong> Use permissionless platforms if you want instant launches and viral potential. Choose curated paths if you value alignment, community, or platform quality control.
          </p>
        </div>

        <div className="bg-card p-4 md:p-6 rounded-lg border">
          <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">2. Meme-Driven vs. Product-Focused</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs md:text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Platform</th>
                  <th className="text-left p-2">Primary Focus</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://pump.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Pump.fun</a>
                  </td>
                  <td className="p-2">Meme virality</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://letsbonk.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Letsbonk.fun</a>
                  </td>
                  <td className="p-2">Meme + trending tokens</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://boop.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Boop.fun</a>
                  </td>
                  <td className="p-2">Meme + community experience</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://believe.app/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Believe App</a>
                  </td>
                  <td className="p-2">Social-first with product orientation</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">
                    <a href="https://dev.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Devfun</a>
                  </td>
                  <td className="p-2">Dev-first product experimentation</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">
                    <a href="https://metadao.fi/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">MetaDAO</a>
                  </td>
                  <td className="p-2">Mission-driven governance projects</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-3 md:mt-4">
            <strong>Summary:</strong> If your goal is fast attention and hype, meme-driven platforms dominate. If you're building for utility or mission, consider tools that support longer arcs of development.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 p-4 md:p-6 rounded-lg">
        <h3 className="text-lg md:text-xl font-bold mb-3 md:mb-4">Use This Spectrum To Decide:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div className="text-sm md:text-base">
            <p className="mb-2"><strong>Speed and virality?</strong> → <a href="https://pump.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Pump.fun</a> or <a href="https://letsbonk.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Letsbonk.fun</a></p>
            <p className="mb-2"><strong>Product plus social discovery?</strong> → <a href="https://believe.app/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Believe App</a> or <a href="https://boop.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Boop.fun</a></p>
          </div>
          <div className="text-sm md:text-base">
            <p className="mb-2"><strong>Governance and long-term alignment?</strong> → <a href="https://metadao.fi/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">MetaDAO</a></p>
            <p><strong>Somewhere in the middle?</strong> → <a href="https://dev.fun/" target="_blank" rel="nofollow" className="text-blue-600 hover:underline">Devfun</a> gives you dev-first control</p>
          </div>
        </div>
      </div>
    </section>
  );
}
