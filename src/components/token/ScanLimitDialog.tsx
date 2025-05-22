
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

interface ScanLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
  plan: string;
  scansUsed: number;
  scanLimit: number;
}

export default function ScanLimitDialog({
  open,
  onOpenChange,
  onUpgrade,
  plan,
  scansUsed,
  scanLimit
}: ScanLimitDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Scan Limit Reached</AlertDialogTitle>
          <AlertDialogDescription>
            {plan === 'free'
              ? `You have used ${scansUsed} out of ${scanLimit} free scans. Upgrade to Pro for more scans and advanced features.`
              : `You have used ${scansUsed} out of ${scanLimit} Pro scans this month. Your limit will reset with your next billing cycle.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onUpgrade}>
            {plan === 'free' ? 'Upgrade to Pro' : 'Manage Subscription'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
