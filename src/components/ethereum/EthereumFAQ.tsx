import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export function EthereumFAQ() {
  const faqs = [
    {
      question: "What is an Ethereum launchpad?",
      answer: "An Ethereum launchpad is a platform that helps new crypto projects raise capital, distribute tokens, and build early community traction. Most include features like KYC onboarding, staking mechanics, and access tiers for participants."
    },
    {
      question: "How are Ethereum launchpads different from Solana launchpads?",
      answer: "Ethereum launchpads focus more on compliance, tooling, and long-term infrastructure. Solana launchpads often prioritize speed and meme-token virality. Ethereum is typically preferred for DeFi, AI, and enterprise-grade projects."
    },
    {
      question: "Which types of projects use Ethereum launchpads?",
      answer: "Projects in DeFi, AI, gaming, NFTs, and real-world assets (RWAs) commonly use Ethereum launchpads. Some platforms specialize in specific verticals, like ChainGPT Pad for AI or Seedify for GameFi."
    },
    {
      question: "What should founders look for in a launchpad?",
      answer: "Key factors include community size, audit and KYC policies, multichain support, ecosystem alignment, and developer tools or post-launch support."
    },
    {
      question: "Do all Ethereum launchpads require KYC?",
      answer: "Not all, but most leading launchpads include KYC to meet regulatory standards and attract institutional investors. DAO Maker, Seedify, and TrustPad enforce KYC requirements."
    },
    {
      question: "Is it better to launch on multiple platforms?",
      answer: "Some teams use multi-platform launches to increase reach—for example, a whitelist on one platform and public round on another. This boosts exposure but adds operational complexity."
    },
    {
      question: "How can I track Ethereum launchpad performance?",
      answer: "Token Health Scan offers live analytics on dev activity, social velocity, audit status, and more, helping teams make data-informed launchpad decisions."
    },
    {
      question: "What's the difference between Ethereum's staking launchpad and token launchpads?",
      answer: "The staking launchpad helps users become Ethereum validators. Token launchpads are designed to raise capital and distribute tokens for new crypto projects."
    }
  ];

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-center">
            Frequently Asked Questions
          </h2>
          
          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`faq-${index}`} className="bg-secondary/10 rounded-lg px-6">
                <AccordionTrigger className="text-left font-medium hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pt-2 pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}