import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, TrendingUp, PieChart, Wallet } from "lucide-react";
import { formatCurrencyValue } from "@/utils/tokenFormatters";

interface TokenomicsData {
  totalSupply: number | null;
  circulatingSupply: number | null;
  marketCap: number | null;
  fdv: number | null;
  tvl: number | null;
  circulatingRatio: number | null;
  maxSupply: number | null;
}

interface TokenomicsCardProps {
  tokenomics: TokenomicsData;
}

function formatLargeNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

function formatPercentage(ratio: number | null | undefined): string {
  if (ratio === null || ratio === undefined) return 'N/A';
  return `${(ratio * 100).toFixed(1)}%`;
}

export function TokenomicsCard({ tokenomics }: TokenomicsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          Tokenomics
        </CardTitle>
        <CardDescription className="text-xs">Supply & Valuation Metrics</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          {/* Market Cap */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <TrendingUp className="h-3 w-3" />
              Market Cap
            </div>
            <div className="font-semibold">
              {tokenomics.marketCap ? formatCurrencyValue(tokenomics.marketCap) : 'N/A'}
            </div>
          </div>

          {/* FDV */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <PieChart className="h-3 w-3" />
              FDV
            </div>
            <div className="font-semibold">
              {tokenomics.fdv ? formatCurrencyValue(tokenomics.fdv) : 'N/A'}
            </div>
          </div>

          {/* TVL */}
          {tokenomics.tvl && (
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-muted-foreground text-xs">
                <Wallet className="h-3 w-3" />
                TVL
              </div>
              <div className="font-semibold">
                {formatCurrencyValue(tokenomics.tvl)}
              </div>
            </div>
          )}

          {/* Circulating Supply */}
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Circulating</div>
            <div className="font-medium">{formatLargeNumber(tokenomics.circulatingSupply)}</div>
          </div>

          {/* Total Supply */}
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs">Total Supply</div>
            <div className="font-medium">{formatLargeNumber(tokenomics.totalSupply)}</div>
          </div>

          {/* Max Supply */}
          {tokenomics.maxSupply && (
            <div className="space-y-1">
              <div className="text-muted-foreground text-xs">Max Supply</div>
              <div className="font-medium">{formatLargeNumber(tokenomics.maxSupply)}</div>
            </div>
          )}

          {/* Circulating Ratio */}
          {tokenomics.circulatingRatio && (
            <div className="space-y-1 col-span-2 md:col-span-1">
              <div className="text-muted-foreground text-xs">Circ. Ratio</div>
              <div className="font-medium">
                {formatPercentage(tokenomics.circulatingRatio)}
                <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                  <div 
                    className="bg-primary h-1.5 rounded-full transition-all" 
                    style={{ width: `${Math.min(tokenomics.circulatingRatio * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default TokenomicsCard;
