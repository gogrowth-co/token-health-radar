
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Define CORS headers for cross-origin requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Initialize Supabase client with service role key to bypass RLS
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Helper function to log function progress for debugging
function logStep(step: string, details?: any) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TOKEN-SCAN] ${step}${detailsStr}`);
}

// Helper function to calculate a score between 0-100 based on factors
function calculateScore(factors: Record<string, number>): number {
  if (Object.keys(factors).length === 0) return 0;
  
  const total = Object.values(factors).reduce((sum, val) => sum + val, 0);
  const maxPossible = Object.keys(factors).length * 100;
  
  return Math.round((total / maxPossible) * 100);
}

// Helper function to ensure token address is properly formatted
function normalizeTokenAddress(address: string): string {
  if (address.startsWith('0x')) {
    return address.toLowerCase();
  }
  return address.toLowerCase();
}

// Helper function to check if a scan is too recent (within 24h)
async function isRecentScan(tokenAddress: string, category: string): Promise<boolean> {
  try {
    const tableName = `token_${category}_cache`;
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .select('updated_at')
      .eq('token_address', tokenAddress.toLowerCase())
      .single();
    
    if (error || !data) return false;
    
    const lastUpdate = new Date(data.updated_at);
    const now = new Date();
    const hoursSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);
    
    return hoursSinceUpdate < 24;
  } catch (error) {
    return false;
  }
}

// Process security data from GoPlus API
async function processSecurityData(tokenAddress: string): Promise<any> {
  try {
    // Normalize token address
    tokenAddress = normalizeTokenAddress(tokenAddress);
    
    // Check if we have recent data
    const hasRecentData = await isRecentScan(tokenAddress, "security");
    if (hasRecentData) {
      const { data, error } = await supabaseAdmin
        .from('token_security_cache')
        .select('*')
        .eq('token_address', tokenAddress)
        .single();
      
      if (!error && data) {
        logStep("Using cached security data", { token_address: tokenAddress });
        return data;
      }
    }
    
    // Use Ethereum chain ID (1) - can be expanded for other chains
    const chainId = "1";
    const apiKey = Deno.env.get("GOPLUS_API_KEY");
    
    if (!apiKey) throw new Error("GoPlus API key not configured");
    
    logStep("Fetching security data from GoPlus", { token_address: tokenAddress });
    const response = await fetch(
      `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${tokenAddress}`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": apiKey
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`GoPlus API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract security data for specified token
    const tokenData = data?.result?.[tokenAddress];
    if (!tokenData) {
      throw new Error("No security data found for token");
    }

    // Check contract verification with Etherscan
    let auditStatus = "unaudited";
    try {
      const etherscanKey = Deno.env.get("ETHERSCAN_API_KEY");
      if (etherscanKey) {
        const etherscanResponse = await fetch(
          `https://api.etherscan.io/api?module=contract&action=getsourcecode&address=${tokenAddress}&apikey=${etherscanKey}`
        );
        
        if (etherscanResponse.ok) {
          const etherscanData = await etherscanResponse.json();
          if (etherscanData.status === "1" && etherscanData.result?.[0]) {
            // Check if contract is verified
            if (etherscanData.result[0].ABI !== "Contract source code not verified") {
              auditStatus = "verified";
            }
          }
        }
      }
    } catch (error) {
      logStep("Etherscan verification check failed", error.message);
    }

    // Process security metrics
    const securityMetrics = {
      honeypot_detected: tokenData.is_honeypot === "1",
      can_mint: tokenData.mint_function === "1",
      ownership_renounced: tokenData.owner_address === "0x0000000000000000000000000000000000000000",
      freeze_authority: tokenData.can_take_back_ownership === "1",
      audit_status: tokenData.is_audited === "1" ? "audited" : auditStatus,
      multisig_status: tokenData.is_multisig === "1" ? "multisig" : "single"
    };
    
    // Calculate security score
    const securityFactors = {
      honeyPot: securityMetrics.honeypot_detected ? 0 : 100,
      minting: securityMetrics.can_mint ? 40 : 100,
      ownershipRenounced: securityMetrics.ownership_renounced ? 100 : 60,
      freezeAuthority: securityMetrics.freeze_authority ? 0 : 100,
      audit: securityMetrics.audit_status === "audited" ? 100 : 
             securityMetrics.audit_status === "verified" ? 75 : 50,
      multisig: securityMetrics.multisig_status === "multisig" ? 100 : 60
    };
    
    const score = calculateScore(securityFactors);
    
    return {
      ...securityMetrics,
      score,
      raw_data: tokenData, // Store raw data for debugging
      token_address: tokenAddress // Ensure token_address is included and normalized
    };
  } catch (error) {
    logStep("Security data processing error", error.message);
    return {
      score: 0,
      error: error.message,
      honeypot_detected: null,
      can_mint: null,
      ownership_renounced: null,
      freeze_authority: null,
      audit_status: "unknown",
      multisig_status: "unknown",
      token_address: tokenAddress // Ensure token_address is included and normalized
    };
  }
}

