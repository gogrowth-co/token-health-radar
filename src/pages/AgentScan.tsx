import { Helmet } from "@/components/ui/helmet";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AgentSearchInput from "@/components/agent-scan/AgentSearchInput";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, DollarSign, Activity, Star, UserCheck } from "lucide-react";

const DIMENSIONS = [
  { icon: Shield, label: "Identity Verification", desc: "ERC-8004 registration, owner address, metadata" },
  { icon: DollarSign, label: "Financial Transparency", desc: "Token links, marketplace listings, pricing" },
  { icon: Activity, label: "Operational Reliability", desc: "Endpoint health, response times, uptime" },
  { icon: Star, label: "Reputation", desc: "Marketplace ratings, social presence, documentation" },
  { icon: UserCheck, label: "Compliance", desc: "Standard compliance, service classification" },
];

const STEPS = [
  { num: "1", title: "Enter Agent ID", desc: "Paste an agent ID or search by name from the ERC-8004 registry" },
  { num: "2", title: "We Scan Everything", desc: "Onchain registry, marketplace data, and endpoint health checks" },
  { num: "3", title: "Get Trust Score", desc: "Receive a 0-100 score across 5 dimensions with actionable insights" },
];

export default function AgentScan() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Helmet>
        <title>AI Agent Trust Score — Scan Any ERC-8004 Agent | Token Health Scan</title>
        <meta name="description" content="Scan any ERC-8004 AI agent and get a trust score across 5 dimensions: Identity, Financial, Operational, Reputation, and Compliance." />
        <link rel="canonical" href="https://token-health-radar.lovable.app/agent-scan" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: "AI Agent Trust Score",
          applicationCategory: "FinanceApplication",
          description: "Scan any ERC-8004 AI agent and get a trust score across 5 dimensions.",
          url: "https://token-health-radar.lovable.app/agent-scan",
        })}</script>
      </Helmet>

      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-radial from-primary/10 to-transparent -z-10" />
          <div className="container px-4 md:px-6 text-center space-y-6 max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-5xl font-bold leading-tight">
              Scan Any AI Agent. Get a Trust Score.
            </h1>
            <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
              The credit bureau for AI agents. Evaluate any ERC-8004 registered agent across identity, financials, reliability, reputation, and compliance.
            </p>
            <div className="max-w-xl mx-auto">
              <AgentSearchInput large />
              <p className="text-xs text-muted-foreground mt-2">
                Enter an agent name or ID number. 3 free scans included.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 border-t border-border">
          <div className="container px-4 md:px-6 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">How It Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {STEPS.map(step => (
                <div key={step.num} className="text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-lg flex items-center justify-center mx-auto">
                    {step.num}
                  </div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 Dimensions */}
        <section className="py-16 border-t border-border bg-muted/30">
          <div className="container px-4 md:px-6 max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-10">5 Dimensions of Trust</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {DIMENSIONS.map(dim => (
                <Card key={dim.label} className="border-border bg-card">
                  <CardContent className="pt-6 space-y-2">
                    <dim.icon className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold text-sm">{dim.label}</h3>
                    <p className="text-xs text-muted-foreground">{dim.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
