
export default function TypesOfScansSection() {
  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold mb-6">Types of Token Scans</h2>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
        Not all token scans are created equal. Here are the main types you'll encounter, and what each one actually tells you about your potential investment.
      </p>

      <div className="space-y-12">
        <div>
          <h3 className="text-2xl font-bold mb-4">Smart Contract Security Scans</h3>
          <img 
            src="/lovable-uploads/ths-smart-contract-security-risks.png" 
            alt="Screenshot of TokenHealthScan security analysis showing red warning flags for a risky token including honeypot detection, mint function risks, and ownership concerns"
            className="w-full mb-6 rounded-lg shadow-lg"
            loading="lazy"
          />
          <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
            This is your first line of defense against getting rugged. A security scan digs into the smart contract code to identify red flags like:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start">
              <span className="text-red-500 mr-2">🍯</span>
              <span><strong>Honeypot mechanisms</strong> – Can you actually sell, or only buy?</span>
            </li>
            <li className="flex items-start">
              <span className="text-orange-500 mr-2">🔨</span>
              <span><strong>Mint functions</strong> – Can the creator print unlimited tokens?</span>
            </li>
            <li className="flex items-start">
              <span className="text-yellow-500 mr-2">⚠️</span>
              <span><strong>Ownership renouncement</strong> – Has the creator given up control?</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-500 mr-2">❄️</span>
              <span><strong>Freeze functions</strong> – Can your tokens be locked?</span>
            </li>
          </ul>
          <p className="text-lg text-muted-foreground">
            Tools like GoPlus API provide this data by analyzing the contract bytecode. It's like having a code auditor working 24/7.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-4">Liquidity Verification</h3>
          <img 
            src="/lovable-uploads/ths-liquidity-verification.png" 
            alt="TokenHealthScan liquidity analysis dashboard showing liquidity pool health, trading volume metrics, and holder distribution charts for comprehensive token assessment"
            className="w-full mb-6 rounded-lg shadow-lg"
            loading="lazy"
          />
          <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
            Here's where most people get burned: they buy a token that looks promising, but when it's time to sell... there's no liquidity. Oops.
          </p>
          <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
            We combine data from <a href="https://www.geckoterminal.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GeckoTerminal</a> (for real-time trading metrics) and <a href="https://etherscan.io/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Etherscan</a> (for on-chain holder analysis) to give you the full picture. This scan tells you whether you'll actually be able to exit your position when you want to.
          </p>
        </div>

        <div>
          <h3 className="text-2xl font-bold mb-4">Team & Ownership Analysis</h3>
          <img 
            src="/lovable-uploads/ths-team-ownership.png" 
            alt="Team analysis interface showing founder wallet tracking, token distribution among team members, and transparency metrics for evaluating project leadership"
            className="w-full mb-6 rounded-lg shadow-lg"
            loading="lazy"
          />
          <p className="text-lg text-muted-foreground mb-4 leading-relaxed">
            Anonymous teams aren't inherently bad, but they do add risk. This analysis looks at:
          </p>
          <ul className="space-y-2 mb-6">
            <li className="flex items-start">
              <span className="text-blue-500 mr-2">👥</span>
              <span><strong>Team transparency</strong> – Are the founders public and doxxed?</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">🔒</span>
              <span><strong>Token distribution</strong> – Do insiders hold too much?</span>
            </li>
            <li className="flex items-start">
              <span className="text-purple-500 mr-2">📈</span>
              <span><strong>Vesting schedules</strong> – When can team tokens be sold?</span>
            </li>
          </ul>
          <p className="text-lg text-muted-foreground">
            Think of this as a background check for your investment.
          </p>
        </div>
      </div>
    </section>
  );
}
