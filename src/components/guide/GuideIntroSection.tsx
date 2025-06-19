
export default function GuideIntroSection() {
  return (
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
  );
}
