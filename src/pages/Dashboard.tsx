
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { UserProfile } from "@/components/auth/UserProfile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScanHistory = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching scan history for user:', user.id);
        
        // Fetch token scans directly - RLS will filter by user_id automatically
        const { data: scanData, error: scanError } = await supabase
          .from("token_scans")
          .select("id, token_address, score_total, scanned_at")
          .order("scanned_at", { ascending: false })
          .limit(10);

        if (scanError) {
          console.error("Error fetching scan history:", scanError);
          setError("Could not load scan history");
          return;
        }

        console.log('Scan data fetched:', scanData);

        // For each scan, try to get token info from cache
        const scansWithTokenInfo = await Promise.all(
          (scanData || []).map(async (scan) => {
            try {
              const { data: tokenData } = await supabase
                .from("token_data_cache")
                .select("name, symbol")
                .eq("token_address", scan.token_address)
                .single();

              return {
                ...scan,
                token_name: tokenData?.name || "Unknown Token",
                token_symbol: tokenData?.symbol || "???"
              };
            } catch (error) {
              console.error(`Error fetching token data for ${scan.token_address}:`, error);
              return {
                ...scan,
                token_name: "Unknown Token",
                token_symbol: "???"
              };
            }
          })
        );

        setScans(scansWithTokenInfo);
      } catch (error) {
        console.error("Error in scan history fetch:", error);
        setError("Failed to load scan history");
      } finally {
        setLoading(false);
      }
    };

    fetchScanHistory();
  }, [user]);

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
                  ) : error ? (
                    <div className="text-center py-8">
                      <Alert variant="destructive" className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                      <Button onClick={() => window.location.reload()} variant="outline">
                        Try Again
                      </Button>
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
