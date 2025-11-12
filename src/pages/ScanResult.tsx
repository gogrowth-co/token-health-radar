import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TokenProfile from "@/components/TokenProfile";
import CategoryTabs from "@/components/CategoryTabs";
import CategoryScoresGrid from "@/components/CategoryScoresGrid";
import ScanLimitIndicator from "@/components/ScanLimitIndicator";
import UpgradeModal from "@/components/UpgradeModal";
import RefreshScanButton from "@/components/RefreshScanButton";
import GenerateReportButton from "@/components/GenerateReportButton";
import TestSocialLinksButton from "@/components/TestSocialLinksButton";
import CopilotPanel from "@/components/copilot/CopilotPanel";
import { isMcpEnabled } from "@/lib/config/mcp-config";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { checkUserHasProAccess } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { normalizeChainId } from "@/utils/tokenCacheUtils";
import { getChainConfigByMoralisId } from "../../supabase/functions/_shared/chainConfig";

enum ScanCategory {
  Security = "security",
  Tokenomics = "tokenomics", 
  Liquidity = "liquidity",
  Community = "community",
  Development = "development"
}

export default function ScanResult() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const { isAdmin } = useUserRole();
  const [scanData, setScanData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ScanCategory>(ScanCategory.Security);
  const [scanLimitData, setScanLimitData] = useState<any>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Get parameters from URL - support both formats and chain with normalization
  const tokenFromParam = searchParams.get("token") || "";
  const addressFromParam = searchParams.get("address") || "";
  const tokenAddress = tokenFromParam || addressFromParam; // Use token param first, fallback to address
  const chainId = normalizeChainId(searchParams.get("chain") || "0x1"); // Normalize chain ID
  const coinGeckoId = searchParams.get("id") || "";
  const isLimited = searchParams.get("limited") === "true";

  console.log("ScanResult: URL params:", {
    token: tokenFromParam,
    address: addressFromParam,
    finalTokenAddress: tokenAddress,
    rawChain: searchParams.get("chain"),
    normalizedChainId: chainId,
    coinGeckoId,
    isLimited
  });

  // Check user's scan access status
  useEffect(() => {
    const checkScanAccess = async () => {
      if (isAuthenticated) {
        try {
          const accessData = await checkUserHasProAccess();
          setScanLimitData(accessData);
        } catch (error) {
          console.error("Error checking scan access:", error);
        }
      }
    };

    checkScanAccess();
  }, [isAuthenticated]);

  useEffect(() => {
    const loadScanData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("ScanResult: Loading data for token:", tokenAddress, "Chain:", chainId, "CoinGecko ID:", coinGeckoId);
        
        if (!tokenAddress) {
          console.error("ScanResult: No token address found in URL params");
          setError("No token address provided");
          return;
        }

        console.log("ScanResult: User authenticated:", isAuthenticated, "User ID:", user?.id);

        // Load scan data from database with chain support
        try {
          // First try to get token data - this is the primary table with chain support
          const { data: tokenData, error: tokenError } = await supabase
            .from('token_data_cache')
            .select('*')
            .eq('token_address', tokenAddress)
            .eq('chain_id', chainId)
            .maybeSingle();

          if (tokenError) {
            console.error("[DB] token_data_cache query failed:", tokenError);
            throw new Error(`Failed to load token data: ${tokenError.message}`);
          }

          if (!tokenData) {
            console.warn("[DB] No token data found for address:", tokenAddress, "chain:", chainId);
            
            // Try fallback to localStorage
            const selectedTokenData = localStorage.getItem("selectedToken");
            if (selectedTokenData) {
              try {
                const selectedToken = JSON.parse(selectedTokenData);
                if (selectedToken.address === tokenAddress || selectedToken.id === coinGeckoId) {
                  console.log("ScanResult: Using fallback data from localStorage");
                  setScanData({
                    success: true,
                    token_address: tokenAddress,
                    chain_id: chainId,
                    overall_score: 0,
                    token_info: {
                      name: selectedToken.name,
                      symbol: selectedToken.symbol,
                      logo_url: selectedToken.logo,
                      current_price_usd: selectedToken.price_usd || 0,
                      price_change_24h: selectedToken.price_change_24h || 0,
                      market_cap_usd: selectedToken.market_cap_usd || 0,
                      coingecko_id: selectedToken.id,
                      description: `${selectedToken.name} (${selectedToken.symbol})`,
                      website_url: "",
                      twitter_handle: "",
                      github_url: ""
                    },
                    security: { score: 0, token_address: tokenAddress, chain_id: chainId },
                    tokenomics: { score: 0, token_address: tokenAddress, chain_id: chainId },
                    liquidity: { score: 0, token_address: tokenAddress, chain_id: chainId },
                    development: { score: 0, token_address: tokenAddress, chain_id: chainId },
                    community: { score: 0, token_address: tokenAddress, chain_id: chainId }
                  });
                  setLoading(false);
                  return;
                }
              } catch (e) {
                console.error("Error parsing selectedToken from localStorage:", e);
              }
            }
            
            setError("Token not found. Please try scanning the token again.");
            setLoading(false);
            return;
          }

          console.log("[DB] Token data found:", tokenData);

          // Now load all cache data with chain support
          const cacheQueries = [
            { name: 'security', query: supabase.from('token_security_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle() },
            { name: 'tokenomics', query: supabase.from('token_tokenomics_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle() },
            { name: 'liquidity', query: supabase.from('token_liquidity_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle() },
            { name: 'development', query: supabase.from('token_development_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle() },
            { name: 'community', query: supabase.from('token_community_cache').select('*').eq('token_address', tokenAddress).eq('chain_id', chainId).maybeSingle() }
          ];

          const cacheResults = await Promise.allSettled(cacheQueries.map(q => q.query));
          
          // Process cache results with proper error handling
          const cacheData: any = {};
          let hasValidScores = false;
          
          cacheResults.forEach((result, index) => {
            const cacheName = cacheQueries[index].name;
            
            if (result.status === 'rejected') {
              console.error(`[DB] ${cacheName} cache query failed:`, result.reason);
              cacheData[cacheName] = { score: 0, token_address: tokenAddress, chain_id: chainId };
            } else {
              const { data, error } = result.value;
              if (error) {
                console.error(`[DB] ${cacheName} cache error:`, error);
                cacheData[cacheName] = { score: 0, token_address: tokenAddress, chain_id: chainId };
              } else {
                cacheData[cacheName] = data || { score: 0, token_address: tokenAddress, chain_id: chainId };
                if (data && data.score && data.score > 0) {
                  hasValidScores = true;
                }
              }
            }
          });

          // Calculate overall score from valid scores only
          const scores = [
            cacheData.security?.score || 0,
            cacheData.tokenomics?.score || 0,
            cacheData.liquidity?.score || 0,
            cacheData.development?.score || 0,
            cacheData.community?.score || 0
          ].filter(score => score > 0);
          
          const overallScore = scores.length > 0 
            ? Math.round(scores.reduce((acc, curr) => acc + curr, 0) / scores.length)
            : 0;

          console.log("ScanResult: Calculated overall score:", overallScore, "from scores:", scores);
          
          setScanData({
            success: true,
            token_address: tokenAddress,
            chain_id: chainId,
            overall_score: overallScore,
            token_info: tokenData,
            lastUpdated: tokenData.created_at, // Use token data timestamp as last updated
            security: cacheData.security,
            tokenomics: cacheData.tokenomics,
            liquidity: cacheData.liquidity,
            development: cacheData.development,
            community: cacheData.community,
          });
          
        } catch (dbError) {
          console.error("ScanResult: Database query error:", dbError);
          setError(dbError instanceof Error ? dbError.message : "Failed to load scan data from database");
        }

        setLoading(false);
      } catch (error) {
        console.error("ScanResult: Error loading scan data:", error);
        setError(error instanceof Error ? error.message : "Failed to load scan results");
        setLoading(false);
      }
    };

    loadScanData();
  }, [tokenAddress, chainId, coinGeckoId]); // Removed user and isAuthenticated to prevent unnecessary reloads

  const handleCategoryChange = (category: ScanCategory) => {
    setActiveTab(category);
  };

  const handleCategoryClick = (categoryName: string) => {
    const category = categoryName as ScanCategory;
    setActiveTab(category);
  };

  // Determine isPro based on user status and scan limits
  const isPro = () => {
    if (!isAuthenticated) return false; // Anonymous users never get Pro view
    if (isLimited) return false; // Explicitly limited
    if (!scanLimitData) return true; // Default to Pro if no limit data (safety)
    return scanLimitData.hasPro; // Use the actual check result
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className={isMobile ? "text-sm" : "text-base"}>Loading scan results...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !scanData) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className={`w-full ${isMobile ? 'max-w-sm' : 'max-w-md'} text-center space-y-6`}>
            <div className="flex flex-col items-center">
              <div className={`${isMobile ? 'w-16 h-16' : 'w-20 h-20'} rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4`}>
                <AlertCircle className={`${isMobile ? 'h-8 w-8' : 'h-10 w-10'} text-red-500`} />
              </div>
              <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-bold`}>Failed to load scan results</h1>
              <p className={`text-muted-foreground mt-2 ${isMobile ? 'text-sm' : 'text-base'}`}>
                {error || "Token scan data not available."}
              </p>
              
              <div className={`flex ${isMobile ? 'flex-col w-full' : 'flex-row'} gap-4 mt-6`}>
                <Button variant="outline" onClick={() => navigate("/")} className={isMobile ? 'w-full' : ''}>
                  Back to Search
                </Button>
                <Button onClick={() => window.location.reload()} className={isMobile ? 'w-full' : ''}>
                  Retry
                </Button>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const tokenInfo = scanData.token_info;

  // Display logic: use DB values, fallback to empty string/0 if not found
  const properName = tokenInfo?.name || "";
  const properSymbol = tokenInfo?.symbol || "";
  const properLogo = tokenInfo?.logo_url || "/placeholder.svg";
  const properWebsite = tokenInfo?.website_url || "";
  const properTwitter = tokenInfo?.twitter_handle
    ? `https://twitter.com/${tokenInfo.twitter_handle}`
    : "";
  const properGithub = tokenInfo?.github_url || "";
  const properPrice = typeof tokenInfo?.current_price_usd === "number"
    ? tokenInfo.current_price_usd : 0;
  const properPriceChange = typeof tokenInfo?.price_change_24h === "number"
    ? tokenInfo.price_change_24h : 0;
  const properMarketCap = typeof tokenInfo?.market_cap_usd === "number"
    ? tokenInfo.market_cap_usd.toString() : "0";
  
  // Use database description, but ensure it's formal/informative (client-side guard)
  const properDescription = (tokenInfo?.description || "").toString();

  // Special override for PENDLE token
  const pendleDescription = "Pendle is a cross-chain compatible ERC20 token designed to offer fixed yields and control over yield exposure. It allows users to lock their PENDLE tokens for a stake in the protocol, providing opportunities for high returns or fixed yields.";
  const isPendleToken = properSymbol?.toUpperCase() === 'PENDLE' || properName?.toLowerCase().includes('pendle');
  const finalDescription = isPendleToken ? pendleDescription : properDescription;

  // Heuristic: detect marketing/tagline style or generic descriptions
  const isTaglineStyle = (text: string): boolean => {
    if (!text) return true;
    if (text.length < 50) return true; // Very short descriptions are likely taglines

    const lower = text.toLowerCase();

    // Generic patterns to detect
    const genericPatterns = [
      /is a (token|cryptocurrency|digital asset|crypto token)/i,
      /^[^.]+\s+(token|coin)\s+on\s+\w+\.?$/i,
      /is a digital (currency|asset|token)/i,
      /cryptocurrency\s+token\.?$/i,
      /^[A-Z0-9]+\s+is\s+the\s+native\s+token/i,
      /is\s+an?\s+(ERC-20|BEP-20|token)\s+on\s+/i,
    ];

    const isGenericPattern = genericPatterns.some(pattern => pattern.test(text));
    if (isGenericPattern) return true;

    const marketingPhrases = [
      'for everyone','warp speed','supercharge','unlock the future',
      'next-gen solution','seamless experience', 'game-changing',
      'cutting-edge', 'breakthrough', 'revolutionary'
    ];

    // Only consider it a tagline if it's very short AND has marketing phrases
    const sentenceCount = (text.match(/[.!?]/g) || []).length;
    const hasMarketingPhrase = marketingPhrases.some(p => lower.includes(p));
    const wordCount = text.split(/\s+/).length;

    return (text.length < 80 && (sentenceCount <= 1 || hasMarketingPhrase)) || wordCount < 15;
  };

  const formatCompactUSD = (n: number) => {
    if (!Number.isFinite(n)) return '';
    if (n >= 1e9) return `$${(n/1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n/1e6).toFixed(2)}M`;
    if (n >= 1e3) return `$${(n/1e3).toFixed(2)}k`;
    return `$${n.toFixed(4)}`;
  };

  // Get chain configuration for proper network display
  const chainConfig = getChainConfigByMoralisId(chainId);
  const chainName = chainConfig?.name || "Ethereum";

  // Curated, purpose-first overrides for known tokens
  const curatedDescriptionOverride = (() => {
    const map: Record<string, string> = {
      // Top DeFi protocols
      "0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9": "Aave is a decentralized lending protocol where users can lend and borrow cryptocurrencies. AAVE token holders can stake their tokens for protocol security and governance.",
      "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "Uniswap is a decentralized exchange protocol that uses automated market makers (AMMs) instead of traditional order books. UNI is its governance token.",
      "0x6b175474e89094c44da98b954eedeac495271d0f": "Dai is a decentralized stablecoin pegged to the US dollar, maintained by the MakerDAO protocol through collateralized debt positions.",
      "0x514910771af9ca656af840dff83e8264ecf986ca": "Chainlink provides decentralized oracle networks that connect smart contracts to real-world data, enabling secure and reliable off-chain data access.",
      "0x0d8775f648430679a709e98d2b0cb6250d2887ef": "Basic Attention Token powers the Brave browser ecosystem, rewarding users for viewing privacy-respecting ads and enabling content creator monetization.",

      // Stablecoins
      "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USD Coin (USDC) is a fully-backed stablecoin pegged 1:1 to the US dollar, issued by Circle and regulated under US money transmission laws.",
      "0xdac17f958d2ee523a2206206994597c13d831ec7": "Tether (USDT) is the largest stablecoin by market cap, pegged to the US dollar and widely used for trading and cross-border transactions.",

      // Layer 2 & Infrastructure
      "0x4200000000000000000000000000000000000006": "Wrapped Ether (WETH) on Base is an ERC-20 compatible version of ETH, enabling it to be used in DeFi protocols and smart contracts.",
      "0x912ce59144191c1204e64559fe8253a0e49e6548": "Arbitrum (ARB) is the governance token for Arbitrum One, a leading Ethereum Layer 2 scaling solution using optimistic rollups.",
      "0x0b2c639c533813f4aa9d7837caf62653d097ff85": "USD Coin on Optimism - bridged version of USDC on the Optimism Layer 2 network for faster and cheaper transactions.",

      // ZK & Privacy
      "0x6bef15d938d4e72056ac92ea4bdd0d76b1c4ad29": "Succinct (PROVE) is an ERC‑20 on Ethereum powering SP1's decentralized prover network for fast zero-knowledge proofs.",

      // Yield & Derivatives
      "0x808507121b80c02388fad14726482e061b8da827": "Pendle enables users to tokenize and trade future yield, separating ownership of the principal and yield components of yield-bearing tokens.",
      "0x9d65ff81a3c488d585bbfb0bfe3c7707c7917f54": "SSV Network provides distributed validator technology for Ethereum staking, enabling resilient and secure validator operations.",

      // Meme tokens (brief but accurate)
      "0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce": "Shiba Inu (SHIB) is an Ethereum-based meme token with a large community and expanding DeFi ecosystem including ShibaSwap DEX."
    };
    return map[tokenAddress.toLowerCase()] || "";
  })();

  const displayDescription = (() => {
    const truncate = (s: string, max = 180) => (s.length <= max ? s : s.slice(0, max - 1).trimEnd() + '…');

    // If we have a curated override, use it
    if (curatedDescriptionOverride) {
      const finalText = truncate(curatedDescriptionOverride, 180);
      console.log('ScanResult: Using curated description:', finalText);
      return finalText;
    }

    // If we have a database description that's meaningful, use it
    if (finalDescription && finalDescription.length > 50 && !isTaglineStyle(finalDescription)) {
      const finalText = truncate(finalDescription, 180);
      console.log('ScanResult: Using database description:', finalText);
      return finalText;
    }

    // Fallback to generated description

    const sec: any = scanData.security || {};

    const bits: string[] = [];
    if (sec.contract_verified === true) bits.push('Verified contract');
    if (sec.honeypot_detected === false) bits.push('No honeypot');
    if (sec.freeze_authority === false) bits.push('No freeze');
    if (sec.ownership_renounced === true) bits.push('Renounced');

    const mc = parseFloat(properMarketCap.replace(/[^0-9.]/g, "")) || 0;
    const market: string[] = [];
    if (properPrice && properPrice > 0) market.push(formatCompactUSD(properPrice));
    if (mc > 0) market.push(`MC ${formatCompactUSD(mc)}`);

    const details = [bits.join(' · '), market.join(' · ')].filter(Boolean).join(' | ');
    const base = `${properName} (${properSymbol}) on ${chainName}`;
    const composed = details ? `${base}: ${details}` : base;

    const finalText = truncate(composed, 180);
    console.log('ScanResult: Using generated description:', finalText);
    return finalText;
  })();

  const networkName = chainConfig?.name === "Base" ? "BASE" : (chainConfig?.name === "Arbitrum" ? "ARB" : "ETH");
  // Use the calculated overall score from the scan data
  const overallScore = scanData.overall_score || 0;

  console.log("ScanResult: Using description from database:", properDescription.substring(0, 50) + '...');

  console.log("ScanResult: Displaying scores:", {
    overall: overallScore,
    security: scanData.security?.score,
    tokenomics: scanData.tokenomics?.score,
    liquidity: scanData.liquidity?.score,
    community: scanData.community?.score,
    development: scanData.development?.score
  });

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className={`flex-1 container px-4 ${isMobile ? 'py-4 pb-32' : 'py-8 pb-24'}`}>
        <div className={`${isMobile ? 'max-w-full' : 'max-w-6xl'} mx-auto space-y-${isMobile ? '6' : '8'}`}>
          {/* Show scan limit indicator for authenticated users */}
          {isAuthenticated && scanLimitData && (
            <ScanLimitIndicator
              scansUsed={scanLimitData.scansUsed || 0}
              scanLimit={scanLimitData.scanLimit || 3}
              plan={scanLimitData.plan || 'free'}
              className="mb-4"
            />
          )}

          {/* Admin Controls - Generate Report & Refresh Scan */}
          {isAdmin && (
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                🛠️ Admin Controls
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <RefreshScanButton 
                  tokenAddress={tokenAddress}
                  chainId={chainId}
                  className="flex-1"
                />
                <GenerateReportButton 
                  tokenAddress={tokenAddress}
                  chainId={chainId}
                  className="flex-1"
                />
                <TestSocialLinksButton />
              </div>
            </div>
          )}

          <TokenProfile
            name={properName}
            symbol={properSymbol}
            logo={properLogo}
            address={tokenAddress}
            website={properWebsite}
            twitter={properTwitter}
            github={properGithub}
            price={properPrice}
            priceChange={properPriceChange}
            marketCap={properMarketCap}
            overallScore={overallScore}
            description={finalDescription || displayDescription}
            network={networkName}
            chainId={chainId}
          />

          {/* Update Frequency Note */}
          {scanData?.lastUpdated && (
            <div className="mb-6 text-center">
              <p className="text-muted-foreground text-sm">
                Generated on {new Date(scanData.lastUpdated).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'numeric', 
                  day: 'numeric' 
                })} | Updated Weekly | Last Updated: {new Date(scanData.lastUpdated).toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          )}

          {/* CoinGecko MCP Copilot Panel */}
          {isMcpEnabled() && (
            <CopilotPanel 
              token={{
                chain: chainId,
                address: tokenAddress,
                coingeckoId: tokenInfo?.coingecko_id || coinGeckoId,
                symbol: properSymbol
              }}
            />
          )}

          <CategoryScoresGrid
            securityScore={scanData.security?.score || 0}
            tokenomicsScore={scanData.tokenomics?.score || 0}
            liquidityScore={scanData.liquidity?.score || 0}
            communityScore={scanData.community?.score || 0}
            developmentScore={scanData.development?.score || 0}
            onCategoryClick={handleCategoryClick}
          />

          <CategoryTabs
            activeTab={activeTab}
            securityData={scanData.security}
            liquidityData={scanData.liquidity}
            tokenomicsData={scanData.tokenomics}
            tokenDataCache={scanData.token_info}
            communityData={scanData.community}
            developmentData={scanData.development}
            isPro={isPro()}
            onCategoryChange={handleCategoryChange}
          />
        </div>
      </main>

      {/* Sticky CTA at bottom for non-pro users */}
      {!isPro() && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-4 z-50">
          <div className="container mx-auto max-w-6xl">
            <div className={`flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
              <div className={`${isMobile ? 'text-center' : 'flex-1'}`}>
                <p className={`${isMobile ? 'text-sm' : 'text-sm'} font-medium text-gray-900 dark:text-white`}>
                  {!isAuthenticated 
                    ? "Want the full picture? Create a free account to unlock detailed risk insights."
                    : "Upgrade to Pro for unlimited detailed scans and advanced features."
                  }
                </p>
              </div>
              <Button 
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/auth');
                  } else {
                    setShowUpgradeModal(true);
                  }
                }}
                className={`${isMobile ? 'w-full' : 'ml-4'}`}
                size={isMobile ? 'lg' : 'default'}
              >
                {!isAuthenticated ? 'Create Free Account' : 'Upgrade to Pro'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        scansUsed={scanLimitData?.scansUsed || 0}
        scanLimit={scanLimitData?.scanLimit || 3}
        plan={scanLimitData?.plan || 'free'}
        isAnonymous={!isAuthenticated}
      />

      <Footer />
    </div>
  );
}
