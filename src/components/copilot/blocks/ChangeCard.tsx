import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrencyValue } from "@/utils/tokenFormatters";

interface ChangeData {
  window: string;
  pct: number;
  from: number;
  to: number;
}

interface ChangeCardProps {
  change: ChangeData;
}

export function ChangeCard({ change }: ChangeCardProps) {
  const isPositive = change.pct >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={`h-4 w-4 ${isPositive ? 'text-green-500' : 'text-red-500'}`} />
          {change.window.toUpperCase()} Price Change
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <CardDescription className="text-xs">Change</CardDescription>
            <div className={`font-semibold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? '+' : ''}{change.pct.toFixed(1)}%
            </div>
          </div>
          <div>
            <CardDescription className="text-xs">From</CardDescription>
            <div className="font-medium">{formatCurrencyValue(change.from)}</div>
          </div>
          <div>
            <CardDescription className="text-xs">To</CardDescription>
            <div className="font-medium">{formatCurrencyValue(change.to)}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}