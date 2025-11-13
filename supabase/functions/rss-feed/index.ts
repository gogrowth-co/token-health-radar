import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TokenReport {
  id: string;
  token_address: string;
  chain_id: string;
  token_symbol: string;
  token_name: string;
  report_content: any;
  created_at: string;
  updated_at: string;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatReportContent(report: TokenReport): string {
  const content = report.report_content;
  let description = "";

  // Add What Is Token section
  if (content.whatIsToken) {
    description += `<h2>What is ${escapeXml(report.token_name)}?</h2>\n`;
    description += `<p>${escapeXml(content.whatIsToken)}</p>\n\n`;
  }

  // Add Risk Overview
  if (content.riskOverview) {
    description += `<h2>Risk Overview</h2>\n`;
    description += `<p>${escapeXml(content.riskOverview)}</p>\n\n`;
  }

  // Add Overall Score if available
  if (content.metadata?.overallScore) {
    description += `<h2>Overall Health Score: ${content.metadata.overallScore}/100</h2>\n\n`;
  }

  // Add Individual Scores
  if (content.metadata?.scores) {
    description += `<h2>Category Scores</h2>\n<ul>\n`;
    const scores = content.metadata.scores;
    if (scores.security) description += `<li>Security: ${scores.security}/100</li>\n`;
    if (scores.tokenomics) description += `<li>Tokenomics: ${scores.tokenomics}/100</li>\n`;
    if (scores.liquidity) description += `<li>Liquidity: ${scores.liquidity}/100</li>\n`;
    if (scores.community) description += `<li>Community: ${scores.community}/100</li>\n`;
    if (scores.development) description += `<li>Development: ${scores.development}/100</li>\n`;
    description += `</ul>\n\n`;
  }

  // Add Security Analysis
  if (content.securityAnalysis) {
    description += `<h2>Security Analysis</h2>\n`;
    if (content.securityAnalysis.summary) {
      description += `<p>${escapeXml(content.securityAnalysis.summary)}</p>\n`;
    }
    if (content.securityAnalysis.keyPoints?.length > 0) {
      description += `<ul>\n`;
      content.securityAnalysis.keyPoints.forEach((point: string) => {
        description += `<li>${escapeXml(point)}</li>\n`;
      });
      description += `</ul>\n`;
    }
    description += `\n`;
  }

  // Add Liquidity Analysis
  if (content.liquidityAnalysis) {
    description += `<h2>Liquidity Analysis</h2>\n`;
    if (content.liquidityAnalysis.summary) {
      description += `<p>${escapeXml(content.liquidityAnalysis.summary)}</p>\n`;
    }
    if (content.liquidityAnalysis.keyPoints?.length > 0) {
      description += `<ul>\n`;
      content.liquidityAnalysis.keyPoints.forEach((point: string) => {
        description += `<li>${escapeXml(point)}</li>\n`;
      });
      description += `</ul>\n`;
    }
    description += `\n`;
  }

  // Add Tokenomics Analysis
  if (content.tokenomicsAnalysis) {
    description += `<h2>Tokenomics Analysis</h2>\n`;
    if (content.tokenomicsAnalysis.summary) {
      description += `<p>${escapeXml(content.tokenomicsAnalysis.summary)}</p>\n`;
    }
    if (content.tokenomicsAnalysis.keyPoints?.length > 0) {
      description += `<ul>\n`;
      content.tokenomicsAnalysis.keyPoints.forEach((point: string) => {
        description += `<li>${escapeXml(point)}</li>\n`;
      });
      description += `</ul>\n`;
    }
    description += `\n`;
  }

  // Add Community Analysis
  if (content.communityAnalysis) {
    description += `<h2>Community Analysis</h2>\n`;
    if (content.communityAnalysis.summary) {
      description += `<p>${escapeXml(content.communityAnalysis.summary)}</p>\n`;
    }
    if (content.communityAnalysis.keyPoints?.length > 0) {
      description += `<ul>\n`;
      content.communityAnalysis.keyPoints.forEach((point: string) => {
        description += `<li>${escapeXml(point)}</li>\n`;
      });
      description += `</ul>\n`;
    }
    description += `\n`;
  }

  // Add Development Analysis
  if (content.developmentAnalysis) {
    description += `<h2>Development Analysis</h2>\n`;
    if (content.developmentAnalysis.summary) {
      description += `<p>${escapeXml(content.developmentAnalysis.summary)}</p>\n`;
    }
    if (content.developmentAnalysis.keyPoints?.length > 0) {
      description += `<ul>\n`;
      content.developmentAnalysis.keyPoints.forEach((point: string) => {
        description += `<li>${escapeXml(point)}</li>\n`;
      });
      description += `</ul>\n`;
    }
    description += `\n`;
  }

  // Add How to Buy section
  if (content.howToBuy?.length > 0) {
    description += `<h2>How to Buy ${escapeXml(report.token_name)}</h2>\n<ol>\n`;
    content.howToBuy.forEach((step: any) => {
      description += `<li><strong>${escapeXml(step.title)}</strong>: ${escapeXml(step.description)}</li>\n`;
    });
    description += `</ol>\n\n`;
  }

  // Add FAQ section
  if (content.faq?.length > 0) {
    description += `<h2>Frequently Asked Questions</h2>\n`;
    content.faq.forEach((item: any) => {
      description += `<h3>${escapeXml(item.question)}</h3>\n`;
      description += `<p>${escapeXml(item.answer)}</p>\n`;
    });
    description += `\n`;
  }

  // Add metadata
  if (content.metadata) {
    description += `<h2>Token Information</h2>\n<ul>\n`;
    if (content.metadata.currentPrice) {
      description += `<li>Current Price: $${content.metadata.currentPrice}</li>\n`;
    }
    if (content.metadata.marketCap) {
      description += `<li>Market Cap: $${content.metadata.marketCap}</li>\n`;
    }
    if (content.metadata.tokenAddress) {
      description += `<li>Contract Address: ${escapeXml(content.metadata.tokenAddress)}</li>\n`;
    }
    description += `</ul>\n`;
  }

  return description;
}

function generateRssFeed(reports: TokenReport[], baseUrl: string): string {
  const now = new Date().toUTCString();

  let rss = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Token Health Radar - Token Reports</title>
    <link>${escapeXml(baseUrl)}</link>
    <description>Comprehensive health and risk analysis reports for cryptocurrency tokens</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(baseUrl)}/rss-feed" rel="self" type="application/rss+xml" />
`;

  reports.forEach((report) => {
    const tokenUrl = `${baseUrl}/token/${report.token_symbol.toLowerCase()}`;
    const pubDate = new Date(report.updated_at || report.created_at).toUTCString();
    const title = `${report.token_name} (${report.token_symbol}) - Health Report`;
    const description = formatReportContent(report);

    rss += `
    <item>
      <title>${escapeXml(title)}</title>
      <link>${escapeXml(tokenUrl)}</link>
      <guid isPermaLink="true">${escapeXml(tokenUrl)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${description}]]></description>
      <content:encoded><![CDATA[${description}]]></content:encoded>
    </item>
`;
  });

  rss += `
  </channel>
</rss>`;

  return rss;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get base URL from request or environment
    const url = new URL(req.url);
    const baseUrl = Deno.env.get("SITE_URL") || `${url.protocol}//${url.host}`;

    // Query all token reports, ordered by most recently updated first
    const { data: reports, error } = await supabaseClient
      .from("token_reports")
      .select("*")
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching token reports:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch token reports" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!reports || reports.length === 0) {
      return new Response(
        JSON.stringify({ error: "No token reports found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate RSS feed
    const rssFeed = generateRssFeed(reports as TokenReport[], baseUrl);

    return new Response(rssFeed, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error("Error generating RSS feed:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
