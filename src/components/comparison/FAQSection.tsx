
import { Helmet } from "react-helmet-async";

export default function FAQSection() {
  const faqData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Is Token Sniffer the same as TokenHealthScan?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No. Token Sniffer checks for basic red flags. TokenHealthScan offers a full-spectrum health report, analyzing everything from liquidity and tokenomics to GitHub activity and social traction."
        }
      },
      {
        "@type": "Question",
        "name": "What is the main benefit of TokenHealthScan?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Depth and clarity. It answers not just 'Is this token safe?' but also 'Is this token strong, liquid, and credible?' It supports better long-term decisions — not just avoiding scams."
        }
      },
      {
        "@type": "Question",
        "name": "Is TokenHealthScan free?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. You get 3 full scans for free. For ongoing monitoring and historical comparisons, TokenHealthScan offers a $20/month Pro tier."
        }
      }
    ]
  };

  return (
    <section className="mb-12">
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(faqData)}
        </script>
      </Helmet>

      <h2 className="text-2xl md:text-3xl font-bold mb-6">Frequently Asked Questions (FAQ)</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-bold mb-3">Is Token Sniffer the same as TokenHealthScan?</h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No. Token Sniffer checks for basic red flags. TokenHealthScan offers a full-spectrum health report, analyzing everything from liquidity and tokenomics to GitHub activity and social traction.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-3">What is the main benefit of TokenHealthScan?</h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Depth and clarity. It answers not just "Is this token safe?" but also "Is this token strong, liquid, and credible?" It supports better long-term decisions — not just avoiding scams.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-3">Is TokenHealthScan free?</h3>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Yes. You get 3 full scans for free. For ongoing monitoring and historical comparisons, TokenHealthScan offers a $20/month Pro tier.
          </p>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-3">Who should use TokenHealthScan?</h3>
          <ul className="space-y-2">
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>DeFi investors seeking deeper due diligence</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>Analysts evaluating early-stage tokens</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>Builders checking their own projects</span>
            </li>
            <li className="flex items-start">
              <span className="text-primary mr-2">•</span>
              <span>Traders avoiding low-liquidity, overhyped coins</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
