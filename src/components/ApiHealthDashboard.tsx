import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle, AlertCircle, Clock, RefreshCw } from "lucide-react";

interface ApiTest {
  status: 'pending' | 'success' | 'no_data' | 'error';
  data: any;
  error: string | null;
  responseTime: number;
}

interface ApiHealthResults {
  timestamp: string;
  testToken: string;
  testChain: string;
  apiKeys: {
    webacy: boolean;
    moralis: boolean;
    github: boolean;
  };
  tests: {
    webacy: ApiTest;
    goplus: ApiTest;
    moralis: ApiTest;
    gecko: ApiTest;
    github: ApiTest;
  };
  summary: {
    totalTests: number;
    successful: number;
    noData: number;
    errors: number;
    avgResponseTime: number;
  };
}

export default function ApiHealthDashboard() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<ApiHealthResults | null>(null);

  const runHealthCheck = async () => {
    setTesting(true);
    setResults(null);
    
    try {
      console.log(`[API-DASHBOARD] Starting API health check...`);
      
      const { data, error } = await supabase.functions.invoke('debug-api-health', {
        body: {
          testToken: "0x808507121b80c02388fad14726482e061b8da827",
          testChain: "0x1"
        }
      });
      
      if (error) {
        console.error(`[API-DASHBOARD] Error:`, error);
        setResults(null);
        toast.error(`Health check failed: ${error.message}`);
        return;
      }
      
      console.log(`[API-DASHBOARD] Success:`, data);
      setResults(data);
      
      const { summary } = data;
      if (summary.errors > 0) {
        toast.warning(`Health check completed with ${summary.errors} API errors`);
      } else if (summary.noData > 0) {
        toast.warning(`Health check completed but ${summary.noData} APIs returned no data`);
      } else {
        toast.success("All APIs are working correctly!");
      }
      
    } catch (error) {
      console.error(`[API-DASHBOARD] Exception:`, error);
      toast.error("Health check failed with exception");
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'no_data':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      success: "default",
      no_data: "secondary", 
      error: "destructive",
      pending: "outline"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "outline"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Health Dashboard</h2>
          <p className="text-muted-foreground">
            Test all external APIs to diagnose data collection issues
          </p>
        </div>
        <Button
          onClick={runHealthCheck}
          disabled={testing}
          className="flex items-center gap-2"
        >
          {testing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {testing ? 'Testing APIs...' : 'Run Health Check'}
        </Button>
      </div>

      {results && (
        <>
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Health Check Summary
                <Badge variant="outline">{new Date(results.timestamp).toLocaleTimeString()}</Badge>
              </CardTitle>
              <CardDescription>
                Testing token: {results.testToken} on chain {results.testChain}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.summary.successful}</div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{results.summary.noData}</div>
                  <div className="text-sm text-muted-foreground">No Data</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.summary.errors}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round(results.summary.avgResponseTime)}ms</div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* API Keys Status */}
          <Card>
            <CardHeader>
              <CardTitle>API Keys Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center justify-between">
                  <span>Webacy API Key</span>
                  {results.apiKeys.webacy ? (
                    <Badge variant="default">Configured</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Moralis API Key</span>
                  {results.apiKeys.moralis ? (
                    <Badge variant="default">Configured</Badge>
                  ) : (
                    <Badge variant="destructive">Missing</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>GitHub API Key</span>
                  {results.apiKeys.github ? (
                    <Badge variant="default">Configured</Badge>
                  ) : (
                    <Badge variant="secondary">Optional</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Individual API Results */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(results.tests).map(([apiName, test]) => (
              <Card key={apiName}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    {getStatusIcon(test.status)}
                    {apiName.charAt(0).toUpperCase() + apiName.slice(1)}
                    {getStatusBadge(test.status)}
                  </CardTitle>
                  <CardDescription>
                    Response Time: {test.responseTime}ms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {test.error && (
                    <div className="text-sm text-red-600 mb-2">
                      <strong>Error:</strong> {test.error}
                    </div>
                  )}
                  {test.data && (
                    <div className="text-sm">
                      <strong>Data Keys:</strong> {Object.keys(test.data).join(', ')}
                    </div>
                  )}
                  {test.status === 'no_data' && (
                    <div className="text-sm text-yellow-600">
                      API responded successfully but returned no data for this token
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Detailed Response Data */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed API Responses</CardTitle>
              <CardDescription>
                Raw response data from each API (useful for debugging)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-4 rounded overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}

      {testing && (
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Testing all APIs... This may take a few moments.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}