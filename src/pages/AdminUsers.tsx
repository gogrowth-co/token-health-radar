import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Loader2, Search, TestTube, Crown, Shield, Ban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

export default function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmAction, setConfirmAction] = useState<{
    type: 'make_admin' | 'remove_admin' | 'ban' | 'unban';
    user: AdminUser;
  } | null>(null);

  useEffect(() => {
    console.log('AdminUsers Debug - Component mounted, fetching users...');
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log('AdminUsers Debug - Fetching user data...');
      
      // Check current user's authentication status
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log('AdminUsers Debug - Current auth user:', {
        user: user?.id,
        email: user?.email,
        authError
      });
      
      const { data, error } = await supabase.rpc('get_admin_user_data');
      
      console.log('AdminUsers Debug - Database response:', {
        data,
        error,
        dataLength: data?.length,
        timestamp: new Date().toISOString()
      });
      
      if (error) {
        console.error('AdminUsers Error - Failed to fetch users:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          errorHint: error.hint
        });
        
        toast({
          title: "Error",
          description: error.message.includes('permission') 
            ? "Admin access required to view user data"
            : `Failed to load user data: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      const userData = (data || []) as AdminUser[];
      console.log('AdminUsers Debug - Processed user data:', {
        userCount: userData.length,
        adminUsers: userData.filter(u => u.is_admin).map(u => ({ id: u.id, email: u.email })),
        currentUserData: userData.find(u => u.id === 'a97608f8-5df3-4780-9832-d15cbe8414ac')
      });
      
      setUsers(userData);
    } catch (error) {
      console.error('AdminUsers Exception - Unexpected error:', {
        error,
        errorStack: error instanceof Error ? error.stack : 'No stack trace',
        errorMessage: error instanceof Error ? error.message : String(error)
      });
      
      toast({
        title: "Error",
        description: "Failed to load user data",
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'admin':
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"><Crown className="w-3 h-3 mr-1" />Admin</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</Badge>;
      case 'banned':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"><Ban className="w-3 h-3 mr-1" />Banned</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const isGmangabeiraEmail = (email: string) => email === 'gmangabeira@gmail.com';

  return (
    <div className="flex flex-col min-h-screen">
      <Helmet>
        <title>User Management - Token Health Scan</title>
      </Helmet>
      <Navbar />
      
      <main className="flex-1 container px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">User Management</h1>
          </div>

          {/* Search and Filter Controls */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <TestTube className="h-4 w-4" />
                        Total Scans
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.name || 'Unknown'}
                        {user.is_admin && (
                          <Crown className="inline w-4 h-4 ml-2 text-purple-600" />
                        )}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell className="text-center">
                        {user.scans_used || 0}
                        {user.is_admin && (
                          <span className="text-xs text-purple-600 ml-1">(∞)</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(user.status)}</TableCell>
                      <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {isGmangabeiraEmail(user.email) && !user.is_admin && (
                            <Button
                              size="sm"
                              onClick={() => setConfirmAction({ type: 'make_admin', user })}
                              className="bg-purple-600 hover:bg-purple-700"
                            >
                              <Crown className="w-3 h-3 mr-1" />
                              Make Admin
                            </Button>
                          )}
                          {user.is_admin && !isGmangabeiraEmail(user.email) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmAction({ type: 'remove_admin', user })}
                            >
                              Remove Admin
                            </Button>
                          )}
                          {!user.is_admin && user.status !== 'admin' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setConfirmAction({ type: 'make_admin', user })}
                            >
                              <Crown className="w-3 h-3 mr-1" />
                              Make Admin
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmAction?.type === 'make_admin' ? 'Make Admin' : 'Remove Admin'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.type === 'make_admin' 
                ? `Are you sure you want to make ${confirmAction.user.email} an admin? They will have unlimited scans and full access to the admin panel.`
                : `Are you sure you want to remove admin privileges from ${confirmAction.user.email}? Their scan limit will be reset to the default.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) {
                  const newRole = confirmAction.type === 'make_admin' ? 'admin' : 'user';
                  handleRoleChange(confirmAction.user.id, newRole);
                  setConfirmAction(null);
                }
              }}
              className={confirmAction?.type === 'make_admin' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              {confirmAction?.type === 'make_admin' ? 'Make Admin' : 'Remove Admin'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}