// Process liquidity data from multiple sources (CoinGecko, GeckoTerminal, GoPlus)
async function processLiquidityData(tokenData: any): Promise<any> {
  try {
    // Normalize token address
    const tokenAddress = normalizeTokenAddress(tokenData.token_address);
    
    // Check if we have recent data
    const hasRecentData = await isRecentScan(tokenAddress, "liquidity");
    if (hasRecentData) {
      const { data, error } = await supabaseAdmin
        .from('token_liquidity_cache')
        .select('*')
        .eq('token_address', tokenAddress)
        .single();
      
      if (!error && data) {
        logStep("Using cached liquidity data", { token_address: tokenAddress });
        return data;
      }
    }
    
    const coinGeckoId = tokenData.coingecko_id;
    const apiKey = Deno.env.get("COINGECKO_API_KEY");
    const etherscanKey = Deno.env.get("ETHERSCAN_API_KEY");
    
    if (!apiKey) throw new Error("CoinGecko API key not configured");
    if (!coinGeckoId) throw new Error("No CoinGecko ID available for token");
    
    // Get market data from CoinGecko
    logStep("Fetching market data from CoinGecko", { coingecko_id: coinGeckoId });
    const marketResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=true&market_data=true&community_data=false&developer_data=false&sparkline=false`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-cg-pro-api-key": apiKey
        }
      }
    );
    
    if (!marketResponse.ok) {
      throw new Error(`CoinGecko API error: ${marketResponse.status}`);
    }
    
    const marketData = await marketResponse.json();
    
    // Check for top exchanges (CEX)
    const exchanges = marketData.tickers || [];
    const cexListings = new Set(exchanges.filter(t => !t.market.identifier.includes("dex")).map(t => t.market.name)).size;
    
    // Check trading volume
    const tradingVolume = marketData.market_data?.total_volume?.usd || 0;
    
    // Get holder distribution info using GoPlus
    const goplusKey = Deno.env.get("GOPLUS_API_KEY");
    let holderDistribution = "unknown";
    let liquidityLockedDays = 0;
    
    if (goplusKey) {
      try {
        const chainId = "1"; // Ethereum
        const goplusResponse = await fetch(
          `https://api.gopluslabs.io/api/v1/token_security/${chainId}?contract_addresses=${tokenAddress}`,
          {
            headers: {
              "Content-Type": "application/json",
              "X-API-KEY": goplusKey
            }
          }
        );
        
        if (goplusResponse.ok) {
          const goplusData = await goplusResponse.json();
          const tokenSecurityData = goplusData?.result?.[tokenAddress];
          
          if (tokenSecurityData) {
            const holderCount = parseInt(tokenSecurityData.holder_count || "0");
            const holdersWithBalance = parseInt(tokenSecurityData.holders_with_balance || "0");
            
            // Analyze holder distribution based on holder count
            if (holderCount > 10000) {
              holderDistribution = "distributed";
            } else if (holderCount > 1000) {
              holderDistribution = "moderate";
            } else if (holderCount > 100) {
              holderDistribution = "concentrated";
            } else {
              holderDistribution = "highly_concentrated";
            }
            
            // Check for locked liquidity
            if (tokenSecurityData.is_open_source === "1" && 
                (tokenSecurityData.lp_holders?.some((h: any) => 
                  h.is_contract === "1" && 
                  h.tag_info?.some((t: any) => t.includes("lock"))))) {
              liquidityLockedDays = 180; // Estimated lock time
            }
          }
        }
      } catch (error) {
        logStep("GoPlus holder analysis failed", error.message);
      }
    }
    
    // Fallback to Etherscan for holder info if GoPlus failed
    if (holderDistribution === "unknown" && etherscanKey) {
      try {
        const etherscanResponse = await fetch(
          `https://api.etherscan.io/api?module=token&action=tokenholderlist&contractaddress=${tokenAddress}&page=1&offset=100&apikey=${etherscanKey}`
        );
        
        if (etherscanResponse.ok) {
          const etherscanData = await etherscanResponse.json();
          
          if (etherscanData.status === "1" && etherscanData.result?.length > 0) {
            // Calculate concentration of top holders
            const holders = etherscanData.result;
            const totalSupply = marketData.market_data?.total_supply || 0;
            const topTenHoldings = holders.slice(0, 10).reduce((sum, h) => sum + Number(h.TokenHolderQuantity), 0);
            
            const topTenPercentage = totalSupply > 0 ? (topTenHoldings / totalSupply) * 100 : 0;
            
            // Categorize holder distribution
            if (topTenPercentage > 80) {
              holderDistribution = "highly_concentrated";
            } else if (topTenPercentage > 50) {
              holderDistribution = "concentrated";
            } else if (topTenPercentage > 20) {
              holderDistribution = "moderate";
            } else {
              holderDistribution = "distributed";
            }
            
            // Check for locked liquidity
            const lockedLiquidityAddresses = holders.find(h => 
              h.TokenHolderAddress.toLowerCase().includes("lock") || 
              h.TokenHolderAddress.toLowerCase().includes("unicrypt") ||
              h.TokenHolderAddress.toLowerCase().includes("team.finance") ||
              h.TokenHolderAddress.toLowerCase().includes("dxsale")
            );
            
            if (lockedLiquidityAddresses) {
              liquidityLockedDays = 180; // Estimated lock time
            }
          }
        }
      } catch (error) {
        logStep("Etherscan holder analysis failed", error.message);
      }
    }
    
    // Try to get DEX depth from GeckoTerminal API (placeholder for now, future integration point)
    // Since GeckoTerminal doesn't have a direct public API, we'll derive from CoinGecko volume for now
    let dexDepthStatus = "low";
    if (tradingVolume > 1000000) {
      dexDepthStatus = "high";
    } else if (tradingVolume > 100000) {
      dexDepthStatus = "medium";
    }
    
    // Calculate liquidity score
    const liquidityFactors = {
      cexListings: Math.min(cexListings * 10, 100),
      tradingVolume: Math.min(Math.log10(tradingVolume + 1) * 10, 100),
      holderDistribution: holderDistribution === "distributed" ? 100 : 
                         holderDistribution === "moderate" ? 70 : 
                         holderDistribution === "concentrated" ? 40 : 20,
      liquidityLock: liquidityLockedDays > 90 ? 100 :
                    liquidityLockedDays > 30 ? 60 : 30,
      dexDepth: dexDepthStatus === "high" ? 100 :
               dexDepthStatus === "medium" ? 60 : 30
    };
    
    const score = calculateScore(liquidityFactors);
    
    return {
      cex_listings: cexListings,
      trading_volume_24h_usd: tradingVolume,
      holder_distribution: holderDistribution,
      liquidity_locked_days: liquidityLockedDays,
      dex_depth_status: dexDepthStatus,
      score,
      token_address: tokenAddress // Ensure token_address is included and normalized
    };
  } catch (error) {
    logStep("Liquidity data processing error", error.message);
    return {
      score: 0,
      error: error.message,
      cex_listings: 0,
      trading_volume_24h_usd: 0,
      holder_distribution: "unknown",
      liquidity_locked_days: 0,
      dex_depth_status: "unknown",
      token_address: normalizeTokenAddress(tokenData.token_address) // Ensure token_address is included and normalized
    };
  }
}

