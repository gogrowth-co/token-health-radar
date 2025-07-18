
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Shield, 
  DollarSign, 
  TrendingUp, 
  Users, 
  Code, 
  ExternalLink,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Wallet,
  ArrowRight
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface AnalysisSection {
  keyPoints?: string[];
  summary?: string;
}

interface HowToBuyStep {
  step: number;
  title: string;
  description: string;
  icon?: string;
}

interface ReportData {
  whatIsToken: string;
  riskOverview: string;
  securityAnalysis: string | AnalysisSection;
  liquidityAnalysis: string | AnalysisSection;
  tokenomicsAnalysis: string | AnalysisSection;
  communityAnalysis: string | AnalysisSection;
  developmentAnalysis: string | AnalysisSection;
  howToBuy: string | HowToBuyStep[];
  faq: Array<{
    question: string;
    answer: string;
  }>;
  metadata: {
    tokenAddress: string;
    chainId: string;
    tokenName: string;
    tokenSymbol: string;
    currentPrice: number;
    marketCap: number;
    scores: {
      overall: number;
      security: number;
      tokenomics: number;
      liquidity: number;
      community: number;
      development: number;
    };
    generatedAt: string;
  };
}

export default function TokenReport() {
  const { symbol } = useParams<{ symbol: string }>();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      if (!symbol) {
        setError("No token symbol provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('token_reports')
          .select('*')
          .eq('token_symbol', symbol.toLowerCase())
          .single();

        if (error) {
          console.error("Error loading report:", error);
          setError("Report not found");
          return;
        }

        if (data) {
          setReportData(data.report_content as unknown as ReportData);
        }
      } catch (err) {
        console.error("Error loading report:", err);
        setError("Failed to load report");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [symbol]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />;
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />;
    return <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />;
  };

  const getScoreDescription = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Moderate";
    return "High Risk";
  };

  const renderAnalysisContent = (content: string | AnalysisSection) => {
    if (!content) return null;

    // Handle string content (legacy format)
    if (typeof content === 'string') {
      return (
        <div className="prose dark:prose-invert max-w-none">
          {content.split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-4 last:mb-0 text-muted-foreground leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      );
    }

    // Handle object content (new format)
    if (typeof content === 'object') {
      return (
        <div className="prose dark:prose-invert max-w-none">
          {content.summary && (
            <p className="mb-4 text-muted-foreground leading-relaxed">
              {content.summary}
            </p>
          )}
          {content.keyPoints && content.keyPoints.length > 0 && (
            <ul className="space-y-2 text-muted-foreground">
              {content.keyPoints.map((point, idx) => (
                <li key={idx} className="leading-relaxed">{point}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    return null;
  };

  const renderHowToBuy = (content: string | HowToBuyStep[]) => {
    // Handle array format (new structured format)
    if (Array.isArray(content)) {
      return (
        <div className="space-y-4">
          {content.map((step, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                {step.step}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold mb-2">{step.title}</h4>
                <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
          ))}
        </div>
      );
    }

    // Handle string format (legacy format)
    if (typeof content === 'string') {
      const steps = content.split('\n').filter(step => step.trim());
      return (
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="text-muted-foreground leading-relaxed">{step}</p>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  const getCategoryInfo = (category: string) => {
    const categoryMap = {
      'Security': {
        description: 'Evaluates smart contract safety, ownership status, and potential security vulnerabilities.',
        whyMatters: 'Security risks can lead to total loss of funds through exploits, rug pulls, or malicious contract functions.',
        keyIndicators: ['Contract verification', 'Ownership renouncement', 'Mint functions', 'Honeypot detection', 'Liquidity locks']
      },
      'Liquidity': {
        description: 'Measures trading accessibility, market depth, and how easily tokens can be bought or sold.',
        whyMatters: 'Poor liquidity can trap investors, cause extreme price volatility, and prevent exit during market downturns.',
        keyIndicators: ['Trading volume', 'Exchange listings', 'Market depth', 'Liquidity pools', 'Price impact']
      },
      'Tokenomics': {
        description: 'Analyzes token supply mechanics, distribution, and economic incentive structures.',
        whyMatters: 'Poor tokenomics can lead to inflation, unfair distribution, or economic models that favor insiders over retail investors.',
        keyIndicators: ['Supply mechanics', 'Holder distribution', 'Burn mechanisms', 'Inflation rate', 'Vesting schedules']
      },
      'Community': {
        description: 'Assesses social media presence, engagement levels, and community growth metrics.',
        whyMatters: 'Strong communities drive adoption and price stability, while weak communities often indicate pump-and-dump schemes.',
        keyIndicators: ['Social media followers', 'Engagement rates', 'Community growth', 'Official verification', 'Active discussions']
      },
      'Development': {
        description: 'Evaluates code activity, repository health, and ongoing project maintenance.',
        whyMatters: 'Active development indicates a committed team and project longevity, while abandoned projects often fail.',
        keyIndicators: ['Code commits', 'Repository activity', 'Developer count', 'Documentation quality', 'Update frequency']
      }
    };
    
    return categoryMap[category] || { description: '', whyMatters: '', keyIndicators: [] };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading token report...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Report Not Found</h1>
            <p className="text-muted-foreground">
              The token report you're looking for doesn't exist or hasn't been generated yet.
            </p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const { metadata } = reportData;
  const reportUrl = `https://tokenhealthscan.com/token/${symbol}`;

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{metadata.tokenName} ({metadata.tokenSymbol.toUpperCase()}) Risk Report | Token Health Scan</title>
        <meta name="description" content={`Comprehensive risk analysis and security report for ${metadata.tokenName} (${metadata.tokenSymbol.toUpperCase()}). Get detailed insights on security, tokenomics, liquidity, and more.`} />
        <meta name="keywords" content={`${metadata.tokenName}, ${metadata.tokenSymbol}, crypto risk, token analysis, security report, DeFi, cryptocurrency`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${metadata.tokenName} Risk Report`} />
        <meta property="og:description" content={`Comprehensive risk analysis for ${metadata.tokenName} (${metadata.tokenSymbol.toUpperCase()})`} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={reportUrl} />
        <meta property="og:image" content="https://tokenhealthscan.com/tokenhealthscan-og.png" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${metadata.tokenName} Risk Report`} />
        <meta name="twitter:description" content={`Comprehensive risk analysis for ${metadata.tokenName}`} />
        <meta name="twitter:image" content="https://tokenhealthscan.com/tokenhealthscan-og.png" />
        
        {/* Canonical URL */}
        <link rel="canonical" href={reportUrl} />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": `${metadata.tokenName} Risk Report`,
            "description": `Comprehensive risk analysis for ${metadata.tokenName} (${metadata.tokenSymbol.toUpperCase()})`,
            "author": {
              "@type": "Organization",
              "name": "Token Health Scan"
            },
            "publisher": {
              "@type": "Organization", 
              "name": "Token Health Scan",
              "logo": {
                "@type": "ImageObject",
                "url": "https://tokenhealthscan.com/tokenhealthscan-og.png"
              }
            },
            "datePublished": metadata.generatedAt,
            "dateModified": metadata.generatedAt,
            "url": reportUrl
          })}
        </script>

        {/* Breadcrumb Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://tokenhealthscan.com"
              },
              {
                "@type": "ListItem", 
                "position": 2,
                "name": "Token Reports",
                "item": "https://tokenhealthscan.com/reports"
              },
              {
                "@type": "ListItem",
                "position": 3,
                "name": `${metadata.tokenName} Report`,
                "item": reportUrl
              }
            ]
          })}
        </script>

        {/* FAQ Schema */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": reportData.faq.map(item => ({
              "@type": "Question",
              "name": item.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": item.answer
              }
            }))
          })}
        </script>
      </Helmet>

      <Navbar />

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-8">
          <a href="/" className="hover:text-primary">Home</a>
          <ChevronRight className="h-4 w-4" />
          <span>Token Reports</span>
          <ChevronRight className="h-4 w-4" />
          <span>{metadata.tokenName}</span>
        </nav>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            {metadata.tokenName} ({metadata.tokenSymbol.toUpperCase()}) Risk Report
          </h1>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <Badge variant="outline">Overall Score: {metadata.scores.overall}/100</Badge>
            <Badge variant="outline">${metadata.currentPrice?.toFixed(4)}</Badge>
            <Badge variant="outline">Market Cap: ${metadata.marketCap?.toLocaleString()}</Badge>
          </div>
          <p className="text-muted-foreground">
            Generated on {new Date(metadata.generatedAt).toLocaleDateString()}
          </p>
        </header>

        {/* What is Token */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">What is {metadata.tokenName}?</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">{reportData.whatIsToken}</p>
            </CardContent>
          </Card>
        </section>

        {/* Risk Overview */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Risk Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">{reportData.riskOverview}</p>
            </CardContent>
          </Card>
        </section>

        {/* Scores Grid */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Risk Analysis Scores</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(metadata.scores.security)}
                  <div className={`text-2xl font-bold ${getScoreColor(metadata.scores.security)}`}>
                    {metadata.scores.security}/100
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getScoreDescription(metadata.scores.security)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tokenomics</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(metadata.scores.tokenomics)}
                  <div className={`text-2xl font-bold ${getScoreColor(metadata.scores.tokenomics)}`}>
                    {metadata.scores.tokenomics}/100
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getScoreDescription(metadata.scores.tokenomics)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Liquidity</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(metadata.scores.liquidity)}
                  <div className={`text-2xl font-bold ${getScoreColor(metadata.scores.liquidity)}`}>
                    {metadata.scores.liquidity}/100
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getScoreDescription(metadata.scores.liquidity)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Community</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(metadata.scores.community)}
                  <div className={`text-2xl font-bold ${getScoreColor(metadata.scores.community)}`}>
                    {metadata.scores.community}/100
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getScoreDescription(metadata.scores.community)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Development</CardTitle>
                <Code className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  {getScoreIcon(metadata.scores.development)}
                  <div className={`text-2xl font-bold ${getScoreColor(metadata.scores.development)}`}>
                    {metadata.scores.development}/100
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getScoreDescription(metadata.scores.development)}
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Detailed Analysis Sections */}
        {[
          { 
            title: "Security Score", 
            content: reportData.securityAnalysis, 
            icon: Shield,
            category: "Security"
          },
          { 
            title: "Liquidity Score", 
            content: reportData.liquidityAnalysis, 
            icon: TrendingUp,
            category: "Liquidity"
          },
          { 
            title: "Tokenomics Score", 
            content: reportData.tokenomicsAnalysis, 
            icon: DollarSign,
            category: "Tokenomics"
          },
          { 
            title: "Community Score", 
            content: reportData.communityAnalysis, 
            icon: Users,
            category: "Community"
          },
          { 
            title: "Development Score", 
            content: reportData.developmentAnalysis, 
            icon: Code,
            category: "Development"
          }
        ].map(({ title, content, icon: Icon, category }) => {
          const categoryInfo = getCategoryInfo(category);
          return (
            <section key={title} className="mb-8">
              <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Icon className="mr-2 h-6 w-6" />
                {title}
              </h2>
              
              {/* Educational Info Card */}
              <Card className="mb-4 bg-muted/30">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3 mb-4">
                    <Info className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <h4 className="font-semibold mb-2">What is {category}?</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                        {categoryInfo.description}
                      </p>
                      <h4 className="font-semibold mb-2">Why it matters</h4>
                      <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                        {categoryInfo.whyMatters}
                      </p>
                      <h4 className="font-semibold mb-2">Key indicators we evaluate</h4>
                      <div className="flex flex-wrap gap-2">
                        {categoryInfo.keyIndicators.map((indicator, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Content */}
              <Card>
                <CardContent className="pt-6">
                  {renderAnalysisContent(content)}
                </CardContent>
              </Card>
            </section>
          );
        })}

        {/* How We Score */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">How We Score</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="prose dark:prose-invert max-w-none">
                <p className="mb-4 text-muted-foreground">
                  Our scoring system evaluates tokens across five key categories, each weighted equally to provide a comprehensive risk assessment:
                </p>
                <ul className="space-y-2 text-muted-foreground">
                  <li><strong>Security (20%):</strong> Smart contract verification, ownership status, mint functions, and security vulnerabilities</li>
                  <li><strong>Tokenomics (20%):</strong> Supply mechanics, distribution, holder concentration, and inflationary/deflationary features</li>
                  <li><strong>Liquidity (20%):</strong> Trading volume, exchange listings, liquidity depth, and market accessibility</li>
                  <li><strong>Community (20%):</strong> Social media presence, engagement levels, and community growth metrics</li>
                  <li><strong>Development (20%):</strong> Code activity, repository health, contributor engagement, and project maintenance</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* How to Buy */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4 flex items-center">
            <Wallet className="mr-2 h-6 w-6" />
            How to Buy {metadata.tokenSymbol.toUpperCase()}
          </h2>
          <Card>
            <CardContent className="pt-6">
              {renderHowToBuy(reportData.howToBuy)}
            </CardContent>
          </Card>
        </section>

        {/* FAQ */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Frequently Asked Questions</h2>
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="w-full">
                {reportData.faq.map((item, idx) => (
                  <AccordionItem key={idx} value={`item-${idx}`}>
                    <AccordionTrigger className="text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.answer}
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        {/* More Resources */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">More Resources</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a 
                  href={`https://www.coingecko.com/en/coins/${symbol}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span>View on CoinGecko</span>
                </a>
                <a 
                  href={`https://etherscan.io/token/${metadata.tokenAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span>View Contract</span>
                </a>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Disclaimer */}
        <section className="mb-8">
          <Card className="border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Important Disclaimer
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300 leading-relaxed">
                    This analysis is not financial advice and should not be considered as such. 
                    Cryptocurrency investments carry significant risks, including the potential for 
                    total loss of capital. Always conduct your own research and consult with 
                    qualified financial advisors before making investment decisions. Only invest 
                    what you can afford to lose and ensure you fully understand the risks involved.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <Footer />
    </div>
  );
}
