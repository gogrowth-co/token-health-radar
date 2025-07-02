import { ReactNode } from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, loading: authLoading, user } = useAuth();
  const { isAdmin, role, loading: roleLoading } = useUserRole();

  // Enhanced debug logging for admin route access
  console.log('AdminRoute Debug - Access Check:', {
    isAuthenticated,
    authLoading,
    roleLoading,
    isAdmin,
    role,
    userId: user?.id,
    userEmail: user?.email,
    timestamp: new Date().toISOString(),
    hasUser: !!user,
    sessionAvailable: !!user
  });

  // Show loading while checking auth and role - wait for both to complete
  const isLoading = authLoading || roleLoading;
  
  if (isLoading) {
    console.log('AdminRoute Debug - Loading state:', { 
      authLoading, 
      roleLoading,
      hasUser: !!user,
      userId: user?.id 
    });
    
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-lg font-medium">Checking permissions...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Verifying admin access for {user?.email || 'user'}
              </p>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                <p><strong>Loading Debug:</strong></p>
                <p>Auth Loading: {authLoading ? 'Yes' : 'No'}</p>
                <p>Role Loading: {roleLoading ? 'Yes' : 'No'}</p>
                <p>User Available: {user?.id ? 'Yes' : 'No'}</p>
                <p>Email: {user?.email || 'N/A'}</p>
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Enhanced access control checks
  const hasValidUser = isAuthenticated && user?.id;
  const hasAdminAccess = isAdmin && role === 'admin';
  
  if (!hasValidUser || !hasAdminAccess) {
    const reason = !isAuthenticated 
      ? 'Not authenticated' 
      : !user?.id 
        ? 'No user ID available' 
        : !isAdmin 
          ? `Not admin (role: ${role})` 
          : 'Unknown access denial reason';
          
    console.error('AdminRoute Debug - Access Denied:', {
      isAuthenticated,
      hasValidUser,
      isAdmin,
      hasAdminAccess,
      role,
      userId: user?.id,
      userEmail: user?.email,
      reason
    });
    
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="flex justify-center">
              <Shield className="h-16 w-16 text-destructive/60" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
              <p className="text-muted-foreground">
                You don't have permission to access this area. Admin privileges are required.
              </p>
              <p className="text-sm text-muted-foreground">
                Current user: {user?.email || 'Not authenticated'}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-left">
                  <p><strong>Debug Info:</strong></p>
                  <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
                  <p>Valid User: {hasValidUser ? 'Yes' : 'No'}</p>
                  <p>Admin: {isAdmin ? 'Yes' : 'No'}</p>
                  <p>Admin Access: {hasAdminAccess ? 'Yes' : 'No'}</p>
                  <p>Role: {role || 'None'}</p>
                  <p>User ID: {user?.id || 'None'}</p>
                  <p>Email: {user?.email || 'None'}</p>
                  <p>Reason: {reason}</p>
                </div>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  console.log('AdminRoute Debug - Access Granted:', {
    isAuthenticated,
    hasValidUser,
    isAdmin,
    hasAdminAccess,
    role,
    userId: user?.id,
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });

  // Render children if admin access is confirmed
  return <>{children}</>;
}