import { Badge } from '@/components/ui/badge';
import { Crown, Ban } from 'lucide-react';

interface AdminUserBadgeProps {
  status: string;
}

export default function AdminUserBadge({ status }: AdminUserBadgeProps) {
  switch (status) {
    case 'admin':
      return (
        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
          <Crown className="w-3 h-3 mr-1" />
          Admin
        </Badge>
      );
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          Active
        </Badge>
      );
    case 'banned':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">
          <Ban className="w-3 h-3 mr-1" />
          Banned
        </Badge>
      );
    default:
      return <Badge variant="secondary">Unknown</Badge>;
  }
}