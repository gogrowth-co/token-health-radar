import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Loader2, Shield } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import UserSearchFilters from '@/components/admin/UserSearchFilters';
import UsersTable from '@/components/admin/UsersTable';
import AdminConfirmDialog from '@/components/admin/AdminConfirmDialog';
import { useAdminUsers } from '@/hooks/useAdminUsers';

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

interface ConfirmAction {
  type: 'make_admin' | 'remove_admin' | 'ban' | 'unban';
  user: AdminUser;
}

export default function AdminUsers() {
  const { users, loading, handleRoleChange } = useAdminUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmAction = (action: ConfirmAction) => {
    const newRole = action.type === 'make_admin' ? 'admin' : 'user';
    handleRoleChange(action.user.id, newRole);
    setConfirmAction(null);
  };

  const handleMakeAdmin = (user: AdminUser) => {
    setConfirmAction({ type: 'make_admin', user });
  };

  const handleRemoveAdmin = (user: AdminUser) => {
    setConfirmAction({ type: 'remove_admin', user });
  };

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
            {process.env.NODE_ENV === 'development' && (
              <div className="ml-auto text-xs text-muted-foreground border p-2 rounded">
                <p><strong>Debug Info:</strong></p>
                <p>Admin Access Confirmed</p>
                <p>Total Users: {users.length}</p>
              </div>
            )}
          </div>

          <UserSearchFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <UsersTable
              users={filteredUsers}
              onMakeAdmin={handleMakeAdmin}
              onRemoveAdmin={handleRemoveAdmin}
            />
          )}
        </div>
      </main>

      <AdminConfirmDialog
        confirmAction={confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
      />

      <Footer />
    </div>
  );
}