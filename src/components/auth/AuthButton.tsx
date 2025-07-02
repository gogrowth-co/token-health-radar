
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function AuthButton() {
  const { user, loading, isAuthenticated } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  if (loading || roleLoading) {
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
      <Button variant="outline" size="sm" asChild>
        <Link to="/auth">Login</Link>
      </Button>
      <Button size="sm" asChild>
        <Link to="/auth">Sign Up</Link>
      </Button>
    </div>
  );
}
