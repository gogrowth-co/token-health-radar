import { Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableCell, TableRow } from '@/components/ui/table';
import AdminUserBadge from './AdminUserBadge';

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

interface UserTableRowProps {
  user: AdminUser;
  onMakeAdmin: (user: AdminUser) => void;
  onRemoveAdmin: (user: AdminUser) => void;
}

const isGmangabeiraEmail = (email: string) => email === 'gmangabeira@gmail.com';

const formatDate = (dateString: string | null) => {
  if (!dateString) return 'Never';
  return new Date(dateString).toLocaleDateString();
};

export default function UserTableRow({ user, onMakeAdmin, onRemoveAdmin }: UserTableRowProps) {
  return (
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
      <TableCell>
        <AdminUserBadge status={user.status} />
      </TableCell>
      <TableCell>{formatDate(user.last_sign_in_at)}</TableCell>
      <TableCell>
        <div className="flex gap-2">
          {isGmangabeiraEmail(user.email) && !user.is_admin && (
            <Button
              size="sm"
              onClick={() => onMakeAdmin(user)}
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
              onClick={() => onRemoveAdmin(user)}
            >
              Remove Admin
            </Button>
          )}
          {!user.is_admin && user.status !== 'admin' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onMakeAdmin(user)}
            >
              <Crown className="w-3 h-3 mr-1" />
              Make Admin
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}