
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tokenAddress, chainId } = await req.json();
    
    if (!tokenAddress || !chainId) {
      throw new Error('Token address and chain ID are required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!userRole) {
      throw new Error('Admin access required');
    }

    // Check if report already exists
    const { data: existingReport } = await supabase
      .from('token_risk_reports')
      .select('*')
      .eq('token_address', tokenAddress)
      .eq('chain_id', chainId)
      .single();

    if (existingReport) {
      return new Response(JSON.stringify({ 
        success: true, 
        reportId: existingReport.id,
        cached: true 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch token data from cache tables
    const [tokenData, securityData, liquidityData, tokenomicsData, communityData, developmentData] = await Promise.all([
      supabase.from('token_data_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_security_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_liquidity_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_tokenomics_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_community_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single(),
      supabase.from('token_development_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).single()
    ]);

    if (!tokenData.data) {
      throw new Error('Token data not found');
    }

    const token = tokenData.data;
    const security = securityData.data || {};
    const liquidity = liquidityData.data || {};
    const tokenomics = tokenomicsData.data || {};
    const community = communityData.data || {};
    const development = developmentData.data || {};

    // Calculate scores
    const scores = {
      security: security.score || 0,
      liquidity: liquidity.score || 0,
      tokenomics: tokenomics.score || 0,
      community: community.score || 0,
      development: development.score || 0
    };

    const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / 5);

    // Generate content using OpenAI
    const prompt = `
Generate a comprehensive token risk report for ${token.name} (${token.symbol}). Use the following data to create professional, informative content:

Token Details:
- Name: ${token.name}
- Symbol: ${token.symbol}
- Description: ${token.description || 'DeFi token'}
- Current Price: $${token.current_price_usd || 0}
- Market Cap: $${token.market_cap_usd || 0}

Risk Scores (0-100):
- Overall Score: ${overallScore}
- Security: ${scores.security}
- Liquidity: ${scores.liquidity}
- Tokenomics: ${scores.tokenomics}
- Community: ${scores.community}
- Development: ${scores.development}

Security Details:
- Contract Verified: ${security.contract_verified ? 'Yes' : 'No'}
- Ownership Renounced: ${security.ownership_renounced ? 'Yes' : 'No'}
- Can Mint: ${security.can_mint ? 'Yes' : 'No'}
- Honeypot Detected: ${security.honeypot_detected ? 'Yes' : 'No'}
- Proxy Contract: ${security.is_proxy ? 'Yes' : 'No'}

Community Details:
- Twitter Followers: ${community.twitter_followers || 0}
- Twitter Verified: ${community.twitter_verified ? 'Yes' : 'No'}

Development Details:
- GitHub Repository: ${development.github_repo || 'Not available'}
- Open Source: ${development.is_open_source ? 'Yes' : 'No'}
- Contributors: ${development.contributors_count || 0}

Generate a JSON response with these sections:
1. tokenOverview - 2-3 sentences about what the token is
2. riskOverview - Natural language summary of overall risk assessment
3. securityAnalysis - Detailed security assessment
4. liquidityAnalysis - Liquidity and trading analysis
5. tokenomicsAnalysis - Token distribution and economics
6. communityAnalysis - Community engagement and social presence
7. developmentAnalysis - Technical development assessment
8. keyFindings - Array of 3-5 bullet points with key findings
9. recommendations - Array of 3-4 recommendations for investors
10. faqs - Array of 5 Q&A objects with "question" and "answer" fields

Use an informative, professional tone suitable for investors and crypto enthusiasts.
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional crypto analyst specializing in token risk assessment. Generate comprehensive, accurate reports in JSON format.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
      }),
    });

    if (!response.ok) {
      throw new Error('OpenAI API request failed');
    }

    const openaiData = await response.json();
    const generatedContent = openaiData.choices[0].message.content;

    let reportContent;
    try {
      reportContent = JSON.parse(generatedContent);
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', generatedContent);
      throw new Error('Failed to generate structured report content');
    }

    // Add metadata
    reportContent.metadata = {
      tokenAddress,
      chainId,
      tokenName: token.name,
      tokenSymbol: token.symbol,
      overallScore,
      scores,
      generatedAt: new Date().toISOString(),
      logoUrl: token.logo_url,
      websiteUrl: token.website_url,
      twitterHandle: token.twitter_handle,
      githubUrl: token.github_url
    };

    // Save report to database
    const { data: savedReport, error: saveError } = await supabase
      .from('token_risk_reports')
      .insert({
        token_address: tokenAddress,
        chain_id: chainId,
        report_content: reportContent,
        generated_by: user.id
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save report: ${saveError.message}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      reportId: savedReport.id,
      cached: false 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating token report:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
