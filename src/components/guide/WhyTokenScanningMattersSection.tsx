
export default function WhyTokenScanningMattersSection() {
  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold mb-6">Why Token Scanning Matters in Crypto</h2>
      <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
        Here's the uncomfortable truth: the crypto space is absolutely flooded with projects designed to separate you from your hard-earned money.
      </p>

      <img 
        src="/lovable-uploads/ths-why-token-scanning-matters-in-crypto.png" 
        alt="Photo of Ethereum and Bitcoin coins on top of dollar bills next to a bear trap, illustrating the financial dangers of crypto scams like rug pulls and honeypots"
        className="w-full max-w-2xl mx-auto mb-8 rounded-lg shadow-lg"
        loading="lazy"
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
  );
}
