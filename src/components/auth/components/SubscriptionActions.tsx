
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type SubscriberData = {
  plan: string;
  scans_used: number;
  pro_scan_limit: number;
  source?: string;
};

interface SubscriptionActionsProps {
  subscriberData: SubscriberData;
  isLoadingPortal: boolean;
  onManageSubscription: () => void;
  onUpgradePlan: () => void;
}

export function SubscriptionActions({ 
  subscriberData, 
  isLoadingPortal, 
  onManageSubscription, 
  onUpgradePlan 
}: SubscriptionActionsProps) {
  if (subscriberData.plan === "lifetime") {
    return (
      <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-sm text-purple-700 font-medium">
          🎉 You have lifetime access!
        </p>
        <p className="text-xs text-purple-600 mt-1">
          Enjoy unlimited scans forever
        </p>
      </div>
    );
  }

  if (subscriberData.plan === "pro") {
    return (
      <Button 
        variant="outline" 
        onClick={onManageSubscription} 
        className="w-full"
        disabled={isLoadingPortal}
      >
        {isLoadingPortal ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Please wait...
          </>
        ) : "Manage Subscription"}
      </Button>
    );
  }

  return (
    <Button 
      variant="default" 
      onClick={onUpgradePlan} 
      className="w-full"
    >
      Upgrade to Pro
    </Button>
  );
}
