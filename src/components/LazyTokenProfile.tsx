
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const TokenProfile = lazy(() => import('./TokenProfile'));

interface LazyTokenProfileProps {
  name: string;
  symbol: string;
  logo: string;
  address: string;
  website: string;
  twitter: string;
  github: string;
  price: number;
  priceChange: number;
  marketCap: string;
  overallScore?: number;
  description?: string;
  network?: string;
}

export default function LazyTokenProfile(props: LazyTokenProfileProps) {
  return (
    <Suspense fallback={
      <div className="w-full max-w-6xl mx-auto">
        <Skeleton className="h-[170px] w-full rounded-xl" />
      </div>
    }>
      <TokenProfile {...props} />
    </Suspense>
  );
}
