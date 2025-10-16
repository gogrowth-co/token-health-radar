import { useState } from 'react';
import { RefreshCw, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RefreshSummary {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ token: string; error: string }>;
  duration: number;
}

export default function TokenRefreshPanel() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [summary, setSummary] = useState<RefreshSummary | null>(null);

  const handleTriggerRefresh = async () => {
    try {
      setIsRefreshing(true);
      setSummary(null);

      toast.info('Starting weekly token refresh...', {
        description: 'This will update all token reports with fresh API data',
      });

      const { data, error } = await supabase.functions.invoke('weekly-token-refresh', {
        body: {
          manual_trigger: true,
          triggered_by: 'admin_panel',
        },
      });

      if (error) {
        console.error('[ADMIN] Weekly refresh failed:', error);
        toast.error('Refresh Failed', {
          description: error.message || 'Failed to trigger token refresh',
        });
        return;
      }

      if (!data?.success) {
        console.error('[ADMIN] Weekly refresh unsuccessful:', data);
        toast.error('Refresh Failed', {
          description: data?.error || 'Token refresh was not successful',
        });
        return;
      }

      setSummary(data.summary);

      toast.success('Token Refresh Complete', {
        description: `Updated ${data.summary.successful}/${data.summary.total} tokens successfully`,
      });

      console.log('[ADMIN] Token refresh completed:', data.summary);
    } catch (error: any) {
      console.error('[ADMIN] Exception during token refresh:', error);
      toast.error('Refresh Error', {
        description: error.message || 'An unexpected error occurred',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Weekly Token Refresh
        </CardTitle>
        <CardDescription>
          Manually trigger a full refresh of all token reports. This updates all data from APIs and regenerates the sitemap.
          Scheduled to run automatically every Monday at 8:00 AM UTC.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={handleTriggerRefresh}
          disabled={isRefreshing}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing All Tokens...' : 'Trigger Refresh Now'}
        </Button>

        {summary && (
          <div className="space-y-3 p-4 bg-muted rounded-lg">
            <div className="font-semibold text-sm">Refresh Summary:</div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Successful: {summary.successful}/{summary.total}</span>
              </div>
              
              {summary.failed > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-500" />
                  <span>Failed: {summary.failed}</span>
                </div>
              )}
              
              <div className="flex items-center gap-2 col-span-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span>Duration: {(summary.duration / 1000).toFixed(2)}s</span>
              </div>
            </div>

            {summary.errors && summary.errors.length > 0 && (
              <div className="mt-3 p-3 bg-destructive/10 rounded text-xs space-y-1">
                <div className="font-semibold text-destructive">Errors:</div>
                {summary.errors.map((err, idx) => (
                  <div key={idx} className="text-muted-foreground">
                    • {err.token}: {err.error}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
