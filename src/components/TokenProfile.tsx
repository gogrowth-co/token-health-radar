
import { Globe, Github, Twitter } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import * as React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import OptimizedTokenLogo from "@/components/OptimizedTokenLogo";

// Mini health score widget with better visibility for dark and light themes
function MiniHealthScore({ score = 0 }: { score: number }) {
  const isMobile = useIsMobile();
  const size = isMobile ? 43 : 58; // 20% bigger: 36*1.2=43, 48*1.2=58
  const radius = isMobile ? 19 : 26; // 20% bigger: 16*1.2=19, 22*1.2=26
  const cx = size / 2;
  const cy = size / 2;
  const angle = 220;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (angle / 360) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#232334"
          strokeWidth={isMobile ? 3.6 : 4.8} // 20% bigger: 3*1.2=3.6, 4*1.2=4.8
          style={{ transition: "stroke-dasharray 0.3s" }}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={isMobile ? 3.6 : 4.8} // 20% bigger: 3*1.2=3.6, 4*1.2=4.8
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={circumference * 0.2}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.3s" }}
        />
        <text
          x="50%"
          y="56%"
          textAnchor="middle"
          fontSize={isMobile ? "14.4" : "19.2"} // 20% bigger: 12*1.2=14.4, 16*1.2=19.2
          fontWeight="600"
          dy=".1em"
          className="fill-black dark:fill-white"
        >
          {Math.round(score)}
        </text>
      </svg>
      <span className={`${isMobile ? 'text-[12px]' : 'text-[14.4px]'} font-medium mt-1 text-[#9CA3AF] dark:text-[#A3A3B3]`}>
        Health Score
      </span>
    </div>
  );
}

interface TokenProfileProps {
  name: string;
  symbol: string;
  logo: string;
  address: string;
  website: string;
  twitter: string;
  github: string;
  price: number;
  priceChange: number;
  marketCap: string;
  overallScore?: number;
  description?: string;
  network?: string;
}

