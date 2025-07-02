import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface DataFreshnessIndicatorProps {
  lastUpdated?: string | null;
  className?: string;
}

export default function DataFreshnessIndicator({ 
  lastUpdated,
  className = "" 
}: DataFreshnessIndicatorProps) {
  if (!lastUpdated) {
    return (
      <Badge variant="secondary" className={`${className} text-xs`}>
        <AlertTriangle className="h-3 w-3 mr-1" />
        No timestamp
      </Badge>
    );
  }

  const lastUpdateDate = new Date(lastUpdated);
  const now = new Date();
  const diffMinutes = Math.floor((now.getTime() - lastUpdateDate.getTime()) / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeText: string;
  let variant: "default" | "secondary" | "destructive" | "outline" = "default";
  let icon: React.ReactNode;

  if (diffMinutes < 5) {
    timeText = "Just updated";
    variant = "default";
    icon = <CheckCircle className="h-3 w-3 mr-1 text-green-600" />;
  } else if (diffMinutes < 60) {
    timeText = `${diffMinutes}m ago`;
    variant = "default";
    icon = <Clock className="h-3 w-3 mr-1" />;
  } else if (diffHours < 24) {
    timeText = `${diffHours}h ago`;
    variant = diffHours > 6 ? "secondary" : "default";
    icon = <Clock className="h-3 w-3 mr-1" />;
  } else {
    timeText = `${diffDays}d ago`;
    variant = "destructive";
    icon = <AlertTriangle className="h-3 w-3 mr-1" />;
  }

  return (
    <Badge variant={variant} className={`${className} text-xs`}>
      {icon}
      {timeText}
    </Badge>
  );
}