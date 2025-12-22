import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, XCircle, AlertTriangle, Lock, Unlock, Coins, FileCode } from "lucide-react";

interface SecurityData {
  ownershipRenounced: boolean | null;
  canMint: boolean | null;
  honeypotDetected: boolean | null;
  freezeAuthority: boolean | null;
  isProxy: boolean | null;
  contractVerified: boolean | null;
  isLiquidityLocked: boolean | null;
  liquidityLockInfo?: string | null;
  score?: number;
  webacySeverity?: string | null;
}

interface SecurityCardProps {
  security: SecurityData;
}

function SecurityFlag({ 
  label, 
  value, 
  isGood 
}: { 
  label: string; 
  value: boolean | null; 
  isGood: boolean;
}) {
  if (value === null) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Badge variant="outline" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      </div>
    );
  }

  const isPositive = isGood ? value : !value;
  
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm">{label}</span>
      <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
        {isPositive ? (
          <CheckCircle className="h-3 w-3 mr-1" />
        ) : (
          <XCircle className="h-3 w-3 mr-1" />
        )}
        {value ? 'Yes' : 'No'}
      </Badge>
    </div>
  );
}

export function SecurityCard({ security }: SecurityCardProps) {
  // Calculate a simple risk level based on flags
  const getRiskLevel = () => {
    if (security.honeypotDetected === true) return { level: 'Critical', color: 'destructive' as const };
    if (security.canMint === true && security.ownershipRenounced === false) return { level: 'High', color: 'destructive' as const };
    if (security.freezeAuthority === true) return { level: 'Medium', color: 'secondary' as const };
    if (security.ownershipRenounced === true && security.canMint === false) return { level: 'Low', color: 'default' as const };
    return { level: 'Unknown', color: 'outline' as const };
  };

  const riskInfo = getRiskLevel();

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Security
            </CardTitle>
            <CardDescription className="text-xs">Contract Security Analysis</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {security.score !== undefined && (
              <Badge variant={security.score >= 70 ? "default" : security.score >= 40 ? "secondary" : "destructive"}>
                Score: {security.score}
              </Badge>
            )}
            <Badge variant={riskInfo.color}>
              {riskInfo.level} Risk
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <SecurityFlag 
          label="Ownership Renounced" 
          value={security.ownershipRenounced} 
          isGood={true}
        />
        <SecurityFlag 
          label="Can Mint" 
          value={security.canMint} 
          isGood={false}
        />
        <SecurityFlag 
          label="Honeypot Detected" 
          value={security.honeypotDetected} 
          isGood={false}
        />
        <SecurityFlag 
          label="Freeze Authority" 
          value={security.freezeAuthority} 
          isGood={false}
        />
        <SecurityFlag 
          label="Is Proxy Contract" 
          value={security.isProxy} 
          isGood={false}
        />
        <SecurityFlag 
          label="Contract Verified" 
          value={security.contractVerified} 
          isGood={true}
        />
        
        {/* Liquidity Lock Info */}
        {security.isLiquidityLocked !== null && (
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm flex items-center gap-1">
              {security.isLiquidityLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
              Liquidity Locked
            </span>
            <Badge variant={security.isLiquidityLocked ? "default" : "destructive"} className="text-xs">
              {security.isLiquidityLocked ? 'Yes' : 'No'}
            </Badge>
          </div>
        )}
        
        {security.liquidityLockInfo && (
          <div className="text-xs text-muted-foreground pt-2">
            {security.liquidityLockInfo}
          </div>
        )}

        {/* Webacy severity if available */}
        {security.webacySeverity && (
          <div className="flex items-center justify-between py-2 mt-2 pt-3 border-t">
            <span className="text-sm text-muted-foreground">Webacy Severity</span>
            <Badge variant={
              security.webacySeverity === 'low' ? 'default' :
              security.webacySeverity === 'medium' ? 'secondary' : 'destructive'
            }>
              {security.webacySeverity}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SecurityCard;
