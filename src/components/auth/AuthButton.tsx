
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { AuthModal } from "./AuthModal";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function AuthButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const { user, loading, isAuthenticated } = useAuth();

  const openModal = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setIsModalOpen(true);
  };

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (isAuthenticated) {
    return (
      <Button variant="outline" size="sm" asChild>
        <Link to="/dashboard">My Dashboard</Link>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => openModal("login")}>
        Login
      </Button>
      <Button size="sm" onClick={() => openModal("signup")}>
        Sign Up
      </Button>

      <AuthModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={authMode}
      />
    </div>
  );
}
