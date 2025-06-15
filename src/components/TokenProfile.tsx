
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

// Mini health score widget with better visibility for dark and light themes
function MiniHealthScore({ score = 0 }: { score: number }) {
  // Arc is 220deg of 360deg
  const angle = 220;
  const radius = 22;
  const cx = 24;
  const cy = 24;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (angle / 360) * circumference;

  // Ensure text color is always readable
  // Use CSS variables or tailwind "text-white"/"text-black" via "dark:" 
  // dark -> white, light -> black
  return (
    <div className="flex flex-col items-center">
      <svg width={48} height={48}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#232334"
          strokeWidth={4}
          style={{ transition: "stroke-dasharray 0.3s" }}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={4}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={circumference * 0.2}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.3s" }}
        />
        <text
          x="50%"
          y="56%"
          textAnchor="middle"
          fontSize="16"
          fontWeight="600"
          dy=".1em"
          className="fill-black dark:fill-white"
        >
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-[12px] font-medium mt-1 text-[#9CA3AF] dark:text-[#A3A3B3]">
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
  // Clamp and ellipsis for description
  const clampedDesc = description
    ? description.length > 256
      ? `${description.slice(0, 253)}...`
      : description
    : "";

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
        className="flex flex-row justify-between items-stretch min-h-[170px] px-6 py-6"
        style={{ minHeight: 170 }}
      >
        {/* LEFT SECTION */}
        <div className="flex items-start gap-6 min-w-0 flex-1">
          {/* Token Logo */}
          <img
            src={logo}
            alt={`${name} logo`}
            className="w-16 h-16 object-cover rounded-full"
            style={{
              minWidth: 64,
              minHeight: 64,
              maxWidth: 64,
              maxHeight: 64,
              background: "#F5F6FA",
            }}
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
            {/* Description */}
            {clampedDesc && (
              <p
                className="text-[16px] font-normal leading-[22px] text-[#4B5563] dark:text-[#A3A3B3] max-w-[700px] truncate whitespace-pre-line"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
                title={clampedDesc}
              >
                {clampedDesc}
              </p>
            )}
            {/* Address */}
            <div className="mt-2 flex items-center gap-2">
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

        {/* RIGHT SECTION: Price, Market Cap, Health Score, and Socials */}
        <div className="flex flex-col items-end justify-between min-w-[300px] h-full">
          {/* Top: Price + Change and Market Cap */}
          <div className="flex flex-col items-end gap-4">
            {/* Price + Change */}
            <div className="flex flex-col items-end">
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
            <div className="flex flex-col items-end">
              <span className="text-[13px] font-medium uppercase text-[#A3A3B3] dark:text-[#A3A3B3] tracking-wide mb-1">
                Market Cap
              </span>
              <span className="text-[20px] font-bold text-[#000] dark:text-white">
                {formatMarketCap(marketCap)}
              </span>
            </div>
          </div>

          {/* Bottom: Health Score and Socials */}
          <div className="flex flex-col items-end gap-4">
            {/* Health Score */}
            <div className="flex flex-col items-center">
              <MiniHealthScore score={overallScore} />
            </div>
            
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
