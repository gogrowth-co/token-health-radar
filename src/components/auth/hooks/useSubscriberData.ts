
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
        setLoading(false);
        return;
      }

      try {
        console.log('👤 Fetching subscriber data for user:', user.id);
        
        // Use the check-scan-access function to get consistent data
        const { data, error } = await supabase.functions.invoke('check-scan-access');

        if (error) {
          console.error("❌ Error checking scan access:", error);
          
          // Try direct database query as fallback with user authentication
          console.log('🔄 Attempting direct database query as fallback');
          const { data: directData, error: directError } = await supabase
            .from("subscribers")
            .select("plan, scans_used, pro_scan_limit, source")
            .eq("id", user.id)
            .maybeSingle();

          if (directError) {
            console.error("❌ Direct query failed:", directError);
            
            // Try to create a subscriber record if none exists
            console.log('🔄 Creating subscriber record for user');
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
              .maybeSingle();

            if (insertError) {
              console.error("❌ Insert failed:", insertError);
              setError("Could not create user profile. Please contact support.");
            } else {
              console.log('✅ Created subscriber record:', insertData);
              setSubscriberData(insertData || {
                plan: "free",
                scans_used: 0,
                pro_scan_limit: 3
              });
              setError(null);
            }
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
