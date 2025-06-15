
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BlurredCategoryOverlayProps {
  children: React.ReactNode;
  isBlurred: boolean;
}

export default function BlurredCategoryOverlay({ children, isBlurred }: BlurredCategoryOverlayProps) {
  const navigate = useNavigate();

  if (!isBlurred) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="filter blur-sm pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/90 to-white/95 dark:from-gray-900/80 dark:via-gray-900/90 dark:to-gray-900/95 flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <div className="flex items-center justify-center gap-2 text-lg font-semibold">
            <Lock className="h-5 w-5" />
            Sign up or log in to view full results
          </div>
          <Button 
            onClick={() => navigate('/auth')}
            className="bg-primary hover:bg-primary/90"
          >
            Create Free Account
          </Button>
        </div>
      </div>
    </div>
  );
}
