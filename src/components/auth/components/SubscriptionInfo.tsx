
import { Badge } from "@/components/ui/badge";

type SubscriberData = {
  plan: string;
  scans_used: number;
  pro_scan_limit: number;
  source?: string;
};

interface SubscriptionInfoProps {
  subscriberData: SubscriberData;
}

export function SubscriptionInfo({ subscriberData }: SubscriptionInfoProps) {
  return (
    <>
      <div className="space-y-1">
        <p className="text-sm font-medium">Plan</p>
        <div className="flex items-center gap-2">
          <p className="text-sm capitalize text-muted-foreground">
            {subscriberData.plan}
          </p>
          {subscriberData.plan === "lifetime" ? (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              Lifetime Access
            </Badge>
          ) : subscriberData.plan === "pro" ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Active
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium">
          {subscriberData.plan === "lifetime" ? "Scans Used" : 
           subscriberData.plan === "pro" ? "Pro Scans (Monthly)" : "Pro Scans"}
        </p>
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            {subscriberData.plan === "lifetime" ? 
              `${subscriberData.scans_used} scans used` :
              `${subscriberData.scans_used} / ${subscriberData.pro_scan_limit} used`
            }
          </p>
          {subscriberData.plan !== "lifetime" && subscriberData.scans_used >= subscriberData.pro_scan_limit && subscriberData.plan !== "pro" && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              Limit Reached
            </Badge>
          )}
        </div>
        {subscriberData.plan === "lifetime" && (
          <p className="text-xs text-muted-foreground">
            Unlimited high-quality scans forever
          </p>
        )}
        {subscriberData.plan !== "lifetime" && subscriberData.plan !== "pro" && subscriberData.scans_used < subscriberData.pro_scan_limit && (
          <p className="text-xs text-muted-foreground">
            Full-quality scans with detailed analysis
          </p>
        )}
        {subscriberData.plan !== "lifetime" && subscriberData.plan !== "pro" && subscriberData.scans_used >= subscriberData.pro_scan_limit && (
          <p className="text-xs text-muted-foreground">
            Unlimited basic scans available. Upgrade for full analysis.
          </p>
        )}
      </div>
    </>
  );
}
