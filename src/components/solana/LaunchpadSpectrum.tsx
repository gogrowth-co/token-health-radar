
export default function LaunchpadSpectrum() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">The Solana Launchpad Spectrum: From Memes to Mission</h2>
      
      <div className="max-w-4xl mx-auto mb-8">
        <p className="text-lg text-muted-foreground mb-6">
          Not all Solana launchpads are built for the same purpose. Some are meme factories optimized for speed. Others prioritize governance, UX, or long-term product alignment. This section maps out six leading platforms across four core axes to help you choose the right one for your project.
        </p>
        
        <img 
          src="/lovable-uploads/Permissionless vs. Curated Platforms in the Crypto Space - visual selection.png" 
          alt="Visual comparison of permissionless vs curated crypto platforms showing the spectrum from fully open to highly curated launches"
          className="w-full rounded-lg shadow-lg mb-8"
          loading="lazy"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">1. Permissionless vs. Curated</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Platform</th>
                  <th className="text-left p-2">Launch Model</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Pump.fun</td>
                  <td className="p-2">Fully permissionless</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Letsbonk.fun</td>
                  <td className="p-2">Fully permissionless</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Devfun</td>
                  <td className="p-2">Semi-permissionless</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Boop.fun</td>
                  <td className="p-2">Semi-curated (invite or gated start)</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Believe App</td>
                  <td className="p-2">Curated with social trust layer</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">MetaDAO</td>
                  <td className="p-2">Fully curated via DAO governance</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Summary:</strong> Use permissionless platforms if you want instant launches and viral potential. Choose curated paths if you value alignment, community, or platform quality control.
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-xl font-bold mb-4">2. Meme-Driven vs. Product-Focused</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Platform</th>
                  <th className="text-left p-2">Primary Focus</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Pump.fun</td>
                  <td className="p-2">Meme virality</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Letsbonk.fun</td>
                  <td className="p-2">Meme + trending tokens</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Boop.fun</td>
                  <td className="p-2">Meme + community experience</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Believe App</td>
                  <td className="p-2">Social-first with product orientation</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Devfun</td>
                  <td className="p-2">Dev-first product experimentation</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">MetaDAO</td>
                  <td className="p-2">Mission-driven governance projects</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            <strong>Summary:</strong> If your goal is fast attention and hype, meme-driven platforms dominate. If you're building for utility or mission, consider tools that support longer arcs of development.
          </p>
        </div>
      </div>

      <div className="bg-gradient-to-r from-primary/10 to-blue-600/10 p-6 rounded-lg">
        <h3 className="text-xl font-bold mb-4">Use This Spectrum To Decide:</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <p className="mb-2"><strong>Speed and virality?</strong> → Pump.fun or Letsbonk.fun</p>
            <p className="mb-2"><strong>Product plus social discovery?</strong> → Believe App or Boop.fun</p>
          </div>
          <div>
            <p className="mb-2"><strong>Governance and long-term alignment?</strong> → MetaDAO</p>
            <p><strong>Somewhere in the middle?</strong> → Devfun gives you dev-first control</p>
          </div>
        </div>
      </div>
    </section>
  );
}
