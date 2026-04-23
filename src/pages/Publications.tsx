import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PublicationCard from "@/components/cms/PublicationCard";
import { usePublications } from "@/hooks/usePublications";
import { Loader2 } from "lucide-react";

export default function Publications() {
  const { data = [], isLoading } = usePublications();
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: "Token Health Scan Publications", url: "https://tokenhealthscan.com/publications", description: "Guides and research on token risk, liquidity, security, tokenomics, community, and development." };
  return (
    <div className="flex min-h-screen flex-col"><Helmet><title>Token Research Publications | Token Health Scan</title><meta name="description" content="Guides and research for evaluating token health, liquidity, security, tokenomics, community, and development risk." /><link rel="canonical" href="https://tokenhealthscan.com/publications" /><meta property="og:type" content="website" /><meta property="og:title" content="Token Research Publications" /><meta property="og:description" content="Practical token research guides from Token Health Scan." /><script type="application/ld+json">{JSON.stringify(jsonLd)}</script></Helmet><Navbar />
      <main className="flex-1"><section className="border-b bg-muted/30"><div className="container px-4 py-12 md:py-16"><h1 className="max-w-3xl text-4xl font-bold md:text-5xl">Token research publications</h1><p className="mt-4 max-w-2xl text-lg text-muted-foreground">Actionable guides for reading token health across security, liquidity, tokenomics, community, and development.</p></div></section>
      <section className="container px-4 py-10">{isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{data.map((publication) => <PublicationCard key={publication.id} publication={publication} />)}</div>}{!isLoading && !data.length && <div className="rounded-lg border p-8 text-center text-muted-foreground">No published articles yet.</div>}</section></main><Footer /></div>
  );
}
