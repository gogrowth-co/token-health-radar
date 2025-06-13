
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Confirm from "./pages/Confirm";
import ScanLoading from "./pages/ScanLoading";
import ScanResults from "./pages/ScanResults"; // Updated route name
import Pricing from "./pages/Pricing";
import LTD from "./pages/LTD";
import LTDThankYou from "./pages/LTDThankYou";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/landing" element={<Landing />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/confirm" element={<Confirm />} />
                  <Route path="/scan-loading" element={<ScanLoading />} />
                  <Route path="/scan-results" element={<ScanResults />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/ltd" element={<LTD />} />
                  <Route path="/ltd-thank-you" element={<LTDThankYou />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
