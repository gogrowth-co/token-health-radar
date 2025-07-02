import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Shield, Info } from 'lucide-react';

interface WebacyFlag {
  flag: string;
  name: string;
  description: string;
  severity?: 'critical' | 'warning' | 'info';
}

interface WebacyRiskFlagsProps {
  webacyFlags: WebacyFlag[];
  webacyRiskScore?: number | null;
  webacySeverity?: string | null;
}

export default function WebacyRiskFlags({ 
  webacyFlags = [], 
  webacyRiskScore, 
  webacySeverity 
}: WebacyRiskFlagsProps) {
  
  if (!webacyFlags || webacyFlags.length === 0) {
    return (
      <div className="relative p-5 rounded-lg bg-white dark:bg-muted border border-gray-100 dark:border-gray-700 shadow-sm min-h-[140px] flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
            Smart Contract Risk Flags (via Webacy)
          </h3>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          No significant risk flags detected or data unavailable
        </div>
        
        <div className="mt-auto">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Clean
          </span>
        </div>
      </div>
    );
  }

  const getSeverityColor = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500 hover:bg-red-600';
      case 'warning':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'info':
        return 'bg-blue-500 hover:bg-blue-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const getSeverityIcon = (severity?: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return <AlertTriangle className="h-3 w-3" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary" />
            Smart Contract Risk Flags (via Webacy)
          </CardTitle>
          {webacyRiskScore !== null && webacyRiskScore !== undefined && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                Risk Score: {webacyRiskScore}/100
              </Badge>
              {webacySeverity && (
                <Badge 
                  className={`text-white ${getSeverityColor(webacySeverity)}`}
                >
                  {webacySeverity.toUpperCase()}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64 w-full pr-4">
          <div className="space-y-3">
            {webacyFlags.map((flag, index) => (
              <div 
                key={index}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getSeverityIcon(flag.severity)}
                      <h4 className="font-medium text-sm">{flag.name}</h4>
                      {flag.severity && (
                      <Badge 
                        className={`text-white ${getSeverityColor(flag.severity)}`}
                      >
                        {flag.severity}
                      </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {flag.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}