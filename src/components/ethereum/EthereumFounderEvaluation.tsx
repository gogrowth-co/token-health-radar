export function EthereumFounderEvaluation() {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            How Founders Should Evaluate Ethereum Launchpads
          </h2>
          
          <p className="text-lg text-muted-foreground text-center mb-12">
            Choosing a launchpad is no longer just about getting listed. Founders need to evaluate platforms the same 
            way they'd assess investors: alignment, value-add, and long-term upside.
          </p>
          
          <div className="mb-12">
            <img
              src="/lovable-uploads/founders-evaluating-ethereum-launchpads.jpg"
              alt="An overhead, photorealistic view of several professionals seated around a modern white conference table. Their hands are visible, some pointing towards the center. On the table, several blue icons are prominently displayed: a balanced scale representing alignment and fairness, an Ethereum logo with 'LAUNCHPAD' text underneath, two bar charts showing upward growth, and a magnifying glass symbolizing careful evaluation. The image conveys the strategic and thorough process founders use to assess Ethereum launchpads for long-term upside."
              className="w-full max-w-3xl mx-auto h-auto rounded-lg"
            />
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <div className="bg-secondary/10 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-primary">Align With the Right Audience</h3>
              <p className="text-muted-foreground leading-relaxed">
                Different launchpads attract different user bases. Gaming projects tend to get better traction on Seedify 
                or Enjinstarter. DeFi protocols find more depth with DAO Maker. AI-native teams are increasingly gravitating 
                toward ChainGPT Pad. Matching your category to the platform's strengths leads to stronger participation and retention.
              </p>
            </div>
            
            <div className="bg-secondary/10 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-primary">Evaluate the Infrastructure</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Founders should dig beyond the UI. Critical infrastructure factors include:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Onboarding flow (KYC requirements, token gating)</li>
                <li>Audit transparency (links to CertiK, Hacken, or in-house assessments)</li>
                <li>Dev support (launchpad-run testnets, integration docs, or L2 deployments)</li>
                <li>Post-launch incentives (staking, governance hooks, or continued exposure)</li>
              </ul>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-secondary/10 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-primary">Check for Real Community Depth</h3>
              <p className="text-muted-foreground leading-relaxed">
                Join the launchpad's Discord or Telegram. Ask questions. Monitor how long it takes to get a reply. 
                Look at community sentiment in project chats. Founders report that launchpad-hosted chats with sustained 
                engagement drive stronger holder retention than one-off AMA events.
              </p>
            </div>
            
            <div className="bg-secondary/10 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4 text-primary">Use On-Chain and Social Data</h3>
              <p className="text-muted-foreground leading-relaxed">
                Don't rely on pitch decks or platform rankings alone. Check wallet overlap with other successful launches, 
                frequency of returning wallets, and Twitter engagement rates. These signals offer better indicators of 
                reach and relevance than token price charts.
              </p>
            </div>
          </div>
          
          <div className="mt-12 bg-gradient-to-r from-primary/20 to-secondary/20 p-6 rounded-lg text-center">
            <p className="text-lg font-medium">
              A polished website is not enough. Look for how much the platform actually helps beyond TGE.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}