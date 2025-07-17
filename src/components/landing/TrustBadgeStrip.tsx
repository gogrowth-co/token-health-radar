import { memo } from "react";

const TrustBadgeStrip = memo(() => {
  const partners = [
    { name: "CoinGecko", logo: "/lovable-uploads/07fef70a-7a2c-4277-bc3f-f5eba0e243ff.png" },
    { name: "Webacy", logo: "/lovable-uploads/2b27ad76-2560-42b1-b13a-7c634aff5a60.png" },
    { name: "Moralis", logo: "/lovable-uploads/a6840633-108e-4977-9f88-a6839e3a1a0b.png" },
    { name: "GoPlus", logo: "/lovable-uploads/d2e93f34-a325-4544-ac59-de9126ae25b6.png" },
    { name: "DefiLlama", logo: "/lovable-uploads/07ef3cce-1e7c-4037-bd0f-1aa664309fa2.png" },
    { name: "Ethereum", logo: "/lovable-uploads/29c5f851-6549-42b1-97f2-e41f151380d8.png" },
    { name: "Base", logo: "/lovable-uploads/833cd881-d241-4fe3-b052-b34de750cadc.png" },
  ];

  return (
    <section className="py-10 bg-muted/30">
      <div className="container px-4 md:px-6">
        <h2 className="text-xl md:text-2xl font-semibold text-center mb-8 text-muted-foreground">
          Powered by Industry Leaders
        </h2>
        <div className="flex items-center justify-center gap-8 md:gap-12 overflow-x-auto pb-4">
          {partners.map((partner) => (
            <div key={partner.name} className="flex-shrink-0">
              <img
                src={partner.logo}
                alt={`${partner.name} logo`}
                className="h-7 md:h-8 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity duration-200"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});

TrustBadgeStrip.displayName = 'TrustBadgeStrip';

export default TrustBadgeStrip;