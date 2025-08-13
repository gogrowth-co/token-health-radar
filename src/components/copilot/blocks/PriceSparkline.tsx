import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface OHLCData {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

interface PriceSparklineProps {
  ohlc?: OHLCData[];
  loading?: boolean;
}

export default function PriceSparkline({ ohlc, loading }: PriceSparklineProps) {
  if (loading) {
    return (
      <div className="w-full h-16 bg-muted animate-pulse rounded"></div>
    );
  }

  if (!ohlc || ohlc.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        7-day price chart not available
      </div>
    );
  }

  // Transform OHLC data to simple close prices for sparkline
  const chartData = ohlc.map(item => ({
    timestamp: item.t,
    price: item.c
  }));

  const minPrice = Math.min(...chartData.map(d => d.price));
  const maxPrice = Math.max(...chartData.map(d => d.price));
  const isPositive = chartData[chartData.length - 1]?.price >= chartData[0]?.price;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">7-day price trend</span>
        <span className="text-xs text-muted-foreground">
          ${minPrice.toFixed(4)} - ${maxPrice.toFixed(4)}
        </span>
      </div>
      <div className="w-full h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={isPositive ? "#22c55e" : "#ef4444"} 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3, fill: isPositive ? "#22c55e" : "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}