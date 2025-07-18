
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
  "whatIsToken": "Brief description of what the token is and its purpose",
  "riskOverview": "Executive summary of the overall risk assessment",
  "securityAnalysis": "Detailed security analysis with bullet points",
  "liquidityAnalysis": "Detailed liquidity analysis with bullet points", 
  "tokenomicsAnalysis": "Detailed tokenomics analysis with bullet points",
  "communityAnalysis": "Detailed community analysis with bullet points",
  "developmentAnalysis": "Detailed development analysis with bullet points",
  "howToBuy": "Step-by-step guide on how to buy this token",
  "faq": [
    {
      "question": "Is ${token.symbol} a good investment?",
      "answer": "Risk-based answer"
    },
    {
      "question": "What are the main risks of ${token.symbol}?", 
      "answer": "Key risk factors"
    },
    {
      "question": "How secure is ${token.symbol}?",
      "answer": "Security assessment"
    }
  ]
}

Make the content informative, balanced, and professional. Include specific data points from the analysis.`;

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
            content: 'You are a professional cryptocurrency analyst. Generate comprehensive, balanced token reports in valid JSON format. Be objective and include both risks and benefits. Always respond with pure JSON without any markdown formatting or code blocks.'
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        reportId: savedReport.id,
        tokenSymbol: token.symbol.toLowerCase(),
        reportUrl: `/token/${token.symbol.toLowerCase()}`
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
