
import { Badge } from "@/components/ui/badge";

interface TokenInfoProps {
  name: string;
  symbol: string;
  description?: string;
  address?: string;
}

export default function TokenInfo({ name, symbol, description, address }: TokenInfoProps) {
  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const truncateDescription = (text: string, maxLines: number = 2) => {
    if (!text) return "";
    // Estimate character limit for 2 lines (roughly 120-140 characters)
    const maxChars = maxLines * 70;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars).trim() + "...";
  };

  return (
    <div className="flex-1">
      {/* Header row with name, symbol, and address */}
      <div className="flex items-center gap-3 mb-2">
        <h3 className="text-2xl font-bold text-foreground">{name}</h3>
        <Badge variant="outline" className="text-sm font-medium px-2 py-1">
          ${symbol.toUpperCase()}
        </Badge>
        {address && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>ETH</span>
            <span className="font-mono">{shortenAddress(address)}</span>
          </div>
        )}
      </div>
      
      {/* Description - max 2 lines with ellipsis */}
      {description && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {truncateDescription(description)}
        </p>
      )}
    </div>
  );
}
