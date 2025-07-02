import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  name: string | null;
  scans_used: number | null;
  pro_scan_limit: number | null;
  plan: string | null;
  role: 'admin' | 'user';
  is_admin: boolean;
  status: 'active' | 'banned' | 'admin';
}

export function useAdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('useAdminUsers - Starting fetch process...');
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('useAdminUsers - Auth check:', {
        userId: user?.id,
        email: user?.email,
        hasUser: !!user,
        authError: authError?.message
      });
      
      if (!user || !user.id || !user.email) {
        console.error('useAdminUsers - Invalid or missing user data');
        toast({
          title: "Authentication Error",
          description: "Please log in to access the admin dashboard.",
          variant: "destructive",
        });
        return;
      }
      
      console.log('useAdminUsers - Checking user role for:', user.email);
      const { data: roleData, error: roleError } = await supabase.rpc('get_user_role', {
        _user_id: user.id
      });
      
      console.log('useAdminUsers - User role check:', {
        roleData,
        roleError: roleError?.message,
        isAdmin: roleData === 'admin',
        userId: user.id,
        email: user.email
      });
      
      if (roleError) {
        console.error('useAdminUsers - Role check failed:', roleError);
        toast({
          title: "Role Verification Failed",
          description: `Unable to verify admin status: ${roleError.message}`,
          variant: "destructive",
        });
        return;
      }
      
      if (roleData !== 'admin') {
        console.error('useAdminUsers - User is not admin:', { roleData, userId: user.id, email: user.email });
        toast({
          title: "Access Denied",
          description: `Admin privileges required. Current role: ${roleData || 'user'}`,
          variant: "destructive",
        });
        return;
      }
      
      console.log('useAdminUsers - Fetching admin user data...');
      const { data, error } = await supabase.rpc('get_admin_user_data', {
        _caller_user_id: user.id
      });
      
      console.log('useAdminUsers - RPC Response:', {
        hasData: !!data,
        dataLength: data?.length || 0,
        error: error?.message
      });
      
      if (error) {
        console.error('useAdminUsers - RPC call failed:', error);
        toast({
          title: "Database Error",
          description: `Failed to load user data: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (!data || data.length === 0) {
        console.log('useAdminUsers - No data returned from function');
        toast({
          title: "No Data Found",
          description: "No user data found.",
          variant: "destructive",
        });
        return;
      }

      const userData = data as AdminUser[];
      console.log('useAdminUsers - Successfully processed user data:', {
        userCount: userData.length,
        adminCount: userData.filter(u => u.is_admin).length
      });
      
      setUsers(userData);
      toast({
        title: "Success",
        description: `Loaded ${userData.length} users successfully`,
        variant: "default",
      });
      
    } catch (error) {
      console.error('useAdminUsers - Unexpected error:', error);
      toast({
        title: "Unexpected Error",
        description: `An unexpected error occurred: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      if (newRole === 'admin') {
        // Insert admin role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: 'admin' });

        if (insertError) throw insertError;

        // Update subscriber to unlimited scans for admins
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({ pro_scan_limit: 999999 })
          .eq('id', userId);

        if (updateError) throw updateError;
      } else {
        // Remove admin role
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', 'admin');

        if (deleteError) throw deleteError;

        // Reset scan limit for regular users
        const { error: updateError } = await supabase
          .from('subscribers')
          .update({ pro_scan_limit: 3 })
          .eq('id', userId);

        if (updateError) throw updateError;
      }

      await fetchUsers();
      toast({
        title: "Success",
        description: `User role updated to ${newRole}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    handleRoleChange
  };
}