// Process tokenomics data from CoinGecko
async function processTokenomicsData(tokenData: any): Promise<any> {
  try {
    // Normalize token address
    const tokenAddress = normalizeTokenAddress(tokenData.token_address);
    
    // Check if we have recent data
    const hasRecentData = await isRecentScan(tokenAddress, "tokenomics");
    if (hasRecentData) {
      const { data, error } = await supabaseAdmin
        .from('token_tokenomics_cache')
        .select('*')
        .eq('token_address', tokenAddress)
        .single();
      
      if (!error && data) {
        logStep("Using cached tokenomics data", { token_address: tokenAddress });
        return data;
      }
    }
    
    const coinGeckoId = tokenData.coingecko_id;
    const apiKey = Deno.env.get("COINGECKO_API_KEY");
    
    if (!apiKey) throw new Error("CoinGecko API key not configured");
    if (!coinGeckoId) throw new Error("No CoinGecko ID available for token");
    
    // Get tokenomics data from CoinGecko
    logStep("Fetching tokenomics data from CoinGecko", { coingecko_id: coinGeckoId });
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinGeckoId}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-cg-pro-api-key": apiKey
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract tokenomics metrics
    const circulatingSupply = data.market_data?.circulating_supply || 0;
    const totalSupply = data.market_data?.total_supply || 0;
    const maxSupply = data.market_data?.max_supply || totalSupply;
    
    // Calculate distribution percentage
    const distributionPercentage = totalSupply > 0 ? (circulatingSupply / totalSupply) * 100 : 0;
    
    // Determine distribution score
    let distributionScore = "poor";
    if (distributionPercentage > 80) {
      distributionScore = "excellent";
    } else if (distributionPercentage > 50) {
      distributionScore = "good";
    } else if (distributionPercentage > 20) {
      distributionScore = "fair";
    }
    
    // Determine if token has a burn mechanism (analyze description)
    const burnMechanism = data.description?.en?.toLowerCase().includes("burn") || false;
    
    // Get TVL from CoinGecko
    let tvlUsd = 0;
    try {
      // For tokens that are also protocols (e.g., UNI), CoinGecko might have TVL data
      tvlUsd = data.market_data?.total_value_locked?.usd || 0;
      
      // If no TVL data available, use market cap as a proxy (less accurate)
      if (tvlUsd === 0) {
        tvlUsd = data.market_data?.market_cap?.usd || 0;
      }
    } catch (error) {
      logStep("TVL data fetch error", error.message);
    }
    
    // Treasury is harder to get accurately - would need DeFiLlama integration
    // For now, use an estimate based on market cap
    const treasuryUsd = tvlUsd * 0.1; // Placeholder estimate
    
    // Calculate tokenomics score
    const tokenomicsFactors = {
      circulationRatio: Math.min((distributionPercentage / 100) * 100, 100),
      supplyLimit: maxSupply > 0 ? 100 : 40,
      burnMechanism: burnMechanism ? 100 : 50,
      tvlRatio: Math.min(Math.log10(tvlUsd / 1000 + 1) * 20, 100),
      treasuryRatio: Math.min(Math.log10(treasuryUsd / 1000 + 1) * 20, 100)
    };
    
    const score = calculateScore(tokenomicsFactors);
    
    return {
      circulating_supply: circulatingSupply,
      supply_cap: maxSupply,
      distribution_score: distributionScore,
      vesting_schedule: "unknown", // Would require contract analysis
      burn_mechanism: burnMechanism,
      tvl_usd: tvlUsd,
      treasury_usd: treasuryUsd,
      score,
      token_address: tokenAddress // Ensure token_address is included and normalized
    };
  } catch (error) {
    logStep("Tokenomics data processing error", error.message);
    return {
      score: 0,
      error: error.message,
      circulating_supply: 0,
      supply_cap: 0,
      distribution_score: "unknown",
      vesting_schedule: "unknown",
      burn_mechanism: null,
      tvl_usd: 0,
      treasury_usd: 0,
      token_address: normalizeTokenAddress(tokenData.token_address) // Ensure token_address is included and normalized
    };
  }
}

