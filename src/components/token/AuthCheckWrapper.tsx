
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface AuthCheckWrapperProps {
  children: React.ReactNode;
  pendingRedirect?: boolean;
  pendingData?: string;
}

export default function AuthCheckWrapper({ 
  children, 
  pendingRedirect = false, 
  pendingData = ""
}: AuthCheckWrapperProps) {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      if (pendingRedirect && pendingData) {
        localStorage.setItem("pendingTokenSearch", pendingData);
      }
      navigate("/auth");
    }
  }, [isAuthenticated, loading, navigate, pendingRedirect, pendingData]);

  // Show loading while auth is checking
  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Checking authentication...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Only render content if authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
