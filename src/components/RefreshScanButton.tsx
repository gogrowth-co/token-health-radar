import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RefreshScanButtonProps {
  tokenAddress: string;
  chainId: string;
  onRefreshComplete?: () => void;
  className?: string;
}

export default function RefreshScanButton({ 
  tokenAddress, 
  chainId, 
  onRefreshComplete,
  className = "" 
}: RefreshScanButtonProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshScan = async () => {
    try {
      setIsRefreshing(true);
      console.log(`[REFRESH] Triggering fresh scan for ${tokenAddress} on chain ${chainId}`);
      
      toast.info("Fresh Scan Started", {
        description: "Fetching latest data from all APIs..."
      });

      const { data, error } = await supabase.functions.invoke('run-token-scan', {
        body: {
          token_address: tokenAddress.toLowerCase(),
          chain_id: chainId,
          force_refresh: true,
          user_id: null // Anonymous refresh
        }
      });

      if (error) {
        console.error(`[REFRESH] Scan failed:`, error);
        toast.error("Refresh Failed", {
          description: `Failed to refresh scan: ${error.message}`
        });
        return;
      }

      if (!data?.success) {
        console.error(`[REFRESH] Scan unsuccessful:`, data);
        toast.error("Refresh Failed", {
          description: data?.error || "Scan was not successful"
        });
        return;
      }

      console.log(`[REFRESH] Fresh scan completed successfully:`, data);
      toast.success("Scan Refreshed", {
        description: "Latest data has been fetched from all APIs. Page will reload shortly."
      });

      // Wait a moment then reload the page to show fresh data
      setTimeout(() => {
        window.location.reload();
      }, 2000);

      if (onRefreshComplete) {
        onRefreshComplete();
      }

    } catch (error: any) {
      console.error(`[REFRESH] Exception during refresh:`, error);
      toast.error("Refresh Error", {
        description: `An error occurred: ${error.message}`
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      onClick={handleRefreshScan}
      disabled={isRefreshing}
      variant="outline"
      size="sm"
      className={`${className}`}
    >
      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Refreshing...' : 'Refresh Scan'}
    </Button>
  );
}