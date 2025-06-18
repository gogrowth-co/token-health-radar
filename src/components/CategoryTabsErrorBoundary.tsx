
import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface CategoryTabsErrorBoundaryProps {
  children: React.ReactNode;
}

export default function CategoryTabsErrorBoundary({ children }: CategoryTabsErrorBoundaryProps) {
  const fallback = (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h3 className="text-lg font-semibold">Category Data Loading</h3>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          We're having trouble loading the detailed category analysis. 
          This might be because the scan is still processing or there was an issue fetching the data.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Try refreshing the page in a few moments.
        </p>
      </CardContent>
    </Card>
  );

  return (
    <ErrorBoundary fallback={fallback}>
      {children}
    </ErrorBoundary>
  );
}
