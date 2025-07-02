
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Crown } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";

interface ScanLimitIndicatorProps {
  scansUsed: number;
  scanLimit: number;
  plan: string;
  className?: string;
}

export default function ScanLimitIndicator({ 
  scansUsed, 
  scanLimit, 
  plan,
  className = "" 
}: ScanLimitIndicatorProps) {
  const { isAdmin } = useUserRole();
  const percentage = scanLimit > 0 ? (scansUsed / scanLimit) * 100 : 0;
  const remaining = Math.max(0, scanLimit - scansUsed);

  // Show admin badge for admin users
  if (isAdmin) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-center">
            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
              <Crown className="w-3 h-3 mr-1" />
              Admin - Unlimited Pro Scans
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Don't show for pro users with unlimited scans
  if (plan === 'pro' && scanLimit > 100) {
    return null;
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Pro Scans</span>
            <Badge variant={plan === 'pro' ? 'default' : 'secondary'}>
              {plan === 'pro' ? 'Pro' : 'Free'}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            {scansUsed} / {scanLimit}
          </span>
        </div>
        
        <Progress value={percentage} className="h-2 mb-2" />
        
        <div className="text-xs text-muted-foreground">
          {remaining > 0 ? (
            `${remaining} Pro scans remaining`
          ) : (
            plan === 'free' ? 'Upgrade for unlimited Pro scans' : 'Limit reached'
          )}
        </div>
      </CardContent>
    </Card>
  );
}