export default function TokenProfile({
  name,
  symbol,
  logo,
  address,
  website,
  twitter,
  github,
  price,
  priceChange,
  marketCap,
  overallScore = 0,
  description,
  network = "ETH",
}: TokenProfileProps) {
  const isMobile = useIsMobile();
  
  const shortenAddress = (addr: string) =>
    `${addr.slice(0, 6)}...${addr.slice(-4) || ""}`;
  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast("Address copied to clipboard");
    } catch (err) {
      // ignore
    }
  };

  // Format market cap
  const formatMarketCap = (cap: string) => {
    const v = parseFloat(cap?.toString().replace(/[^0-9.]/g, "")) || 0;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  };

  if (isMobile) {
    return (
      <Card
        className="overflow-visible transition-all"
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "var(--profile-border, #E6E8EC)",
          background: "var(--profile-bg, #FFF)",
          width: "100%",
          padding: 0,
          margin: "auto",
        }}
      >
        <div className="p-4 space-y-4">
          {/* Mobile Top Section: Logo + Name/Symbol */}
          <div className="flex items-start gap-3">
            <OptimizedTokenLogo
              logo={logo}
              name={name}
              className="w-12 h-12 rounded-full flex-shrink-0"
              size={48}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-lg leading-tight text-gray-900 dark:text-gray-100 truncate">
                  {name}
                </h2>
                <span className="font-medium text-xs px-2 py-1 bg-[#252534] text-gray-200 rounded-full flex-shrink-0">
                  ${symbol.toUpperCase()}
                </span>
              </div>
              
              {/* Address and Network */}
              <div className="flex items-center gap-2 mb-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={copyAddress}
                        className="font-mono text-xs px-2 py-1 rounded bg-[#232334] text-[#A3A3B3] border-none focus:outline-none transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        {shortenAddress(address)}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Click to copy address</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span className="px-1.5 py-0.5 rounded bg-[#252534] text-[#A3A3B3] font-semibold text-xs">
                  {network.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Description - prominently displayed */}
          {description && (
            <div className="mb-4">
              <p className="text-sm leading-relaxed text-[#4B5563] dark:text-[#A3A3B3]">
                {description}
              </p>
            </div>
          )}

          {/* Mobile Bottom Section: Price/Market Cap + Health Score */}
          <div className="flex items-center justify-between">
            {/* Price and Market Cap */}
            <div className="flex flex-col">
              <div className="flex flex-col mb-3">
                <span className="text-xl font-bold leading-none text-[#000] dark:text-[#fff]">
                  ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span
                  className="text-sm font-medium mt-0.5"
                  style={{
                    color: priceChange >= 0 ? "#10B981" : "#DC2626",
                  }}
                >
                  {priceChange >= 0 ? "+" : ""}
                  {priceChange.toFixed(2)}%
                </span>
              </div>
              
              <div className="flex flex-col">
                <span className="text-xs font-medium uppercase text-[#A3A3B3] tracking-wide mb-1">
                  Market Cap
                </span>
                <span className="text-lg font-bold text-[#000] dark:text-white">
                  {formatMarketCap(marketCap)}
                </span>
              </div>
            </div>

            {/* Health Score and Socials */}
            <div className="flex flex-col items-center gap-3">
              <MiniHealthScore score={overallScore} />
              
              {/* Socials */}
              {(website || twitter || github) && (
                <div className="flex items-center gap-3">
                  {website && (
                    <a
                      href={website.startsWith("http") ? website : `https://${website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded transition-colors text-[#A3A3B3] hover:text-[#000] dark:hover:text-white focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="Website"
                    >
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                  {twitter && (
                    <a
                      href={twitter.startsWith("http") ? twitter : `https://twitter.com/${twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded transition-colors text-[#A3A3B3] hover:text-[#000] dark:hover:text-white focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="X/Twitter"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {github && (
                    <a
                      href={github.startsWith("http") ? github : `https://github.com/${github.replace(/^@/, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded transition-colors text-[#A3A3B3] hover:text-[#000] dark:hover:text-white focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
                      aria-label="GitHub"
                    >
                      <Github className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        {/* CSS variables for theme */}
        <style>{`
          :root {
            --profile-border: #E6E8EC;
            --profile-bg: #FFF;
          }
          .dark {
            --profile-border: #232334;
            --profile-bg: #181826;
          }
        `}</style>
      </Card>
    );
  }

  // Desktop layout - updated to include description prominently
  return (
    <Card
      className="overflow-visible transition-all"
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "var(--profile-border, #E6E8EC)",
        background: "var(--profile-bg, #FFF)",
        width: "100%",
        maxWidth: 1420,
        minHeight: 170,
        padding: 0,
        margin: "auto",
      }}
    >
      <div
        className="flex flex-col min-h-[170px] px-6 py-6"
        style={{ minHeight: 170 }}
      >
        {/* TOP ROW: Token info, price, and health score */}
        <div className="flex items-start justify-between mb-4">
          {/* LEFT SECTION */}
          <div className="flex items-start gap-6 min-w-0 flex-1">
            {/* Token Logo */}
            <OptimizedTokenLogo
              logo={logo}
              name={name}
              className="w-16 h-16 rounded-full"
              size={64}
            />
            <div className="flex flex-col gap-2 min-w-0">
              {/* Name + Symbol */}
              <div className="flex items-center gap-3">
                <h2
                  className="font-semibold text-[20px] leading-[28px] text-gray-900 dark:text-gray-100 truncate"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {name}
                </h2>
                <span
                  className="font-medium text-[14px] px-3 py-1 bg-[#252534] dark:bg-[#252534] text-gray-200 dark:text-gray-300 rounded-full"
                  style={{
                    borderRadius: "9999px",
                    letterSpacing: ".01em",
                    fontWeight: 500,
                    fontFamily: "Inter, sans-serif",
                    padding: "6px 12px",
                  }}
                >
                  ${symbol.toUpperCase()}
                </span>
              </div>
              
              {/* Address */}
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={copyAddress}
                        className="font-mono text-[14px] px-4 py-1 rounded-full bg-[#232334] dark:bg-[#232334] text-[#A3A3B3] dark:text-[#A3A3B3] border-none focus:outline-none transition-all"
                      >
                        {shortenAddress(address)}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Click to copy address</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span
                  className="px-2 py-[2px] rounded-full bg-[#252534] dark:bg-[#252534] text-[#A3A3B3] dark:text-[#A3A3B3] font-semibold text-[12px]"
                  style={{ fontWeight: 600, marginLeft: "2px" }}
                >
                  {network.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* CENTER: Price and Market Cap Section */}
          <div className="flex flex-col items-start gap-4 mx-16">
            {/* Price + Change */}
            <div className="flex flex-col items-start">
              <span className="text-[28px] font-bold leading-[36px] text-[#000] dark:text-[#fff]">
                ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span
                className="text-[16px] font-medium"
                style={{
                  color: priceChange >= 0 ? "#10B981" : "#DC2626",
                  marginTop: 2,
                }}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)}%
              </span>
            </div>
            
            {/* Market Cap */}
            <div className="flex flex-col items-start">
              <span className="text-[13px] font-medium uppercase text-[#A3A3B3] dark:text-[#A3A3B3] tracking-wide mb-1">
                Market Cap
              </span>
              <span className="text-[20px] font-bold text-[#000] dark:text-white">
                {formatMarketCap(marketCap)}
              </span>
            </div>
          </div>

          {/* RIGHT: Health Score and Socials */}
          <div className="flex flex-col items-center gap-4">
            {/* Health Score */}
            <MiniHealthScore score={overallScore} />
            
            {/* Socials */}
            {(website || twitter || github) && (
              <div className="flex items-center gap-4">
                {website && (
                  <a
                    href={website.startsWith("http") ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded transition-colors text-[#A3A3B3] dark:text-[#A3A3B3] hover:text-[#000] dark:hover:text-white focus:outline-none"
                    aria-label="Website"
                    style={{ lineHeight: 0 }}
                  >
                    <Globe className="w-5 h-5" />
                  </a>
                )}
                {twitter && (
                  <a
                    href={twitter.startsWith("http") ? twitter : `https://twitter.com/${twitter.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded transition-colors text-[#A3A3B3] dark:text-[#A3A3B3] hover:text-[#000] dark:hover:text-white focus:outline-none"
                    aria-label="X/Twitter"
                    style={{ lineHeight: 0 }}
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                )}
                {github && (
                  <a
                    href={github.startsWith("http") ? github : `https://github.com/${github.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded transition-colors text-[#A3A3B3] dark:text-[#A3A3B3] hover:text-[#000] dark:hover:text-white focus:outline-none"
                    aria-label="GitHub"
                    style={{ lineHeight: 0 }}
                  >
                    <Github className="w-5 h-5" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* BOTTOM ROW: Description prominently displayed */}
        {description && (
          <div className="mt-2">
            <p
              className="text-[16px] font-normal leading-[24px] text-[#4B5563] dark:text-[#A3A3B3]"
              style={{
                fontFamily: "Inter, sans-serif",
                lineHeight: "1.5",
              }}
            >
              {description}
            </p>
          </div>
        )}
      </div>
      
      {/* CSS variables for theme */}
      <style>{`
        :root {
          --profile-border: #E6E8EC;
          --profile-bg: #FFF;
        }
        .dark {
          --profile-border: #232334;
          --profile-bg: #181826;
        }
      `}</style>
    </Card>
  );
}
