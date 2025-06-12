
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

type SubscriberData = {
  plan: string;
  scans_used: number;
  pro_scan_limit: number;
  source?: string;
};

export function UserProfile() {
  const { user, signOut } = useAuth();
  const [subscriberData, setSubscriberData] = useState<SubscriberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubscriberData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('👤 Fetching subscriber data for user:', user.id);
        
        // Use the check-scan-access function to get consistent data
        const { data, error } = await supabase.functions.invoke('check-scan-access');

        if (error) {
          console.error("❌ Error checking scan access:", error);
          setError("Could not load subscription data");
          
          // Try direct database query as fallback
          console.log('🔄 Attempting direct database query as fallback');
          const { data: directData, error: directError } = await supabase
            .from("subscribers")
            .select("plan, scans_used, pro_scan_limit, source")
            .eq("id", user.id)
            .maybeSingle();

          if (directError) {
            console.error("❌ Direct query also failed:", directError);
            // Set defaults if everything fails
            setSubscriberData({
              plan: "free",
              scans_used: 0,
              pro_scan_limit: 3
            });
          } else if (directData) {
            console.log('✅ Direct query succeeded:', directData);
            setSubscriberData(directData);
            setError(null);
          } else {
            console.log('ℹ️ No subscriber record found, using defaults');
            setSubscriberData({
              plan: "free",
              scans_used: 0,
              pro_scan_limit: 3
            });
          }
        } else {
          console.log('✅ Access data received:', data);
          setSubscriberData({
            plan: data.plan || "free",
            scans_used: data.scansUsed || 0,
            pro_scan_limit: data.scanLimit || 3
          });
          setError(null);
        }
      } catch (error) {
        console.error("💥 Error in subscriber data fetch:", error);
        setError("Could not load subscription data");
        // Set defaults
        setSubscriberData({
          plan: "free",
          scans_used: 0,
          pro_scan_limit: 3
        });
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

            {error && (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {subscriberData && (
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

                <div className="pt-2">
                  {subscriberData.plan === "lifetime" ? (
                    <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                      <p className="text-sm text-purple-700 font-medium">
                        🎉 You have lifetime access!
                      </p>
                      <p className="text-xs text-purple-600 mt-1">
                        Enjoy unlimited scans forever
                      </p>
                    </div>
                  ) : subscriberData.plan === "pro" ? (
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
