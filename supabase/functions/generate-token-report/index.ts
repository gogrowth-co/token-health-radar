import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { ImageResponse } from "https://deno.land/x/og_edge/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Small helpers for snapshot rendering
const SCORE_COLORS = {
  good: '#22c55e',     // success
  warn: '#f59e0b',     // warning
  bad:  '#ef4444',     // destructive
  mut:  '#9ca3af'      // muted
};

function colorForScore(n?: number | null) {
  if (n == null) return SCORE_COLORS.mut;
  if (n >= 70) return SCORE_COLORS.good;
  if (n >= 40) return SCORE_COLORS.warn;
  return SCORE_COLORS.bad;
}

function barWidth(n?: number | null, max = 300) {
  if (n == null) return Math.round(max * 0.15);
  const clamped = Math.max(0, Math.min(100, n));
  return Math.round((clamped / 100) * max);
}

async function renderScoreSnapshotPNG(params: {
  name: string;
  symbol: string;
  chainId: string;
  overall?: number | null;
  scores: {
    security?: number | null;
    liquidity?: number | null;
    tokenomics?: number | null;
    community?: number | null;
    development?: number | null;
  };
  updatedAt?: string;
}) {
  const width = 1200;
  const height = 630;

  const {
    name,
    symbol,
    chainId,
    overall,
    scores,
    updatedAt
  } = params;

  const headerStyle = {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  };

  const sectionTitleStyle = {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 12,
  };

  const labelStyle = {
    fontSize: 22,
    color: '#d1d5db',
  };

  const textStyle = {
    fontSize: 24,
    color: '#e5e7eb',
  };

  const scoreDial = (
    <div style={{
      width: 220,
      height: 220,
      borderRadius: 110,
      border: `8px solid ${colorForScore(overall)}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: colorForScore(overall),
      fontSize: 64,
      fontWeight: 800
    }}>
      {overall == null ? '—' : `${overall}`}
    </div>
  );

  const renderBar = (label: string, value?: number | null) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ ...labelStyle }}>{label}</div>
      <div style={{
        width: 320,
        height: 20,
        background: '#374151',
        borderRadius: 10,
        overflow: 'hidden'
      }}>
        <div style={{
          width: barWidth(value, 320),
          height: 20,
          background: colorForScore(value)
        }} />
      </div>
    </div>
  );

  const image = new ImageResponse(
    (
      <div
        style={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          padding: 48,
          background: '#0b0f16',
          color: '#fff',
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, "Apple Color Emoji", "Segoe UI Emoji"',
        }}
      >
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 42, fontWeight: 800 }}>
              {name} ({symbol?.toUpperCase()})
            </div>
            <div style={{ ...labelStyle }}>
              Chain: {chainId} • Updated: {updatedAt ? new Date(updatedAt).toLocaleString() : 'now'}
            </div>
          </div>
          {scoreDial}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: '#1f2937', margin: '24px 0' }} />

        {/* Body */}
        <div style={{ display: 'flex', gap: 48 }}>
          {/* Pillars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={sectionTitleStyle}>Pillar Scores</div>
            {renderBar('Security', scores.security)}
            {renderBar('Liquidity', scores.liquidity)}
            {renderBar('Tokenomics', scores.tokenomics)}
            {renderBar('Community', scores.community)}
            {renderBar('Development', scores.development)}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={sectionTitleStyle}>Legend</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, background: SCORE_COLORS.good, borderRadius: 4 }} />
              <div style={textStyle}>70-100 Good</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, background: SCORE_COLORS.warn, borderRadius: 4 }} />
              <div style={textStyle}>40-69 Moderate</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, background: SCORE_COLORS.bad, borderRadius: 4 }} />
              <div style={textStyle}>0-39 High Risk</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 16, height: 16, background: SCORE_COLORS.mut, borderRadius: 4 }} />
              <div style={textStyle}>No data</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 20, color: '#9ca3af' }}>
            Token Health Scan • tokenhealthscan.com
          </div>
          <div style={{ fontSize: 20, color: '#9ca3af' }}>
            Snapshot generated by server
          </div>
        </div>
      </div>
    ),
    { width, height }
  );

  const pngArrayBuffer = await image.arrayBuffer();
  return new Uint8Array(pngArrayBuffer);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenAddress, chainId, userId } = await req.json();

    if (!tokenAddress || !chainId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating report for:', { tokenAddress, chainId, userId });

    // Check if user is admin
    const { data: userRole } = await supabase.rpc('get_user_role', { _user_id: userId });
    if (userRole !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch all scan data from cache tables
    const [tokenData, securityData, tokenomicsData, liquidityData, communityData, developmentData] = await Promise.all([
      supabase.from('token_data_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_security_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_tokenomics_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_liquidity_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_community_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_development_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single()
    ]);

    if (!tokenData.data) {
      return new Response(
        JSON.stringify({ error: 'Token data not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = tokenData.data;
    const security = securityData.data;
    const tokenomics = tokenomicsData.data;
    const liquidity = liquidityData.data;
    const community = communityData.data;
    const development = developmentData.data;

    // Create comprehensive prompt for GPT-4
    const prompt = `Generate a comprehensive token risk report for ${token.name} (${token.symbol}). 

Token Details:
- Name: ${token.name}
- Symbol: ${token.symbol}
- Address: ${tokenAddress}
- Chain: ${chainId}
- Current Price: $${token.current_price_usd}
- Market Cap: $${token.market_cap_usd}
- Description: ${token.description}

Security Analysis:
- Contract Verified: ${security?.contract_verified}
- Ownership Renounced: ${security?.ownership_renounced}
- Can Mint: ${security?.can_mint}
- Honeypot Detected: ${security?.honeypot_detected}
- Liquidity Locked: ${security?.is_liquidity_locked}
- Security Score: ${security?.score}/100

Tokenomics Analysis:
- Total Supply: ${tokenomics?.total_supply}
- Circulating Supply: ${tokenomics?.circulating_supply}
- Holder Concentration: ${tokenomics?.holder_concentration_risk}
- Burn Mechanism: ${tokenomics?.burn_mechanism}
- Tokenomics Score: ${tokenomics?.score}/100

Liquidity Analysis:
- Trading Volume 24h: $${liquidity?.trading_volume_24h_usd}
- CEX Listings: ${liquidity?.cex_listings}
- DEX Depth Status: ${liquidity?.dex_depth_status}
- Liquidity Score: ${liquidity?.score}/100

Community Analysis:
- Twitter Followers: ${community?.twitter_followers}
- Twitter Verified: ${community?.twitter_verified}
- Discord Members: ${community?.discord_members}
- Telegram Members: ${community?.telegram_members}
- Community Score: ${community?.score}/100

Development Analysis:
- Is Open Source: ${development?.is_open_source}
- GitHub Repository: ${development?.github_repo}
- Contributors: ${development?.contributors_count}
- Recent Commits (30d): ${development?.commits_30d}
- Last Commit: ${development?.last_commit}
- Development Score: ${development?.score}/100

Please generate structured report content in JSON format with the following sections:
{
  "whatIsToken": "Brief 2-3 sentence description of what the token is and its purpose",
  "riskOverview": "Executive summary of the overall risk assessment highlighting the main concerns and positives",
  "securityAnalysis": {
    "summary": "Brief overview of security findings",
    "keyPoints": [
      "Specific security finding 1 with explanation",
      "Specific security finding 2 with explanation",
      "Risk assessment point with context"
    ]
  },
  "liquidityAnalysis": {
    "summary": "Brief overview of liquidity situation", 
    "keyPoints": [
      "Trading volume analysis with specific numbers",
      "Exchange availability assessment",
      "Market depth evaluation"
    ]
  },
  "tokenomicsAnalysis": {
    "summary": "Brief overview of token economics",
    "keyPoints": [
      "Supply mechanism details",
      "Holder distribution analysis", 
      "Economic model assessment"
    ]
  },
  "communityAnalysis": {
    "summary": "Brief overview of community health",
    "keyPoints": [
      "Social media presence analysis",
      "Community engagement levels",
      "Growth metrics and trends"
    ]
  },
  "developmentAnalysis": {
    "summary": "Brief overview of development activity",
    "keyPoints": [
      "Code activity assessment",
      "Developer engagement levels",
      "Project maintenance status"
    ]
  },
  "howToBuy": [
    {
      "step": 1,
      "title": "Set up a cryptocurrency wallet",
      "description": "Download and install a compatible wallet like MetaMask, Trust Wallet, or Coinbase Wallet"
    },
    {
      "step": 2,
      "title": "Purchase ETH or USDC",
      "description": "Buy Ethereum (ETH) or USDC from a centralized exchange like Coinbase, Binance, or Kraken"
    },
    {
      "step": 3,
      "title": "Transfer to your wallet",
      "description": "Send your ETH or USDC from the exchange to your personal wallet address"
    },
    {
      "step": 4,
      "title": "Connect to a DEX",
      "description": "Visit Uniswap, SushiSwap, or another decentralized exchange and connect your wallet"
    },
    {
      "step": 5,
      "title": "Swap for ${token.symbol}",
      "description": "Enter the token contract address and swap your ETH/USDC for ${token.symbol}"
    }
  ],
  "faq": [
    {
      "question": "Is ${token.symbol} a good investment?",
      "answer": "Detailed risk-based answer considering the token's scores and analysis"
    },
    {
      "question": "What are the main risks of investing in ${token.symbol}?",
      "answer": "Specific risk factors based on the security, liquidity, and tokenomics analysis"
    },
    {
      "question": "How secure is the ${token.symbol} smart contract?",
      "answer": "Security assessment based on contract verification, ownership, and audit status"
    },
    {
      "question": "What makes ${token.symbol} different from other tokens?",
      "answer": "Unique features and value proposition based on the token's characteristics"
    },
    {
      "question": "Where can I track ${token.symbol} price and market data?",
      "answer": "Recommended resources for monitoring price, volume, and market metrics"
    }
  ]
}

Make the content informative, balanced, and professional. Include specific data points from the analysis. For each analysis section, provide a brief summary followed by 3-5 specific key points that reference actual data. Make the how-to-buy steps clear and actionable. Ensure FAQ answers are comprehensive and address real investor concerns.`;

    // Generate content with OpenAI
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a professional cryptocurrency analyst. Generate comprehensive, balanced token reports in valid JSON format. Be objective and include both risks and benefits. Always respond with pure JSON without any markdown formatting or code blocks. Focus on providing educational content that helps users understand both what each metric means and why it matters for their investment decisions.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', await openAIResponse.text());
      return new Response(
        JSON.stringify({ error: 'Failed to generate report content' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    let reportContent;
    
    try {
      let content = openAIData.choices[0].message.content;
      
      // Check if content is wrapped in markdown code blocks
      if (content.includes('```json')) {
        console.log('Detected markdown-wrapped JSON, extracting...');
        // Extract JSON from markdown code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }
      } else if (content.includes('```')) {
        // Handle case where it might be wrapped in generic code blocks
        console.log('Detected generic code blocks, extracting...');
        const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch) {
          content = codeMatch[1].trim();
        }
      }
      
      // Clean up any remaining backticks or whitespace
      content = content.replace(/^`+|`+$/g, '').trim();
      
      console.log('Attempting to parse extracted content...');
      reportContent = JSON.parse(content);
      
      // Validate the parsed content has required fields
      if (!reportContent.whatIsToken || !reportContent.riskOverview) {
        throw new Error('Generated content missing required fields');
      }
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw OpenAI response:', openAIData.choices[0].message.content);
      
      // Try a fallback approach - look for any JSON-like content
      try {
        const content = openAIData.choices[0].message.content;
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          const extractedJson = content.substring(jsonStart, jsonEnd + 1);
          reportContent = JSON.parse(extractedJson);
          console.log('Successfully parsed with fallback method');
        } else {
          throw new Error('No valid JSON found in response');
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        return new Response(
          JSON.stringify({ error: 'Failed to parse generated content' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Add metadata to report content
    const fullReportContent = {
      ...reportContent,
      metadata: {
        tokenAddress,
        chainId,
        tokenName: token.name,
        tokenSymbol: token.symbol,
        currentPrice: token.current_price_usd,
        marketCap: token.market_cap_usd,
        scores: {
          overall: Math.round(((security?.score || 0) + (tokenomics?.score || 0) + (liquidity?.score || 0) + (community?.score || 0) + (development?.score || 0)) / 5),
          security: security?.score || 0,
          tokenomics: tokenomics?.score || 0,
          liquidity: liquidity?.score || 0,
          community: community?.score || 0,
          development: development?.score || 0
        },
        generatedAt: new Date().toISOString()
      }
    };

    // Save to database (upsert to handle regeneration)
    const { data: savedReport, error: saveError } = await supabase
      .from('token_reports')
      .upsert({
        token_address: tokenAddress,
        chain_id: chainId,
        token_symbol: token.symbol.toLowerCase(),
        token_name: token.name,
        report_content: fullReportContent,
        generated_by: userId
      }, {
        onConflict: 'token_address,chain_id'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving report:', saveError);
      return new Response(
        JSON.stringify({ error: 'Failed to save report' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Report generated and saved successfully');

    // Generate and upload the score snapshot PNG (non-blocking on failure)
    let snapshotUrl: string | undefined;
    try {
      const pngBytes = await renderScoreSnapshotPNG({
        name: token.name,
        symbol: token.symbol,
        chainId,
        overall: fullReportContent.metadata.scores.overall,
        scores: {
          security: fullReportContent.metadata.scores.security,
          liquidity: fullReportContent.metadata.scores.liquidity,
          tokenomics: fullReportContent.metadata.scores.tokenomics,
          community: fullReportContent.metadata.scores.community,
          development: fullReportContent.metadata.scores.development
        },
        updatedAt: fullReportContent.metadata.generatedAt
      });

      const objectPath = `${chainId}/${tokenAddress}/score-snapshot_1200x630.png`;
      const { error: uploadError } = await supabase
        .storage
        .from('reports')
        .upload(objectPath, pngBytes, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Snapshot upload failed:', uploadError);
      } else {
        const { data: pub } = supabase.storage.from('reports').getPublicUrl(objectPath);
        snapshotUrl = pub?.publicUrl;
        console.log('Snapshot generated at:', snapshotUrl);
      }
    } catch (snapErr) {
      console.error('Snapshot generation error (ignored):', snapErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        reportId: savedReport.id,
        tokenSymbol: token.symbol.toLowerCase(),
        reportUrl: `/token/${token.symbol.toLowerCase()}`,
        snapshotUrl // optional; may be undefined if snapshot failed, but report succeeded
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-token-report function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
