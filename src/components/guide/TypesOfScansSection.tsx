
export default function TypesOfScansSection() {
  return (
    <section className="mb-12">
      <h2 className="text-3xl font-bold mb-6">Types of Token Scans</h2>
      <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
        Now that you understand why token scanning is crucial, let's break down the different types of scans you should be running. Think of these as different X-ray machines – each one reveals a specific part of the token's "anatomy" that could make or break your investment.
      </p>

      {/* Security Scans */}
      <div className="mb-10">
        <h3 className="text-2xl font-bold mb-4">Security Scans: Your First Line of Defense</h3>
        <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
          This is where we catch the obvious scams before they catch you. Security scans dig into the smart contract code to identify red flags that could drain your wallet.
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold">What we're looking for:</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span><strong>Mintability risks</strong> - Can the creators print unlimited new tokens?</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span><strong>Honeypot behavior</strong> - Will you be able to sell your tokens?</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span><strong>Blacklist functions</strong> - Can the contract block you from trading?</span>
              </li>
              <li className="flex items-start">
                <span className="text-red-500 mr-2">•</span>
                <span><strong>Hidden backdoors</strong> - Secret functions giving developers advantages?</span>
              </li>
            </ul>
          </div>
          <img 
            src="/lovable-uploads/ths-smart-contract-security-risks.png" 
            alt="Infographic detailing smart contract security risks such as reentrancy attacks, oracle manipulation, frontrunning, insecure math, and denial of service vulnerabilities"
            className="w-full rounded-lg shadow-lg"
            loading="lazy"
          />
        </div>

        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 p-4 rounded-lg">
          <p className="font-medium text-red-800 dark:text-red-200">
            Real talk: If a token fails the security scan, just walk away. There are thousands of other opportunities that won't potentially steal your money.
          </p>
        </div>
      </div>

      {/* Liquidity Verification */}
      <div className="mb-10">
        <h3 className="text-2xl font-bold mb-4">Liquidity Verification: Can You Actually Trade?</h3>
        <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
          Here's a scenario that'll make you sick: You find a "moonshot" token, watch it pump 10x, go to sell... and discover there's no liquidity. Your gains are trapped.
        </p>

        <img 
          src="/lovable-uploads/ths-liquidity-verification.png" 
          alt="Diagram showing key factors of liquidity verification in crypto tokens, including pool depth, lock status, token holder concentration, and trading patterns"
          className="w-full max-w-2xl mx-auto mb-6 rounded-lg shadow-lg"
          loading="lazy"
        />

        <h4 className="text-lg font-semibold mb-4">Liquidity verification checks:</h4>
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-card rounded-lg border">
            <h5 className="font-semibold">Pool depth</h5>
            <p className="text-sm text-muted-foreground">How much trading volume can the market handle?</p>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <h5 className="font-semibold">Lock status</h5>
            <p className="text-sm text-muted-foreground">Are liquidity tokens locked or can developers rug pull?</p>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <h5 className="font-semibold">Token holder concentration</h5>
            <p className="text-sm text-muted-foreground">Do a few whales control most of the supply?</p>
          </div>
          <div className="p-4 bg-card rounded-lg border">
            <h5 className="font-semibold">Trading patterns</h5>
            <p className="text-sm text-muted-foreground">Is the volume organic or artificially pumped?</p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800/30 p-4 rounded-lg">
          <p className="font-medium text-yellow-800 dark:text-yellow-200">
            Bottom line: High concentration + unlocked liquidity = high rug pull risk. Proceed with extreme caution.
          </p>
        </div>
      </div>

      {/* Team Ownership */}
      <div className="mb-10">
        <h3 className="text-2xl font-bold mb-4">Ownership & Team Visibility: Who's Really Behind This?</h3>
        <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
          This is where we get into detective mode. Who created this token? Do they still control it? Can you actually find information about the team?
        </p>

        <img 
          src="/lovable-uploads/ths-team-ownership.png" 
          alt="Photo-realistic image of a gold cryptocurrency token in front of silhouetted figures, representing anonymous team ownership and visibility in Web3 projects"
          className="w-full max-w-2xl mx-auto mb-6 rounded-lg shadow-lg"
          loading="lazy"
        />

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-lg font-semibold mb-4">Current analysis includes:</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Deployer wallet activity - Is the original creator still involved?</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Control mechanisms - Single wallet vs. multisig setup</span>
              </li>
              <li className="flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                <span>Transaction patterns - Suspicious creator behavior?</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-lg font-semibold mb-4">Coming soon in TokenHealthScan Pro:</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Team wallet tracking - Monitor development team activity</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Cross-project analysis - See previous team involvement</span>
              </li>
              <li className="flex items-start">
                <span className="text-green-500 mr-2">•</span>
                <span>Social verification - Match wallets to public profiles</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
