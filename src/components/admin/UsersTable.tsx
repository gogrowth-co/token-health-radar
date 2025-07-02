import { TestTube } from 'lucide-react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import UserTableRow from './UserTableRow';

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

interface UsersTableProps {
  users: AdminUser[];
  onMakeAdmin: (user: AdminUser) => void;
  onRemoveAdmin: (user: AdminUser) => void;
}

export default function UsersTable({ users, onMakeAdmin, onRemoveAdmin }: UsersTableProps) {
  return (
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
          {users.map((user) => (
            <UserTableRow
              key={user.id}
              user={user}
              onMakeAdmin={onMakeAdmin}
              onRemoveAdmin={onRemoveAdmin}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}