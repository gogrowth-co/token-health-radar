
import { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface BlurredCategoryProps {
  children: ReactNode;
  title: string;
  isBlurred: boolean;
  isProLimitReached?: boolean;
}

export default function BlurredCategory({ 
  children, 
  title, 
  isBlurred, 
  isProLimitReached = false 
}: BlurredCategoryProps) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (!isBlurred) {
    return <>{children}</>;
  }

  const handleCTAClick = () => {
    if (isProLimitReached) {
      navigate("/pricing");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="relative">
      {/* Blurred content */}
      <div className="filter blur-sm pointer-events-none">
        {children}
      </div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              {isProLimitReached ? "Pro Scan Limit Reached" : `Unlock ${title} Analysis`}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {isProLimitReached 
                ? "You've used your 3 free Pro scans. Upgrade to continue." 
                : "Sign up or log in to view detailed risk insights"
              }
            </p>
          </div>
          
          <Button 
            onClick={handleCTAClick}
            size="sm"
            className="bg-primary hover:bg-primary/90"
          >
            {isProLimitReached ? "Upgrade Now" : "Unlock Full Results"}
          </Button>
        </div>
      </div>
    </div>
  );
}
