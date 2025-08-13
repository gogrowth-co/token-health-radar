import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface PriceData {
  usd: number;
  change24hPct: number;
  mcap: number | null;
  change30dPct?: number | null;
}

interface MetricCardsProps {
  price?: PriceData;
  loading?: boolean;
}

export default function MetricCards({ price, loading }: MetricCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-16 mb-2"></div>
              <div className="h-6 bg-muted rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!price) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        Price data not available
      </div>
    );
  }

  const formatPrice = (value: number) => {
    if (value >= 1) {
      return `$${value.toFixed(2)}`;
    } else {
      return `$${value.toFixed(6)}`;
    }
  };

  const formatMarketCap = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  const isPositive = price.change24hPct >= 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Price</span>
          </div>
          <div className="text-lg font-semibold">
            {formatPrice(price.usd)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm text-muted-foreground">24h Change</span>
          </div>
          <div className={`text-lg font-semibold ${
            isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {isPositive ? '+' : ''}{price.change24hPct.toFixed(2)}%
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Market Cap</span>
          </div>
          <div className="text-lg font-semibold">
            {formatMarketCap(price.mcap)}
          </div>
        </CardContent>
      </Card>

      {price?.change30dPct !== undefined && price?.change30dPct !== null && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {price.change30dPct! >= 0 ? 
                <TrendingUp className="h-4 w-4 text-green-500" /> : 
                <TrendingDown className="h-4 w-4 text-red-500" />
              }
              <span className="text-sm text-muted-foreground">30d Change</span>
            </div>
            <div className={`text-lg font-semibold ${
              price.change30dPct! >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {price.change30dPct! >= 0 ? '+' : ''}{price.change30dPct!.toFixed(2)}%
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}