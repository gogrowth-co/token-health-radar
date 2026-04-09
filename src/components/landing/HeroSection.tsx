
import { memo } from "react";
import TokenSearchInput from "@/components/TokenSearchInput";
import AgentSearchInput from "@/components/agent-scan/AgentSearchInput";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const HeroSection = memo(() => {
  return (
    <section className="relative py-32 md:py-40 lg:py-48 pb-32 md:pb-40 lg:pb-48 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent -z-10"></div>
      
      <div className="container px-4 md:px-6 space-y-6 md:space-y-8 text-center">
        {/* Notification Banner */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center rounded-full text-sm font-medium overflow-hidden">
            <span className="px-3 py-2 bg-blue-600 text-white">🔥 New</span>
            <span className="px-4 py-2 bg-blue-900 text-white">AI Agent Trust Score — scan any ERC-8004 agent!</span>
          </div>
        </div>
        <div className="space-y-3 md:space-y-4 max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
            Find Hidden Risks Before You Dive In
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Scan any project and uncover critical risks — from contract flaws to liquidity traps — in seconds.
          </p>
        </div>
        
        <div className="max-w-lg mx-auto px-2 sm:px-4">
          <Tabs defaultValue="token" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="token">Scan Token</TabsTrigger>
              <TabsTrigger value="agent">Scan Agent</TabsTrigger>
            </TabsList>
            <TabsContent value="token">
              <TokenSearchInput large={true} placeholder="Enter token name or address" />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Free to use. No wallet required.
              </p>
            </TabsContent>
            <TabsContent value="agent">
              <AgentSearchInput large />
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                Scan any ERC-8004 AI agent. 3 free scans included.
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </section>
  );
});

HeroSection.displayName = 'HeroSection';

export default HeroSection;
