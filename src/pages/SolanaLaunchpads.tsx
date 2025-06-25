
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
  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Solana Launchpads Guide 2025: From Pump.fun to MetaDAO | TokenHealthScan</title>
        <meta name="description" content="Complete guide to Solana token launchpads including Pump.fun, Boop.fun, MetaDAO, Devfun, Believe App, and Letsbonk.fun. Compare features, mechanics, and find the best launchpad for your project." />
        <meta name="keywords" content="Solana launchpads, Pump.fun, MetaDAO, token launch, meme coins, crypto launchpad, Solana tokens, DeFi launch" />
        <meta property="og:title" content="Complete Guide to Solana Launchpads 2025 - TokenHealthScan" />
        <meta property="og:description" content="Discover and compare the best Solana launchpads for your token. From meme coins to governance tokens - find the perfect launch platform." />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/solana%20launchpads2.png" />
        <meta property="og:type" content="article" />
        <link rel="canonical" href="https://tokenhealthscan.com/solana-launchpads" />
      </Helmet>
      
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
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
