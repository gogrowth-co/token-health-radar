import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";

export default function TestFailedScanButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testFailedScan = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log("Testing failed scan for Base token...");
      
      const { data, error } = await supabase.functions.invoke("run-token-scan", {
        body: {
          token_address: "0x98d0baa52b2d063e780de12f615f963fe8537553",
          chain_id: "0x2105", // Base chain
          user_id: null,
          is_anonymous: true,
          force_refresh: true
        }
      });

      if (error) {
        console.error("Test scan error:", error);
        setResult({ success: false, error: error.message });
        toast.error("Test scan failed: " + error.message);
      } else {
        console.log("Test scan response:", data);
        setResult(data);
        toast.success("Test scan completed! Check console for details.");
      }
    } catch (error) {
      console.error("Test scan exception:", error);
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      toast.error("Test scan failed with exception");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        onClick={testFailedScan}
        disabled={testing}
        variant="destructive"
        className="gap-2"
      >
        {testing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <AlertTriangle className="h-4 w-4" />
        )}
        Test Failed Base Token Scan
      </Button>
      
      {result && (
        <div className="p-4 rounded-lg border bg-card text-card-foreground">
          <pre className="text-sm bg-muted p-2 rounded overflow-auto max-h-60">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}