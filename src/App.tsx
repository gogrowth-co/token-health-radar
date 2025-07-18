
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Home from "./pages/Home";
import ScanResult from "./pages/ScanResult";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Admin from "./pages/Admin";
import { useAuth } from "./contexts/AuthContext";
import { useEffect } from "react";
import { useHubspot } from "./hooks/useHubspot";
import TokenRiskReport from "@/pages/TokenRiskReport";
import AdminRoute from "@/components/admin/AdminRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<ScanResult />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/account" element={<Account />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
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
