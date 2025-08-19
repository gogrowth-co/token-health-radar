
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateStaticHTML, isBot } from "@/utils/prerender";

interface ServerSideTokenReportProps {}

export default function ServerSideTokenReport({}: ServerSideTokenReportProps) {
  const { symbol } = useParams<{ symbol: string }>();
  const [isPrerendering, setIsPrerendering] = useState(false);

  useEffect(() => {
    const checkAndPrerender = async () => {
      // Check if this is a bot/crawler request
      const userAgent = navigator.userAgent;
      if (isBot(userAgent) && symbol) {
        setIsPrerendering(true);
        
        try {
          // Fetch token data for prerendering
          const { data: reportResult } = await supabase
            .from('token_reports')
            .select('*')
            .eq('token_symbol', symbol.toLowerCase())
            .single();

          if (reportResult) {
            // Fetch token cache data
            const { data: cacheResult } = await supabase
              .from('token_data_cache')
              .select('*')
              .eq('token_address', reportResult.token_address)
              .eq('chain_id', reportResult.chain_id)
              .maybeSingle();

            if (cacheResult) {
              const reportContent = reportResult.report_content as any;
              const tokenData = {
                symbol: cacheResult.symbol,
                name: cacheResult.name,
                logo_url: cacheResult.logo_url,
                description: cacheResult.description,
                website_url: cacheResult.website_url,
                twitter_handle: cacheResult.twitter_handle,
                coingecko_id: cacheResult.coingecko_id,
                current_price_usd: cacheResult.current_price_usd,
                market_cap_usd: cacheResult.market_cap_usd,
                overall_score: reportContent?.metadata?.scores?.overall,
                token_address: reportResult.token_address,
                chain_id: reportResult.chain_id
              };

              // Generate static HTML and replace document
              const staticHTML = generateStaticHTML(tokenData, reportResult.report_content);
              
              // For bots, we'd typically serve this from a server
              // For now, we'll update the document head
              const parser = new DOMParser();
              const doc = parser.parseFromString(staticHTML, 'text/html');
              const head = doc.head;
              
              // Aggressively remove ALL canonical links first to prevent duplicates
              const removeAllCanonicals = () => {
                const canonicals = document.head.querySelectorAll('link[rel="canonical"]');
                canonicals.forEach(link => link.remove());
              };
              
              // Remove existing dynamic content and all canonical links
              const existingMetas = document.head.querySelectorAll('meta[data-dynamic="true"], title[data-dynamic="true"], script[data-dynamic="true"], link[data-dynamic="true"]');
              existingMetas.forEach(meta => meta.remove());
              removeAllCanonicals();
              
              // Add new dynamic content (excluding canonical links)
              head.querySelectorAll('meta, title, link, script[type="application/ld+json"]').forEach(element => {
                // Skip ALL link elements with rel="canonical" - they're handled by SeoHead component
                if (element.tagName.toLowerCase() === 'link' && element.getAttribute('rel') === 'canonical') {
                  return;
                }
                
                const clone = element.cloneNode(true) as HTMLElement;
                clone.setAttribute('data-dynamic', 'true');
                document.head.appendChild(clone);
              });
              
              // Final cleanup: remove any canonical links that might have snuck through
              setTimeout(() => {
                removeAllCanonicals();
              }, 50);
            }
          }
        } catch (error) {
          console.error('Error prerendering token page:', error);
        } finally {
          setIsPrerendering(false);
        }
      }
    };

    checkAndPrerender();
  }, [symbol]);

  // Return null as this is just for meta tag injection
  return null;
}
