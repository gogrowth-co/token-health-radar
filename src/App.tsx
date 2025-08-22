
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Confirm from "./pages/Confirm";
import ScanChain from "./pages/ScanChain";
import ScanLoading from "./pages/ScanLoading";
import ScanResult from "./pages/ScanResult";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import LTD from "./pages/LTD";
import LTDThankYou from "./pages/LTDThankYou";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import TokenScanGuide from "./pages/TokenScanGuide";
import TokenSnifferComparison from "./pages/TokenSnifferComparison";
import SolanaLaunchpads from "./pages/SolanaLaunchpads";
import EthereumLaunchpads from "./pages/EthereumLaunchpads";
import TokenReport from "./pages/TokenReport";
import TokenDirectory from "./pages/TokenDirectory";
import NotFound from "./pages/NotFound";
import AdminUsers from "./pages/AdminUsers";
import AdminRoute from "./components/admin/AdminRoute";
import { useEffect } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Component that handles static file routes without rendering React content
const StaticFileRoute = ({ filePath }: { filePath: string }) => {
  useEffect(() => {
    // Immediately redirect to the static file
    window.location.replace(filePath);
  }, [filePath]);

  // Return null to prevent any React content from rendering
  return null;
};

const App = () => {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <ErrorBoundary>
                  <Routes>
                    {/* Static file routes - handle these first to prevent React rendering */}
                    <Route path="/sitemap.xml" element={<StaticFileRoute filePath="/sitemap.xml" />} />
                    <Route path="/robots.txt" element={<StaticFileRoute filePath="/robots.txt" />} />
                    
                    {/* Regular app routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={
                      <ErrorBoundary>
                        <Auth />
                      </ErrorBoundary>
                    } />
                    <Route path="/confirm" element={<Confirm />} />
                    <Route path="/scan/:chain/:address" element={<ScanChain />} />
                    <Route path="/scan-loading" element={<ScanLoading />} />
                    <Route path="/scan-result" element={<ScanResult />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/ltd" element={<LTD />} />
                    <Route path="/ltd-thank-you" element={<LTDThankYou />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/token-scan-guide" element={<TokenScanGuide />} />
                    <Route path="/token-sniffer-comparison" element={<TokenSnifferComparison />} />
                    <Route path="/solana-launchpads" element={<SolanaLaunchpads />} />
                    <Route path="/ethereum-launchpads" element={<EthereumLaunchpads />} />
                    <Route path="/token" element={<TokenDirectory />} />
                    <Route path="/token/:symbol" element={<TokenReport />} />
                    <Route path="/admin/users" element={
                      <AdminRoute>
                        <AdminUsers />
                      </AdminRoute>
                    } />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </ErrorBoundary>
              </BrowserRouter>
            </AuthProvider>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
