
import { Suspense, lazy } from "react";

const HowItWorksSection = lazy(() => import("./HowItWorksSection"));
const ReportPreviewSection = lazy(() => import("./ReportPreviewSection"));
const FeatureGridSection = lazy(() => import("./FeatureGridSection"));
const SocialProofSection = lazy(() => import("./SocialProofSection"));
const PricingTeaserSection = lazy(() => import("./PricingTeaserSection"));
const FinalCTASection = lazy(() => import("./FinalCTASection"));

const SectionSkeleton = () => (
  <div className="py-12 md:py-16">
    <div className="container px-4 md:px-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mx-auto"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const LazyHowItWorks = () => (
  <Suspense fallback={<SectionSkeleton />}>
    <HowItWorksSection />
  </Suspense>
);

export const LazyReportPreview = () => (
  <Suspense fallback={<SectionSkeleton />}>
    <ReportPreviewSection />
  </Suspense>
);

export const LazyFeatureGrid = () => (
  <Suspense fallback={<SectionSkeleton />}>
    <FeatureGridSection />
  </Suspense>
);

export const LazySocialProof = () => (
  <Suspense fallback={<SectionSkeleton />}>
    <SocialProofSection />
  </Suspense>
);

export const LazyPricingTeaser = () => (
  <Suspense fallback={<SectionSkeleton />}>
    <PricingTeaserSection />
  </Suspense>
);

export const LazyFinalCTA = () => (
  <Suspense fallback={<SectionSkeleton />}>
    <FinalCTASection />
  </Suspense>
);
