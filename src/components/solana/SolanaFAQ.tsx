
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function SolanaFAQ() {
  return (
    <section className="mb-16">
      <h2 className="text-3xl font-bold mb-8 text-center">People Also Ask (FAQ)</h2>
      
      <div className="max-w-4xl mx-auto">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="what-is-crypto-launchpad">
            <AccordionTrigger className="text-left">What is a crypto launchpad?</AccordionTrigger>
            <AccordionContent>
              A crypto launchpad is a platform that helps new tokens launch into the market. It can handle everything from smart contract deployment and liquidity setup to community access, token distribution, and trading kick-off.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="solana-vs-ethereum-launchpads">
            <AccordionTrigger className="text-left">How do Solana launchpads differ from Ethereum-based ones?</AccordionTrigger>
            <AccordionContent>
              Solana launchpads tend to be faster, cheaper, and more permissionless. Many don't require KYC, and tools like Pump.fun allow meme tokens to launch in seconds. But that speed comes with risks—like scams, unvetted teams, and unsustainable hype cycles.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="permissionless-platform-risks">
            <AccordionTrigger className="text-left">What are the risks of launching on a permissionless platform?</AccordionTrigger>
            <AccordionContent>
              You get speed and visibility, but lose control. Many permissionless tools lack LP locking, allow anonymous teams, and attract short-term speculators. This can lead to rug pulls or failed launches if not handled strategically.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="best-launchpad-for-project">
            <AccordionTrigger className="text-left">Which launchpad is best for my project?</AccordionTrigger>
            <AccordionContent>
              It depends on your goal:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Viral memecoin?</strong> → Pump.fun or Letsbonk.fun</li>
                <li><strong>Developer tools or protocol testing?</strong> → Devfun</li>
                <li><strong>Governance-heavy project?</strong> → MetaDAO</li>
                <li><strong>Influencer-driven community token?</strong> → Believe App or Boop.fun</li>
              </ul>
              Use our Founder Fit section and Decision Tree to match your use case.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="tracking-tools">
            <AccordionTrigger className="text-left">What tools can I use to track new token launches?</AccordionTrigger>
            <AccordionContent>
              You can use:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li><strong>Solscan</strong> to monitor token creation and activity</li>
                <li><strong>Dune Analytics</strong> to visualize trends across launchpads</li>
                <li><strong>TokenHealthScan (THS)</strong> to analyze token safety and legitimacy</li>
              </ul>
              These tools help filter signal from noise in a chaotic ecosystem.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="bonding-curves-explained">
            <AccordionTrigger className="text-left">How do bonding curves work in Solana launchpads?</AccordionTrigger>
            <AccordionContent>
              Bonding curves are automated market makers where token price increases as more tokens are purchased. Early buyers get cheaper prices, while later buyers pay more. This creates initial price discovery and liquidity, but can lead to volatility and dump risks when early buyers sell.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="avoid-rug-pulls">
            <AccordionTrigger className="text-left">How can I avoid rug pulls when investing in new Solana tokens?</AccordionTrigger>
            <AccordionContent>
              Look for these red flags:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>No liquidity pool locks</li>
                <li>Anonymous teams with no social presence</li>
                <li>Excessive token allocations to creators</li>
                <li>No renounced mint authority</li>
                <li>Suspicious trading patterns or bot activity</li>
              </ul>
              Use tools like TokenHealthScan to get automated risk assessments before investing.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}
