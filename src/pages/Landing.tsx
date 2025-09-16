
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/landing/HeroSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import { 
  LazyHowItWorks, 
  LazyReportPreview, 
  LazyFeatureGrid, 
  LazySocialProof, 
  LazyPricingTeaser, 
  LazyFinalCTA 
} from "@/components/landing/LazySection";

export default function Landing() {
  
  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Token Health Scan - Find Hidden Risks Before You Dive In</title>
        <meta name="description" content="Token Health Scan helps you analyze any crypto token's health across security, liquidity, tokenomics, community, and development." />
        <meta name="keywords" content="token scanner, crypto analysis, DeFi security, smart contract audit, liquidity verification, token due diligence" />
        <link rel="canonical" href="https://tokenhealthscan.com/" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Token Health Scan - Find Hidden Risks Before You Dive In" />
        <meta property="og:description" content="Scan any project and uncover critical risks — from contract flaws to liquidity traps — in seconds." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tokenhealthscan.com/" />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="TokenHealthScan" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Token Health Scan - Find Hidden Risks Before You Dive In" />
        <meta name="twitter:description" content="Scan any project and uncover critical risks — from contract flaws to liquidity traps — in seconds." />
        <meta name="twitter:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
        <meta name="twitter:site" content="@tokenhealthscan" />
        
        {/* Additional SEO tags */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="author" content="Token Health Scan" />
      </Helmet>
      <Navbar />
      
      <main className="flex-1">
        {/* Critical above-the-fold content */}
        <HeroSection />
        
        
        {/* Report preview moved here */}
        <LazyReportPreview />
        
        {/* Lazy-loaded below-the-fold content */}
        <LazyHowItWorks />
        <BenefitsSection />
        <LazyFeatureGrid />
        <LazySocialProof />
        <LazyPricingTeaser />
        <LazyFinalCTA />
      </main>
      
      <Footer />
    </div>
  );
}
