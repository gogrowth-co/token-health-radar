
// Vercel serverless function for prerendering token pages
export default async function handler(req, res) {
  const { token } = req.query;
  
  // Check if request is from a bot/crawler
  const userAgent = req.headers['user-agent'] || '';
  const isBot = /bot|crawler|spider|crawling|facebookexternalhit|twitterbot|linkedinbot|slackbot|whatsapp|discordbot/i.test(userAgent);
  
  if (!isBot) {
    // Regular users get the normal React app
    return res.redirect(307, `/token/${token}`);
  }
  
  try {
    // For bots, fetch token data and generate static HTML
    const supabaseUrl = 'https://qaqebpcqespvzbfwawlp.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFhcWVicGNxZXNwdnpiZndhd2xwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3ODkxNzEsImV4cCI6MjA2MzM2NTE3MX0.11hoagaFRKXswTNtXTwDM4NDHpPMO5EDEUhyFS3N8v4';
    
    // Fetch token report
    const reportResponse = await fetch(`${supabaseUrl}/rest/v1/token_reports?token_symbol=eq.${token.toLowerCase()}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const reportData = await reportResponse.json();
    
    if (!reportData || reportData.length === 0) {
      return res.status(404).send('Token report not found');
    }
    
    const report = reportData[0];
    
    // Fetch token cache data
    const cacheResponse = await fetch(`${supabaseUrl}/rest/v1/token_data_cache?token_address=eq.${report.token_address}&chain_id=eq.${report.chain_id}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    const cacheData = await cacheResponse.json();
    const tokenCache = cacheData && cacheData.length > 0 ? cacheData[0] : null;
    
    // Generate prerendered HTML
    const tokenData = {
      symbol: tokenCache?.symbol || token,
      name: tokenCache?.name || token.toUpperCase(),
      logo_url: tokenCache?.logo_url,
      description: tokenCache?.description,
      website_url: tokenCache?.website_url,
      twitter_handle: tokenCache?.twitter_handle,
      coingecko_id: tokenCache?.coingecko_id,
      current_price_usd: tokenCache?.current_price_usd,
      market_cap_usd: tokenCache?.market_cap_usd,
      overall_score: report.report_content?.metadata?.scores?.overall,
      token_address: report.token_address,
      chain_id: report.chain_id
    };
    
    const title = `${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report | Token Health Scan`;
    const description = `Comprehensive risk analysis and security report for ${tokenData.name} (${tokenData.symbol.toUpperCase()}). Get detailed insights on security, tokenomics, liquidity, community, and development${tokenData.overall_score ? ` with an overall risk score of ${tokenData.overall_score}/100` : ''}.`;
    const canonicalUrl = `https://tokenhealthscan.com/token/${tokenData.symbol.toLowerCase()}`;
    const imageUrl = tokenData.logo_url || "https://tokenhealthscan.com/tokenhealthscan-og.png";
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  
  <title>${title}</title>
  <meta name="description" content="${description}" />
  <meta name="keywords" content="${tokenData.name}, ${tokenData.symbol}, crypto risk, token analysis, security report, DeFi, cryptocurrency, smart contract audit, liquidity analysis, tokenomics" />
  <meta name="author" content="Token Health Scan" />
  
  <meta property="og:title" content="${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report" />
  <meta property="og:description" content="${description}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${imageUrl}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:site_name" content="Token Health Scan" />
  
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="@tokenhealthscan" />
  <meta name="twitter:title" content="${tokenData.name} Risk Report" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image" content="${imageUrl}" />
  
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="icon" href="/lovable-uploads/ae39e42e-1394-4b63-8dd4-8ca4bf332fa3.png" type="image/png">
</head>
<body>
  <div id="root">
    <div style="padding: 2rem; text-align: center; font-family: system-ui;">
      <h1>${tokenData.name} (${tokenData.symbol.toUpperCase()}) Risk Report</h1>
      <p>Loading comprehensive risk analysis...</p>
      <p>Score: ${tokenData.overall_score || 'Calculating'}/100</p>
    </div>
  </div>
  
  <script>
    // Redirect to React app for interactive experience
    if (typeof window !== 'undefined') {
      window.location.href = '/token/${token}';
    }
  </script>
</body>
</html>`;
    
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
    
  } catch (error) {
    console.error('Prerender error:', error);
    res.status(500).send('Internal server error');
  }
}
