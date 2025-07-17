import { memo } from "react";

const SupportedChainsSection = memo(() => {
  const chains = [
    { name: "Ethereum", logo: "/lovable-uploads/29c5f851-6549-42b1-97f2-e41f151380d8.png" },
    { name: "Base", logo: "/lovable-uploads/833cd881-d241-4fe3-b052-b34de750cadc.png" },
    { name: "Arbitrum", logo: "/lovable-uploads/c25d904b-cd2d-42b5-8887-bb455e78493f.png" },
    { name: "Optimism", logo: "/lovable-uploads/8baaafae-fbfe-46c8-b42f-77a79fc473bb.png" }
  ];

  return (
    <section className="py-12 md:py-16 bg-muted/30">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tighter mb-4">
            Currently Supports
          </h2>
        </div>
        
        <div className="flex items-center justify-center gap-8 md:gap-12 overflow-x-auto pb-4">
          {chains.map((chain) => (
            <div key={chain.name} className="flex-shrink-0 flex flex-col items-center gap-2">
              <img
                src={chain.logo}
                alt={`${chain.name} logo`}
                className="h-8 md:h-10 w-auto object-contain"
              />
              <span className="text-sm font-medium text-muted-foreground">
                {chain.name}
              </span>
            </div>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            More chains coming soon: zkSync, Solana
          </p>
        </div>
      </div>
    </section>
  );
});

SupportedChainsSection.displayName = 'SupportedChainsSection';

export default SupportedChainsSection;