// Process community data using Twitter/X data from Apify API via webhook
async function processCommunityData(tokenData: any): Promise<any> {
  try {
    // Normalize token address
    const tokenAddress = normalizeTokenAddress(tokenData.token_address);
    
    // Check if we have recent data
    const hasRecentData = await isRecentScan(tokenAddress, "community");
    if (hasRecentData) {
      const { data, error } = await supabaseAdmin
        .from('token_community_cache')
        .select('*')
        .eq('token_address', tokenAddress)
        .single();
      
      if (!error && data) {
        logStep("Using cached community data", { token_address: tokenAddress });
        return data;
      }
    }
    
    // We need a Twitter handle
    const twitterHandle = tokenData.twitter_handle;
    if (!twitterHandle) throw new Error("No Twitter handle available for token");
    
    logStep("Processing Twitter data for handle", { twitter_handle: twitterHandle });
    
    // Check if we have Twitter data in cache
    const { data: cachedTwitterData, error: twitterError } = await supabaseAdmin
      .from('twitter_profile_cache')
      .select('*')
      .eq('twitter_handle', twitterHandle.toLowerCase())
      .maybeSingle();
    
    let twitterData = null;
    
    // If cached data exists and is less than 7 days old, use it
    if (cachedTwitterData && !twitterError) {
      const lastUpdate = new Date(cachedTwitterData.last_updated);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceUpdate < 7) {
        twitterData = cachedTwitterData;
        logStep("Using cached Twitter data", { twitter_handle: twitterHandle });
      }
    }
    
    // If no valid cached data, fetch from Apify webhook
    if (!twitterData) {
      // Try to fetch from Make.com webhook for Twitter data
      try {
        const makeWebhookUrl = "https://hook.us1.make.com/mhus9uttupnwsd6rx3qemwnpwg41qc7y"; // Replace with real webhook if available
        const webhookResponse = await fetch(makeWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            endpoint: "user/info",
            parameters: {
              userName: twitterHandle.replace('@', '')
            }
          })
        });
        
        if (webhookResponse.ok) {
          const webhookData = await webhookResponse.json();
          
          if (webhookData && webhookData.followers_count) {
            // Store the Twitter data in cache
            const { error: insertError } = await supabaseAdmin
              .from('twitter_profile_cache')
              .upsert({
                twitter_handle: twitterHandle.toLowerCase(),
                followers_count: webhookData.followers_count,
                is_verified: webhookData.verified || false,
                growth_7d: webhookData.growth_7d || 0,
                last_updated: new Date().toISOString()
              });
            
            if (insertError) {
              logStep("Error caching Twitter data", insertError.message);
            }
            
            twitterData = {
              twitter_handle: twitterHandle,
              followers_count: webhookData.followers_count,
              is_verified: webhookData.verified || false,
              growth_7d: webhookData.growth_7d || 0
            };
          }
        }
      } catch (error) {
        logStep("Twitter data fetch error", error.message);
      }
    }
    
    // If we still don't have Twitter data, use placeholder values
    if (!twitterData) {
      twitterData = {
        twitter_handle: twitterHandle,
        followers_count: 0,
        is_verified: false,
        growth_7d: 0
      };
    }
    
    // Additional community metrics - we would need more APIs to get these accurately
    // For now, use estimates based on Twitter data
    const twitterFollowers = twitterData.followers_count;
    const twitterGrowth7d = twitterData.growth_7d;
    const twitterVerified = twitterData.is_verified;
    
    // Estimate other social metrics based on Twitter followers
    // These are rough estimates - real integration would use actual API data
    const telegramMembers = Math.floor(twitterFollowers * (0.5 + Math.random() * 0.5));
    const discordMembers = Math.floor(twitterFollowers * (0.3 + Math.random() * 0.4));
    
    // Determine active channels based on links in token data
    const activeChannels = ["twitter"];
    if (tokenData.website_url) activeChannels.push("website");
    if (tokenData.github_url) activeChannels.push("github");
    
    // Team visibility would require manual research
    // For now, use verified status as a proxy
    const teamVisibility = twitterVerified ? "public" : "anon";
    
    // Calculate community score
    const communityFactors = {
      twitterFollowers: Math.min(Math.log10(twitterFollowers + 1) * 20, 100),
      twitterGrowth: twitterGrowth7d > 10 ? 100 : twitterGrowth7d > 0 ? 70 : 40,
      verification: twitterVerified ? 100 : 50,
      telegramActivity: Math.min(Math.log10(telegramMembers + 1) * 20, 100),
      discordActivity: Math.min(Math.log10(discordMembers + 1) * 20, 100),
      channelDiversity: Math.min(activeChannels.length * 25, 100),
      teamTransparency: teamVisibility === "public" ? 100 : teamVisibility === "mixed" ? 60 : 30
    };
    
    const score = calculateScore(communityFactors);
    
    return {
      twitter_followers: twitterFollowers,
      twitter_growth_7d: twitterGrowth7d,
      twitter_verified: twitterVerified,
      telegram_members: telegramMembers,
      discord_members: discordMembers,
      active_channels: activeChannels,
      team_visibility: teamVisibility,
      score,
      token_address: tokenAddress // Ensure token_address is included and normalized
    };
  } catch (error) {
    logStep("Community data processing error", error.message);
    return {
      score: 0,
      error: error.message,
      twitter_followers: null,
      twitter_growth_7d: null,
      twitter_verified: null,
      telegram_members: null,
      discord_members: null,
      active_channels: [],
      team_visibility: "unknown",
      token_address: normalizeTokenAddress(tokenData.token_address) // Ensure token_address is included and normalized
    };
  }
}

