
import { memo } from "react";
import { Users } from "lucide-react";

const SocialProofSection = memo(() => {
  return (
    <section className="py-12 md:py-16 bg-muted">
      <div className="container px-4 md:px-6">
        <div className="text-center">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mb-4">
            <Users className="h-6 w-6 text-primary flex-shrink-0" />
            <span className="text-base md:text-lg font-medium text-center">Trusted by 1,000+ protocol teams diagnosing their token health</span>
          </div>
        </div>
      </div>
    </section>
  );
});

SocialProofSection.displayName = 'SocialProofSection';

export default SocialProofSection;
