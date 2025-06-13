
import { Badge } from "@/components/ui/badge";

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  logo: string;
  price_usd: number;
  price_change_24h?: number;
  market_cap_usd: number;
}

interface TokenInfoProps {
  tokenData: TokenData;
}

export default function TokenInfo({ tokenData }: TokenInfoProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        {tokenData.logo && (
          <img 
            src={tokenData.logo} 
            alt={tokenData.name}
            className="w-12 h-12 rounded-full"
          />
        )}
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-2xl font-bold text-foreground">{tokenData.name}</h3>
            <Badge variant="outline" className="text-sm font-medium px-3 py-1">
              ${tokenData.symbol.toUpperCase()}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {tokenData.address}
          </p>
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-2xl font-bold">
          ${tokenData.price_usd.toLocaleString()}
        </div>
        <div className="text-lg text-muted-foreground">
          Market Cap: ${tokenData.market_cap_usd.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
