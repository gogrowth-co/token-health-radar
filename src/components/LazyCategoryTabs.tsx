
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const CategoryTabs = lazy(() => import('./CategoryTabs'));

// Import the ScanCategory enum from CategoryTabs
enum ScanCategory {
  Security = "security",
  Tokenomics = "tokenomics", 
  Liquidity = "liquidity",
  Community = "community",
  Development = "development"
}

interface LazyCategoryTabsProps {
  activeTab: ScanCategory;
  securityData: any;
  liquidityData: any;
  tokenomicsData: any;
  communityData: any;
  developmentData: any;
  isPro: boolean;
  onCategoryChange: (category: ScanCategory) => void;
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
