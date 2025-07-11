
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function AuthButton() {
  const { user, loading, isAuthenticated } = useAuth();
  const { isAdmin, role, loading: roleLoading } = useUserRole();

  // Enhanced debug logging for AuthButton
  console.log('AuthButton Debug - Component state:', {
    isAuthenticated,
    loading,
    roleLoading,
    isAdmin,
    role,
    userId: user?.id,
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });

  if (loading || roleLoading) {
    return <Loader2 className="h-4 w-4 animate-spin" />;
  }

  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard">My Dashboard</Link>
        </Button>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/users">
              Admin Panel
              {process.env.NODE_ENV === 'development' && (
                <span className="ml-1 text-xs">({role})</span>
              )}
            </Link>
          </Button>
        )}
        {process.env.NODE_ENV === 'development' && isAdmin && (
          <div className="text-xs text-muted-foreground">
            {user?.email} | {role || 'user'} | ID: {user?.id?.slice(0, 8)}
          </div>
        )}
      </div>
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
