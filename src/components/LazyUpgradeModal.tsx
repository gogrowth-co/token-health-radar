
import { lazy, Suspense } from 'react';

const UpgradeModal = lazy(() => import('./UpgradeModal'));

interface LazyUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scansUsed: number;
  scanLimit: number;
  plan: string;
  isAnonymous: boolean;
}

export default function LazyUpgradeModal(props: LazyUpgradeModalProps) {
  return (
    <Suspense fallback={null}>
      <UpgradeModal {...props} />
    </Suspense>
  );
}
