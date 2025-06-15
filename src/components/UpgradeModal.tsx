
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scansUsed: number;
  scanLimit: number;
  plan: string;
  isAnonymous?: boolean;
}

export default function UpgradeModal({
  open,
  onOpenChange,
  scansUsed,
  scanLimit,
  plan,
  isAnonymous = false
}: UpgradeModalProps) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    if (isAnonymous) {
      navigate('/auth');
    } else {
      navigate('/pricing');
    }
    onOpenChange(false);
  };

  const handleDismiss = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAnonymous ? '🔒 Sign Up for More Scans' : '⚡ Upgrade to Pro'}
          </DialogTitle>
          <DialogDescription>
            {isAnonymous ? (
              "Create a free account to get 3 Pro-quality token scans with full risk analysis and detailed insights."
            ) : plan === 'free' ? (
              `You've used ${scansUsed} of ${scanLimit} free Pro scans. Upgrade to Pro for unlimited scans and advanced features.`
            ) : (
              `You've reached your scan limit of ${scanLimit} this month. Your limit will reset with your next billing cycle.`
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Detailed security analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Complete tokenomics breakdown</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              <span className="text-sm">Liquidity & development metrics</span>
            </div>
            {!isAnonymous && (
              <div className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                <span className="text-sm">Unlimited monthly scans</span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2">
          <Button onClick={handleUpgrade} className="w-full">
            {isAnonymous ? 'Create Free Account' : 'Upgrade to Pro'}
          </Button>
          <Button variant="outline" onClick={handleDismiss} className="w-full">
            Continue with Limited Results
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
