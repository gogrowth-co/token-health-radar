import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, AlertTriangle, TrendingUp } from "lucide-react";

interface HoldersData {
  totalHolders: number;
  topHolders: Array<{
    address: string;
    percentage: number;
    balance?: number;
  }>;
  top10Percentage: number;
  concentrationRisk: string;
  giniCoefficient?: number;
}

interface HoldersTableProps {
  holders: HoldersData;
}

function formatAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
  return num.toFixed(2);
}

function getRiskBadgeVariant(risk: string): "default" | "secondary" | "destructive" | "outline" {
  switch (risk.toLowerCase()) {
    case 'low':
      return 'secondary';
    case 'medium':
      return 'outline';
    case 'high':
      return 'destructive';
    default:
      return 'default';
  }
}

export default function HoldersTable({ holders }: HoldersTableProps) {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Token Holders
          </CardTitle>
          <Badge variant={getRiskBadgeVariant(holders.concentrationRisk)}>
            {holders.concentrationRisk} Concentration
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Holders</p>
            <p className="text-lg font-semibold">{formatNumber(holders.totalHolders)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Top 10 Own</p>
            <p className="text-lg font-semibold">{holders.top10Percentage.toFixed(1)}%</p>
          </div>
        </div>

        {/* Gini Coefficient */}
        {holders.giniCoefficient !== undefined && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Gini Coefficient: {holders.giniCoefficient.toFixed(3)}</span>
            {holders.giniCoefficient > 0.8 && (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}

        {/* Top Holders Table */}
        {holders.topHolders && holders.topHolders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-muted-foreground">#</th>
                  <th className="pb-2 font-medium text-muted-foreground">Address</th>
                  <th className="pb-2 font-medium text-muted-foreground text-right">% Owned</th>
                  {holders.topHolders[0]?.balance !== undefined && (
                    <th className="pb-2 font-medium text-muted-foreground text-right">Balance</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {holders.topHolders.slice(0, 10).map((holder, index) => (
                  <tr key={holder.address} className="border-b last:border-0">
                    <td className="py-2 text-muted-foreground">{index + 1}</td>
                    <td className="py-2 font-mono text-xs">{formatAddress(holder.address)}</td>
                    <td className="py-2 text-right">
                      <span className={holder.percentage > 10 ? 'text-destructive font-medium' : ''}>
                        {holder.percentage.toFixed(2)}%
                      </span>
                    </td>
                    {holder.balance !== undefined && (
                      <td className="py-2 text-right text-muted-foreground">
                        {formatNumber(holder.balance)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Source: Moralis Token API
        </p>
      </CardContent>
    </Card>
  );
}
