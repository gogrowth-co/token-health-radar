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

interface ConfirmAction {
  type: 'make_admin' | 'remove_admin' | 'ban' | 'unban';
  user: AdminUser;
}

interface AdminConfirmDialogProps {
  confirmAction: ConfirmAction | null;
  onClose: () => void;
  onConfirm: (action: ConfirmAction) => void;
}

export default function AdminConfirmDialog({ confirmAction, onClose, onConfirm }: AdminConfirmDialogProps) {
  if (!confirmAction) return null;

  const getTitle = () => {
    switch (confirmAction.type) {
      case 'make_admin':
        return 'Make Admin';
      case 'remove_admin':
        return 'Remove Admin';
      default:
        return 'Confirm Action';
    }
  };

  const getDescription = () => {
    switch (confirmAction.type) {
      case 'make_admin':
        return `Are you sure you want to make ${confirmAction.user.email} an admin? They will have unlimited scans and full access to the admin panel.`;
      case 'remove_admin':
        return `Are you sure you want to remove admin privileges from ${confirmAction.user.email}? Their scan limit will be reset to the default.`;
      default:
        return 'Are you sure you want to proceed with this action?';
    }
  };

  const getActionText = () => {
    switch (confirmAction.type) {
      case 'make_admin':
        return 'Make Admin';
      case 'remove_admin':
        return 'Remove Admin';
      default:
        return 'Confirm';
    }
  };

  return (
    <AlertDialog open={!!confirmAction} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{getTitle()}</AlertDialogTitle>
          <AlertDialogDescription>{getDescription()}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(confirmAction)}
            className={confirmAction.type === 'make_admin' ? 'bg-purple-600 hover:bg-purple-700' : ''}
          >
            {getActionText()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}