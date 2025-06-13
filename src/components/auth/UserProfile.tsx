
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSubscriberData } from "./hooks/useSubscriberData";
import { useSubscriptionActions } from "./hooks/useSubscriptionActions";
import { UserProfileInfo } from "./components/UserProfileInfo";
import { SubscriptionInfo } from "./components/SubscriptionInfo";
import { SubscriptionActions } from "./components/SubscriptionActions";

export function UserProfile() {
  const { user, signOut } = useAuth();
  const { subscriberData, loading, error } = useSubscriberData();
  const { isLoadingPortal, handleManageSubscription, handleUpgradePlan } = useSubscriptionActions();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Please log in to view your profile</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center my-4">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            <UserProfileInfo user={user} />

            {error && (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {subscriberData && (
              <>
                <SubscriptionInfo subscriberData={subscriberData} />

                <div className="pt-2">
                  <SubscriptionActions
                    subscriberData={subscriberData}
                    isLoadingPortal={isLoadingPortal}
                    onManageSubscription={() => handleManageSubscription(user)}
                    onUpgradePlan={handleUpgradePlan}
                  />
                </div>
              </>
            )}

            <Button variant="outline" onClick={() => signOut()} className="w-full mt-4">
              Sign Out
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
