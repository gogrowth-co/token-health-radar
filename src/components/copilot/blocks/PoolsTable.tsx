import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Pool {
  name: string;
  dex: string;
  liquidityUsd: number;
  vol24hUsd: number;
  ageDays: number;
}

interface PoolsTableProps {
  pools?: Pool[];
  loading?: boolean;
}

export default function PoolsTable({ pools, loading }: PoolsTableProps) {
  const formatUSD = (value: number) => {
    if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(1)}K`;
    }
    return `$${value.toFixed(0)}`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 border rounded animate-pulse">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-24"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
            </div>
            <div className="space-y-2 text-right">
              <div className="h-4 bg-muted rounded w-20"></div>
              <div className="h-3 bg-muted rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!pools || pools.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No primary DEX pool found yet</p>
        <p className="text-xs mt-1">This token may be trading on centralized exchanges</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-muted-foreground">Top Liquidity Pools</h4>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pool</TableHead>
            <TableHead>Liquidity</TableHead>
            <TableHead>24h Volume</TableHead>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pools.slice(0, 5).map((pool, index) => (
            <TableRow key={index}>
              <TableCell>
                <div className="space-y-1">
                  <div className="font-medium text-sm">{pool.name}</div>
                  <Badge variant="outline" className="text-xs">
                    {pool.dex}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{formatUSD(pool.liquidityUsd)}</div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{formatUSD(pool.vol24hUsd)}</div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {pool.ageDays}d
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}