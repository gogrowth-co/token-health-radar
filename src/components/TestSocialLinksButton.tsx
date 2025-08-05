import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function TestSocialLinksButton() {
  const [loading, setLoading] = useState(false);

  const testSocialLinks = async () => {
    setLoading(true);
    try {
      console.log("Triggering test scan for PENDLE token...");
      
      const { data, error } = await supabase.functions.invoke("run-token-scan", {
        body: {
          token_address: "0x808507121b80c02388fad14726482e061b8da827",
          chain_id: "0x1",
          user_id: null,
          is_anonymous: true
        }
      });

      if (error) {
        console.error("Test scan error:", error);
        toast.error("Test scan failed: " + error.message);
      } else {
        console.log("Test scan response:", data);
        toast.success("Test scan completed! Check console and database for social links.");
        
        // Refresh the page after successful scan to see updated data
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (error) {
      console.error("Test scan exception:", error);
      toast.error("Test scan failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={testSocialLinks}
      disabled={loading}
      variant="outline"
      className="gap-2"
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      Test Social Links Extraction
    </Button>
  );
}