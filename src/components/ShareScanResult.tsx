
import { useState } from "react";
import { Share2, Copy, Twitter, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface ShareScanResultProps {
  tokenAddress: string;
  chainId: string;
  tokenName: string;
  tokenSymbol: string;
  className?: string;
}

export default function ShareScanResult({
  tokenAddress,
  chainId,
  tokenName,
  tokenSymbol,
  className = ""
}: ShareScanResultProps) {
  const [copied, setCopied] = useState(false);
  const isMobile = useIsMobile();

  // Convert chain ID to friendly name
  const getChainName = (chain: string) => {
    const chainMap: Record<string, string> = {
      "0x1": "eth",
      "0xa4b1": "arb",
      "0x89": "polygon",
      "0x38": "bsc",
    };
    return chainMap[chain] || "eth";
  };

  // Generate shareable URL
  const generateShareUrl = (includeRef = false) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://tokenhealthscan.com';
    const chain = getChainName(chainId);
    
    let url = `${origin}/scan-result?chain=${chain}&address=${tokenAddress}&utm_source=share&utm_campaign=token-scan`;
    
    // Add ref parameter if user is authenticated (optional future enhancement)
    // if (includeRef && user?.id) {
    //   url += `&ref=${user.id}`;
    // }
    
    return url;
  };

  // Copy URL to clipboard
  const handleCopyLink = async () => {
    try {
      const url = generateShareUrl();
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy link");
    }
  };

  // Share on Twitter
  const handleTwitterShare = () => {
    const url = generateShareUrl();
    const shortAddress = `${tokenAddress.slice(0, 6)}...${tokenAddress.slice(-4)}`;
    
    const tweetText = `DYOR complete 🔍 Here's the scan report for $${tokenSymbol.toUpperCase()} (${shortAddress}) via @TokenHealthScan\n\n${url}`;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };

  // Fallback for browsers without clipboard API
  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success("Link copied to clipboard!");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link");
    }
    
    document.body.removeChild(textArea);
  };

  const handleCopyWithFallback = async () => {
    const url = generateShareUrl();
    
    if (navigator.clipboard && window.isSecureContext) {
      await handleCopyLink();
    } else {
      fallbackCopyToClipboard(url);
    }
  };

  if (isMobile) {
    return (
      <div className={`flex flex-col gap-2 w-full ${className}`}>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyWithFallback}
          className="w-full min-h-[44px] flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy Link</span>
            </>
          )}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleTwitterShare}
          className="w-full min-h-[44px] flex items-center justify-center gap-2"
        >
          <Twitter className="h-4 w-4" />
          <span>Share on Twitter</span>
        </Button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopyWithFallback}
        className="flex items-center gap-2"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span>Copied!</span>
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            <span>Copy Link</span>
          </>
        )}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleTwitterShare}
        className="flex items-center gap-2"
      >
        <Twitter className="h-4 w-4" />
        <span>Share</span>
      </Button>
    </div>
  );
}
