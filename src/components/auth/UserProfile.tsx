
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

type SubscriberData = {
  plan: string;
  scans_used: number;
  pro_scan_limit: number;
};

export function UserProfile() {
  const { user, signOut } = useAuth();
  const [subscriberData, setSubscriberData] = useState<SubscriberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubscriberData = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("subscribers")
          .select("plan, scans_used, pro_scan_limit")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching subscriber data:", error);
          toast({
            title: "Error",
            description: "Could not fetch your subscription data",
            variant: "destructive",
          });
          return;
        }

        setSubscriberData(data);
      } catch (error) {
        console.error("Error in subscriber data fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriberData();
  }, [user]);

  const handleManageSubscription = async () => {
    if (!user) return;
    
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        body: {
          returnUrl: `${window.location.origin}/dashboard`,
        },
      });

      if (error) throw new Error(error.message);
      
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Error creating customer portal session:", error);
      toast({
        title: "Error",
        description: "Could not open subscription management portal",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const handleUpgradePlan = () => {
    navigate('/pricing');
  };

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
            <div className="space-y-1">
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>

            {subscriberData && (
              <>
                <div className="space-y-1">
                  <p className="text-sm font-medium">Plan</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm capitalize text-muted-foreground">
                      {subscriberData.plan}
                    </p>
                    {subscriberData.plan === "pro" ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Active
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    {subscriberData.plan === "pro" ? "Pro Scans (Monthly)" : "Pro Scans"}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-muted-foreground">
                      {subscriberData.scans_used} / {subscriberData.pro_scan_limit} used
                    </p>
                    {subscriberData.scans_used >= subscriberData.pro_scan_limit && subscriberData.plan !== "pro" && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Limit Reached
                      </Badge>
                    )}
                  </div>
                  {subscriberData.plan !== "pro" && subscriberData.scans_used < subscriberData.pro_scan_limit && (
                    <p className="text-xs text-muted-foreground">
                      Full-quality scans with detailed analysis
                    </p>
                  )}
                  {subscriberData.plan !== "pro" && subscriberData.scans_used >= subscriberData.pro_scan_limit && (
                    <p className="text-xs text-muted-foreground">
                      Unlimited basic scans available. Upgrade for full analysis.
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  {subscriberData.plan === "pro" ? (
                    <Button 
                      variant="outline" 
                      onClick={handleManageSubscription} 
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
                  ) : (
                    <Button 
                      variant="default" 
                      onClick={handleUpgradePlan} 
                      className="w-full"
                    >
                      Upgrade to Pro
                    </Button>
                  )}
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
