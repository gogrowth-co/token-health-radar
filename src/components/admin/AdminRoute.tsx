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

  // Debug logging for admin route access
  console.log('AdminRoute Debug - Access Check:', {
    isAuthenticated,
    authLoading,
    roleLoading,
    isAdmin,
    role,
    userId: user?.id,
    userEmail: user?.email,
    timestamp: new Date().toISOString()
  });

  // Show loading while checking auth and role
  if (authLoading || roleLoading) {
    console.log('AdminRoute Debug - Loading state:', { authLoading, roleLoading });
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Checking permissions...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Show access denied if not authenticated or not admin
  if (!isAuthenticated || !isAdmin) {
    console.error('AdminRoute Debug - Access Denied:', {
      isAuthenticated,
      isAdmin,
      role,
      userId: user?.id,
      userEmail: user?.email,
      reason: !isAuthenticated ? 'Not authenticated' : !isAdmin ? 'Not admin' : 'Unknown'
    });
    
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 container px-4 py-8 flex items-center justify-center">
          <div className="text-center space-y-6 max-w-md">
            <div className="flex justify-center">
              <Shield className="h-16 w-16 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
              <p className="text-muted-foreground">
                You don't have permission to access this area. Admin privileges are required.
              </p>
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded text-sm text-left">
                  <p><strong>Debug Info:</strong></p>
                  <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
                  <p>Admin: {isAdmin ? 'Yes' : 'No'}</p>
                  <p>Role: {role || 'None'}</p>
                  <p>User ID: {user?.id || 'None'}</p>
                  <p>Email: {user?.email || 'None'}</p>
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
    isAdmin,
    role,
    userId: user?.id,
    userEmail: user?.email
  });

  // Render children if admin
  return <>{children}</>;
}