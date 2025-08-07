import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'user' | null;

export function useUserRole() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    async function fetchUserRole() {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }
      
      if (!isAuthenticated || !user?.id) {
        console.log('useUserRole - No authenticated user');
        setRole(null);
        setLoading(false);
        return;
      }

      console.log('useUserRole - Fetching role for user:', {
        userId: user.id,
        email: user.email
      });

      try {
        setLoading(true);
        
        // Use the database function for consistent role checking
        const { data: roleData, error } = await supabase.rpc('get_user_role', {
          _user_id: user.id
        });

        console.log('useUserRole - Role function response:', {
          roleData,
          error: error?.message,
          userId: user.id,
          userEmail: user.email
        });

        if (error) {
          console.error('useUserRole - Role fetch error:', error);
          setRole('user'); // Default to user role on error
        } else {
          const finalRole = roleData || 'user';
          console.log('useUserRole - Final role determined:', {
            finalRole,
            isAdmin: finalRole === 'admin',
            userId: user.id,
            userEmail: user.email
          });
          setRole(finalRole);
        }
      } catch (error) {
        console.error('useUserRole - Unexpected error:', error);
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
  }, [user?.id, user?.email, isAuthenticated, authLoading]);

  const isAdmin = role === 'admin';

  console.log('useUserRole - Current state:', {
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