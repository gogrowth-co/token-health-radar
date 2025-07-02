import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TestTube, CheckCircle, XCircle } from "lucide-react";

interface TestScanButtonProps {
  tokenAddress?: string;
  chainId?: string;
  className?: string;
}

export default function TestScanButton({ 
  tokenAddress = "0x808507121b80c02388fad14726482e061b8da827", 
  chainId = "0x1",
  className 
}: TestScanButtonProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    
    try {
      console.log(`[TEST] Starting test scan for ${tokenAddress} on chain ${chainId}`);
      
      // Call the test-scan function
      const { data, error } = await supabase.functions.invoke('test-scan', {
        body: {}
      });
      
      if (error) {
        console.error(`[TEST] Error:`, error);
        setResult({ success: false, error: error.message });
        toast.error(`Test failed: ${error.message}`);
        return;
      }
      
      console.log(`[TEST] Success:`, data);
      setResult(data);
      
      if (data.success) {
        toast.success("Token scan test completed successfully!");
      } else {
        toast.error(`Test failed: ${data.error}`);
      }
      
    } catch (error) {
      console.error(`[TEST] Exception:`, error);
      setResult({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      toast.error("Test failed with exception");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Button
        onClick={runTest}
        disabled={testing}
        variant="outline"
        className="flex items-center gap-2"
      >
        {testing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <TestTube className="h-4 w-4" />
        )}
        {testing ? 'Testing Scan...' : 'Test Token Scan'}
      </Button>
      
      {result && (
        <div className="p-4 rounded-lg border bg-card text-card-foreground">
          <div className="flex items-center gap-2 mb-2">
            {result.success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            <span className="font-semibold">
              {result.success ? 'Test Passed' : 'Test Failed'}
            </span>
          </div>
          
          <pre className="text-sm bg-muted p-2 rounded overflow-auto max-h-60">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}