// Process development data from GitHub
async function processDevelopmentData(tokenData: any): Promise<any> {
  try {
    // Normalize token address
    const tokenAddress = normalizeTokenAddress(tokenData.token_address);
    
    // Check if we have recent data
    const hasRecentData = await isRecentScan(tokenAddress, "development");
    if (hasRecentData) {
      const { data, error } = await supabaseAdmin
        .from('token_development_cache')
        .select('*')
        .eq('token_address', tokenAddress)
        .single();
      
      if (!error && data) {
        logStep("Using cached development data", { token_address: tokenAddress });
        return data;
      }
    }
    
    const githubUrl = tokenData.github_url;
    const apiKey = Deno.env.get("GITHUB_API_KEY");
    
    if (!apiKey) throw new Error("GitHub API key not configured");
    if (!githubUrl) throw new Error("No GitHub URL available for token");
    
    logStep("Processing GitHub data", { github_url: githubUrl });
    
    // Extract owner and repo from GitHub URL
    const urlParts = githubUrl.replace(/\/$/, "").split('/');
    const repoOwner = urlParts[urlParts.length - 2];
    const repoName = urlParts[urlParts.length - 1];
    
    if (!repoOwner || !repoName) throw new Error("Invalid GitHub repository URL");
    
    // Get repository information
    const repoResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}`,
      {
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    if (!repoResponse.ok) {
      throw new Error(`GitHub API error: ${repoResponse.status}`);
    }
    
    const repoData = await repoResponse.json();
    
    // Get commit activity for last 30 days
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/commits?per_page=100&since=${new Date(Date.now() - 30 * 86400000).toISOString()}`,
      {
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    if (!commitsResponse.ok) {
      throw new Error(`GitHub API error: ${commitsResponse.status}`);
    }
    
    const commitsData = await commitsResponse.json();
    const commits30d = commitsData.length;
    
    // Get contributors count
    const contributorsResponse = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/contributors?per_page=100`,
      {
        headers: {
          "Accept": "application/vnd.github+json",
          "Authorization": `Bearer ${apiKey}`
        }
      }
    );
    
    if (!contributorsResponse.ok) {
      throw new Error(`GitHub API error: ${contributorsResponse.status}`);
    }
    
    const contributorsData = await contributorsResponse.json();
    const contributorsCount = contributorsData.length;
    
    // Get last commit date
    const lastCommit = repoData.updated_at || null;
    
    // Check if repository is public
    const isOpenSource = !repoData.private;
    
    // Determine roadmap progress based on repo activity
    let roadmapProgress = "unknown";
    
    // Logic to determine roadmap progress based on repo stats
    const repoAge = new Date().getTime() - new Date(repoData.created_at).getTime();
    const repoAgeMonths = repoAge / (1000 * 60 * 60 * 24 * 30);
    
    if (repoAgeMonths > 12 && commits30d > 10 && contributorsCount > 5) {
      roadmapProgress = "mature";
    } else if ((repoAgeMonths > 6 && commits30d > 5) || contributorsCount > 3) {
      roadmapProgress = "active";
    } else {
      roadmapProgress = "early";
    }
    
    // Calculate development score
    const developmentFactors = {
      recentActivity: lastCommit ? (new Date().getTime() - new Date(lastCommit).getTime() < 30 * 86400000 ? 100 : 50) : 0,
      commitFrequency: Math.min(commits30d * 3, 100),
      contributorCount: Math.min(contributorsCount * 10, 100),
      openSource: isOpenSource ? 100 : 50,
      roadmapStatus: roadmapProgress === "mature" ? 100 : roadmapProgress === "active" ? 70 : 40
    };
    
    const score = calculateScore(developmentFactors);
    
    return {
      github_repo: `${repoOwner}/${repoName}`,
      is_open_source: isOpenSource,
      contributors_count: contributorsCount,
      commits_30d: commits30d,
      last_commit: lastCommit,
      roadmap_progress: roadmapProgress,
      score,
      token_address: tokenAddress // Ensure token_address is included and normalized
    };
  } catch (error) {
    logStep("Development data processing error", error.message);
    return {
      score: 0,
      error: error.message,
      github_repo: null,
      is_open_source: null,
      contributors_count: 0,
      commits_30d: 0,
      last_commit: null,
      roadmap_progress: "unknown",
      token_address: normalizeTokenAddress(tokenData.token_address) // Ensure token_address is included and normalized
    };
  }
}

// Resolve token info from address or symbol
async function resolveTokenInfo(tokenInput: string): Promise<any> {
  try {
    const apiKey = Deno.env.get("COINGECKO_API_KEY");
    
    if (!apiKey) throw new Error("CoinGecko API key not configured");
    
    // Check if input is an Ethereum address
    const isAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenInput);
    const normalizedInput = tokenInput.toLowerCase();
    
    if (isAddress) {
      logStep("Searching token by contract address", { address: normalizedInput });
      // Search by contract address
      const response = await fetch(
        `https://api.coingecko.com/api/v3/coins/ethereum/contract/${normalizedInput}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-cg-pro-api-key": apiKey
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        token_address: normalizedInput,
        name: data.name || "N/A",
        symbol: data.symbol?.toUpperCase() || "N/A",
        description: data.description?.en?.substring(0, 500) || "N/A",
        logo_url: data.image?.large || null,
        coingecko_id: data.id,
        twitter_handle: data.links?.twitter_screen_name || null,
        github_url: data.links?.repos_url?.github?.[0] || null,
        website_url: data.links?.homepage?.[0] || null,
        launch_date: data.genesis_date || null
      };
    } else {
      logStep("Searching token by name/symbol", { input: normalizedInput });
      // Search by symbol or name
      const searchResponse = await fetch(
        `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(normalizedInput)}`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-cg-pro-api-key": apiKey
          }
        }
      );
      
      if (!searchResponse.ok) {
        throw new Error(`CoinGecko API error: ${searchResponse.status}`);
      }
      
      const searchData = await searchResponse.json();
      const coin = searchData.coins?.[0];
      
      if (!coin) {
        throw new Error("No token found with the provided name/symbol");
      }
      
      // Now get detailed info
      const detailResponse = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coin.id}?localization=false&tickers=false&market_data=true&community_data=false`,
        {
          headers: {
            "Content-Type": "application/json",
            "x-cg-pro-api-key": apiKey
          }
        }
      );
      
      if (!detailResponse.ok) {
        throw new Error(`CoinGecko API error: ${detailResponse.status}`);
      }
      
      const detailData = await detailResponse.json();
      
      // Get price data from market data
      const currentPrice = detailData.market_data?.current_price?.usd;
      const marketCap = detailData.market_data?.market_cap?.usd;
      
      // Create normalized token address for Ethereum tokens
      let tokenAddress = detailData.platforms?.ethereum;
      if (!tokenAddress) {
        // Generate a placeholder address if actual address is not available
        tokenAddress = `0x${coin.id.replace(/-/g, '')}`.slice(0, 42).toLowerCase();
      } else {
        tokenAddress = tokenAddress.toLowerCase();
      }
      
      return {
        token_address: tokenAddress,
        name: detailData.name || "N/A",
        symbol: detailData.symbol?.toUpperCase() || "N/A",
        description: detailData.description?.en?.substring(0, 500) || "N/A",
        logo_url: detailData.image?.large || null,
        coingecko_id: detailData.id,
        twitter_handle: detailData.links?.twitter_screen_name || null,
        github_url: detailData.links?.repos_url?.github?.[0] || null,
        website_url: detailData.links?.homepage?.[0] || null,
        launch_date: detailData.genesis_date || null,
        current_price_usd: currentPrice || null,
        market_cap_usd: marketCap || null
      };
    }
  } catch (error) {
    logStep("Token resolution error", error.message);
    // If API fails, return basic info based on input
    const normalizedInput = tokenInput.toLowerCase();
    
    return {
      token_address: /^0x[a-fA-F0-9]{40}$/.test(normalizedInput) 
        ? normalizedInput 
        : `0x${normalizedInput.replace(/[^a-zA-Z0-9]/g, "").padEnd(40, "0")}`.toLowerCase(),
      name: tokenInput,
      symbol: tokenInput.slice(0, 5).toUpperCase(),
      coingecko_id: null,
      logo_url: null,
      description: "N/A",
      twitter_handle: null,
      github_url: null,
      website_url: null,
      launch_date: null,
      current_price_usd: null,
      market_cap_usd: null
    };
  }
}

// Fixed increment function to use numbers instead of RPC
async function incrementScansUsed(userId: string, incrementBy: number): Promise<number> {
  try {
    // Get current scans_used value
    const { data: subscriber, error: getError } = await supabaseAdmin
      .from("subscribers")
      .select("scans_used")
      .eq("id", userId)
      .single();
    
    if (getError) {
      throw new Error(`Failed to get subscriber data: ${getError.message}`);
    }
    
    // Calculate new value
    const currentScansUsed = subscriber?.scans_used || 0;
    const newScansUsed = currentScansUsed + incrementBy;
    
    // Update the record
    const { error: updateError } = await supabaseAdmin
      .from("subscribers")
      .update({ scans_used: newScansUsed })
      .eq("id", userId);
    
    if (updateError) {
      throw new Error(`Failed to update scans_used: ${updateError.message}`);
    }
    
    return newScansUsed;
  } catch (error) {
    logStep("Error incrementing scans_used", error.message);
    return 0;
  }
}

// Check if user has access to perform scan
async function checkScanAccess(userId: string): Promise<{ allowed: boolean; reason: string; plan: string }> {
  try {
    // Get user's subscription data
    const { data: subscriber, error: subscriberError } = await supabaseAdmin
      .from("subscribers")
      .select("*")
      .eq("id", userId)
      .single();
    
    if (subscriberError) {
      throw new Error(`Failed to retrieve subscriber data: ${subscriberError.message}`);
    }
    
    const plan = subscriber?.plan || "free";
    const scansUsed = subscriber?.scans_used || 0;
    const scanLimit = plan === "pro" ? (subscriber?.pro_scan_limit || 10) : 3;
    
    if (scansUsed >= scanLimit) {
      return {
        allowed: false,
        reason: `You've reached your ${plan} scan limit (${scansUsed}/${scanLimit})`,
        plan
      };
    }
    
    return {
      allowed: true,
      reason: "Scan allowed",
      plan
    };
  } catch (error) {
    logStep("Scan access check error", error.message);
    return {
      allowed: false,
      reason: `Error checking scan access: ${error.message}`,
      plan: "unknown"
    };
  }
}

