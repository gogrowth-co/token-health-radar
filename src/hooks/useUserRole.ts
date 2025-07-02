import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'user' | null;

export function useUserRole() {
  const { user, isAuthenticated } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserRole() {
      if (!isAuthenticated || !user) {
        console.log('useUserRole Debug - No authenticated user:', { isAuthenticated, hasUser: !!user });
        setRole(null);
        setLoading(false);
        return;
      }

      console.log('useUserRole Debug - Fetching role for user:', {
        userId: user.id,
        email: user.email
      });

      try {
        const { data, error } = await supabase.rpc('get_user_role', {
          _user_id: user.id
        });

        console.log('useUserRole Debug - Database response:', {
          data,
          error,
          userId: user.id
        });

        if (error) {
          console.error('Error fetching user role:', error);
          setRole('user'); // Default to user role on error
        } else {
          const finalRole = data || 'user';
          console.log('useUserRole Debug - Final role determined:', {
            rawData: data,
            finalRole,
            isAdmin: finalRole === 'admin'
          });
          setRole(finalRole);
        }
      } catch (error) {
        console.error('Exception fetching user role:', error);
        setRole('user');
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [user, isAuthenticated]);

  const isAdmin = role === 'admin';

  return { role, isAdmin, loading };
}