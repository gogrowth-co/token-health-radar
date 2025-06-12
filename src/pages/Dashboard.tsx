
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { UserProfile } from "@/components/auth/UserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2, Bug } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

type ScanHistory = {
  id: string;
  token_address: string;
  score_total: number;
  scanned_at: string;
  token_name?: string;
  token_symbol?: string;
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [scans, setScans] = useState<ScanHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [debugSyncing, setDebugSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchScanHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: scanData, error } = await supabase
          .from("token_scans")
          .select(`
            id, 
            token_address,
            score_total,
            scanned_at,
            token_data_cache (
              name,
              symbol
            )
          `)
          .eq("user_id", user.id)
          .order("scanned_at", { ascending: false })
          .limit(10);

        if (error) {
          console.error("Error fetching scan history:", error);
          return;
        }

        // Transform the data to include token name and symbol
        const formattedScans = scanData.map(scan => ({
          id: scan.id,
          token_address: scan.token_address,
          score_total: scan.score_total,
          scanned_at: scan.scanned_at,
          token_name: scan.token_data_cache?.name || "Unknown Token",
          token_symbol: scan.token_data_cache?.symbol || "???"
        }));

        setScans(formattedScans);
      } catch (error) {
        console.error("Error in scan history fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchScanHistory();
  }, [user]);

  const handleDebugHubSpotSync = async () => {
    if (!user) return;
    
    setDebugSyncing(true);
    console.log('Starting debug HubSpot sync for user:', user.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('hubspot-sync', {
        body: { user_id: user.id }
      });

      console.log('HubSpot sync response:', data);
      console.log('HubSpot sync error:', error);

      if (error) {
        toast({
          title: "Debug Sync Error",
          description: `Error: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Debug Sync Complete",
          description: `Status: ${data?.success ? 'Success' : 'Failed'}. Synced: ${data?.synced_count || 0}, Errors: ${data?.error_count || 0}`,
        });
      }
    } catch (err) {
      console.error('Debug sync exception:', err);
      toast({
        title: "Debug Sync Failed",
        description: `Exception: ${err.message}`,
        variant: "destructive",
      });
    } finally {
      setDebugSyncing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Alert className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Authentication Required</AlertTitle>
              <AlertDescription>
                Please log in or sign up to access your dashboard.
              </AlertDescription>
            </Alert>
            <div className="text-center mt-8">
              <h1 className="text-3xl font-bold mb-4">Welcome to TokenHealthScan</h1>
              <p className="text-lg text-muted-foreground mb-6">
                Sign in to track your token scans and manage your subscription.
              </p>
              <Button asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            {/* Debug button - temporary for testing */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDebugHubSpotSync}
              disabled={debugSyncing}
            >
              {debugSyncing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Bug className="h-4 w-4 mr-2" />
              )}
              Debug HubSpot Sync
            </Button>
          </div>
          
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <UserProfile />
            </div>
            
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Scans</CardTitle>
                  <CardDescription>Your most recent token health scans</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : scans.length > 0 ? (
                    <div className="space-y-4">
                      {scans.map((scan) => (
                        <div key={scan.id} className="flex items-center justify-between border-b pb-3">
                          <div>
                            <p className="font-medium">{scan.token_name} ({scan.token_symbol})</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(scan.scanned_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Score</p>
                              <p className="font-medium">{scan.score_total}/100</p>
                            </div>
                            <Button variant="outline" size="sm" asChild>
                              <Link to={`/scan-result?token=${scan.token_address}`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">You haven't performed any scans yet.</p>
                      <Button asChild>
                        <Link to="/">Scan a Token Now</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
