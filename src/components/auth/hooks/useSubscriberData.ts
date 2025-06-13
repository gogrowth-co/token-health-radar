
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type SubscriberData = {
  plan: string;
  scans_used: number;
  pro_scan_limit: number;
  source?: string;
};

export function useSubscriberData() {
  const { user } = useAuth();
  const [subscriberData, setSubscriberData] = useState<SubscriberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubscriberData = async () => {
      if (!user) {
        setSubscriberData(null);
        setLoading(false);
        return;
      }

      try {
        console.log('👤 Fetching subscriber data for user:', user.id);
        
        // First try direct database query with proper RLS
        const { data: directData, error: directError } = await supabase
          .from("subscribers")
          .select("plan, scans_used, pro_scan_limit, source")
          .eq("id", user.id)
          .maybeSingle();

        if (directError) {
          console.error("❌ Direct query failed:", directError);
          setError("Could not load subscription data");
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
          // User doesn't have a subscriber record, create one
          console.log('ℹ️ No subscriber record found, creating one');
          const { data: insertData, error: insertError } = await supabase
            .from("subscribers")
            .insert({
              id: user.id,
              plan: "free",
              scans_used: 0,
              pro_scan_limit: 3,
              source: "manual"
            })
            .select("plan, scans_used, pro_scan_limit, source")
            .single();

          if (insertError) {
            console.error("❌ Insert failed:", insertError);
            setError("Could not create user profile");
            setSubscriberData({
              plan: "free",
              scans_used: 0,
              pro_scan_limit: 3
            });
          } else {
            console.log('✅ Created subscriber record:', insertData);
            setSubscriberData(insertData);
            setError(null);
          }
        }
      } catch (error) {
        console.error("💥 Error in subscriber data fetch:", error);
        setError("Could not load subscription data");
        // Set safe defaults
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

  return {
    subscriberData,
    loading,
    error
  };
}
