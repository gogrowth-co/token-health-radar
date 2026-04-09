import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { Helmet } from "@/components/ui/helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentTrustScoreRing from "@/components/agent-scan/AgentTrustScoreRing";
import AgentDimensionGrid from "@/components/agent-scan/AgentDimensionGrid";
import AgentIdentityCard from "@/components/agent-scan/AgentIdentityCard";
import AgentActionPlan from "@/components/agent-scan/AgentActionPlan";
import AgentCrossSell from "@/components/agent-scan/AgentCrossSell";
import AgentScanLoading from "@/components/agent-scan/AgentScanLoading";
import { calculateAgentTrustScore, type AgentScanData, type AgentTrustResult } from "@/lib/agent-scoring";
import { supabase } from "@/integrations/supabase/client";

export default function AgentScanResult() {
  const { chain, agentId } = useParams<{ chain: string; agentId: string }>();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [scanData, setScanData] = useState<AgentScanData | null>(null);
  const [result, setResult] = useState<AgentTrustResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (!chain || !agentId || fetched.current) return;
    fetched.current = true;

    async function scan() {
      try {
        // Step progress animation
        const stepInterval = setInterval(() => {
          setStep(prev => Math.min(prev + 1, 4));
        }, 1200);

        const { data, error: fnError } = await supabase.functions.invoke("scan-agent", {
          body: { chain, agentId },
        });

        clearInterval(stepInterval);
        setStep(5);

        if (fnError) {
          setError(fnError.message || "Scan failed");
          setLoading(false);
          return;
        }

        // Data could be cached (full row) or fresh (raw_data wrapper)
        const rawData: AgentScanData = data?.raw_data?.agent
          ? data.raw_data
          : data?.raw_data;

        if (!rawData?.agent) {
          setError("No agent data returned");
          setLoading(false);
          return;
        }

        setScanData(rawData);
        const trustResult = calculateAgentTrustScore(rawData);
        setResult(trustResult);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || "Unknown error");
        setLoading(false);
      }
    }

    scan();
  }, [chain, agentId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1">
          <AgentScanLoading currentStep={step} />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !scanData || !result) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 px-4">
            <h1 className="text-2xl font-bold">Scan Failed</h1>
            <p className="text-muted-foreground">{error || "Unable to scan this agent. Please try again."}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>{scanData.agent.name} Trust Score — {result.overallScore}/100 | Token Health Scan</title>
        <meta name="description" content={`${scanData.agent.name} scored ${result.overallScore}/100 on the Agent Trust Score. ${result.label}. Scanned across Identity, Financial, Operational, Reputation, and Compliance dimensions.`} />
        <meta name="robots" content="noindex" />
      </Helmet>

      <Navbar />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Identity + Score */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-start">
          <AgentIdentityCard data={scanData} />
          <div className="flex justify-center relative">
            <AgentTrustScoreRing
              score={result.overallScore}
              color={result.color}
              label={result.label}
            />
          </div>
        </div>

        {/* Dimensions */}
        <section>
          <h2 className="text-lg font-bold mb-4">Trust Dimensions</h2>
          <AgentDimensionGrid dimensions={result.dimensions} />
        </section>

        {/* Action Plan */}
        <section>
          <AgentActionPlan actions={result.actionPlan} />
        </section>

        {/* Cross-sell */}
        {result.crossSell.hasTokenAddress && (
          <AgentCrossSell
            tokenAddress={result.crossSell.tokenAddress}
            chain={result.crossSell.chain}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}
