
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GuideHeroSection from "@/components/guide/GuideHeroSection";
import GuideIntroSection from "@/components/guide/GuideIntroSection";
import WhatIsTokenScanSection from "@/components/guide/WhatIsTokenScanSection";
import WhyTokenScanningMattersSection from "@/components/guide/WhyTokenScanningMattersSection";
import TypesOfScansSection from "@/components/guide/TypesOfScansSection";
import ScanningProcessSection from "@/components/guide/ScanningProcessSection";

export default function TokenScanGuide() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "The Complete Guide to Token Scanning (2025)",
    "description": "Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques.",
    "author": {
      "@type": "Organization",
      "name": "TokenHealthScan"
    },
    "publisher": {
      "@type": "Organization",
      "name": "TokenHealthScan",
      "logo": {
        "@type": "ImageObject",
        "url": "https://tokenhealthscan.com/lovable-uploads/c705b444-0cef-46bf-b4a1-c6663acf1164.png"
      }
    },
    "datePublished": "2025-06-19",
    "dateModified": "2025-06-19",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://tokenhealthscan.com/token-scan-guide"
    },
    "image": "https://tokenhealthscan.com/lovable-uploads/9823d2dd-2bbb-4762-9882-69c6848988c4.png",
    "keywords": ["token scanning", "crypto analysis", "smart contract security", "liquidity verification", "token due diligence", "DYOR crypto"],
    "wordCount": "3500",
    "articleSection": "Cryptocurrency",
    "about": {
      "@type": "Thing",
      "name": "Cryptocurrency Token Analysis"
    },
    "mentions": [
      {
        "@type": "SoftwareApplication",
        "name": "TokenHealthScan",
        "url": "https://tokenhealthscan.com"
      }
    ]
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens</title>
        <meta name="description" content="Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools, techniques, and best practices." />
        <meta name="keywords" content="token scanning, crypto analysis, smart contract security, liquidity verification, token due diligence, DYOR crypto" />
        <link rel="canonical" href="https://tokenhealthscan.com/token-scan-guide" />
        
        {/* Open Graph tags */}
        <meta property="og:title" content="Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens" />
        <meta property="og:description" content="Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://tokenhealthscan.com/token-scan-guide" />
        <meta property="og:image" content="https://tokenhealthscan.com/lovable-uploads/9823d2dd-2bbb-4762-9882-69c6848988c4.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="TokenHealthScan" />
        <meta property="article:published_time" content="2025-06-19T17:58:00Z" />
        <meta property="article:modified_time" content="2025-06-19T17:58:00Z" />
        <meta property="article:author" content="TokenHealthScan" />
        <meta property="article:section" content="Cryptocurrency" />
        <meta property="article:tag" content="token scanning" />
        <meta property="article:tag" content="crypto analysis" />
        <meta property="article:tag" content="smart contract security" />
        
        {/* Twitter Card tags */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Complete Token Scanning Guide 2025 - How to Analyze Crypto Tokens" />
        <meta name="twitter:description" content="Learn how to analyze crypto tokens for security, liquidity, and investment risks. Complete guide to token scanning tools and techniques." />
        <meta name="twitter:image" content="https://tokenhealthscan.com/lovable-uploads/9823d2dd-2bbb-4762-9882-69c6848988c4.png" />
        <meta name="twitter:site" content="@TokenHealthScan" />
        <meta name="twitter:creator" content="@TokenHealthScan" />
        
        {/* Additional SEO tags */}
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <meta name="language" content="en" />
        <meta name="author" content="TokenHealthScan" />
        <meta name="revisit-after" content="7 days" />
        
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      <Navbar />
      
      <main className="flex-1">
        <article className="container mx-auto px-4 py-8 max-w-4xl">
          <GuideHeroSection />
          <GuideIntroSection />
          <WhatIsTokenScanSection />
          <WhyTokenScanningMattersSection />
          <TypesOfScansSection />
          <ScanningProcessSection />
        </article>
      </main>
      
      <Footer />
    </div>
  );
}
