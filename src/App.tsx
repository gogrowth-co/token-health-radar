
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { initializeErrorTracking, safePerformanceTrack } from "@/utils/errorTracking";
// Import the sync execution to trigger it
import { executeManualSync } from "@/utils/executeSync";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Confirm from "./pages/Confirm";
import ScanLoading from "./pages/ScanLoading";
import ScanResult from "./pages/ScanResult";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import LTD from "./pages/LTD";
import LTDThankYou from "./pages/LTDThankYou";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";

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

const App = () => {
  useEffect(() => {
    // Initialize error tracking
    initializeErrorTracking();
    
    // Track app initialization
    safePerformanceTrack('app_initialization', {
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
    
    // Trigger HubSpot sync on app load
    executeManualSync().catch(error => {
      console.error('HubSpot sync failed on app load:', error);
    });
    
    // Wait for DOM to be fully loaded before tracking performance
    if (document.readyState === 'complete') {
      safePerformanceTrack('app_loaded_complete');
    } else {
      window.addEventListener('load', () => {
        safePerformanceTrack('app_loaded_complete');
      });
    }
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/auth" element={
                    <ErrorBoundary>
                      <Auth />
                    </ErrorBoundary>
                  } />
                  <Route path="/confirm" element={<Confirm />} />
                  <Route path="/scan-loading" element={<ScanLoading />} />
                  <Route path="/scan-result" element={<ScanResult />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/ltd" element={<LTD />} />
                  <Route path="/ltd-thank-you" element={<LTDThankYou />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ErrorBoundary>
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
