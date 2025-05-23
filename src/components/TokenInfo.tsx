
import { Badge } from "@/components/ui/badge";

interface TokenInfoProps {
  name: string;
  symbol: string;
  showAddressInHeader?: boolean;
}

export default function TokenInfo({ 
  name, 
  symbol, 
  showAddressInHeader = false 
}: TokenInfoProps) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-2xl font-bold text-foreground">{name}</h3>
      <Badge variant="outline" className="text-sm font-medium px-3 py-1">
        ${symbol.toUpperCase()}
      </Badge>
    </div>
  );
}
