import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SolanaLaunchpadsHero from "@/components/solana/SolanaLaunchpadsHero";
import LaunchpadSpectrum from "@/components/solana/LaunchpadSpectrum";
import ComparativeAnalysis from "@/components/solana/ComparativeAnalysis";
import LaunchMechanics from "@/components/solana/LaunchMechanics";
import TokenDistribution from "@/components/solana/TokenDistribution";
import UXOnboarding from "@/components/solana/UXOnboarding";
import FounderFit from "@/components/solana/FounderFit";
import LaunchPlans from "@/components/solana/LaunchPlans";
import ToolsDashboards from "@/components/solana/ToolsDashboards";
import KeyTakeaways from "@/components/solana/KeyTakeaways";
import SolanaFAQ from "@/components/solana/SolanaFAQ";

export default function SolanaLaunchpads() {
  const schemaMarkup = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Solana Launchpads Guide 2025: From Pump.fun to MetaDAO",
    "description": "Discover and compare the best Solana launchpads for your token. Read the full article and find the best launchpad for your project.",
    "image": "https://tokenhealthscan.com/lovable-uploads/solana%20launchpads2.png",
    "author": {
      "@type": "Organization",
      "name": "Token Health Scan Editors"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TokenHealthScan",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png"
      }
    },
    "datePublished": "2025-01-01",
    "dateModified": "2025-01-01",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://tokenhealthscan.com/solana-launchpads"
    }
  };

  const faqSchemaMarkup = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "What is a crypto launchpad?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "A crypto launchpad is a platform that helps new tokens launch into the market. It can handle everything from smart contract deployment and liquidity setup to community access, token distribution, and trading kick-off."
        }
      },
      {
        "@type": "Question",
        "name": "How do Solana launchpads differ from Ethereum-based ones?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Solana launchpads tend to be faster, cheaper, and more permissionless. Many don't require KYC, and tools like Pump.fun allow meme tokens to launch in seconds. But that speed comes with risks—like scams, unvetted teams, and unsustainable hype cycles."
        }
      },
      {
        "@type": "Question",
        "name": "What are the risks of launching on a permissionless platform?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You get speed and visibility, but lose control. Many permissionless tools lack LP locking, allow anonymous teams, and attract short-term speculators. This can lead to rug pulls or failed launches if not handled strategically."
        }
      },
      {
        "@type": "Question",
        "name": "Which launchpad is best for my project?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "It depends on your goal: Viral memecoin? → Pump.fun or Letsbonk.fun. Developer tools or protocol testing? → Devfun. Governance-heavy project? → MetaDAO. Influencer-driven community token? → Believe App or Boop.fun. Use our Founder Fit section and Decision Tree to match your use case."
        }
      },
      {
        "@type": "Question",
        "name": "What tools can I use to track new token launches?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "You can use: Solscan to monitor token creation and activity, Dune Analytics to visualize trends across launchpads, TokenHealthScan (THS) to analyze token safety and legitimacy. These tools help filter signal from noise in a chaotic ecosystem."
        }
      },
      {
        "@type": "Question",
        "name": "How do bonding curves work in Solana launchpads?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Bonding curves are automated market makers where token price increases as more tokens are purchased. Early buyers get cheaper prices, while later buyers pay more. This creates initial price discovery and liquidity, but can lead to volatility and dump risks when early buyers sell."
        }
      },
      {
        "@type": "Question",
        "name": "How can I avoid rug pulls when investing in new Solana tokens?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Look for these red flags: No liquidity pool locks, Anonymous teams with no social presence, Excessive token allocations to creators, No renounced mint authority, Suspicious trading patterns or bot activity. Use tools like TokenHealthScan to get automated risk assessments before investing."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Solana Launchpads Guide 2025: From Pump.fun to MetaDAO | TokenHealthScan</title>
        <meta name="description" content="Discover and compare the best Solana launchpads for your token. Read the full article and find the best launchpad for your project." />
        <meta name="keywords" content="Solana launchpads, Pump.fun, MetaDAO, token launch, meme coins, crypto launchpad, Solana tokens, DeFi launch" />
        <meta property="og:title" content="Complete Guide to Solana Launchpads 2025 - TokenHealthScan" />
        <meta property="og:description" content="Discover and compare the best Solana launchpads for your token. Read the full article and find the best launchpad for your project." />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/solana%20launchpads2.png" />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Complete Guide to Solana Launchpads 2025" />
        <meta name="twitter:description" content="Discover and compare the best Solana launchpads for your token." />
        <meta name="twitter:image" content="https://tokenhealthscan.com/lovable-uploads/solana%20launchpads2.png" />
        <link rel="canonical" href="https://tokenhealthscan.com/solana-launchpads" />
        <script type="application/ld+json">
          {JSON.stringify(schemaMarkup)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchemaMarkup)}
        </script>
      </Helmet>
      
      <Navbar />
      
      <main className="container mx-auto px-4 py-4 md:py-8 max-w-6xl">
        <SolanaLaunchpadsHero />
        <LaunchpadSpectrum />
        <ComparativeAnalysis />
        <LaunchMechanics />
        <TokenDistribution />
        <UXOnboarding />
        <FounderFit />
        <LaunchPlans />
        <ToolsDashboards />
        <KeyTakeaways />
        <SolanaFAQ />
      </main>
      
      <Footer />
    </div>
  );
}