// Main handler function
serve(async (req: Request) => {
  // Handle preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }
  
  try {
    // Parse request body
    const body = await req.json();
    const { token_address, user_id, coingecko_id } = body;
    
    if (!token_address) {
      throw new Error("Token address is required");
    }
    
    if (!user_id) {
      throw new Error("User ID is required");
    }
    
    // Normalize token address to lowercase
    const normalizedTokenAddress = normalizeTokenAddress(token_address);
    
    logStep("Starting token scan", { 
      token_address: normalizedTokenAddress, 
      user_id,
      coingecko_id: coingecko_id || "not provided" 
    });
    
    // Check if user has access to perform scan
    const accessCheck = await checkScanAccess(user_id);
    
    if (!accessCheck.allowed) {
      return new Response(
        JSON.stringify({
          allowed: false,
          reason: accessCheck.reason,
          plan: accessCheck.plan
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }
    
    // Check if token already exists in the database
    const { data: existingToken } = await supabaseAdmin
      .from("token_data_cache")
      .select("*")
      .eq("token_address", normalizedTokenAddress)
      .maybeSingle();
    
    // Get token info - either from cache or by resolving from APIs
    let tokenInfo;
    if (existingToken) {
      tokenInfo = existingToken;
      logStep("Found token in cache", { token_address: tokenInfo.token_address });
    } else {
      // If coingecko_id is provided, use it for better resolution
      tokenInfo = await resolveTokenInfo(coingecko_id || token_address);
      
      // Ensure the token address is set to the one we received (if originally from coingecko_id)
      if (tokenInfo && normalizedTokenAddress) {
        tokenInfo.token_address = normalizedTokenAddress;
      }
      
      // Store token info in the database
      const { error: insertError } = await supabaseAdmin
        .from("token_data_cache")
        .insert({
          ...tokenInfo,
          token_address: normalizeTokenAddress(tokenInfo.token_address)
        });
      
      if (insertError) {
        logStep("Error storing token info", insertError.message);
        // Don't fail the entire scan if this fails
      } else {
        logStep("Stored token info in database", { token_address: tokenInfo.token_address });
      }
    }
    
    // Process security data
    logStep("Processing security data");
    const securityData = await processSecurityData(tokenInfo.token_address);
    
    // Store security data in database
    const { error: securityError } = await supabaseAdmin
      .from("token_security_cache")
      .upsert({
        ...securityData,
        token_address: normalizeTokenAddress(tokenInfo.token_address),
        updated_at: new Date().toISOString()
      });
    
    if (securityError) {
      logStep("Error storing security data", securityError.message);
    }
    
    // Process liquidity data
    logStep("Processing liquidity data");
    const liquidityData = await processLiquidityData(tokenInfo);
    
    // Store liquidity data in database
    const { error: liquidityError } = await supabaseAdmin
      .from("token_liquidity_cache")
      .upsert({
        ...liquidityData,
        token_address: normalizeTokenAddress(tokenInfo.token_address),
        updated_at: new Date().toISOString()
      });
    
    if (liquidityError) {
      logStep("Error storing liquidity data", liquidityError.message);
    }
    
    // Process tokenomics data
    logStep("Processing tokenomics data");
    const tokenomicsData = await processTokenomicsData(tokenInfo);
    
    // Store tokenomics data in database
    const { error: tokenomicsError } = await supabaseAdmin
      .from("token_tokenomics_cache")
      .upsert({
        ...tokenomicsData,
        token_address: normalizeTokenAddress(tokenInfo.token_address),
        updated_at: new Date().toISOString()
      });
    
    if (tokenomicsError) {
      logStep("Error storing tokenomics data", tokenomicsError.message);
    }
    
    // Process community data
    logStep("Processing community data");
    const communityData = await processCommunityData(tokenInfo);
    
    // Store community data in database
    const { error: communityError } = await supabaseAdmin
      .from("token_community_cache")
      .upsert({
        ...communityData,
        token_address: normalizeTokenAddress(tokenInfo.token_address),
        updated_at: new Date().toISOString()
      });
    
    if (communityError) {
      logStep("Error storing community data", communityError.message);
    }
    
    // Process development data
    logStep("Processing development data");
    const developmentData = await processDevelopmentData(tokenInfo);
    
    // Store development data in database
    const { error: developmentError } = await supabaseAdmin
      .from("token_development_cache")
      .upsert({
        ...developmentData,
        token_address: normalizeTokenAddress(tokenInfo.token_address),
        updated_at: new Date().toISOString()
      });
    
    if (developmentError) {
      logStep("Error storing development data", developmentError.message);
    }
    
    // Calculate overall score
    const scores = [
      securityData.score,
      liquidityData.score,
      tokenomicsData.score,
      communityData.score,
      developmentData.score
    ].filter(score => score !== null && score !== undefined);
    
    const overallScore = scores.length > 0
      ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
      : 0;
    
    // Store scan record
    const { error: scanError } = await supabaseAdmin
      .from("token_scans")
      .insert({
        user_id,
        token_address: normalizeTokenAddress(tokenInfo.token_address),
        score_total: overallScore,
        pro_scan: accessCheck.plan === "pro",
        scanned_at: new Date().toISOString()
      });
    
    if (scanError) {
      logStep("Error storing scan record", scanError.message);
    }
    
    // Increment the user's scans_used count using our fixed function
    await incrementScansUsed(user_id, 1);
    
    // Prepare response
    const response = {
      allowed: true,
      token_info: {
        ...tokenInfo,
        token_address: normalizeTokenAddress(tokenInfo.token_address),
        // Add price and market cap if available
        current_price_usd: tokenInfo.current_price_usd || 0,
        market_cap_usd: tokenInfo.market_cap_usd || 0
      },
      security: {
        ...securityData,
        // Remove raw data from response
        raw_data: undefined
      },
      liquidity: liquidityData,
      tokenomics: tokenomicsData,
      community: communityData,
      development: developmentData,
      score_total: overallScore
    };
    
    logStep("Scan completed successfully", { 
      token_address: tokenInfo.token_address, 
      score: overallScore,
      token_name: tokenInfo.name,
      token_symbol: tokenInfo.symbol
    });
    
    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    logStep("Scan error", error.message);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        allowed: false
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
