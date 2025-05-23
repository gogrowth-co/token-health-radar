
import { Badge } from "@/components/ui/badge";

interface TokenInfoProps {
  name: string;
  symbol: string;
  description?: string;
}

export default function TokenInfo({ name, symbol, description }: TokenInfoProps) {
  const getTokenSummary = () => {
    if (description) return description;
    return `${name} (${symbol}) is a cryptocurrency`;
  };

  return (
    <div>
      <h3 className="text-2xl font-bold">{name}</h3>
      <Badge variant="outline" className="mt-1 text-xs font-medium">{symbol}</Badge>
      
      <p className="mt-4 text-sm text-muted-foreground">
        {getTokenSummary()}
      </p>
    </div>
  );
}
