import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BlogTemplate from "@/components/cms/BlogTemplate";
import { usePublicPage } from "@/hooks/usePublications";
import NotFound from "./NotFound";
import { Loader2 } from "lucide-react";

export default function DynamicPage() {
  const { slug } = useParams();
  const { data: page, isLoading } = usePublicPage(slug);
  if (isLoading) return <div className="flex min-h-screen flex-col"><Navbar /><main className="flex flex-1 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></main><Footer /></div>;
  if (!page) return <NotFound />;
  const canonical = `https://tokenhealthscan.com/publications/${page.slug}`;
  const image = page.featured_image || "https://tokenhealthscan.com/lovable-uploads/tokenhealthscan-og.png";
  const articleLd = page.schema || { "@context": "https://schema.org", "@type": "Article", headline: page.title, description: page.meta_description, image, author: { "@type": "Organization", name: page.author_name || "Token Health Scan" }, publisher: { "@type": "Organization", name: "Token Health Scan" }, datePublished: page.created_at, dateModified: page.updated_at, mainEntityOfPage: canonical };
  const breadcrumbLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "https://tokenhealthscan.com" }, { "@type": "ListItem", position: 2, name: "Publications", item: "https://tokenhealthscan.com/publications" }, { "@type": "ListItem", position: 3, name: page.title, item: canonical }] };
  return (
    <div className="flex min-h-screen flex-col"><Helmet><title>{`${page.title} | Token Health Scan`}</title><meta name="description" content={page.meta_description || "Token Health Scan publication."} /><link rel="canonical" href={canonical} /><meta property="og:type" content="article" /><meta property="og:title" content={page.title} /><meta property="og:description" content={page.meta_description || ""} /><meta property="og:url" content={canonical} /><meta property="og:image" content={image} /><meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content={page.title} /><meta name="twitter:description" content={page.meta_description || ""} /><meta name="twitter:image" content={image} /><script type="application/ld+json">{JSON.stringify(articleLd)}</script><script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script></Helmet><Navbar /><main className="flex-1"><BlogTemplate page={page} /></main><Footer /></div>
  );
}
