
import { Globe, Github, Twitter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import * as React from "react";

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

function MiniHealthScore({ score = 0 }: { score: number }) {
  // Orange arc: 220deg ~ 61% of circumference
  const angle = 220;
  const radius = 22;
  const cx = 24;
  const cy = 24;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (angle / 360) * circumference;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={48} height={48}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={4}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#F59E0B"
          strokeWidth={4}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeDashoffset={(circumference * 0.2)}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.3s" }}
        />
        <text
          x="50%"
          y="56%"
          textAnchor="middle"
          fill="#F59E0B"
          fontSize="16"
          fontWeight="600"
          dy=".1em"
        >
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-[12px] mt-[-2px] font-medium text-gray-400 dark:text-gray-500" style={{letterSpacing: "0.02em"}}>
        Health Score
      </span>
    </div>
  );
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
  network = "ETH"
}: TokenProfileProps) {
  // For accessibility/truncation we clamp desc at 2 lines visually, fallback to max 256 chars.
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

  // Market cap: Format like $4.27B, $1.2M
  const formatMarketCap = (cap: string) => {
    const v = parseFloat(cap.replace(/[^0-9.]/g, ""));
    if (isNaN(v)) return "N/A";
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
    return `$${v.toFixed(2)}`;
  };

  return (
    <Card
      style={{
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "var(--profile-border, #E6E8EC)",
        background: "var(--profile-bg, #FFF)",
        width: "100%",
        maxWidth: 1420,
        minHeight: 170,
        padding: 0,
        margin: "auto"
      }}
      className="overflow-visible transition-all"
    >
      {/* NOTE: px-6 is close to 24px, py-6 = 24px; we use those for padding */}
      <div className="flex justify-between items-center h-full min-h-[170px] px-6 py-6"
        style={{minHeight: 170}}
      >
        {/* LEFT: Token Identity */}
        <div className="flex items-start gap-6 min-w-0">
          {/* Logo */}
          <img
            src={logo}
            alt={`${name} logo`}
            className="w-16 h-16 object-cover rounded-full border border-[#e6e8ec] dark:border-[#232334]"
            style={{minWidth: 64, minHeight: 64, maxWidth: 64, maxHeight: 64}}
          />
          {/* Info */}
          <div className="flex flex-col gap-2 min-w-0">
            {/* Name + Symbol */}
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-[20px] leading-[28px] text-gray-900 dark:text-gray-100 truncate">
                {name}
              </h2>
              <span
                className="font-medium bg-[#F3F4F6] dark:bg-[#262634] text-gray-700 dark:text-gray-300 text-[14px] px-3 py-1 rounded-full leading-[18px] ml-[2px]"
                style={{letterSpacing: ".01em", fontWeight: 500}}
              >
                ${symbol.toUpperCase()}
              </span>
            </div>
            {/* Description (multi-line clamp, gray-700) */}
            {clampedDesc && (
              <p
                className="text-[16px] text-gray-700 dark:text-gray-300 max-w-[700px] leading-[22px] truncate whitespace-pre-line"
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden"
                }}
                title={clampedDesc}
              >
                {clampedDesc}
              </p>
            )}
            {/* Address tag */}
            <div className="mt-1 flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={copyAddress}
                      className="font-mono text-[14px] px-4 py-1 rounded-full bg-[#F9FAFB] dark:bg-[#181827] text-gray-500 dark:text-gray-400 border-none focus:outline-none transition-all"
                    >
                      {shortenAddress(address)}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Click to copy address
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span
                className="bg-[#E5E7EB] dark:bg-[#262634] text-gray-600 dark:text-gray-400 rounded-full px-2 py-0.5 text-[12px] font-semibold"
              >
                {network.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Metrics block (Price, Market cap, Score, Socials) */}
        <div className="flex flex-col items-end justify-between h-full gap-2">
          {/* Price/Change/Cap */}
          <div className="flex flex-col items-end">
            <span className="text-[24px] font-bold leading-[30px] text-gray-900 dark:text-gray-100">
              ${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </span>
            <span className={`text-[14px] font-medium leading-[18px] mt-0.5 ${priceChange >= 0 ? "text-green-600" : "text-red-600"}`}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
            </span>
            <span className="uppercase text-[12px] font-medium text-gray-400 dark:text-gray-500 tracking-wide mt-4 mb-0">
              Market Cap
            </span>
            <span className="text-[16px] font-bold leading-[22px] text-slate-900 dark:text-gray-100 mb-2">
              {formatMarketCap(marketCap)}
            </span>
          </div>
          {/* Health Score Mini-widget */}
          <MiniHealthScore score={overallScore} />
          {/* Social icons (bottom right) */}
          {(website || twitter || github) && (
            <div className="flex items-center gap-3 mt-6">
              {/* Website */}
              {website && (
                <a
                  href={website.startsWith("http") ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white focus:outline-none"
                  aria-label="Website link"
                  style={{lineHeight: 0}}
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
              {/* Twitter */}
              {twitter && (
                <a
                  href={twitter.startsWith("http") ? twitter : `https://twitter.com/${twitter.replace("@", "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white focus:outline-none"
                  aria-label="X/Twitter link"
                  style={{lineHeight: 0}}
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {/* Github */}
              {github && (
                <a
                  href={github.startsWith("http") ? github : `https://github.com/${github.replace(/^@/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white focus:outline-none"
                  aria-label="GitHub link"
                  style={{lineHeight: 0}}
                >
                  <Github className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>
      <style>{`
        :root {
          --profile-border: #E6E8EC;
          --profile-bg: #FFF;
        }
        .dark {
          --profile-border: #232334;
          --profile-bg: #17171f;
        }
      `}</style>
    </Card>
  );
}
