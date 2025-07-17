import { memo } from "react";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQSection = memo(() => {
  const faqs = [
    {
      question: "Is this really free?",
      answer: "Yes — you can run up to 3 token scans completely free. No wallet or login required."
    },
    {
      question: "Do I need to connect my wallet?",
      answer: "No. TokenHealthScan works anonymously — just paste a token address and go."
    },
    {
      question: "How accurate are your results?",
      answer: "We use 30+ risk signals including code analysis, liquidity, and dev activity. It's not foolproof, but flags common threats fast."
    },
    {
      question: "What chains are supported?",
      answer: "Ethereum, BNB Chain, Arbitrum, Base, and Polygon."
    },
    {
      question: "Who uses this tool?",
      answer: "Traders, auditors, DAOs, and developers — anyone who needs fast token risk analysis."
    }
  ];

  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-4">
            Frequently Asked Questions
          </h2>
        </div>
        
        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border border-border/50 rounded-lg px-6">
                <AccordionTrigger className="text-left hover:no-underline py-6">
                  <div className="flex items-center gap-3">
                    <HelpCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="font-medium">{faq.question}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6 text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
});

FAQSection.displayName = 'FAQSection';

export default FAQSection;