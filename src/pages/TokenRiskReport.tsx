
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, TrendingUp, Users, Code, DollarSign, AlertTriangle, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ReportContent {
  tokenOverview: string;
  riskOverview: string;
  securityAnalysis: string;
  liquidityAnalysis: string;
  tokenomicsAnalysis: string;
  communityAnalysis: string;
  developmentAnalysis: string;
  keyFindings: string[];
  recommendations: string[];
  faqs: { question: string; answer: string; }[];
  metadata: {
    tokenAddress: string;
    chainId: string;
    tokenName: string;
    tokenSymbol: string;
    overallScore: number;
    scores: {
      security: number;
      liquidity: number;
      tokenomics: number;
      community: number;
      development: number;
    };
    generatedAt: string;
    logoUrl?: string;
    websiteUrl?: string;
    twitterHandle?: string;
    githubUrl?: string;
  };
}

export default function TokenRiskReport() {
  const { chain, address } = useParams<{ chain: string; address: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { isAdmin } = useUserRole();
  const [reportData, setReportData] = useState<ReportContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) {
      navigate('/');
      return;
    }

    const loadReport = async () => {
      try {
        if (!chain || !address) {
          throw new Error('Invalid URL parameters');
        }

        const { data, error } = await supabase
          .from('token_risk_reports')
          .select('*')
          .eq('token_address', address)
          .eq('chain_id', chain)
          .single();

        if (error) {
          throw new Error('Report not found');
        }

        // Properly cast the Json type to ReportContent
        setReportData(data.report_content as ReportContent);
      } catch (err) {
        console.error('Error loading report:', err);
        setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [chain, address, isAuthenticated, isAdmin, navigate]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Loading token risk report...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle className="h-16 w-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold">Report Not Found</h1>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const { metadata } = reportData;

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 container px-4 py-8 max-w-4xl mx-auto">
        {/* JSON-LD Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FinancialProduct",
              "name": metadata.tokenName,
              "symbol": metadata.tokenSymbol,
              "logo": metadata.logoUrl,
              "url": metadata.websiteUrl,
              "sameAs": [
                metadata.twitterHandle ? `https://twitter.com/${metadata.twitterHandle}` : null,
                metadata.githubUrl
              ].filter(Boolean)
            })
          }}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            {metadata.logoUrl && (
              <img 
                src={metadata.logoUrl} 
                alt={`${metadata.tokenName} logo`}
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">
                {metadata.tokenName} ({metadata.tokenSymbol}) Token Risk Report
              </h1>
              <p className="text-muted-foreground">
                Generated on {new Date(metadata.generatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Overall Score */}
          <div className="flex items-center gap-4 mb-6">
            <div className="text-center">
              <div className={`text-4xl font-bold ${getScoreColor(metadata.overallScore)}`}>
                {metadata.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
            </div>
            
            {/* Individual Scores */}
            <div className="flex flex-wrap gap-2">
              <Badge className={getScoreBadgeColor(metadata.scores.security)}>
                <Shield className="w-3 h-3 mr-1" />
                Security: {metadata.scores.security}
              </Badge>
              <Badge className={getScoreBadgeColor(metadata.scores.liquidity)}>
                <DollarSign className="w-3 h-3 mr-1" />
                Liquidity: {metadata.scores.liquidity}
              </Badge>
              <Badge className={getScoreBadgeColor(metadata.scores.tokenomics)}>
                <TrendingUp className="w-3 h-3 mr-1" />
                Tokenomics: {metadata.scores.tokenomics}
              </Badge>
              <Badge className={getScoreBadgeColor(metadata.scores.community)}>
                <Users className="w-3 h-3 mr-1" />
                Community: {metadata.scores.community}
              </Badge>
              <Badge className={getScoreBadgeColor(metadata.scores.development)}>
                <Code className="w-3 h-3 mr-1" />
                Development: {metadata.scores.development}
              </Badge>
            </div>
          </div>
        </div>

        {/* Token Overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What is {metadata.tokenName}?</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg leading-relaxed">{reportData.tokenOverview}</p>
            </CardContent>
          </Card>
        </section>

        {/* Risk Overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Risk Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="leading-relaxed">{reportData.riskOverview}</p>
            </CardContent>
          </Card>
        </section>

        {/* Key Findings */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Key Findings</h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2">
                {reportData.keyFindings.map((finding, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>{finding}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Security Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{reportData.securityAnalysis}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Liquidity Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{reportData.liquidityAnalysis}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Tokenomics Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{reportData.tokenomicsAnalysis}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Community Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{reportData.communityAnalysis}</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="w-5 h-5" />
                Development Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{reportData.developmentAnalysis}</p>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Investment Recommendations</h2>
          <Card>
            <CardContent className="pt-6">
              <ul className="space-y-2">
                {reportData.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {reportData.faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Resources */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">More Resources</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                {metadata.websiteUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={metadata.websiteUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Official Website
                    </a>
                  </Button>
                )}
                {metadata.twitterHandle && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`https://twitter.com/${metadata.twitterHandle}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Twitter
                    </a>
                  </Button>
                )}
                {metadata.githubUrl && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={metadata.githubUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* How We Score */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Score Tokens</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="leading-relaxed">
                TokenHealthScan evaluates tokens across 5 risk pillars: Security, Liquidity, Tokenomics, 
                Community, and Development. Each pillar is assessed using on-chain analysis, open data sources, 
                and AI-powered heuristics to provide a comprehensive risk assessment score from 0-100.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* JSON-LD FAQ Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": reportData.faqs.map(faq => ({
                "@type": "Question",
                "name": faq.question,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.answer
                }
              }))
            })
          }}
        />
      </main>
      <Footer />
    </div>
  );
}
