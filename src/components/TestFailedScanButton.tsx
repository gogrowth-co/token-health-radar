import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Search, Bug } from "lucide-react";

export default function TestFailedScanButton() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [debuggingAPIs, setDebuggingAPIs] = useState(false);
  const [apiDebugResults, setApiDebugResults] = useState<any>(null);

  const testFailedScan = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log("=== TESTING FAILED BASE TOKEN SCAN ===");
      console.log("Token: 0x98d0baa52b2d063e780de12f615f963fe8537553");
      console.log("Chain: 0x2105 (Base)");
      
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
        console.error("=== SCAN ERROR ===", error);
        setResult({ success: false, error: error.message, timestamp: new Date().toISOString() });
        toast.error("Test scan failed: " + error.message);
      } else {
        console.log("=== SCAN SUCCESS ===", data);
        setResult({ ...data, timestamp: new Date().toISOString() });
        if (data?.success) {
          toast.success("Test scan completed successfully!");
        } else {
          toast.error("Test scan completed but with errors");
        }
      }
    } catch (error) {
      console.error("=== SCAN EXCEPTION ===", error);
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      toast.error("Test scan failed with exception");
    } finally {
      setTesting(false);
    }
  };

  const debugAPIs = async () => {
    setDebuggingAPIs(true);
    setApiDebugResults(null);
    
    try {
      console.log("=== DEBUGGING API HEALTH FOR BASE TOKEN ===");
      
      const { data, error } = await supabase.functions.invoke("debug-api-health", {
        body: {
          testTokenAddress: "0x98d0baa52b2d063e780de12f615f963fe8537553",
          testChainId: "0x2105"
        }
      });

      if (error) {
        console.error("=== API DEBUG ERROR ===", error);
        setApiDebugResults({ success: false, error: error.message });
        toast.error("API debug failed: " + error.message);
      } else {
        console.log("=== API DEBUG RESULTS ===", data);
        setApiDebugResults(data);
        toast.success("API debug completed! Check results below.");
      }
    } catch (error) {
      console.error("=== API DEBUG EXCEPTION ===", error);
      setApiDebugResults({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      toast.error("API debug failed with exception");
    } finally {
      setDebuggingAPIs(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          onClick={testFailedScan}
          disabled={testing || debuggingAPIs}
          variant="destructive"
          className="gap-2"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          Test Base Token Scan
        </Button>
        
        <Button
          onClick={debugAPIs}
          disabled={testing || debuggingAPIs}
          variant="outline"
          className="gap-2"
        >
          {debuggingAPIs ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Bug className="h-4 w-4" />
          )}
          Debug APIs
        </Button>
      </div>
      
      {result && (
        <div className="p-4 rounded-lg border bg-card text-card-foreground">
          <h4 className="font-semibold mb-2 text-sm">Scan Result:</h4>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-60">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
      
      {apiDebugResults && (
        <div className="p-4 rounded-lg border bg-card text-card-foreground">
          <h4 className="font-semibold mb-2 text-sm">API Debug Results:</h4>
          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-80">
            {JSON.stringify(apiDebugResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}