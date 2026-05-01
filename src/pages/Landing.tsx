
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
        <title>Token Health Scan — Your token is struggling. Find out why.</title>
        <meta name="description" content="Get a 0–100 health score across all 5 dimensions for your protocol's token in 60 seconds — plus a ranked list of what to fix. Free scan, no login." />
        <meta name="keywords" content="token health, protocol diagnostics, token score, remediation checklist, DeFi token scan, smart contract analysis" />
        <link rel="canonical" href="https://tokenhealthscan.com/" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Token Health Scan — Your token is struggling. Find out why." />
        <meta property="og:description" content="A 0–100 score across all 5 dimensions, plus a ranked fix list — in 60 seconds. Built for protocol founders." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tokenhealthscan.com/" />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="TokenHealthScan" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Token Health Scan — Your token is struggling. Find out why." />
        <meta name="twitter:description" content="A 0–100 score across all 5 dimensions, plus a ranked fix list — in 60 seconds. Built for protocol founders." />
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
