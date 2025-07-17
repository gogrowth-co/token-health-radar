
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/landing/HeroSection";
import TrustBadgeStrip from "@/components/landing/TrustBadgeStrip";
import WhoThisIsForSection from "@/components/landing/WhoThisIsForSection";
import SupportedChainsSection from "@/components/landing/SupportedChainsSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import { 
  LazyHowItWorks, 
  LazyReportPreview, 
  LazyPricingTeaser
} from "@/components/landing/LazySection";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1">
        {/* Critical above-the-fold content */}
        <HeroSection />
        
        {/* Trust badge strip */}
        <TrustBadgeStrip />
        
        {/* Report preview */}
        <LazyReportPreview />
        
        {/* How it works */}
        <LazyHowItWorks />
        
        {/* Who this is for */}
        <WhoThisIsForSection />
        
        {/* Supported chains */}
        <SupportedChainsSection />
        
        {/* Pricing */}
        <LazyPricingTeaser />
        
        {/* FAQ */}
        <FAQSection />
        
        {/* Final CTA */}
        <FinalCTASection />
      </main>
      
      <Footer />
    </div>
  );
}
