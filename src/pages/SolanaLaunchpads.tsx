
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
