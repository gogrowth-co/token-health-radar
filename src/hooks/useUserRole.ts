import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'user' | null;

export function useUserRole() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  useEffect(() => {
    let mounted = true;
    
    async function fetchUserRole() {
      // Wait for auth to finish loading
      if (authLoading) {
        console.log('useUserRole Debug - Waiting for auth to finish loading...');
        return;
      }
      
      if (!isAuthenticated || !user?.id) {
        console.log('useUserRole Debug - No authenticated user:', { 
          isAuthenticated, 
          hasUser: !!user,
          userId: user?.id,
          authLoading
        });
        setRole(null);
        setLoading(false);
        return;
      }

      console.log('useUserRole Debug - Fetching role for user:', {
        userId: user.id,
        email: user.email,
        attempt: retryCount + 1
      });

      try {
        setLoading(true);
        
        const { data, error } = await supabase.rpc('get_user_role', {
          _user_id: user.id
        });

        console.log('useUserRole Debug - Database response:', {
          data,
          error: error ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          } : null,
          userId: user.id,
          userEmail: user.email,
          timestamp: new Date().toISOString()
        });

        if (error) {
          console.error('useUserRole Error - Database error:', {
            error,
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            userId: user.id,
            retryCount
          });
          
          // Retry logic for database errors
          if (retryCount < maxRetries && mounted) {
            console.log(`useUserRole Debug - Retrying role fetch (${retryCount + 1}/${maxRetries})...`);
            setRetryCount(prev => prev + 1);
            setTimeout(() => {
              if (mounted) fetchUserRole();
            }, 1000 * (retryCount + 1));
            return;
          }
          
          setRole('user'); // Default to user role on persistent error
        } else {
          const finalRole = data || 'user';
          console.log('useUserRole Debug - Final role determined:', {
            rawData: data,
            finalRole,
            isAdmin: finalRole === 'admin',
            userId: user.id,
            userEmail: user.email
          });
          setRole(finalRole);
          setRetryCount(0); // Reset retry count on success
        }
      } catch (error) {
        console.error('useUserRole Exception - Unexpected error:', {
          error,
          errorStack: error instanceof Error ? error.stack : 'No stack trace',
          errorMessage: error instanceof Error ? error.message : String(error),
          userId: user.id,
          retryCount
        });
        
        // Retry logic for exceptions
        if (retryCount < maxRetries && mounted) {
          console.log(`useUserRole Debug - Retrying after exception (${retryCount + 1}/${maxRetries})...`);
          setRetryCount(prev => prev + 1);
          setTimeout(() => {
            if (mounted) fetchUserRole();
          }, 1000 * (retryCount + 1));
          return;
        }
        
        setRole('user');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUserRole();
    
    return () => {
      mounted = false;
    };
  }, [user?.id, isAuthenticated, authLoading, retryCount]);

  const isAdmin = role === 'admin';

  console.log('useUserRole Debug - Hook state:', {
    role,
    isAdmin,
    loading,
    authLoading,
    isAuthenticated,
    userId: user?.id,
    userEmail: user?.email
  });

  return { role, isAdmin, loading };
}