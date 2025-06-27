
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
      <Navbar />
      
      <main className="flex-1">
        {/* Critical above-the-fold content */}
        <HeroSection />
        
        {/* Lazy-loaded below-the-fold content */}
        <LazyHowItWorks />
        <LazyReportPreview />
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
