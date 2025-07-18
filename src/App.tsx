
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Landing from "./pages/Landing";
import ScanResult from "./pages/ScanResult";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Pricing from "./pages/Pricing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Admin from "./pages/AdminUsers";
import { useAuth } from "./contexts/AuthContext";
import { useEffect } from "react";
import TokenRiskReport from "@/pages/TokenRiskReport";
import AdminRoute from "@/components/admin/AdminRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/scan" element={<ScanResult />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/account" element={<Dashboard />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <Admin />
            </AdminRoute>
          }
        />
        
        {/* Admin-only token risk report route */}
        <Route 
          path="/token-risk-report/:chain/:address" 
          element={
            <AdminRoute>
              <TokenRiskReport />
            </AdminRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
