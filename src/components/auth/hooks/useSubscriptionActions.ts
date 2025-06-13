
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export function useSubscriptionActions() {
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);
  const navigate = useNavigate();

  const handleManageSubscription = async (user: any) => {
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

  return {
    isLoadingPortal,
    handleManageSubscription,
    handleUpgradePlan
  };
}
