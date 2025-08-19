import { useEffect } from "react";
import { Helmet } from "@/components/ui/helmet";

interface SeoHeadProps {
  title: string;
  description: string;
  keywords?: string;
  canonicalUrl: string;
  ogImage?: string;
  ogTitle?: string;
  twitterTitle?: string;
  children?: React.ReactNode;
}

export default function SeoHead({
  title,
  description,
  keywords,
  canonicalUrl,
  ogImage,
  ogTitle,
  twitterTitle,
  children
}: SeoHeadProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // Check for canonical link validation in dev
      setTimeout(() => {
        const canonicalLinks = document.querySelectorAll('link[rel="canonical"]');
        
        if (canonicalLinks.length === 0) {
          console.error('SeoHead: Missing canonical URL - no <link rel="canonical"> found in <head>');
        } else if (canonicalLinks.length > 1) {
          console.error('SeoHead: Duplicate canonical URLs found - multiple <link rel="canonical"> elements detected', 
            Array.from(canonicalLinks).map(link => (link as HTMLLinkElement).href)
          );
        } else {
          const canonicalHref = (canonicalLinks[0] as HTMLLinkElement).href;
          if (canonicalHref !== canonicalUrl) {
            console.warn('SeoHead: Canonical URL mismatch', {
              expected: canonicalUrl,
              actual: canonicalHref
            });
          }
        }
      }, 100); // Small delay to ensure DOM is updated
    }
  }, [canonicalUrl]);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      <meta name="author" content="Token Health Scan" />
      
      {/* Open Graph */}
      <meta property="og:title" content={ogTitle || title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={canonicalUrl} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {ogImage && <meta property="og:image:width" content="1200" />}
      {ogImage && <meta property="og:image:height" content="630" />}
      <meta property="og:site_name" content="Token Health Scan" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@tokenhealthscan" />
      <meta name="twitter:title" content={twitterTitle || title} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
      
      {/* Canonical URL - Critical for SEO */}
      <link rel="canonical" href={canonicalUrl} />

      {/* Additional schemas and meta tags */}
      {children}
    </Helmet>
  );
}