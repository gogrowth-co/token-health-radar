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

// Timeout helper for API calls
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    )
  ]);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== Token Report Generation Started ===');
    
    // Parse and validate request
    const { tokenAddress, chainId, userId } = await req.json();
    console.log('Request parameters:', { tokenAddress, chainId, userId });

    if (!tokenAddress || !chainId || !userId) {
      console.error('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: tokenAddress, chainId, and userId are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking user authorization...');
    // Check if user is admin
    const { data: userRole, error: roleError } = await supabase.rpc('get_user_role', { _user_id: userId });
    if (roleError) {
      console.error('Error checking user role:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user authorization' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userRole !== 'admin') {
      console.error('Unauthorized access attempt by user:', userId);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Fetching token data from cache tables...');
    // Fetch all scan data from cache tables
    const [tokenData, securityData, tokenomicsData, liquidityData, communityData, developmentData] = await Promise.all([
      supabase.from('token_data_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle(),
      supabase.from('token_security_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle(),
      supabase.from('token_tokenomics_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle(),
      supabase.from('token_liquidity_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle(),
      supabase.from('token_community_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle(),
      supabase.from('token_development_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle()
    ]);

    console.log('Cache data fetched:', {
      tokenData: !!tokenData.data,
      securityData: !!securityData.data,
      tokenomicsData: !!tokenomicsData.data,
      liquidityData: !!liquidityData.data,
      communityData: !!communityData.data,
      developmentData: !!developmentData.data
    });

    if (!tokenData.data) {
      console.error('Token data not found in cache');
      return new Response(
        JSON.stringify({ error: 'Token data not found. Please scan the token first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = tokenData.data;
    const security = securityData.data;
    const tokenomics = tokenomicsData.data;
    const liquidity = liquidityData.data;
    const community = communityData.data;
    const development = developmentData.data;

    // Calculate overall scores
    const scores = {
      security: security?.score || null,
      liquidity: liquidity?.score || null,
      tokenomics: tokenomics?.score || null,
      community: community?.score || null,
      development: development?.score || null
    };

    const validScores = Object.values(scores).filter(score => score !== null) as number[];
    const overallScore = validScores.length > 0 ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length) : null;

    console.log('Calculated scores:', { ...scores, overall: overallScore });

    // Create comprehensive prompt for GPT-4
    const prompt = `Generate a comprehensive token risk report for ${token.name} (${token.symbol}). 

Token Details:
- Name: ${token.name}
- Symbol: ${token.symbol}
- Address: ${tokenAddress}
- Chain: ${chainId}
- Current Price: $${token.current_price_usd || 'N/A'}
- Market Cap: $${token.market_cap_usd || 'N/A'}
- Description: ${token.description || 'No description available'}

Security Analysis:
- Contract Verified: ${security?.contract_verified || 'Unknown'}
- Ownership Renounced: ${security?.ownership_renounced || 'Unknown'}
- Can Mint: ${security?.can_mint || 'Unknown'}
- Honeypot Detected: ${security?.honeypot_detected || 'Unknown'}
- Liquidity Locked: ${security?.is_liquidity_locked || 'Unknown'}
- Security Score: ${security?.score || 'N/A'}/100

Tokenomics Analysis:
- Total Supply: ${tokenomics?.total_supply || 'N/A'}
- Circulating Supply: ${tokenomics?.circulating_supply || 'N/A'}
- Holder Concentration: ${tokenomics?.holder_concentration_risk || 'Unknown'}
- Burn Mechanism: ${tokenomics?.burn_mechanism || 'Unknown'}
- Tokenomics Score: ${tokenomics?.score || 'N/A'}/100

Liquidity Analysis:
- Trading Volume 24h: $${liquidity?.trading_volume_24h_usd || 'N/A'}
- CEX Listings: ${liquidity?.cex_listings || 'N/A'}
- DEX Depth Status: ${liquidity?.dex_depth_status || 'Unknown'}
- Liquidity Score: ${liquidity?.score || 'N/A'}/100

Community Analysis:
- Twitter Followers: ${community?.twitter_followers || 'N/A'}
- Twitter Verified: ${community?.twitter_verified || 'Unknown'}
- Discord Members: ${community?.discord_members || 'N/A'}
- Telegram Members: ${community?.telegram_members || 'N/A'}
- Community Score: ${community?.score || 'N/A'}/100

Development Analysis:
- Is Open Source: ${development?.is_open_source || 'Unknown'}
- GitHub Repository: ${development?.github_repo || 'N/A'}
- Contributors: ${development?.contributors_count || 'N/A'}
- Recent Commits (30d): ${development?.commits_30d || 'N/A'}
- Last Commit: ${development?.last_commit || 'N/A'}
- Development Score: ${development?.score || 'N/A'}/100

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

    console.log('Calling OpenAI API...');
    
    // Generate content with OpenAI (with timeout)
    const openAIResponse = await withTimeout(
      fetch('https://api.openai.com/v1/chat/completions', {
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
      }),
      30000 // 30 second timeout
    );

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', { status: openAIResponse.status, statusText: openAIResponse.statusText, body: errorText });
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate report content',
          details: `OpenAI API returned ${openAIResponse.status}: ${openAIResponse.statusText}`
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openAIData = await openAIResponse.json();
    console.log('OpenAI response received');
    
    let reportContent;
    
    try {
      let content = openAIData.choices[0].message.content;
      
      // Check if content is wrapped in markdown code blocks
      if (content.includes('```json')) {
        console.log('Detected markdown-wrapped JSON, extracting...');
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          content = jsonMatch[1].trim();
        }
      } else if (content.includes('```')) {
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
      
      console.log('Successfully parsed OpenAI response');
      
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw OpenAI response:', openAIData.choices[0].message.content.substring(0, 500) + '...');
      
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
          JSON.stringify({ 
            error: 'Failed to parse AI-generated report content',
            details: 'The AI response was not in the expected JSON format'
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Add metadata to report content
    const enrichedContent = {
      ...reportContent,
      metadata: {
        tokenAddress,
        chainId,
        tokenName: token.name,
        tokenSymbol: token.symbol,
        overallScore,
        scores,
        generatedAt: new Date().toISOString(),
        generatedBy: 'ai'
      }
    };

    console.log('Saving report to database...');
    
    // Save report to database (upsert to handle existing reports)
    const { data: reportData, error: insertError } = await supabase
      .from('token_reports')
      .upsert({
        token_address: tokenAddress,
        chain_id: chainId,
        token_name: token.name,
        token_symbol: token.symbol,
        report_content: enrichedContent,
        generated_by: userId
      }, {
        onConflict: 'token_address,chain_id'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving report to database:', insertError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save report to database',
          details: insertError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Report saved successfully with ID:', reportData.id);

    // Generate score snapshot image asynchronously (don't await to avoid blocking response)
    const snapshotGeneration = (async () => {
      try {
        console.log('Generating score snapshot...');
        
        const { data: snapshotData, error: snapshotError } = await supabase.functions.invoke('render-score-snapshot', {
          body: {
            tokenName: token.name,
            tokenSymbol: token.symbol,
            tokenAddress,
            chainId,
            overallScore,
            scores,
            updatedAt: new Date().toISOString()
          }
        });

        if (snapshotError || !snapshotData?.url) {
          console.error('Failed to generate snapshot:', snapshotError);
          return;
        }

        console.log('Snapshot generated:', snapshotData.url);
        
        // Update report content with snapshot URL
        const updatedContent = {
          ...enrichedContent,
          metadata: {
            ...enrichedContent.metadata,
            snapshotUrl: snapshotData.url
          }
        };
        
        await supabase
          .from('token_reports')
          .update({ report_content: updatedContent })
          .eq('id', reportData.id);
          
        console.log('Report updated with snapshot URL');
        
      } catch (error) {
        console.error('Error in snapshot generation:', error);
      }
    })();

    // Don't await the snapshot generation
    snapshotGeneration.catch(err => console.error('Snapshot generation failed:', err));

    // Generate hero image asynchronously (don't await to avoid blocking response)
    const heroImageGeneration = (async () => {
      try {
        console.log('Generating hero image...');
        
        const { data: heroData, error: heroError } = await supabase.functions.invoke('generate-hero-image', {
          body: {
            chain: chainId,
            address: tokenAddress,
            name: token.name,
            symbol: token.symbol,
            overallScore,
            scores,
            lastScannedAt: new Date().toISOString()
          }
        });

        if (heroError || !heroData?.ok) {
          console.error('Failed to generate hero image:', heroError);
          return;
        }

        console.log('Hero image generated successfully');
        
      } catch (error) {
        console.error('Error in hero image generation:', error);
      }
    })();

    // Don't await the hero image generation
    heroImageGeneration.catch(err => console.error('Hero image generation failed:', err));

    const reportUrl = `/token/${token.symbol.toLowerCase()}`;
    
    console.log('=== Token Report Generation Completed Successfully ===');

    return new Response(
      JSON.stringify({
        success: true,
        reportId: reportData.id,
        reportUrl,
        message: 'Token report generated successfully'
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('=== Token Report Generation Error ===');
    console.error('Error details:', error);
    console.error('Stack trace:', error.stack);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during report generation',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});