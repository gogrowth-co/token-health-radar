
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

type SubscriberData = {
  plan: string;
  scans_used: number;
  pro_scan_limit: number;
};

export function UserProfile() {
  const { user, signOut } = useAuth();
  const [subscriberData, setSubscriberData] = useState<SubscriberData | null>(null);
  const [loading, setLoading] = useState(true);

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
                  <p className="text-sm capitalize text-muted-foreground">
                    {subscriberData.plan}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium">Pro Scans</p>
                  <p className="text-sm text-muted-foreground">
                    {subscriberData.scans_used} / {subscriberData.pro_scan_limit} used
                  </p>
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
