
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const CategoryTabs = lazy(() => import('./CategoryTabs'));

interface LazyCategoryTabsProps {
  activeTab: string;
  securityData: any;
  liquidityData: any;
  tokenomicsData: any;
  communityData: any;
  developmentData: any;
  isPro: boolean;
  onCategoryChange: (category: any) => void;
}

export default function LazyCategoryTabs(props: LazyCategoryTabsProps) {
  return (
    <Suspense fallback={
      <div className="w-full">
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <CategoryTabs {...props} />
    </Suspense>
  );
}
